import { openai } from "./openai";

const MODEL = "gpt-4o-mini";
const MAX_TOTAL = 8;

export type Slot = "morning" | "day" | "evening";

export interface DigestInput {
  id: string;
  title: string;
  priority: string;
  category: string;
  deadline: Date | null;
  createdAt: Date;
}

export interface DigestItem {
  id: string;
  reason: string;
}

export interface Digest {
  morning: DigestItem[];
  day: DigestItem[];
  evening: DigestItem[];
  summary: string;
}

const PRIORITY_RANK: Record<string, number> = { high: 0, medium: 1, low: 2 };

function buildSystemPrompt(now: Date): string {
  const human = new Intl.DateTimeFormat("uk-UA", {
    timeZone: "Europe/Kyiv",
    weekday: "long",
    day: "numeric",
    month: "long",
    hour: "2-digit",
    minute: "2-digit",
  }).format(now);

  return `Ти — секретар-планувальник. Користувач показує АКТИВНІ задачі. Склади план на СЬОГОДНІ, розподіливши задачі по 3 слотах дня:
- "morning" — ранок (до 12:00). Сюди ставимо прострочене, дедлайни сьогодні зранку, важливі справи що краще робити зі свіжою головою.
- "day" — день (12:00–18:00). Сюди ставимо більшість робочих дедлайнів сьогодні/завтра, високий пріоритет без чіткого часу.
- "evening" — вечір (після 18:00). Сюди ставимо легкі/особисті задачі, низький пріоритет, "як буде час".

Поверни СТРОГО валідний JSON:
{
  "morning": [{ "id": "<id>", "reason": "<коротке пояснення>" }, ...],
  "day": [...],
  "evening": [...],
  "summary": "<1 речення з настановою на день, 10-20 слів>"
}

Правила:
- Використовуй ТІЛЬКИ id з вхідного списку, не вигадуй
- Загалом не більше ${MAX_TOTAL} задач у всіх слотах разом — зайве просто пропускай
- Слот може бути порожнім масивом
- reason: 12-25 слів українською, у 2-й особі ("закрий", "почни", "встигни"), посилайся на дедлайн / пріоритет / категорію
- summary — мотивуюча настанова, без води
- Прострочені задачі ОБОВʼЯЗКОВО потрапляють у "morning"

Поточний час: ${human} (Europe/Kyiv).`;
}

interface RawOutput {
  morning?: unknown;
  day?: unknown;
  evening?: unknown;
  summary?: unknown;
}

interface RawItem {
  id?: unknown;
  reason?: unknown;
}

function parseSlot(
  raw: unknown,
  validIds: Set<string>,
  seen: Set<string>,
  remaining: { count: number }
): DigestItem[] {
  if (!Array.isArray(raw)) return [];
  const out: DigestItem[] = [];
  for (const item of raw) {
    if (remaining.count <= 0) break;
    if (typeof item !== "object" || item === null) continue;
    const r = item as RawItem;
    if (typeof r.id !== "string" || typeof r.reason !== "string") continue;
    if (!validIds.has(r.id) || seen.has(r.id)) continue;
    const reason = r.reason.trim();
    if (reason.length === 0) continue;
    seen.add(r.id);
    out.push({ id: r.id, reason });
    remaining.count -= 1;
  }
  return out;
}

function parseDigest(raw: unknown, validIds: Set<string>): Digest | null {
  if (typeof raw !== "object" || raw === null) return null;
  const data = raw as RawOutput;

  const seen = new Set<string>();
  const remaining = { count: MAX_TOTAL };

  const morning = parseSlot(data.morning, validIds, seen, remaining);
  const day = parseSlot(data.day, validIds, seen, remaining);
  const evening = parseSlot(data.evening, validIds, seen, remaining);

  const summary =
    typeof data.summary === "string" && data.summary.trim().length > 0
      ? data.summary.trim()
      : "Почни з ранку — менше прокрастинації.";

  if (morning.length + day.length + evening.length === 0) return null;

  return { morning, day, evening, summary };
}

