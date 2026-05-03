import type { ZodError, ZodIssue } from "zod";

const MAX_ISSUES = 10;

function pathToString(path: ZodIssue["path"]): string {
  if (path.length === 0) return "(root)";
  let out = "";
  for (const seg of path) {
    if (typeof seg === "number") out += `[${seg}]`;
    else if (out === "") out = String(seg);
    else out += `.${String(seg)}`;
  }
  return out;
}

export function formatZodError(err: ZodError): string {
  const issues = err.issues.slice(0, MAX_ISSUES);
  const lines = issues.map((i) => `${pathToString(i.path)}: ${i.message}`);
  if (err.issues.length > MAX_ISSUES) {
    lines.push(`…and ${err.issues.length - MAX_ISSUES} more`);
  }
  return lines.join("\n");
}
