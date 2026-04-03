const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || "http://localhost:3001";

async function parseErrorResponse(res: Response, fallback: string) {
  try {
    const payload = await res.json();
    return payload.error || fallback;
  } catch {
    return fallback;
  }
}

export function getBackendUrl() {
  return BACKEND_URL;
}

export async function postJson<TResponse>(path: string, body: unknown, fallbackError: string): Promise<TResponse> {
  try {
    const res = await fetch(`${BACKEND_URL}${path}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      throw new Error(await parseErrorResponse(res, fallbackError));
    }

    return res.json() as Promise<TResponse>;
  } catch (error) {
    if (error instanceof Error) {
      throw error;
    }

    throw new Error(fallbackError);
  }
}
