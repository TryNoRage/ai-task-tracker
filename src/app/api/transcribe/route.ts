import { NextResponse } from "next/server";
import { openai } from "@/lib/openai";
import { requireApiUser } from "@/lib/session";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MODEL = "whisper-1";
const LANGUAGE = "uk";
const MAX_BYTES = 25 * 1024 * 1024;

// Whisper prompt має бути в стилі попередньої транскрипції, а не опису.
// Тримаємо коротко — лише задає мову/стиль та кілька доменних слів.
const PROMPT = "Україномовна нотатка-задача: завтра, до обіду, терміново.";

const HALLUCINATIONS = new Set(
  [
    "дякую за перегляд",
    "дякую за перегляд!",
    "дякую за увагу",
    "thanks for watching",
    "thanks for watching!",
    "thank you for watching",
    "thank you.",
    "thank you",
    "subtitles by the amara.org community",
    ".",
    "...",
    "…",
  ].map((s) => s.toLowerCase())
);

function sanitizeTranscript(raw: string): { cleaned: string; reason: string } {
  const trimmed = raw.trim();
  if (!trimmed) return { cleaned: "", reason: "empty" };
  if (HALLUCINATIONS.has(trimmed.toLowerCase())) {
    return { cleaned: "", reason: "hallucination" };
  }
  return { cleaned: trimmed, reason: "ok" };
}

function shortId(): string {
  return Math.random().toString(36).slice(2, 8);
}

function log(rid: string, event: string, fields: Record<string, unknown>): void {
  const parts = Object.entries(fields).map(
    ([k, v]) => `${k}=${typeof v === "string" ? JSON.stringify(v) : String(v)}`
  );
  console.log(`[transcribe rid=${rid}] ${event} ${parts.join(" ")}`);
}

export async function POST(req: Request) {
  const rid = shortId();
  const startedAt = Date.now();

  log(rid, "request.received", {
    contentType: req.headers.get("content-type") ?? "",
    contentLength: req.headers.get("content-length") ?? "",
    userAgent: req.headers.get("user-agent")?.slice(0, 120) ?? "",
  });

  const auth = await requireApiUser(req);
  if (!auth.ok) {
    log(rid, "auth.failed", { elapsedMs: Date.now() - startedAt });
    return auth.response;
  }
  log(rid, "auth.ok", { userId: auth.user.id });

  if (!process.env.OPENAI_API_KEY) {
    log(rid, "config.missing", { key: "OPENAI_API_KEY" });
    return NextResponse.json(
      { error: "Транскрипція недоступна: відсутній OPENAI_API_KEY" },
      { status: 503 }
    );
  }

  let formData: FormData;
  try {
    formData = await req.formData();
  } catch (err) {
    log(rid, "formdata.error", {
      message: err instanceof Error ? err.message : String(err),
    });
    return NextResponse.json(
      { error: "Очікується multipart/form-data" },
      { status: 400 }
    );
  }

  const file = formData.get("audio");
  const metaRaw = formData.get("meta");
  const clientMeta = typeof metaRaw === "string" ? metaRaw : "";

  if (!(file instanceof File)) {
    log(rid, "audio.missing", { metaPresent: clientMeta.length > 0 });
    return NextResponse.json(
      { error: "Поле 'audio' обовʼязкове" },
      { status: 400 }
    );
  }

  // #region agent log
  log(rid, "audio.received", {
    name: file.name,
    type: file.type,
    size: file.size,
    clientMetaLen: clientMeta.length,
    clientMeta: clientMeta.slice(0, 4000),
  });
  // #endregion

  if (file.size === 0) {
    log(rid, "audio.empty", {});
    return NextResponse.json({ error: "Порожній аудіо-файл" }, { status: 400 });
  }
  if (file.size > MAX_BYTES) {
    log(rid, "audio.too_large", { max: MAX_BYTES });
    return NextResponse.json(
      { error: "Файл задовгий (>25MB)" },
      { status: 413 }
    );
  }

  log(rid, "whisper.start", {
    model: MODEL,
    language: LANGUAGE,
    promptLen: PROMPT.length,
    fileSize: file.size,
  });
  const whisperStartedAt = Date.now();

  try {
    const tr = await openai.audio.transcriptions.create({
      file,
      model: MODEL,
      language: LANGUAGE,
      prompt: PROMPT,
      temperature: 0,
      response_format: "json",
    });

    const whisperMs = Date.now() - whisperStartedAt;
    const raw = tr.text ?? "";
    const { cleaned, reason } = sanitizeTranscript(raw);

    log(rid, "whisper.done", {
      latencyMs: whisperMs,
      rawLen: raw.length,
      raw,
      cleanedLen: cleaned.length,
      sanitize: reason,
      totalMs: Date.now() - startedAt,
    });

    return NextResponse.json({ text: cleaned });
  } catch (err) {
    const whisperMs = Date.now() - whisperStartedAt;
    const message = err instanceof Error ? err.message : String(err);
    const stack = err instanceof Error ? err.stack ?? "" : "";
    log(rid, "whisper.error", {
      latencyMs: whisperMs,
      message,
      stack: stack.split("\n").slice(0, 5).join(" | "),
      totalMs: Date.now() - startedAt,
    });
    return NextResponse.json(
      { error: "Не вдалося розпізнати голос" },
      { status: 500 }
    );
  }
}
