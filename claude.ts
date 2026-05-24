import Anthropic from "@anthropic-ai/sdk";

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

export async function callClaude({
  prompt,
  model = "claude-3-sonnet-20240229",
  maxTokens = 1000,
}: {
  prompt: string;
  model?: string;
  maxTokens?: number;
}) {
  const response = await anthropic.messages.create({
    model,
    max_tokens: maxTokens,
    messages: [
      {
        role: "user",
        content: prompt,
      },
    ],
  });

  const content = response.content[0];

  if ("text" in content) {
    return content.text;
  }

  return JSON.stringify(response);
}
``