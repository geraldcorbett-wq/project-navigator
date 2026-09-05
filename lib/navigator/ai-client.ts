const NAVIGATOR_AI_ENDPOINT = "https://api.openai.com/v1/responses";
export type NavigatorAIResponse = {
  output_text?: string;
  output?: Array<{ content?: Array<{ type?: string; text?: string }> }>;
  usage?: { input_tokens?: number; output_tokens?: number; total_tokens?: number };
  error?: { message?: string };
};
export async function callNavigatorAI(apiKey: string, payload: Record<string, unknown>) {
  return fetch(NAVIGATOR_AI_ENDPOINT, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify(payload), cache: "no-store", signal: AbortSignal.timeout(60000)
  });
}
