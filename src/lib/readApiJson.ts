/** Safari throws "The string did not match the expected pattern" on res.json() for non-JSON. */
export async function readApiJson<T = Record<string, unknown>>(
  response: Response
): Promise<T> {
  const text = await response.text();
  if (!text.trim()) {
    throw new Error(
      response.ok
        ? "Empty response from server"
        : `Request failed (${response.status})`
    );
  }

  try {
    return JSON.parse(text) as T;
  } catch {
    throw new Error(
      `Request failed (${response.status}). Check API keys on Vercel and try again.`
    );
  }
}
