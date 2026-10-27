export function ok<T>(data: T, init?: ResponseInit) {
  return Response.json(data, init);
}

export function fail(message: string, status = 400) {
  return Response.json({ error: message }, { status });
}

export async function jsonBody<T>(request: Request): Promise<T> {
  try {
    return (await request.json()) as T;
  } catch {
    return {} as T;
  }
}

export function isAbortError(error: unknown) {
  if (!error) return false;
  if (error instanceof DOMException && error.name === "AbortError") return true;
  const message = error instanceof Error ? `${error.name} ${error.message}` : String(error);
  return /abort/i.test(message);
}
