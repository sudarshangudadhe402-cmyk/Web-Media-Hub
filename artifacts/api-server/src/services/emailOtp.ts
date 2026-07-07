import nodemailer from "nodemailer";

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

// ─── Shared email transporter ─────────────────────────────────────────────────
const _transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.GMAIL_USER,
    pass: process.env.GMAIL_APP_PASSWORD,
  },
});

// ─── Store Created Email ──────────────────────────────────────────────────────
export async function sendStoreCreatedEmail(params: {
  toEmail: string;
  password: string;
  planName: string;
  planPrice: string;
  planPeriod: string;
  planBadge: string;
  storeName: string;
}) {
  const { toEmail, password, planName, planPrice, planPeriod, planBadge, storeName } = params;
  const safeEmail = escapeHtml(toEmail);
  const safeStoreName = escapeHtml(storeName || "Your Store");
  const safePlan = escapeHtml(planName || "Starter");
  const safePrice = escapeHtml(planPrice || "");
  const safePeriod = escapeHtml(planPeriod || "");
  const safeBadge = escapeHtml(planBadge || "");
  const loginUrl = escapeHtml(process.env.FRONTEND_URL || "https://web-media-hub.replit.app");

  const html = `
  <div style="font-family:'Segoe UI',Arial,sans-serif;max-width:520px;margin:0 auto;background:#ffffff;border-radius:16px;overflow:hidden;border:1px solid #e5e7eb;">
    <!-- Header -->
    <div style="background:linear-gradient(135deg,#000 0%,#1a1a2e 100%);padding:32px 28px;text-align:center;">
      <p style="color:#ffffff;font-size:12px;letter-spacing:3px;font-weight:700;margin:0 0 12px;text-transform:uppercase;">Web Media Hub</p>
      <p style="color:#ffffff;font-size:28px;margin:0;font-weight:800;">🎉 Congratulations!</p>
      <p style="color:rgba(255,255,255,0.75);font-size:14px;margin:8px 0 0;">Your store is now live on Web Media Hub</p>
    </div>
    <!-- Body -->
    <div style="padding:32px 28px;">
      <p style="font-size:15px;color:#111827;font-weight:700;margin:0 0 6px;">Welcome aboard, ${safeStoreName}!</p>
      <p style="font-size:13px;color:#6b7280;margin:0 0 28px;line-height:1.6;">Your online clothing store is successfully created. Here are your login credentials — please keep them safe.</p>

      <!-- Credentials -->
      <div style="background:#f9fafb;border:1px solid #e5e7eb;border-radius:12px;padding:20px 24px;margin-bottom:24px;">
        <p style="font-size:11px;font-weight:700;color:#6b7280;letter-spacing:2px;text-transform:uppercase;margin:0 0 12px;">Your Login Details</p>
        <p style="font-size:13px;color:#374151;margin:0 0 8px;"><span style="color:#9ca3af;min-width:70px;display:inline-block;">Email</span><strong style="color:#111827;">${safeEmail}</strong></p>
        <p style="font-size:13px;color:#374151;margin:0;"><span style="color:#9ca3af;min-width:70px;display:inline-block;">Password</span><strong style="color:#111827;">${escapeHtml(password)}</strong></p>
      </div>

      <!-- Current Plan -->
      <div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:12px;padding:20px 24px;margin-bottom:24px;">
        <p style="font-size:11px;font-weight:700;color:#16a34a;letter-spacing:2px;text-transform:uppercase;margin:0 0 12px;">Your Current Plan</p>
        <p style="font-size:18px;font-weight:800;color:#111827;margin:0 0 4px;">${safePlan}${safeBadge ? ` <span style="font-size:12px;background:#dcfce7;color:#16a34a;padding:2px 8px;border-radius:20px;font-weight:600;">${safeBadge}</span>` : ""}</p>
        ${safePrice ? `<p style="font-size:13px;color:#6b7280;margin:4px 0 0;">${safePrice}${safePeriod ? ` &nbsp;·&nbsp; ${safePeriod}` : ""}</p>` : ""}
      </div>

      <!-- Plan Benefits -->
      <div style="margin-bottom:24px;">
        <p style="font-size:11px;font-weight:700;color:#6b7280;letter-spacing:2px;text-transform:uppercase;margin:0 0 12px;">What's Included in Your Plan</p>
        <table style="width:100%;border-collapse:collapse;">
          <tr><td style="padding:7px 0;font-size:13px;color:#374151;">✅&nbsp; Unlimited product listings</td></tr>
          <tr><td style="padding:7px 0;font-size:13px;color:#374151;">✅&nbsp; Your own branded store URL</td></tr>
          <tr><td style="padding:7px 0;font-size:13px;color:#374151;">✅&nbsp; Customer appointment bookings</td></tr>
          <tr><td style="padding:7px 0;font-size:13px;color:#374151;">✅&nbsp; WhatsApp direct enquiry integration</td></tr>
          <tr><td style="padding:7px 0;font-size:13px;color:#374151;">✅&nbsp; Product wishlists for customers</td></tr>
          <tr><td style="padding:7px 0;font-size:13px;color:#374151;">✅&nbsp; 3D Try-On experience for shoppers</td></tr>
          <tr><td style="padding:7px 0;font-size:13px;color:#374151;">✅&nbsp; Customer reviews & ratings</td></tr>
          <tr><td style="padding:7px 0;font-size:13px;color:#374151;">✅&nbsp; Store performance analytics dashboard</td></tr>
        </table>
      </div>

      <!-- Store Benefits -->
      <div style="background:#fff7ed;border:1px solid #fed7aa;border-radius:12px;padding:20px 24px;margin-bottom:28px;">
        <p style="font-size:11px;font-weight:700;color:#ea580c;letter-spacing:2px;text-transform:uppercase;margin:0 0 12px;">Why Sell on Web Media Hub</p>
        <p style="font-size:13px;color:#374151;margin:0 0 8px;line-height:1.6;">🛍️ &nbsp;Reach thousands of online shoppers browsing your category every day.</p>
        <p style="font-size:13px;color:#374151;margin:0 0 8px;line-height:1.6;">📲 &nbsp;Your store works beautifully on every mobile device — no app needed.</p>
        <p style="font-size:13px;color:#374151;margin:0;line-height:1.6;">📦 &nbsp;Manage products, bookings, and customers all from one simple dashboard.</p>
      </div>

      <!-- Motivation -->
      <div style="border-left:4px solid #000;padding-left:16px;margin-bottom:28px;">
        <p style="font-size:13px;color:#374151;font-style:italic;margin:0 0 8px;line-height:1.7;">"Every big brand started as a small store. Today you've taken the first step — and that already puts you ahead of everyone still thinking about it."</p>
        <p style="font-size:12px;color:#9ca3af;margin:0;">The best time to grow your business is right now. Add your products, share your store link, and let the customers come to you.</p>
      </div>

      <!-- CTA -->
      <div style="text-align:center;">
        <a href="${loginUrl}" style="display:inline-block;background:#000;color:#fff;text-decoration:none;padding:14px 32px;border-radius:10px;font-size:14px;font-weight:700;letter-spacing:0.5px;">Go to My Store Dashboard →</a>
      </div>
    </div>
    <!-- Footer -->
    <div style="background:#f9fafb;padding:16px 28px;border-top:1px solid #f3f4f6;text-align:center;">
      <p style="font-size:11px;color:#d1d5db;margin:0;">Powered by <strong style="color:#9ca3af;">Web Media Hub</strong> &nbsp;·&nbsp; Need help? Reply to this email.</p>
    </div>
  </div>`;

  await _transporter.sendMail({
    from: `"Web Media Hub" <${process.env.GMAIL_USER}>`,
    to: toEmail,
    replyTo: process.env.GMAIL_USER,
    subject: `Congratulations! Your store is created on Web Media Hub 🎉`,
    html,
    text: `Congratulations! Your store "${storeName}" is now live on Web Media Hub.\n\nLogin: ${toEmail}\nPassword: ${password}\n\nPlan: ${planName} — ${planPrice} ${planPeriod}\n\nVisit: ${loginUrl}\n\nWeb Media Hub`,
  });
}

