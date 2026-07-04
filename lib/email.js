/**
 * Shared email provider layer for the backend (password resets, and any future
 * transactional email). Mirrors lib/aiProvider.js's pattern: swap the
 * EMAIL_PROVIDER env var to change providers without touching call sites.
 */
const PROVIDER = process.env.EMAIL_PROVIDER || "sendgrid";

const FROM_EMAIL = process.env.EMAIL_FROM || "no-reply@voo-ai.app";
const FROM_NAME = process.env.EMAIL_FROM_NAME || "Voo AI";

let sgMail = null;
function getSendgridClient() {
  if (!sgMail) {
    sgMail = require("@sendgrid/mail");
    sgMail.setApiKey(process.env.SENDGRID_API_KEY);
  }
  return sgMail;
}

/**
 * Send a plain-text + HTML email. Resolves when the provider accepts the send
 * (does not guarantee delivery — providers report that async via webhooks).
 */
async function sendEmail({ to, subject, text, html }) {
  if (PROVIDER === "sendgrid") {
    const client = getSendgridClient();
    await client.send({
      to,
      from: { email: FROM_EMAIL, name: FROM_NAME },
      subject,
      text,
      html,
    });
    return;
  }

  if (PROVIDER === "ses") {
    // Not yet wired — install @aws-sdk/client-sesv2 and implement here if you
    // switch providers. In the meantime set EMAIL_PROVIDER=sendgrid.
    throw new Error("SES email provider not yet wired — set EMAIL_PROVIDER=sendgrid for now.");
  }

  throw new Error(`Unknown EMAIL_PROVIDER: ${PROVIDER}`);
}

/**
 * Send the password reset email with the CLIENT_URL/reset-password?token= link.
 */
async function sendPasswordResetEmail({ to, resetToken }) {
  const resetUrl = `${process.env.CLIENT_URL}/reset-password?token=${resetToken}`;

  const text = [
    "We received a request to reset your Voo AI password.",
    `Reset it here: ${resetUrl}`,
    "This link expires in 15 minutes. If you didn't request this, you can ignore this email.",
  ].join("\n\n");

  const html = `
    <div style="font-family: -apple-system, Helvetica, Arial, sans-serif; max-width: 480px; margin: 0 auto; color: #111;">
      <h2 style="margin-bottom: 8px;">Reset your password</h2>
      <p>We received a request to reset your Voo AI password.</p>
      <p style="margin: 24px 0;">
        <a href="${resetUrl}"
           style="background: linear-gradient(90deg,#22d3ee,#3b82f6); color: #fff; text-decoration: none;
                  padding: 12px 24px; border-radius: 8px; display: inline-block; font-weight: 600;">
          Reset password
        </a>
      </p>
      <p style="font-size: 13px; color: #666;">Or paste this link into your browser:<br>${resetUrl}</p>
      <p style="font-size: 13px; color: #666;">This link expires in 15 minutes. If you didn't request this, you can safely ignore this email.</p>
    </div>
  `;

  await sendEmail({
    to,
    subject: "Reset your Voo AI password",
    text,
    html,
  });
}

module.exports = { sendEmail, sendPasswordResetEmail };
