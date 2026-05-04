import "server-only";

// S5-T05 — Voucher email template. Returns inline-styled HTML + plaintext.
// Hex literals are inlined because most email clients strip CSS variables.
// Colors mirror the Dawn palette tokens in src/styles/globals.css:
//   --espresso       #3b2415  (ink anchor)
//   --espresso-deep  #1f120a
//   --crema          #d4a86a  (gold accent)
//   --crema-soft     #f6e7c4  (cream surface)

export type VoucherEmailProps = {
  recipientName: string;
  partnerName: string;
  voucherCode: string;
  expiresAt: string; // ISO datetime
  streakLength: number;
};

export function renderVoucherEmail(
  props: VoucherEmailProps,
): { html: string; text: string; subject: string } {
  const subject = `Cup on the counter — your ${props.partnerName} voucher`;

  const expiresFriendly = new Date(props.expiresAt).toLocaleDateString(
    "en-US",
    { weekday: "long", month: "long", day: "numeric", year: "numeric" },
  );

  const recipient = escape(props.recipientName);
  const partner = escape(props.partnerName);
  const code = escape(props.voucherCode);
  const expires = escape(expiresFriendly);
  const streak = String(props.streakLength);

  const html = `
    <html>
      <body style="margin:0;background:#f6e7c4;font-family:'Source Serif Pro',Georgia,serif;color:#1f120a;">
        <div style="max-width:480px;margin:48px auto;background:#ffffff;border-radius:12px;padding:32px;border:1px solid #e8dfd2;">
          <h1 style="font-size:22px;font-weight:500;margin:0 0 12px 0;color:#1f120a;">
            Cup on the counter.
          </h1>
          <p style="font-size:15px;line-height:1.55;color:#3b2415;margin:0 0 16px 0;">
            ${recipient}, you've brewed ${streak} mornings in a row. Treat yourself.
          </p>
          <div style="background:#f6e7c4;border:1px dashed #d4a86a;border-radius:8px;padding:18px;text-align:center;margin:18px 0;">
            <div style="font-size:11px;text-transform:uppercase;letter-spacing:.12em;color:#a87a3c;margin-bottom:6px;">
              Your code
            </div>
            <div style="font-family:Menlo,Monaco,monospace;font-size:22px;letter-spacing:.05em;color:#1f120a;">
              ${code}
            </div>
            <div style="font-size:13px;color:#3b2415;margin-top:10px;">
              Good at ${partner}
            </div>
          </div>
          <p style="font-size:13px;line-height:1.55;color:#3b2415;margin:0 0 18px 0;">
            Redeem in store or on their site. Expires ${expires}.
          </p>
          <p style="font-size:12px;line-height:1.5;color:#a87a3c;margin:0;">
            DayBeans — different beans, same morning.
          </p>
        </div>
      </body>
    </html>
  `.trim();

  const text = [
    `Cup on the counter.`,
    ``,
    `${props.recipientName}, you've brewed ${props.streakLength} mornings in a row. Treat yourself.`,
    ``,
    `Your code: ${props.voucherCode}`,
    `Good at: ${props.partnerName}`,
    `Expires: ${expiresFriendly}`,
    ``,
    `DayBeans — different beans, same morning.`,
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
