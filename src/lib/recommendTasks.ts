import { openai } from "./openai";

const MODEL = "gpt-4o-mini";
const MAX_PICKS = 3;

export interface RecommendInput {
  id: string;
  title: string;
  priority: string;
  deadline: Date | null;
  createdAt: Date;
}

export interface Recommendation {
  id: string;
  reason: string;
}

const PRIORITY_RANK: Record<string, number> = { high: 0, medium: 1, low: 2 };

function fallbackPick(tasks: RecommendInput[]): Recommendation[] {
  const now = Date.now();
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

  return sorted.slice(0, MAX_PICKS).map((t) => ({
    id: t.id,
    reason: buildFallbackReason(t, now),
  }));
}

function buildFallbackReason(t: RecommendInput, now: number): string {
  if (t.deadline) {
    const ms = t.deadline.getTime() - now;
    if (ms < 0) return "Прострочено — закривай у першу чергу.";
    const hours = Math.round(ms / (1000 * 60 * 60));
    if (hours <= 24) return `Дедлайн менш ніж за ${hours} год — варто встигнути сьогодні.`;
    const days = Math.round(hours / 24);
    return `Дедлайн через ${days} дн — раніше почнеш, спокійніше зробиш.`;
  }
  if (t.priority === "high") return "Високий пріоритет без дедлайну — закрий поки памʼятаєш.";
  if (t.priority === "low") return "Низький пріоритет, але швидка — можна закрити між справами.";
  return "Чекає у списку — зроби сьогодні щоб не накопичувалось.";
}

function buildSystemPrompt(now: Date): string {
  const human = new Intl.DateTimeFormat("uk-UA", {
    timeZone: "Europe/Kyiv",
    weekday: "long",
    day: "numeric",
    month: "long",
    hour: "2-digit",
    minute: "2-digit",
  }).format(now);

  return `Ти — секретар-планувальник. Користувач показує список своїх АКТИВНИХ задач. Вибери ТОП-${MAX_PICKS} які варто робити САМЕ ЗАРАЗ або сьогодні.

Поверни СТРОГО валідний JSON:
{
  "recommendations": [
    { "id": "<id з вхідного списку>", "reason": "<коротке пояснення українською>" }
  ]
}

Правила пріоритезації (у порядку важливості):
1. Прострочені дедлайни — у першу чергу
2. Дедлайн сьогодні / завтра
3. Високий пріоритет
4. Решта

Правила для reason:
- Українською мовою, дружньо, у 2-й особі ("закрий", "встигни", "почни")
- 1 речення, 12-25 слів
- Конкретно посилайся на дедлайн або пріоритет ("прострочено годину тому", "дедлайн сьогодні", "high priority")
- НЕ повторюй назву задачі дослівно

Обмеження:
- Не вигадуй id — використовуй ТІЛЬКИ ті що є у вхідному списку
- Якщо активних задач менше ${MAX_PICKS} — повертай скільки є
- recommendations має бути масивом, навіть з одним елементом

Поточний час: ${human} (Europe/Kyiv).`;
}

interface RawOutput {
  recommendations?: unknown;
}

interface RawRec {
  id?: unknown;
  reason?: unknown;
}

function parseRecommendations(raw: unknown, validIds: Set<string>): Recommendation[] {
  if (typeof raw !== "object" || raw === null) return [];
  const recs = (raw as RawOutput).recommendations;
  if (!Array.isArray(recs)) return [];

  const seen = new Set<string>();
  const out: Recommendation[] = [];
  for (const item of recs) {
    if (typeof item !== "object" || item === null) continue;
    const r = item as RawRec;
    if (typeof r.id !== "string" || typeof r.reason !== "string") continue;
    if (!validIds.has(r.id) || seen.has(r.id)) continue;
    const reason = r.reason.trim();
    if (reason.length === 0) continue;
    seen.add(r.id);
    out.push({ id: r.id, reason });
    if (out.length >= MAX_PICKS) break;
  }
  return out;
}

export async function recommendTasks(
  active: RecommendInput[]
): Promise<Recommendation[]> {
  if (active.length === 0) return [];

  if (!process.env.OPENAI_API_KEY) {
    return fallbackPick(active);
  }

  const validIds = new Set(active.map((t) => t.id));

  const userPayload = {
    now: new Date().toISOString(),
    tasks: active.map((t) => ({
      id: t.id,
      title: t.title,
      priority: t.priority,
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
    if (!content) return fallbackPick(active);

    const parsed = JSON.parse(content);
    const recs = parseRecommendations(parsed, validIds);
    if (recs.length === 0) return fallbackPick(active);
    return recs;
  } catch (err) {
    console.error("[recommendTasks] OpenAI failed:", err);
    return fallbackPick(active);
  }
}
