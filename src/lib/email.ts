import "server-only";

// Email sending adapter. In production, set RESEND_API_KEY (and EMAIL_FROM) to
// deliver real mail via Resend. In development there's no mail server, so the
// reset link is logged and returned to the caller so the flow stays testable.

export async function sendPasswordResetEmail(
  email: string,
  resetUrl: string,
): Promise<{ devLink?: string }> {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.EMAIL_FROM || "Z <onboarding@resend.dev>";

  if (apiKey) {
    await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from,
        to: email,
        subject: "Reset your Z password",
        html: `<p>Click the link below to reset your password. It expires in 1 hour.</p><p><a href="${resetUrl}">Reset password</a></p><p>If you didn't request this, you can ignore this email.</p>`,
      }),
    }).catch((e) => console.error("Failed to send reset email:", e));
    return {};
  }

  // Dev fallback: no mail server configured.
  console.log(`[dev] Password reset link for ${email}: ${resetUrl}`);
  return {
    devLink: process.env.NODE_ENV !== "production" ? resetUrl : undefined,
  };
}
