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

function sanitizeTranscript(raw: string): string {
  const trimmed = raw.trim();
  if (!trimmed) return "";
  if (HALLUCINATIONS.has(trimmed.toLowerCase())) return "";
  return trimmed;
}

export async function POST(req: Request) {
  const auth = await requireApiUser(req);
  if (!auth.ok) return auth.response;

  if (!process.env.OPENAI_API_KEY) {
    return NextResponse.json(
      { error: "Транскрипція недоступна: відсутній OPENAI_API_KEY" },
      { status: 503 }
    );
  }

  let formData: FormData;
  try {
    formData = await req.formData();
  } catch {
    return NextResponse.json(
      { error: "Очікується multipart/form-data" },
      { status: 400 }
    );
  }

  const file = formData.get("audio");
  if (!(file instanceof File)) {
    return NextResponse.json(
      { error: "Поле 'audio' обовʼязкове" },
      { status: 400 }
    );
  }
  if (file.size === 0) {
    return NextResponse.json({ error: "Порожній аудіо-файл" }, { status: 400 });
  }
  if (file.size > MAX_BYTES) {
    return NextResponse.json(
      { error: "Файл задовгий (>25MB)" },
      { status: 413 }
    );
  }

  try {
    const tr = await openai.audio.transcriptions.create({
      file,
      model: MODEL,
      language: LANGUAGE,
      prompt: PROMPT,
      temperature: 0,
      response_format: "json",
    });

    const raw = tr.text ?? "";
    const cleaned = sanitizeTranscript(raw);
    console.log(
      `[transcribe] mime=${file.type} size=${file.size}B raw=${JSON.stringify(
        raw
      )} cleaned=${JSON.stringify(cleaned)}`
    );

    return NextResponse.json({ text: cleaned });
  } catch (err) {
    console.error("[POST /api/transcribe]", err);
    return NextResponse.json(
      { error: "Не вдалося розпізнати голос" },
      { status: 500 }
    );
  }
}
