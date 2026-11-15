
import {
  createCipheriv,
  createDecipheriv,
  randomBytes,
} from "node:crypto";
import {
  mkdir,
  open,
  readFile,
  writeFile,
  rename,
  stat,
  unlink,
} from "node:fs/promises";
import path from "node:path";
import os from "node:os";

type MercadoLibreTokens = {
  access_token: string;
  refresh_token: string;
  user_id: number;
  expires_at: number;
};

type MercadoLibreTokenResponse = {
  access_token?: unknown;
  refresh_token?: unknown;
  user_id?: unknown;
  expires_in?: unknown;
  error?: unknown;
  error_description?: unknown;
};

let refreshInProgress: Promise<string> | null = null;

function getEncryptionKey(): Buffer {
  const value = process.env.MERCADOLIBRE_ENCRYPTION_KEY;

  if (!value || !/^[a-f0-9]{64}$/i.test(value)) {
    throw new Error("La clave de cifrado de Mercado Libre no está configurada.");
  }

  return Buffer.from(value, "hex");
}

function getTokenPath(): string {
  const base = process.env.LOCALAPPDATA || os.homedir();

  return path.join(
    base,
    "ALEZZA",
    "secrets",
    "mercadolibre-token.enc"
  );
}

function validateTokens(value: unknown): MercadoLibreTokens {
  if (!value || typeof value !== "object") {
    throw new Error("Los datos de Mercado Libre no son válidos.");
  }

  const tokens = value as Record<string, unknown>;

  if (
    typeof tokens.access_token !== "string" ||
    !tokens.access_token ||
    typeof tokens.refresh_token !== "string" ||
    !tokens.refresh_token ||
    typeof tokens.user_id !== "number" ||
    !Number.isFinite(tokens.user_id) ||
    typeof tokens.expires_at !== "number" ||
    !Number.isFinite(tokens.expires_at)
  ) {
    throw new Error("Los tokens de Mercado Libre están incompletos.");
  }

  return {
    access_token: tokens.access_token,
    refresh_token: tokens.refresh_token,
    user_id: tokens.user_id,
    expires_at: tokens.expires_at,
  };
}

export async function saveMercadoLibreTokens(
  value: MercadoLibreTokens
): Promise<void> {
  const tokens = validateTokens(value);
  const key = getEncryptionKey();
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key, iv);

  const encrypted = Buffer.concat([
    cipher.update(JSON.stringify(tokens), "utf8"),
    cipher.final(),
  ]);

  const payload = {
    iv: iv.toString("hex"),
    tag: cipher.getAuthTag().toString("hex"),
    data: encrypted.toString("hex"),
  };

  const filePath = getTokenPath();
  const directory = path.dirname(filePath);
  const temporaryPath = `${filePath}.${randomBytes(8).toString("hex")}.tmp`;

  await mkdir(directory, { recursive: true });

  try {
    await writeFile(temporaryPath, JSON.stringify(payload), {
      encoding: "utf8",
      mode: 0o600,
    });

    await rename(temporaryPath, filePath);
  } catch (error) {
    await unlink(temporaryPath).catch(() => undefined);
    throw error;
  }
}

async function readStoredTokens(): Promise<MercadoLibreTokens | null> {
  let raw: string;

  try {
    raw = await readFile(getTokenPath(), "utf8");
  } catch (error) {
    if (
      error &&
      typeof error === "object" &&
      "code" in error &&
      error.code === "ENOENT"
    ) {
      return null;
    }

    throw new Error("No se pudo leer el archivo de tokens de Mercado Libre.");
  }

  try {
    const payload: unknown = JSON.parse(raw);

    if (!payload || typeof payload !== "object") {
      throw new Error("Formato inválido.");
    }

    const encrypted = payload as Record<string, unknown>;

    if (
      typeof encrypted.iv !== "string" ||
      !/^[a-f0-9]{24}$/i.test(encrypted.iv) ||
      typeof encrypted.tag !== "string" ||
      !/^[a-f0-9]{32}$/i.test(encrypted.tag) ||
      typeof encrypted.data !== "string" ||
      !/^(?:[a-f0-9]{2})+$/i.test(encrypted.data)
    ) {
      throw new Error("Contenido cifrado inválido.");
    }

    const decipher = createDecipheriv(
      "aes-256-gcm",
      getEncryptionKey(),
      Buffer.from(encrypted.iv, "hex")
    );

    decipher.setAuthTag(Buffer.from(encrypted.tag, "hex"));

    const decrypted = Buffer.concat([
      decipher.update(Buffer.from(encrypted.data, "hex")),
      decipher.final(),
    ]);

    return validateTokens(JSON.parse(decrypted.toString("utf8")));
  } catch {
    throw new Error(
      "No se pudieron validar o descifrar los tokens de Mercado Libre."
    );
  }
}

