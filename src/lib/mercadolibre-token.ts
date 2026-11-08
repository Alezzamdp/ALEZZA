import {
  createCipheriv,
  createDecipheriv,
  randomBytes,
} from "node:crypto";
import { mkdir, readFile, writeFile, rename } from "node:fs/promises";
import path from "node:path";
import os from "node:os";

type MercadoLibreTokens = {
  access_token: string;
  refresh_token: string;
  user_id: number;
  expires_at: number;
};

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

export async function saveMercadoLibreTokens(
  tokens: MercadoLibreTokens
): Promise<void> {
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

  await mkdir(directory, { recursive: true });

  const temporaryPath = `${filePath}.tmp`;

  await writeFile(temporaryPath, JSON.stringify(payload), {
    encoding: "utf8",
    mode: 0o600,
  });

  await rename(temporaryPath, filePath);
}

async function readStoredTokens(): Promise<MercadoLibreTokens | null> {
  try {
    const filePath = getTokenPath();
    const raw = await readFile(filePath, "utf8");
    const payload = JSON.parse(raw);

    const decipher = createDecipheriv(
      "aes-256-gcm",
      getEncryptionKey(),
      Buffer.from(payload.iv, "hex")
    );

    decipher.setAuthTag(Buffer.from(payload.tag, "hex"));

    const decrypted = Buffer.concat([
      decipher.update(Buffer.from(payload.data, "hex")),
      decipher.final(),
    ]);

    return JSON.parse(decrypted.toString("utf8"));
  } catch {
    return null;
  }
}

export async function getMercadoLibreAccessToken(): Promise<string> {
  const tokens = await readStoredTokens();

  if (!tokens) {
    throw new Error("Mercado Libre todavía no está conectado.");
  }

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

  const response = await fetch("https://api.mercadolibre.com/oauth/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
    cache: "no-store",
  });

  const refreshed = await response.json();

  if (!response.ok) {
    throw new Error("No se pudo renovar el acceso a Mercado Libre.");
  }

  const updatedTokens: MercadoLibreTokens = {
    access_token: refreshed.access_token,
    refresh_token: refreshed.refresh_token,
    user_id: refreshed.user_id,
    expires_at: Date.now() + refreshed.expires_in * 1000,
  };

  await saveMercadoLibreTokens(updatedTokens);

  return updatedTokens.access_token;
}
