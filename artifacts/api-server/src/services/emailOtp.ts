import nodemailer from "nodemailer";

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.GMAIL_USER,
    pass: process.env.GMAIL_APP_PASSWORD,
  },
});

export async function sendOtpEmail(toEmail: string, otp: string, storeName: string, purpose: "signup" | "signin") {
  const subject = purpose === "signup"
    ? `${otp} — Your OTP to create account on ${storeName}`
    : `${otp} — Your OTP to sign in to ${storeName}`;

  const html = `
    <div style="font-family:'Segoe UI',Arial,sans-serif;max-width:480px;margin:0 auto;background:#fff;border-radius:16px;overflow:hidden;border:1px solid #e5e7eb;">
      <div style="background:#000;padding:24px 28px;">
        <p style="color:#fff;font-size:11px;letter-spacing:2px;font-weight:700;margin:0;text-transform:uppercase;">Web Media Hub</p>
        <p style="color:rgba(255,255,255,0.5);font-size:11px;margin:4px 0 0;">Store Account Verification</p>
      </div>
      <div style="padding:32px 28px;">
        <p style="font-size:15px;color:#111;font-weight:600;margin:0 0 8px;">
          ${purpose === "signup" ? "Welcome! Verify your email" : "Sign in verification"}
        </p>
        <p style="font-size:13px;color:#6b7280;margin:0 0 28px;">
          Use the OTP below to ${purpose === "signup" ? "create your account" : "sign in"} on <strong>${storeName}</strong>. This code is valid for <strong>10 minutes</strong>.
        </p>
        <div style="background:#f9fafb;border:2px dashed #e5e7eb;border-radius:12px;padding:20px;text-align:center;margin-bottom:24px;">
          <p style="font-size:36px;font-weight:900;letter-spacing:10px;color:#000;margin:0;font-family:monospace;">${otp}</p>
        </div>
        <p style="font-size:12px;color:#9ca3af;margin:0;">If you didn't request this OTP, you can safely ignore this email.</p>
      </div>
      <div style="background:#f9fafb;padding:16px 28px;border-top:1px solid #f3f4f6;">
        <p style="font-size:11px;color:#d1d5db;margin:0;text-align:center;">Powered by <strong style="color:#9ca3af;">Web Media Hub</strong></p>
      </div>
    </div>
  `;

  await transporter.sendMail({
    from: `"Web Media Hub" <${process.env.GMAIL_USER}>`,
    to: toEmail,
    subject,
    html,
  });
}
