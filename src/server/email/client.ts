import "server-only";

// S5-T05 — Tiny Resend wrapper. Uses fetch directly to avoid pulling in
// the SDK as a dependency. If RESEND_API_KEY is unset we log to console
// and return a fake messageId so the caller's flow (e.g. claimReward)
// continues working in dev without an API key.

export type EmailSend = {
  from: string;
  to: string;
  subject: string;
  html: string;
  text: string;
};

export type EmailSendResult =
  | { ok: true; messageId: string }
  | { ok: false; error: string };

export async function sendEmail(input: EmailSend): Promise<EmailSendResult> {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    console.log("[email:dev] RESEND_API_KEY not set — would have sent:", {
      to: input.to,
      subject: input.subject,
      // log the text body, not html, for legibility in dev console
      text: input.text.slice(0, 600),
    });
    return { ok: true, messageId: `dev-${Date.now()}` };
  }

  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(input),
    });
    if (!res.ok) {
      const body = await res.text().catch(() => "");
      return {
        ok: false,
        error: `Resend ${res.status}: ${body.slice(0, 200)}`,
      };
    }
    const json = (await res.json()) as { id?: string };
    return { ok: true, messageId: json.id ?? "unknown" };
  } catch (e) {
    return { ok: false, error: (e as Error).message };
  }
}
