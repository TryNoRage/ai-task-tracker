# AI Таск-Трекер

Особистий таск-трекер з одним полем вводу. Пиши задачу природньою мовою — AI сам розбирає назву, пріоритет і дедлайн.

> Приклад: `"завтра написати Славі про відео до обіду, терміново"`
> →  Назва: "Написати Славі про відео" · Пріоритет: 🔴 high · Дедлайн: завтра 12:00

## Стек

- **Next.js 16** (App Router) + **TypeScript**
- **Tailwind CSS v4**
- **Prisma 6** + **Neon Postgres**
- **OpenAI** (`gpt-4o-mini`) — JSON-mode для парсингу задач
- Деплой на **Vercel**

## Локальний запуск

### 1. Встанови залежності

```bash
npm install
```

### 2. Налаштуй `.env.local`

Скопіюй `.env.example` у `.env.local` і встав свої значення:

```bash
cp .env.example .env.local
```

```ini
# Neon Postgres (з Vercel → Storage → Connect)
DATABASE_URL="postgresql://...@...-pooler.../neondb?sslmode=require"
DIRECT_URL="postgresql://...@.../neondb?sslmode=require"

# OpenAI ключ (від організаторів воркшопу або власний)
OPENAI_API_KEY="sk-..."
```

> `DATABASE_URL` — пулерний URL (для рантайму), `DIRECT_URL` — прямий (для міграцій). На Neon це той самий хост, тільки без `-pooler` у назві.

### 3. Застосуй міграції

```bash
npm run db:migrate
```

(Команда обгорнута у `dotenv-cli`, щоб читати `.env.local`.)

### 4. Запусти dev-сервер

```bash
npm run dev
```

Відкрий [http://localhost:3000](http://localhost:3000).

## Деплой на Vercel

1. Запушив репозиторій на GitHub.
2. На [vercel.com](https://vercel.com) натисни **New Project** → імпортуй репо.
3. У **Settings → Environment Variables** додай ті самі дві (три) змінні: `DATABASE_URL`, `DIRECT_URL`, `OPENAI_API_KEY`.
4. У **Storage → Create Database → Neon** можеш приконнектити Neon одним кліком — Vercel сам додасть `DATABASE_URL` і `DIRECT_URL`. У такому випадку імпорти просто прив’язуй до вже існуючого Neon-проєкту.
5. Натисни **Deploy**.

Vercel запускає `prisma generate` автоматично через `postinstall`, а `next build` запустить ще раз через скрипт `build`. Міграції на проді запускай локально (`npm run db:migrate`) або через `prisma migrate deploy` як окремий крок CI.

## Структура

```
prisma/
  schema.prisma            # Task model
  migrations/              # versioned SQL
src/
  app/
    api/tasks/route.ts     # GET (list), POST (create + AI parse)
    api/tasks/[id]/route.ts# PATCH (toggle done), DELETE
    layout.tsx
    page.tsx               # server component: hero + TaskBoard
    globals.css
  components/
    TaskBoard.tsx          # client state, optimistic updates
    TaskInput.tsx          # one big text field + Add
    TaskCard.tsx           # checkbox · title · priority · deadline · delete
  lib/
    prisma.ts              # singleton client (Vercel-safe)
    openai.ts              # OpenAI client
    parseTask.ts           # системний промпт + JSON mode
    format.ts              # формат дедлайну укр. локаллю
    types.ts
```

## Скрипти

| Команда | Що робить |
|---|---|
| `npm run dev` | Локальний Next.js dev-сервер |
| `npm run build` | `prisma generate` + `next build` |
| `npm run start` | Прод-сервер (після build) |
| `npm run lint` | ESLint |
| `npm run db:migrate` | `prisma migrate dev` із `.env.local` |
| `npm run db:push` | Швидкий `prisma db push` без міграцій |
| `npm run db:studio` | Prisma Studio |
| `npm run db:deploy` | `prisma migrate deploy` для CI/прод |

## Поза скоупом MVP

- Авторизація / мульти-користувачі (продукт особистий)
- Редагування полів задачі вручну
- Фільтри, теги, повторювані задачі
- Push-нагадування