// ─── Store Deactivated Email ──────────────────────────────────────────────────
export async function sendStoreDeactivatedEmail(params: {
  toEmail: string;
  storeName: string;
  planName: string;
}) {
  const { toEmail, storeName, planName } = params;
  const safeStoreName = escapeHtml(storeName || "Your Store");
  const safePlan = escapeHtml(planName || "your plan");
  const renewUrl = escapeHtml(
    `${process.env.FRONTEND_URL || "https://web-media-hub.replit.app"}/plan-renewal`
  );

  const html = `
  <div style="font-family:'Segoe UI',Arial,sans-serif;max-width:520px;margin:0 auto;background:#ffffff;border-radius:16px;overflow:hidden;border:1px solid #e5e7eb;">
    <!-- Header -->
    <div style="background:#1f2937;padding:32px 28px;text-align:center;">
      <p style="color:#ffffff;font-size:12px;letter-spacing:3px;font-weight:700;margin:0 0 12px;text-transform:uppercase;">Web Media Hub</p>
      <div style="width:56px;height:56px;background:rgba(239,68,68,0.15);border-radius:50%;display:inline-flex;align-items:center;justify-content:center;margin-bottom:12px;">
        <span style="font-size:28px;line-height:1;">⏸️</span>
      </div>
      <p style="color:#f9fafb;font-size:20px;font-weight:800;margin:0;">Your store has been deactivated</p>
      <p style="color:rgba(255,255,255,0.6);font-size:13px;margin:8px 0 0;">${safeStoreName} on Web Media Hub</p>
    </div>
    <!-- Body -->
    <div style="padding:32px 28px;">
      <p style="font-size:14px;color:#374151;margin:0 0 12px;line-height:1.6;">Your <strong>${safePlan}</strong> subscription has expired and your store is now temporarily offline. Customers will not be able to browse your products until you renew.</p>
      <p style="font-size:14px;color:#374151;margin:0 0 28px;line-height:1.6;">Don't worry — all your products, bookings, and customer data are safe. Renewing your plan will instantly bring your store back online.</p>

      <!-- What's paused -->
      <div style="background:#fef2f2;border:1px solid #fecaca;border-radius:12px;padding:20px 24px;margin-bottom:24px;">
        <p style="font-size:11px;font-weight:700;color:#dc2626;letter-spacing:2px;text-transform:uppercase;margin:0 0 12px;">What's currently paused</p>
        <p style="font-size:13px;color:#374151;margin:0 0 8px;">❌&nbsp; Your public store is not visible to customers</p>
        <p style="font-size:13px;color:#374151;margin:0 0 8px;">❌&nbsp; New bookings and product enquiries are paused</p>
        <p style="font-size:13px;color:#374151;margin:0;">❌&nbsp; Store dashboard access is restricted</p>
      </div>

      <!-- What's safe -->
      <div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:12px;padding:20px 24px;margin-bottom:28px;">
        <p style="font-size:11px;font-weight:700;color:#16a34a;letter-spacing:2px;text-transform:uppercase;margin:0 0 12px;">What's safe & waiting for you</p>
        <p style="font-size:13px;color:#374151;margin:0 0 8px;">✅&nbsp; All your products are saved</p>
        <p style="font-size:13px;color:#374151;margin:0 0 8px;">✅&nbsp; Booking history is intact</p>
        <p style="font-size:13px;color:#374151;margin:0;">✅&nbsp; Customer data is fully preserved</p>
      </div>

      <!-- Motivation -->
      <div style="border-left:4px solid #f97316;padding-left:16px;margin-bottom:28px;">
        <p style="font-size:13px;color:#374151;font-style:italic;margin:0 0 8px;line-height:1.7;">"A pause is not the end — it's just a breath before the next chapter. Your customers are still out there, waiting for your store to open again."</p>
        <p style="font-size:12px;color:#9ca3af;margin:0;">Renew today and get back to growing your business. Every day your store is offline is a sale you're missing.</p>
      </div>

      <!-- CTA -->
      <div style="text-align:center;">
        <a href="${renewUrl}" style="display:inline-block;background:#f97316;color:#fff;text-decoration:none;padding:14px 32px;border-radius:10px;font-size:14px;font-weight:700;letter-spacing:0.5px;">Renew My Plan &amp; Reactivate Store →</a>
      </div>
    </div>
    <!-- Footer -->
    <div style="background:#f9fafb;padding:16px 28px;border-top:1px solid #f3f4f6;text-align:center;">
      <p style="font-size:11px;color:#d1d5db;margin:0;">Powered by <strong style="color:#9ca3af;">Web Media Hub</strong> &nbsp;·&nbsp; Need help? Reply to this email.</p>
    </div>
  </div>`;

  await _transporter.sendMail({
    from: `"Web Media Hub" <${process.env.GMAIL_USER}>`,
    to: toEmail,
    replyTo: process.env.GMAIL_USER,
    subject: `Your store is deactivated on Web Media Hub — Please renew your plan`,
    html,
    text: `Your store "${storeName}" has been deactivated because your ${planName} subscription has expired.\n\nRenew your plan to reactivate: ${renewUrl}\n\nAll your data is safe — products, bookings, and customers are preserved.\n\nWeb Media Hub`,
  });
}

