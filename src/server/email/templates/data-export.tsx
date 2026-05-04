import "server-only";

// S7-T02 — Data export email template. Direct, no metaphors — Privacy/Export
// is one of the few brand surfaces that intentionally drops the coffee voice.
// Hex literals are inlined because most email clients strip CSS variables.

export type DataExportEmailProps = {
  recipientName: string;
  downloadUrl: string;
  expiresAt: string; // ISO datetime
};

export function renderDataExportEmail(
  props: DataExportEmailProps,
): { html: string; text: string; subject: string } {
  const subject = "Your DayBeans data export is ready";

  const expiresFriendly = new Date(props.expiresAt).toLocaleString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    timeZoneName: "short",
  });

  const recipient = escape(props.recipientName);
  const url = escape(props.downloadUrl);
  const expires = escape(expiresFriendly);

  const html = `
    <html>
      <body style="margin:0;background:#f6e7c4;font-family:'Source Serif Pro',Georgia,serif;color:#1f120a;">
        <div style="max-width:480px;margin:48px auto;background:#ffffff;border-radius:12px;padding:32px;border:1px solid #e8dfd2;">
          <h1 style="font-size:20px;font-weight:500;margin:0 0 12px 0;color:#1f120a;">
            Your data export is ready
          </h1>
          <p style="font-size:15px;line-height:1.55;color:#3b2415;margin:0 0 16px 0;">
            ${recipient}, here's your full DayBeans data dump.
          </p>
          <p style="text-align:center;margin:24px 0;">
            <a href="${url}" style="display:inline-block;background:#3b2415;color:#ffffff;text-decoration:none;padding:12px 22px;border-radius:6px;font-size:14px;font-weight:600;">
              Download my data
            </a>
          </p>
          <p style="font-size:13px;line-height:1.55;color:#3b2415;margin:0 0 8px 0;">
            This link is valid for 24 hours and works once. It expires ${expires}.
          </p>
          <p style="font-size:12px;line-height:1.5;color:#a87a3c;margin:18px 0 0 0;">
            If you didn't request this, ignore the email — the link can only be used once and self-expires.
          </p>
        </div>
      </body>
    </html>
  `.trim();

  const text = [
    `Your DayBeans data export is ready.`,
    ``,
    `${props.recipientName}, here's your full DayBeans data dump.`,
    ``,
    `Download: ${props.downloadUrl}`,
    ``,
    `This link is valid for 24 hours and works once. It expires ${expiresFriendly}.`,
    ``,
    `If you didn't request this, ignore the email — the link can only be used once and self-expires.`,
  ].join("\n");

  return { html, text, subject };
}

function escape(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}
