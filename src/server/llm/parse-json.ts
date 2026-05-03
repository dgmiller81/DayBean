/**
 * Robust JSON extractor for LLM text outputs that don't reliably honor
 * "output JSON only" instructions. Tries, in order:
 *   1. JSON.parse(text) — happy path
 *   2. Strip ```json ... ``` or ``` ... ``` markdown fences and retry
 *   3. Extract the first balanced {…} block and retry
 *
 * Throws with a clean message if all three fail.
 */
export function parseLlmJson(raw: string): unknown {
  // 1. Direct parse
  try {
    return JSON.parse(raw);
  } catch {
    /* fall through */
  }

  // 2. Strip ```json fences
  const fenced = raw.match(/```(?:json)?\s*\n?([\s\S]*?)\n?```/i);
  if (fenced) {
    try {
      return JSON.parse(fenced[1].trim());
    } catch {
      /* fall through */
    }
  }

  // 3. Find the outermost balanced object
  const start = raw.indexOf("{");
  const end = raw.lastIndexOf("}");
  if (start >= 0 && end > start) {
    const candidate = raw.slice(start, end + 1);
    try {
      return JSON.parse(candidate);
    } catch {
      /* fall through */
    }
  }

  throw new Error(
    `LLM output was not parseable as JSON. First 200 chars: ${raw.slice(0, 200)}`,
  );
}
