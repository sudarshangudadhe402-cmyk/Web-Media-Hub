import nodemailer from "nodemailer";

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.GMAIL_USER,
    pass: process.env.GMAIL_APP_PASSWORD,
  },
});

export async function sendLockoutEmail(
  toEmail: string,
  username: string,
  lockedUntil: Date
) {
  const safeUsername = escapeHtml(username);
  const lockedUntilStr = lockedUntil.toLocaleString("en-IN", { timeZone: "Asia/Kolkata" });
  const resetUrl = `${process.env.FRONTEND_URL || "https://web-media-hub.replit.app"}/super-admin/forgot-password`;

  const subject = "Security Alert: Your Web Media Hub account has been temporarily locked";
  const html = `
    <div style="font-family:'Segoe UI',Arial,sans-serif;max-width:480px;margin:0 auto;background:#fff;border-radius:16px;overflow:hidden;border:1px solid #e5e7eb;">
      <div style="background:#000;padding:24px 28px;">
        <p style="color:#fff;font-size:11px;letter-spacing:2px;font-weight:700;margin:0;text-transform:uppercase;">Web Media Hub</p>
        <p style="color:rgba(255,255,255,0.5);font-size:11px;margin:4px 0 0;">Security Alert</p>
      </div>
      <div style="padding:32px 28px;">
        <p style="font-size:15px;color:#111;font-weight:600;margin:0 0 8px;">Account Temporarily Locked</p>
        <p style="font-size:13px;color:#6b7280;margin:0 0 16px;">
          We detected multiple failed login attempts on your account <strong>${safeUsername}</strong>.
          For your security, access has been locked until <strong>${escapeHtml(lockedUntilStr)} IST</strong>.
        </p>
        <p style="font-size:13px;color:#6b7280;margin:0 0 24px;">
          If this wasn't you, your credentials may be compromised. We strongly recommend resetting your password immediately.
        </p>
        <a href="${escapeHtml(resetUrl)}" style="display:inline-block;background:#000;color:#fff;text-decoration:none;padding:12px 24px;border-radius:8px;font-size:13px;font-weight:600;">
          Reset My Password
        </a>
        <p style="font-size:12px;color:#9ca3af;margin:24px 0 0;">If this was you and you forgot your password, use the button above to reset it. Otherwise, please contact support immediately.</p>
      </div>
      <div style="background:#f9fafb;padding:16px 28px;border-top:1px solid #f3f4f6;">
        <p style="font-size:11px;color:#d1d5db;margin:0;text-align:center;">Powered by <strong style="color:#9ca3af;">Web Media Hub</strong></p>
      </div>
    </div>
  `;

  await transporter.sendMail({
    from: `"Web Media Hub Security" <${process.env.GMAIL_USER}>`,
    to: toEmail,
    replyTo: process.env.GMAIL_USER,
    subject,
    html,
    text: `Your account has been temporarily locked until ${lockedUntilStr} IST due to multiple failed login attempts.\n\nReset your password: ${resetUrl}\n\nWeb Media Hub`,
    headers: { "X-Priority": "1", "X-Mailer": "Web Media Hub Mailer" },
  });
}

export async function sendWithdrawalOtpEmail(
  toEmail: string,
  otp: string,
  partnerName: string,
  amount: number
) {
  const safeName = escapeHtml(partnerName);
  const safeOtp = escapeHtml(otp);
  const safeAmount = escapeHtml(`₹${amount.toLocaleString("en-IN")}`);
  const html = `
    <div style="font-family:'Segoe UI',Arial,sans-serif;max-width:480px;margin:0 auto;background:#fff;border-radius:16px;overflow:hidden;border:1px solid #e5e7eb;">
      <div style="background:#16a34a;padding:24px 28px;">
        <p style="color:#fff;font-size:11px;letter-spacing:2px;font-weight:700;margin:0;text-transform:uppercase;">Web Media Hub</p>
        <p style="color:rgba(255,255,255,0.7);font-size:11px;margin:4px 0 0;">Withdrawal Verification</p>
      </div>
      <div style="padding:32px 28px;">
        <p style="font-size:15px;color:#111;font-weight:600;margin:0 0 8px;">Confirm your withdrawal, ${safeName}</p>
        <p style="font-size:13px;color:#6b7280;margin:0 0 8px;">You've requested a withdrawal of <strong>${safeAmount}</strong>.</p>
        <p style="font-size:13px;color:#6b7280;margin:0 0 28px;">Enter the OTP below to confirm. Valid for <strong>10 minutes</strong>. Do NOT share this code with anyone.</p>
        <div style="background:#f0fdf4;border:2px dashed #86efac;border-radius:12px;padding:20px;text-align:center;margin-bottom:24px;">
          <p style="font-size:36px;font-weight:900;letter-spacing:10px;color:#16a34a;margin:0;font-family:monospace;">${safeOtp}</p>
        </div>
        <div style="background:#fef3c7;border-radius:10px;padding:12px 16px;margin-bottom:16px;">
          <p style="font-size:12px;color:#92400e;margin:0;font-weight:600;">⚠️ Security Notice</p>
          <p style="font-size:12px;color:#92400e;margin:4px 0 0;">If you did not request this withdrawal, please contact support immediately. Do not share this OTP with anyone.</p>
        </div>
        <p style="font-size:12px;color:#9ca3af;margin:0;">Withdrawal amount: <strong>${safeAmount}</strong></p>
      </div>
      <div style="background:#f9fafb;padding:16px 28px;border-top:1px solid #f3f4f6;">
        <p style="font-size:11px;color:#d1d5db;margin:0;text-align:center;">Powered by <strong style="color:#9ca3af;">Web Media Hub</strong></p>
      </div>
    </div>
  `;
  await transporter.sendMail({
    from: `"Web Media Hub" <${process.env.GMAIL_USER}>`,
    to: toEmail,
    subject: `${otp} — Confirm your ₹${amount.toLocaleString("en-IN")} withdrawal — Web Media Hub`,
    html,
    text: `Your withdrawal OTP is: ${otp}\n\nWithdrawal amount: ₹${amount.toLocaleString("en-IN")}\nThis code is valid for 10 minutes.\n\nDo NOT share this OTP with anyone.\n\nWeb Media Hub`,
    headers: { "X-Priority": "1", "X-Mailer": "Web Media Hub Mailer" },
  });
}

