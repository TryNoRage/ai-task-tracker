import OpenAI from "openai";

if (!process.env.OPENAI_API_KEY) {
  console.warn(
    "[openai] OPENAI_API_KEY is not set — task parsing will fall back to plain text."
  );
}

export const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});