function fallbackDigest(tasks: DigestInput[]): Digest {
  const now = Date.now();
  const startOfToday = startOfDayKyiv(new Date(now));
  const endOfToday = startOfToday + 24 * 60 * 60 * 1000;

  const sorted = [...tasks].sort((a, b) => {
    const aOver = a.deadline && a.deadline.getTime() < now ? 0 : 1;
    const bOver = b.deadline && b.deadline.getTime() < now ? 0 : 1;
    if (aOver !== bOver) return aOver - bOver;
    const ad = a.deadline?.getTime() ?? Number.POSITIVE_INFINITY;
    const bd = b.deadline?.getTime() ?? Number.POSITIVE_INFINITY;
    if (ad !== bd) return ad - bd;
    const ap = PRIORITY_RANK[a.priority] ?? 1;
    const bp = PRIORITY_RANK[b.priority] ?? 1;
    if (ap !== bp) return ap - bp;
    return b.createdAt.getTime() - a.createdAt.getTime();
  });

  const morning: DigestItem[] = [];
  const day: DigestItem[] = [];
  const evening: DigestItem[] = [];

  for (const t of sorted) {
    if (morning.length + day.length + evening.length >= MAX_TOTAL) break;
    const reason = buildFallbackReason(t, now);
    const dl = t.deadline?.getTime() ?? null;

    if (dl !== null && dl < now) {
      morning.push({ id: t.id, reason });
      continue;
    }
    if (dl !== null && dl >= startOfToday && dl < endOfToday) {
      const hour = new Date(dl).getHours();
      if (hour < 12) morning.push({ id: t.id, reason });
      else if (hour < 18) day.push({ id: t.id, reason });
      else evening.push({ id: t.id, reason });
      continue;
    }
    if (t.priority === "high") {
      day.push({ id: t.id, reason });
      continue;
    }
    if (t.priority === "low" && !dl) {
      evening.push({ id: t.id, reason });
      continue;
    }
    day.push({ id: t.id, reason });
  }

  return {
    morning,
    day,
    evening,
    summary: "Почни з ранку — менше прокрастинації.",
  };
}

function buildFallbackReason(t: DigestInput, now: number): string {
  if (t.deadline) {
    const ms = t.deadline.getTime() - now;
    if (ms < 0) return "Прострочено — закривай у першу чергу.";
    const hours = Math.round(ms / (1000 * 60 * 60));
    if (hours <= 24) return `Дедлайн менш ніж за ${hours} год — встигни сьогодні.`;
    const days = Math.round(hours / 24);
    return `Дедлайн через ${days} дн — почни раніше, щоб не горіло.`;
  }
  if (t.priority === "high") return "Високий пріоритет без дедлайну — закрий поки памʼятаєш.";
  if (t.priority === "low") return "Низький пріоритет — можна між справами.";
  return "Чекає у списку — зроби, щоб не накопичувалось.";
}

function startOfDayKyiv(d: Date): number {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Kyiv",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(d);
  const y = parts.find((p) => p.type === "year")?.value;
  const m = parts.find((p) => p.type === "month")?.value;
  const day = parts.find((p) => p.type === "day")?.value;
  return new Date(`${y}-${m}-${day}T00:00:00+03:00`).getTime();
}

export async function buildDailyDigest(
  active: DigestInput[]
): Promise<Digest> {
  if (active.length === 0) {
    return { morning: [], day: [], evening: [], summary: "" };
  }

  if (!process.env.OPENAI_API_KEY) {
    return fallbackDigest(active);
  }

  const validIds = new Set(active.map((t) => t.id));
  const userPayload = {
    now: new Date().toISOString(),
    tasks: active.map((t) => ({
      id: t.id,
      title: t.title,
      priority: t.priority,
      category: t.category,
      deadline: t.deadline ? t.deadline.toISOString() : null,
    })),
  };

  try {
    const completion = await openai.chat.completions.create({
      model: MODEL,
      temperature: 0.2,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: buildSystemPrompt(new Date()) },
        { role: "user", content: JSON.stringify(userPayload) },
      ],
    });

    const content = completion.choices[0]?.message?.content;
    if (!content) return fallbackDigest(active);

    const parsed = JSON.parse(content);
    const digest = parseDigest(parsed, validIds);
    if (!digest) return fallbackDigest(active);
    return digest;
  } catch (err) {
    console.error("[buildDailyDigest] OpenAI failed:", err);
    return fallbackDigest(active);
  }
}