function validateRefreshResponse(
  value: MercadoLibreTokenResponse
): MercadoLibreTokens {
  if (
    typeof value.access_token !== "string" ||
    !value.access_token ||
    typeof value.refresh_token !== "string" ||
    !value.refresh_token ||
    typeof value.user_id !== "number" ||
    !Number.isFinite(value.user_id) ||
    typeof value.expires_in !== "number" ||
    !Number.isFinite(value.expires_in) ||
    value.expires_in <= 0
  ) {
    throw new Error("Mercado Libre devolvió una renovación inválida.");
  }

  return {
    access_token: value.access_token,
    refresh_token: value.refresh_token,
    user_id: value.user_id,
    expires_at: Date.now() + value.expires_in * 1000,
  };
}

// Lock entre procesos: el refresh_token de Mercado Libre es de un solo uso,
// así que dos procesos no deben renovarlo a la vez.
// ponytail: lockfile con vencimiento de 30 s; alcanza para un único servidor local.
async function withRefreshLock<T>(task: () => Promise<T>): Promise<T> {
  const lockPath = `${getTokenPath()}.lock`;
  const deadline = Date.now() + 15_000;

  await mkdir(path.dirname(lockPath), { recursive: true });

  for (;;) {
    try {
      const handle = await open(lockPath, "wx");
      await handle.close();
      break;
    } catch (error) {
      if (!(error && typeof error === "object" && "code" in error && error.code === "EEXIST")) {
        throw error;
      }

      const lock = await stat(lockPath).catch(() => null);
      if (lock && Date.now() - lock.mtimeMs > 30_000) {
        await unlink(lockPath).catch(() => undefined);
        continue;
      }

      if (Date.now() > deadline) {
        throw new Error("Otra renovación de Mercado Libre sigue en curso.");
      }

      await new Promise((resolve) => setTimeout(resolve, 200));
    }
  }

  try {
    return await task();
  } finally {
    await unlink(lockPath).catch(() => undefined);
  }
}

async function refreshMercadoLibreAccessToken(): Promise<string> {
  return withRefreshLock(refreshWhileLocked);
}

async function refreshWhileLocked(): Promise<string> {
  const tokens = await readStoredTokens();

  if (!tokens) {
    throw new Error("Mercado Libre todavía no está conectado.");
  }

  // Otra solicitud pudo haber renovado los tokens mientras esperábamos.
  if (tokens.expires_at > Date.now() + 60_000) {
    return tokens.access_token;
  }

  const clientId = process.env.MERCADOLIBRE_CLIENT_ID;
  const clientSecret = process.env.MERCADOLIBRE_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    throw new Error("Faltan las credenciales de Mercado Libre.");
  }

  const body = new URLSearchParams({
    grant_type: "refresh_token",
    client_id: clientId,
    client_secret: clientSecret,
    refresh_token: tokens.refresh_token,
  });

  const response = await fetch(
    "https://api.mercadolibre.com/oauth/token",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body,
      cache: "no-store",
    }
  );

  if (!response.ok) {
    const failure = (await response.json().catch(() => ({}))) as MercadoLibreTokenResponse;

    // Los tokens guardados no se borran: se conservan para diagnóstico.
    if (failure.error === "invalid_grant") {
      throw new Error(
        "Mercado Libre rechazó el refresh token. Hay que volver a conectar la cuenta desde Configuración."
      );
    }

    throw new Error(
      `No se pudo renovar el acceso a Mercado Libre (HTTP ${response.status}).`
    );
  }

  const refreshed: unknown = await response.json();

  const updatedTokens = validateRefreshResponse(
    refreshed as MercadoLibreTokenResponse
  );

  await saveMercadoLibreTokens(updatedTokens);

  return updatedTokens.access_token;
}

// Estado de la conexión sin renovar ni exponer tokens.
export async function getMercadoLibreConnectionStatus() {
  const tokens = await readStoredTokens();

  if (!tokens) return { connected: false as const };

  return {
    connected: true as const,
    user_id: tokens.user_id,
    access_expires_at: new Date(tokens.expires_at).toISOString(),
    access_valid: tokens.expires_at > Date.now() + 60_000,
  };
}

export async function getMercadoLibreAccessToken(): Promise<string> {
  const tokens = await readStoredTokens();

  if (!tokens) {
    throw new Error("Mercado Libre todavía no está conectado.");
  }

  if (tokens.expires_at > Date.now() + 60_000) {
    return tokens.access_token;
  }

  if (!refreshInProgress) {
    refreshInProgress = refreshMercadoLibreAccessToken().finally(() => {
      refreshInProgress = null;
    });
  }

  return refreshInProgress;
}
