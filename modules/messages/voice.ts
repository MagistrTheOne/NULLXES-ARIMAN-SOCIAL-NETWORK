import type { InferSelectModel } from "drizzle-orm";
import OpenAI, { toFile } from "openai";
import { db } from "@/lib/db";
import { messages } from "@/lib/db/schema";
import { assertMember } from "@/modules/messages/service";
import { resolveMentionsFromPlaintext } from "@/modules/messages/mentions-resolve";

const MAX_VOICE_BYTES = 8 * 1024 * 1024;

export type MessageRecord = InferSelectModel<typeof messages>;

export async function createVoiceMessageFromUpload(args: {
  userId: string;
  conversationId: string;
  file: Blob;
}): Promise<{ conversationId: string; message: MessageRecord }> {
  if (!process.env.OPENAI_API_KEY) {
    throw new Error("OPENAI_API_KEY_MISSING");
  }

  const member = await assertMember(args.userId, args.conversationId);
  if (!member) throw new Error("NOT_MEMBER");

  const buf = Buffer.from(await args.file.arrayBuffer());
  if (buf.length === 0) throw new Error("EMPTY_AUDIO");
  if (buf.length > MAX_VOICE_BYTES) throw new Error("VOICE_TOO_LARGE");

  const mime = args.file.type || "audio/webm";
  const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  const uploadable = await toFile(buf, "voice.webm", { type: mime });
  const tr = await client.audio.transcriptions.create({
    file: uploadable,
    model: "whisper-1",
  });
  const transcript = (tr.text ?? "").trim();
  if (!transcript) throw new Error("WHISPER_EMPTY");

  const b64 = buf.toString("base64");
  const mentionRows = await resolveMentionsFromPlaintext(transcript);

  const [msg] = await db
    .insert(messages)
    .values({
      conversationId: args.conversationId,
      senderUserId: args.userId,
      senderType: "user",
      messageType: "voice",
      body: transcript,
      transcript,
      voiceMimeType: mime,
      voiceAudioBase64: b64,
      mentions: mentionRows.length ? mentionRows : null,
      ciphertext: null,
      senderPublicKey: null,
      encryptionVersion: 0,
    })
    .returning();

  if (!msg) throw new Error("MESSAGE_INSERT_FAILED");
  return { conversationId: args.conversationId, message: msg };
}