// ─── Store Reactivated Email ──────────────────────────────────────────────────
export async function sendStoreReactivatedEmail(params: {
  toEmail: string;
  storeName: string;
  planName: string;
  planPrice: string;
  planPeriod: string;
  planBadge: string;
}) {
  const { toEmail, storeName, planName, planPrice, planPeriod, planBadge } = params;
  const safeStoreName = escapeHtml(storeName || "Your Store");
  const safePlan = escapeHtml(planName || "");
  const safePrice = escapeHtml(planPrice || "");
  const safePeriod = escapeHtml(planPeriod || "");
  const safeBadge = escapeHtml(planBadge || "");
  const dashboardUrl = escapeHtml(process.env.FRONTEND_URL || "https://web-media-hub.replit.app");

  const html = `
  <div style="font-family:'Segoe UI',Arial,sans-serif;max-width:520px;margin:0 auto;background:#ffffff;border-radius:16px;overflow:hidden;border:1px solid #e5e7eb;">
    <!-- Header -->
    <div style="background:linear-gradient(135deg,#16a34a 0%,#15803d 100%);padding:32px 28px;text-align:center;">
      <p style="color:#ffffff;font-size:12px;letter-spacing:3px;font-weight:700;margin:0 0 12px;text-transform:uppercase;">Web Media Hub</p>
      <p style="color:#ffffff;font-size:28px;margin:0;font-weight:800;">🎉 Your store is active again!</p>
      <p style="color:rgba(255,255,255,0.8);font-size:14px;margin:8px 0 0;">${safeStoreName} is now live for customers</p>
    </div>
    <!-- Body -->
    <div style="padding:32px 28px;">
      <p style="font-size:14px;color:#374151;margin:0 0 8px;line-height:1.6;">Welcome back! Your store is fully reactivated and customers can browse your products again. Thank you for continuing your journey with Web Media Hub.</p>
      <p style="font-size:13px;color:#6b7280;margin:0 0 28px;line-height:1.6;">Everything is right where you left it — products, bookings, and customers are all intact.</p>

      <!-- Current Plan -->
      <div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:12px;padding:20px 24px;margin-bottom:24px;">
        <p style="font-size:11px;font-weight:700;color:#16a34a;letter-spacing:2px;text-transform:uppercase;margin:0 0 12px;">Your Active Plan</p>
        <p style="font-size:20px;font-weight:800;color:#111827;margin:0 0 4px;">${safePlan}${safeBadge ? ` <span style="font-size:12px;background:#dcfce7;color:#16a34a;padding:2px 8px;border-radius:20px;font-weight:600;">${safeBadge}</span>` : ""}</p>
        ${safePrice ? `<p style="font-size:13px;color:#6b7280;margin:6px 0 0;">${safePrice}${safePeriod ? ` &nbsp;·&nbsp; ${safePeriod}` : ""}</p>` : ""}
      </div>

      <!-- Plan Benefits -->
      <div style="margin-bottom:24px;">
        <p style="font-size:11px;font-weight:700;color:#6b7280;letter-spacing:2px;text-transform:uppercase;margin:0 0 12px;">Everything Back Online</p>
        <table style="width:100%;border-collapse:collapse;">
          <tr><td style="padding:7px 0;font-size:13px;color:#374151;">✅&nbsp; Your store is visible to all customers</td></tr>
          <tr><td style="padding:7px 0;font-size:13px;color:#374151;">✅&nbsp; Product listings live and browsable</td></tr>
          <tr><td style="padding:7px 0;font-size:13px;color:#374151;">✅&nbsp; Appointment bookings are open again</td></tr>
          <tr><td style="padding:7px 0;font-size:13px;color:#374151;">✅&nbsp; WhatsApp enquiries flowing in</td></tr>
          <tr><td style="padding:7px 0;font-size:13px;color:#374151;">✅&nbsp; Dashboard and analytics fully accessible</td></tr>
          <tr><td style="padding:7px 0;font-size:13px;color:#374151;">✅&nbsp; 3D Try-On experience active for shoppers</td></tr>
        </table>
      </div>

      <!-- Store Benefits -->
      <div style="background:#fff7ed;border:1px solid #fed7aa;border-radius:12px;padding:20px 24px;margin-bottom:28px;">
        <p style="font-size:11px;font-weight:700;color:#ea580c;letter-spacing:2px;text-transform:uppercase;margin:0 0 12px;">Tips to Maximise This Plan</p>
        <p style="font-size:13px;color:#374151;margin:0 0 8px;line-height:1.6;">📸 &nbsp;Add fresh product photos to attract returning customers.</p>
        <p style="font-size:13px;color:#374151;margin:0 0 8px;line-height:1.6;">📲 &nbsp;Share your store link on WhatsApp Status &amp; Instagram Stories — it's free marketing.</p>
        <p style="font-size:13px;color:#374151;margin:0;line-height:1.6;">⭐ &nbsp;Ask happy customers to leave a review — it builds trust for new buyers.</p>
      </div>

      <!-- Motivation -->
      <div style="border-left:4px solid #16a34a;padding-left:16px;margin-bottom:28px;">
        <p style="font-size:13px;color:#374151;font-style:italic;margin:0 0 8px;line-height:1.7;">"The most successful stores are built by those who keep showing up — every product added, every customer served, every day open is a brick in your empire."</p>
        <p style="font-size:12px;color:#9ca3af;margin:0;">You're back and that's what matters. Now let's make this period count.</p>
      </div>

      <!-- CTA -->
      <div style="text-align:center;">
        <a href="${dashboardUrl}" style="display:inline-block;background:#16a34a;color:#fff;text-decoration:none;padding:14px 32px;border-radius:10px;font-size:14px;font-weight:700;letter-spacing:0.5px;">Go to My Dashboard →</a>
      </div>
    </div>
    <!-- Footer -->
    <div style="background:#f9fafb;padding:16px 28px;border-top:1px solid #f3f4f6;text-align:center;">
      <p style="font-size:11px;color:#d1d5db;margin:0;">Powered by <strong style="color:#9ca3af;">Web Media Hub</strong> &nbsp;·&nbsp; Need help? Reply to this email.</p>
    </div>
  </div>`;

  await _transporter.sendMail({
    from: `"Web Media Hub" <${process.env.GMAIL_USER}>`,
    to: toEmail,
    replyTo: process.env.GMAIL_USER,
    subject: `Congratulations! Your store is active again on Web Media Hub 🎉`,
    html,
    text: `Great news! Your store "${storeName}" is active again on Web Media Hub.\n\nActive Plan: ${planName} — ${planPrice} ${planPeriod}\n\nVisit your dashboard: ${dashboardUrl}\n\nWeb Media Hub`,
  });
}

function _escapeHtml_unused(str: string): string {
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
  purpose: "signup" | "signin" | "admin-creation" | "admin-forgot-password" | "cancel-autopay" | "reactivate-autopay"
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
  } else if (purpose === "reactivate-autopay") {
    subject = `${otp} — Confirm AutoPay reactivation on Web Media Hub`;
    headingText = "Reactivate AutoPay";
    bodyText = `Use the OTP below to <strong>confirm reactivation of AutoPay</strong> for <strong>${safeStoreName}</strong> on <strong>Web Media Hub</strong>. This code is valid for <strong>10 minutes</strong>. If you didn't request this, ignore this email — your AutoPay will remain cancelled.`;
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
