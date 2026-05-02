import { openai } from "./openai";

export type Priority = "high" | "medium" | "low";

export interface ParsedTask {
  title: string;
  priority: Priority;
  deadline: Date | null;
}

const MODEL = "gpt-4o-mini";

function buildSystemPrompt(now: Date): string {
  const formatter = new Intl.DateTimeFormat("uk-UA", {
    timeZone: "Europe/Kyiv",
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
  const todayHuman = formatter.format(now);
  const todayIso = now.toISOString();

  return `Ти — парсер задач. Користувач пише задачу природньою мовою (українська або англійська).

Поверни СТРОГО валідний JSON у такому форматі:
{
  "title": string,
  "priority": "high" | "medium" | "low",
  "deadline": string | null
}

Правила:
- title: коротка чиста назва задачі без слів типу "терміново", "завтра", "до обіду", "ASAP". Зберігай мову користувача.
- priority:
  - "high" — якщо є слова "терміново", "ASAP", "urgent", "критично", "негайно", "якнайшвидше"
  - "low" — якщо є слова "колись", "як буде час", "не терміново", "low priority", "whenever"
  - інакше "medium"
- deadline: ISO 8601 рядок з часовою зоною Europe/Kyiv (наприклад "2026-04-08T12:00:00+03:00"), або null якщо дедлайн не вказано.
- Відносні дати: "завтра" = +1 день, "післязавтра" = +2 дні, "в понеділок" = найближчий понеділок (якщо сьогодні вже понеділок — наступний).
- Час доби: "до ранку" = 09:00, "до обіду" = 12:00, "до вечора" = 18:00, "до ночі" = 22:00. Якщо тільки дата без часу — 23:59 того дня.
- Якщо deadline не вказаний явно — null.

Поточний час: ${todayHuman} (Europe/Kyiv).
ISO зараз: ${todayIso}`;
}

interface RawParsed {
  title?: unknown;
  priority?: unknown;
  deadline?: unknown;
}

function normalizePriority(value: unknown): Priority {
  if (value === "high" || value === "medium" || value === "low") return value;
  return "medium";
}

function normalizeDeadline(value: unknown): Date | null {
  if (typeof value !== "string" || value.length === 0) return null;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
}

function fallbackParse(rawInput: string): ParsedTask {
  return {
    title: rawInput.trim().slice(0, 200) || "Без назви",
    priority: "medium",
    deadline: null,
  };
}

export async function parseTask(rawInput: string): Promise<ParsedTask> {
  const trimmed = rawInput.trim();
  if (!trimmed) {
    throw new Error("Порожній текст задачі");
  }

  if (!process.env.OPENAI_API_KEY) {
    return fallbackParse(trimmed);
  }

  try {
    const completion = await openai.chat.completions.create({
      model: MODEL,
      temperature: 0,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: buildSystemPrompt(new Date()) },
        { role: "user", content: trimmed },
      ],
    });

    const content = completion.choices[0]?.message?.content;
    if (!content) return fallbackParse(trimmed);

    const parsed = JSON.parse(content) as RawParsed;
    const title =
      typeof parsed.title === "string" && parsed.title.trim().length > 0
        ? parsed.title.trim()
        : trimmed;

    return {
      title,
      priority: normalizePriority(parsed.priority),
      deadline: normalizeDeadline(parsed.deadline),
    };
  } catch (err) {
    console.error("[parseTask] OpenAI parse failed:", err);
    return fallbackParse(trimmed);
  }
}
