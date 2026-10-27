export type SseEvent = {
  event: string;
  data: unknown;
};

/**
 * Minimal SSE reader for POST-based streams (EventSource cannot POST).
 * Frames are separated by blank lines; `data:` lines are joined with \n.
 */
export async function readSse(
  response: Response,
  onEvent: (event: string, data: unknown) => void,
): Promise<void> {
  const body = response.body;
  if (!body) throw new Error("响应没有内容");

  const reader = body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  const flushFrame = (raw: string) => {
    let event = "message";
    const dataLines: string[] = [];
    for (const line of raw.split(/\r?\n/)) {
      if (!line || line.startsWith(":")) continue;
      if (line.startsWith("event:")) {
        event = line.slice(6).trim();
      } else if (line.startsWith("data:")) {
        dataLines.push(line.slice(5).replace(/^ /, ""));
      }
    }
    if (!dataLines.length) return;
    const rawData = dataLines.join("\n");
    let data: unknown = rawData;
    try {
      data = JSON.parse(rawData);
    } catch {
      // keep as string
    }
    onEvent(event, data);
  };

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      let match = /\r?\n\r?\n/.exec(buffer);
      while (match) {
        const frame = buffer.slice(0, match.index);
        buffer = buffer.slice(match.index + match[0].length);
        flushFrame(frame);
        match = /\r?\n\r?\n/.exec(buffer);
      }
    }
    if (buffer.trim()) flushFrame(buffer);
  } finally {
    reader.releaseLock();
  }
}
