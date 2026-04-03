import OpenAI from "openai";

/**
 * AI fallback when extraction from aiAnswer finds no example.
 */
export async function generateVocabularyExample(params: {
  term: string;
  language: string;
  summaryZh?: string;
  summaryEn?: string;
  aiAnswer?: string;
}): Promise<{ sentence: string; translation: string } | null> {
  if (!process.env.OPENAI_API_KEY) return null;

  const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  const model = process.env.OPENAI_MODEL_DEFAULT || "gpt-4.1-mini";

  const term = params.term.slice(0, 80);
  const language = params.language.slice(0, 30);
  const context = (params.summaryZh || params.summaryEn || params.aiAnswer || "").slice(0, 400);

  const messages: OpenAI.Chat.Completions.ChatCompletionMessageParam[] = [
    {
      role: "system",
      content: `Generate exactly one short natural example sentence in ${language} using the vocabulary word, and its Chinese translation.
Return JSON only: { "exampleSentence": "...", "exampleTranslation": "..." }
Keep sentence under 15 words. Output valid JSON only.`
    },
    { role: "user", content: `Word: ${term}\nContext: ${context}` }
  ];

  try {
    const completion = await openai.chat.completions.create({
      model,
      max_completion_tokens: 120,
      response_format: { type: "json_object" },
      messages
    });
    const text = completion.choices[0]?.message?.content || "";
    const parsed = JSON.parse(text) as { exampleSentence?: string; exampleTranslation?: string };
    const sentence = String(parsed.exampleSentence || "").trim();
    const translation = String(parsed.exampleTranslation || "").trim();
    if (sentence.length >= 2 && translation.length >= 2) {
      return { sentence, translation };
    }
  } catch {
    // ignore
  }
  return null;
}
