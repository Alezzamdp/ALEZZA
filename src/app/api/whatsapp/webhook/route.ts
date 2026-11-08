import { NextRequest, NextResponse } from "next/server";
import { createHmac, timingSafeEqual } from "node:crypto";
import { createClient } from "@supabase/supabase-js";
import { generateWhatsAppReply } from "@/lib/whatsapp/agent";

export const runtime = "nodejs";

function getSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !key) {
    throw new Error("Faltan las credenciales privadas de Supabase.");
  }

  return createClient(url, key, {
    auth: { persistSession: false },
  });
}

async function sendWhatsAppText(
  phoneNumberId: string,
  recipient: string,
  message: string
): Promise<string> {
  const token = process.env.WHATSAPP_ACCESS_TOKEN;

  if (!token) {
    throw new Error("Falta configurar WHATSAPP_ACCESS_TOKEN.");
  }

  const version = process.env.WHATSAPP_GRAPH_API_VERSION || "v26.0";

  const response = await fetch(
    `https://graph.facebook.com/${version}/${phoneNumberId}/messages`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        messaging_product: "whatsapp",
        recipient_type: "individual",
        to: recipient,
        type: "text",
        text: {
          preview_url: false,
          body: message.slice(0, 4096),
        },
      }),
    }
  );

  const result = (await response.json()) as {
    messages?: Array<{ id?: string }>;
    error?: { message?: string };
  };

  if (!response.ok) {
    throw new Error(
      result.error?.message || `WhatsApp respondió con estado ${response.status}.`
    );
  }

  const providerMessageId = result.messages?.[0]?.id;

  if (!providerMessageId) {
    throw new Error("WhatsApp no devolvió el identificador del mensaje.");
  }

  return providerMessageId;
}

export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;
  const mode = params.get("hub.mode");
  const token = params.get("hub.verify_token");
  const challenge = params.get("hub.challenge");

  if (
    mode === "subscribe" &&
    token === process.env.WHATSAPP_VERIFY_TOKEN &&
    challenge
  ) {
    return new NextResponse(challenge, { status: 200 });
  }

  return NextResponse.json(
    { error: "Verificación rechazada" },
    { status: 403 }
  );
}

export async function POST(request: NextRequest) {
  try {
    const rawBody = await request.text();
    const signature = request.headers.get("x-hub-signature-256");
    const appSecret = process.env.WHATSAPP_APP_SECRET;

    if (!appSecret || !signature) {
      return NextResponse.json(
        { error: "Firma ausente" },
        { status: 401 }
      );
    }

    const expected =
      "sha256=" +
      createHmac("sha256", appSecret).update(rawBody).digest("hex");

    const receivedBuffer = Buffer.from(signature);
    const expectedBuffer = Buffer.from(expected);

    if (
      receivedBuffer.length !== expectedBuffer.length ||
      !timingSafeEqual(receivedBuffer, expectedBuffer)
    ) {
      return NextResponse.json(
        { error: "Firma inválida" },
        { status: 401 }
      );
    }

    const body = JSON.parse(rawBody);
    const supabase = getSupabase();

    for (const entry of body.entry ?? []) {
      for (const change of entry.changes ?? []) {
        const value = change.value ?? {};
        const phoneNumberId = value.metadata?.phone_number_id;

        for (const message of value.messages ?? []) {
          const waId = message.from;

          if (!waId || !phoneNumberId || !message.id) continue;

          const contact = (value.contacts ?? []).find(
            (item: { wa_id?: string }) => item.wa_id === waId
          );

          const displayName = contact?.profile?.name ?? null;

          const { data: conversation, error: conversationError } =
            await supabase
              .from("whatsapp_conversations")
              .upsert(
                {
                  wa_id: waId,
                  phone_number_id: phoneNumberId,
                  display_name: displayName,
                  last_message_at: new Date(
                    Number(message.timestamp ?? Date.now() / 1000) * 1000
                  ).toISOString(),
                  updated_at: new Date().toISOString(),
                },
                { onConflict: "phone_number_id,wa_id" }
              )
              .select("id")
              .single();

          if (conversationError) throw conversationError;

          const audio = message.audio ?? null;

          const content =
            message.text?.body ??
            message.image?.caption ??
            message.video?.caption ??
            message.document?.caption ??
            message.interactive?.button_reply?.title ??
            message.interactive?.list_reply?.title ??
            message.button?.text ??
            null;

          const { data: existing, error: existingError } = await supabase
            .from("whatsapp_messages")
            .select("id")
            .eq("provider_message_id", message.id)
            .maybeSingle();

          if (existingError) throw existingError;
          if (existing) continue;

          const { data: insertedMessage, error: messageError } =
            await supabase
              .from("whatsapp_messages")
              .insert({
                conversation_id: conversation.id,
                provider_message_id: message.id,
                direction: "inbound",
                message_type: message.type ?? "unknown",
                content,
                media_id:
                  audio?.id ??
                  message.image?.id ??
                  message.video?.id ??
                  message.document?.id ??
                  null,
                status: "received",
                metadata: {
                  timestamp: message.timestamp ?? null,
                  audio_mime_type: audio?.mime_type ?? null,
                  audio_voice: audio?.voice ?? null,
                },
              })
              .select("id")
              .single();

          if (messageError) {
            if (messageError.code === "23505") continue;
            throw messageError;
          }

          // Los audios se almacenan, pero todavía no se transcriben.
          // El agente responde por ahora a mensajes que contienen texto.
          if (typeof content !== "string" || !content.trim()) continue;

          try {
            const reply = await generateWhatsAppReply({
              supabase,
              conversationId: conversation.id,
              incomingText: content,
            });

            // Si no hay respuesta, no se envía nada.
            if (!reply) continue;

            // Revalidar el modo justo antes del envío.
            const { data: currentConversation, error: modeError } =
              await supabase
                .from("whatsapp_conversations")
                .select("agent_mode")
                .eq("id", conversation.id)
                .single();

            if (modeError) throw modeError;

            if (
              currentConversation.agent_mode === "paused" ||
              currentConversation.agent_mode === "human"
            ) {
              continue;
            }

            const providerMessageId = await sendWhatsAppText(
              phoneNumberId,
              waId,
              reply
            );

            const { error: outboundError } = await supabase
              .from("whatsapp_messages")
              .insert({
                conversation_id: conversation.id,
                provider_message_id: providerMessageId,
                direction: "outbound",
                message_type: "text",
                content: reply,
                status: "sent",
                metadata: {
                  source: "ai_agent",
                  in_reply_to: message.id,
                },
              });

            if (outboundError) throw outboundError;

            await supabase
              .from("whatsapp_messages")
              .update({ status: "processed" })
              .eq("id", insertedMessage.id);
          } catch (agentError) {
            const errorMessage =
              agentError instanceof Error
                ? agentError.message
                : String(agentError);

            console.error("WhatsApp agent error:", errorMessage);

            await supabase
              .from("whatsapp_messages")
              .update({
                status: "failed",
                error_message: errorMessage.slice(0, 1000),
              })
              .eq("id", insertedMessage.id);
          }
        }
      }
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error("WhatsApp webhook error:", error);

    return NextResponse.json(
      { error: "No se pudo procesar el mensaje" },
      { status: 500 }
    );
  }
}
