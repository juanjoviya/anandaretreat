import OpenAI from "openai";

const apiKey = import.meta.env.VITE_OPENAI_API_KEY as string;

const client = new OpenAI({ apiKey, dangerouslyAllowBrowser: true });

export async function complete(messages: { role: "user" | "assistant"; content: string }[]): Promise<{ response: string }> {
  const res = await client.chat.completions.create({
    model: "gpt-4o-mini",
    messages,
  });
  return { response: res.choices[0].message.content ?? "" };
}