export async function sendPartnerVerificationEmail(
  toEmail: string,
  otp: string,
  partnerName: string
) {
  const safeName = escapeHtml(partnerName);
  const safeOtp = escapeHtml(otp);
  const html = `
    <div style="font-family:'Segoe UI',Arial,sans-serif;max-width:480px;margin:0 auto;background:#fff;border-radius:16px;overflow:hidden;border:1px solid #e5e7eb;">
      <div style="background:#000;padding:24px 28px;">
        <p style="color:#fff;font-size:11px;letter-spacing:2px;font-weight:700;margin:0;text-transform:uppercase;">Web Media Hub</p>
        <p style="color:rgba(255,255,255,0.5);font-size:11px;margin:4px 0 0;">Partnership Portal</p>
      </div>
      <div style="padding:32px 28px;">
        <p style="font-size:15px;color:#111;font-weight:600;margin:0 0 8px;">Verify your identity, ${safeName}</p>
        <p style="font-size:13px;color:#6b7280;margin:0 0 28px;">Use the OTP below to access your <strong>Partnership Portal</strong>. This code is valid for <strong>10 minutes</strong>.</p>
        <div style="background:#f9fafb;border:2px dashed #e5e7eb;border-radius:12px;padding:20px;text-align:center;margin-bottom:24px;">
          <p style="font-size:36px;font-weight:900;letter-spacing:10px;color:#000;margin:0;font-family:monospace;">${safeOtp}</p>
        </div>
        <p style="font-size:12px;color:#9ca3af;margin:0;">If you didn't request this, you can safely ignore this email.</p>
      </div>
      <div style="background:#f9fafb;padding:16px 28px;border-top:1px solid #f3f4f6;">
        <p style="font-size:11px;color:#d1d5db;margin:0;text-align:center;">Powered by <strong style="color:#9ca3af;">Web Media Hub</strong></p>
      </div>
    </div>
  `;
  await transporter.sendMail({
    from: `"Web Media Hub" <${process.env.GMAIL_USER}>`,
    to: toEmail,
    subject: `${otp} — Verify your Web Media Hub Partnership Portal access`,
    html,
    text: `Your OTP is: ${otp}\n\nThis code is valid for 10 minutes.\n\nWeb Media Hub Partnership Portal`,
  });
}

export async function sendOtpEmail(
  toEmail: string,
  otp: string,
  storeName: string,
  purpose: "signup" | "signin" | "admin-creation" | "admin-forgot-password" | "cancel-autopay"
) {
  let subject = "";
  let headingText = "";
  let bodyText = "";

  const safeStoreName = escapeHtml(storeName);
  const safeOtp = escapeHtml(otp);

  if (purpose === "signup") {
    subject = `${otp} — Your OTP to create account on ${storeName}`;
    headingText = "Welcome! Verify your email";
    bodyText = `Use the OTP below to <strong>create your account</strong> on <strong>${safeStoreName}</strong>. This code is valid for <strong>10 minutes</strong>.`;
  } else if (purpose === "signin") {
    subject = `${otp} — Your OTP to sign in to ${storeName}`;
    headingText = "Sign in verification";
    bodyText = `Use the OTP below to <strong>sign in</strong> to <strong>${safeStoreName}</strong>. This code is valid for <strong>10 minutes</strong>.`;
  } else if (purpose === "admin-creation") {
    subject = `${otp} — Verify admin email for Web Media Hub`;
    headingText = "Admin Account Email Verification";
    bodyText = `Use the OTP below to <strong>verify this email</strong> for new admin account creation on <strong>Web Media Hub</strong>. This code is valid for <strong>10 minutes</strong>.`;
  } else if (purpose === "admin-forgot-password") {
    subject = `${otp} — Reset your admin password on Web Media Hub`;
    headingText = "Admin Password Reset";
    bodyText = `Use the OTP below to <strong>reset your admin password</strong> on <strong>Web Media Hub</strong>. This code is valid for <strong>10 minutes</strong>.`;
  } else if (purpose === "cancel-autopay") {
    subject = `${otp} — Confirm AutoPay cancellation on Web Media Hub`;
    headingText = "Cancel AutoPay";
    bodyText = `Use the OTP below to <strong>confirm cancellation of AutoPay</strong> for <strong>${safeStoreName}</strong> on <strong>Web Media Hub</strong>. This code is valid for <strong>10 minutes</strong>. If you didn't request this, ignore this email — your AutoPay will remain active.`;
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
          <p style="font-size:36px;font-weight:900;letter-spacing:10px;color:#000;margin:0;font-family:monospace;">${safeOtp}</p>
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
