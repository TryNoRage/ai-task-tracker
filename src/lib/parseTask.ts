import { openai } from "./openai";

export type Priority = "high" | "medium" | "low";
export type Category = "work" | "personal" | "study" | "other";

export interface ParsedTask {
  title: string;
  priority: Priority;
  category: Category;
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
  "category": "work" | "personal" | "study" | "other",
  "deadline": string | null
}

Правила:
- title: коротка чиста назва задачі без слів типу "терміново", "завтра", "до обіду", "ASAP". Зберігай мову користувача.
- priority:
  - "high" — якщо є слова "терміново", "ASAP", "urgent", "критично", "негайно", "якнайшвидше"
  - "low" — якщо є слова "колись", "як буде час", "не терміново", "low priority", "whenever"
  - інакше "medium"
- category:
  - "work" — робочі задачі: мітинги, клієнти, звіти, презентації, проєкти, зарплата, deadline робочих процесів, "написати колезі", "коміт", "PR"
  - "study" — навчання: курси, лекції, університет, "вивчити", "прочитати книгу", "домашка", "конспект", "екзамен"
  - "personal" — побут і життя: родина, друзі, "купити", "подзвонити мамі", спорт, здоровʼя, лікар, господарство
  - "other" — якщо не впевнений або задача не вписується в три категорії вище
- deadline: ISO 8601 рядок з часовою зоною Europe/Kyiv (наприклад "2026-04-08T12:00:00+03:00"), або null якщо дедлайн не вказано.

Правила для DEADLINE (відносні дати від "поточного часу"):
- "вчора" / "yesterday" = -1 день
- "позавчора" = -2 дні
- "сьогодні" / "today" = той самий день
- "завтра" / "tomorrow" = +1 день
- "післязавтра" = +2 дні
- "через N днів" / "за N днів" / "in N days" = +N днів
- "через тиждень" / "за тиждень" / "in a week" = +7 днів
- "наступного тижня" = +7 днів
- "в понеділок" / "у вівторок" / ... = найближчий цей день тижня (якщо сьогодні вже той — НАСТУПНИЙ)
- "наступного понеділка" = +7 днів від найближчого понеділка
- Конкретна дата "01.05" / "1 травня" / "1 May" = у поточному році; якщо ця дата вже минула цього року — у наступному році
- Час доби: "до ранку" / "вранці" = 09:00, "до обіду" / "вдень" = 12:00, "до вечора" / "ввечері" = 18:00, "до ночі" / "вночі" = 22:00
- Якщо вказана тільки дата без часу — ставимо 23:59 того дня
- Якщо вказаний тільки час без дати ("до 9:00") — це сьогодні; нічого додатково не робити, навіть якщо час уже минув
- Минулі дедлайни ДОЗВОЛЕНІ (наприклад "звіт вчора" → дедлайн був вчора 23:59 — задача буде overdue, це нормально)
- Якщо deadline не вказаний явно — null

Приклади (припустимо, поточний час "2026-05-02 14:00 +03:00"):
- "Здати звіт вчора" → { "title": "Здати звіт", "priority": "medium", "category": "work", "deadline": "2026-05-01T23:59:00+03:00" }
- "Купити молоко за 3 дні" → { "title": "Купити молоко", "priority": "medium", "category": "personal", "deadline": "2026-05-05T23:59:00+03:00" }
- "Написати листа до 9 ранку післязавтра" → { "title": "Написати листа", "priority": "medium", "category": "work", "deadline": "2026-05-04T09:00:00+03:00" }
- "Прибрати в кімнаті позавчора" → { "title": "Прибрати в кімнаті", "priority": "medium", "category": "personal", "deadline": "2026-04-30T23:59:00+03:00" }
- "Зустріч 1 травня" → { "title": "Зустріч", "priority": "medium", "category": "personal", "deadline": "2027-05-01T23:59:00+03:00" }
- "Подзвонити мамі" → { "title": "Подзвонити мамі", "priority": "medium", "category": "personal", "deadline": null }

Поточний час: ${todayHuman} (Europe/Kyiv).
ISO зараз: ${todayIso}`;
}

interface RawParsed {
  title?: unknown;
  priority?: unknown;
  category?: unknown;
  deadline?: unknown;
}

function normalizePriority(value: unknown): Priority {
  if (value === "high" || value === "medium" || value === "low") return value;
  return "medium";
}

function normalizeCategory(value: unknown): Category {
  if (
    value === "work" ||
    value === "personal" ||
    value === "study" ||
    value === "other"
  ) {
    return value;
  }
  return "other";
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
    category: "other",
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
      category: normalizeCategory(parsed.category),
      deadline: normalizeDeadline(parsed.deadline),
    };
  } catch (err) {
    console.error("[parseTask] OpenAI parse failed:", err);
    return fallbackParse(trimmed);
  }
}
