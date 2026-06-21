import nodemailer from "nodemailer";

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.GMAIL_USER,
    pass: process.env.GMAIL_APP_PASSWORD,
  },
});

export async function sendOtpEmail(
  toEmail: string,
  otp: string,
  storeName: string,
  purpose: "signup" | "signin" | "admin-creation" | "admin-forgot-password"
) {
  let subject = "";
  let headingText = "";
  let bodyText = "";

  if (purpose === "signup") {
    subject = `${otp} — Your OTP to create account on ${storeName}`;
    headingText = "Welcome! Verify your email";
    bodyText = `Use the OTP below to <strong>create your account</strong> on <strong>${storeName}</strong>. This code is valid for <strong>10 minutes</strong>.`;
  } else if (purpose === "signin") {
    subject = `${otp} — Your OTP to sign in to ${storeName}`;
    headingText = "Sign in verification";
    bodyText = `Use the OTP below to <strong>sign in</strong> to <strong>${storeName}</strong>. This code is valid for <strong>10 minutes</strong>.`;
  } else if (purpose === "admin-creation") {
    subject = `${otp} — Verify admin email for Web Media Hub`;
    headingText = "Admin Account Email Verification";
    bodyText = `Use the OTP below to <strong>verify this email</strong> for new admin account creation on <strong>Web Media Hub</strong>. This code is valid for <strong>10 minutes</strong>.`;
  } else if (purpose === "admin-forgot-password") {
    subject = `${otp} — Reset your admin password on Web Media Hub`;
    headingText = "Admin Password Reset";
    bodyText = `Use the OTP below to <strong>reset your admin password</strong> on <strong>Web Media Hub</strong>. This code is valid for <strong>10 minutes</strong>.`;
  }

  const html = `
    <div style="font-family:'Segoe UI',Arial,sans-serif;max-width:480px;margin:0 auto;background:#fff;border-radius:16px;overflow:hidden;border:1px solid #e5e7eb;">
      <div style="background:#000;padding:24px 28px;">
        <p style="color:#fff;font-size:11px;letter-spacing:2px;font-weight:700;margin:0;text-transform:uppercase;">Web Media Hub</p>
        <p style="color:rgba(255,255,255,0.5);font-size:11px;margin:4px 0 0;">
          ${purpose === "admin-creation" || purpose === "admin-forgot-password" ? "Admin Portal" : "Store Account Verification"}
        </p>
      </div>
      <div style="padding:32px 28px;">
        <p style="font-size:15px;color:#111;font-weight:600;margin:0 0 8px;">${headingText}</p>
        <p style="font-size:13px;color:#6b7280;margin:0 0 28px;">${bodyText}</p>
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
    replyTo: process.env.GMAIL_USER,
    subject,
    html,
    text: `Your OTP is: ${otp}\n\nThis code is valid for 10 minutes.\n\nWeb Media Hub`,
    headers: {
      "X-Priority": "1",
      "X-Mailer": "Web Media Hub Mailer",
    },
  });
}
