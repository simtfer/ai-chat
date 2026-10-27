import type { StreamChunk, Usage } from "./types";

/**
 * Parses an OpenAI-compatible SSE body. Handles \n\n and \r\n\r\n frame
 * separators, multi-line data fields, and the [DONE] sentinel.
 */
export async function* iterateOpenAIStream(
  body: ReadableStream<Uint8Array>,
): AsyncGenerator<StreamChunk> {
  const reader = body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let usage: Usage | undefined;

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });

      let match = /\r?\n\r?\n/.exec(buffer);
      while (match) {
        const frame = buffer.slice(0, match.index);
        buffer = buffer.slice(match.index + match[0].length);
        const dataLines: string[] = [];
        for (const line of frame.split(/\r?\n/)) {
          if (!line || line.startsWith(":")) continue;
          if (line.startsWith("data:")) {
            dataLines.push(line.slice(5).replace(/^ /, ""));
          }
        }
        if (dataLines.length) {
          const data = dataLines.join("\n").trim();
          if (data === "[DONE]") return;
          try {
            const parsed = JSON.parse(data) as {
              choices?: Array<{ delta?: { content?: string | null }; message?: { content?: string | null } }>;
              usage?: { prompt_tokens?: number; completion_tokens?: number };
            };
            if (parsed.usage) {
              usage = {
                promptTokens: parsed.usage.prompt_tokens,
                completionTokens: parsed.usage.completion_tokens,
              };
            }
            const choice = parsed.choices?.[0];
            const text = choice?.delta?.content ?? choice?.message?.content ?? "";
            if (text) yield { text };
          } catch {
            // Ignore malformed keep-alive frames.
          }
        }
        match = /\r?\n\r?\n/.exec(buffer);
      }
    }
    if (usage) yield { usage };
  } finally {
    reader.releaseLock();
  }
}
