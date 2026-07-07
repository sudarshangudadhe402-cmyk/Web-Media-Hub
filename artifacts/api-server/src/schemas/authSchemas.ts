import { z } from "zod";

function stripHtml(val: string): string {
  return val
    .replace(/<[^>]*>/g, "")
    .replace(/&[a-z]+;/gi, "")
    .replace(/javascript:/gi, "")
    .replace(/on\w+\s*=/gi, "")
    .trim();
}

const safeString = (max: number) =>
  z.string().max(max).transform(stripHtml);

const emailField = z
  .string()
  .min(3)
  .max(254)
  .email()
  .transform((v) => stripHtml(v).toLowerCase());

const passwordField = z
  .string()
  .min(1)
  .max(128)
  .transform(stripHtml);

const usernameField = z
  .string()
  .min(1)
  .max(64)
  .regex(/^[a-zA-Z0-9_.\-@]+$/, "Invalid characters in username")
  .transform(stripHtml);

const otpField = z
  .string()
  .min(4)
  .max(10)
  .regex(/^\d+$/, "OTP must be digits only")
  .transform(stripHtml);

const slugField = z
  .string()
  .min(1)
  .max(100)
  .regex(/^[a-zA-Z0-9_\-]+$/, "Invalid slug")
  .transform(stripHtml);

const mobileField = z
  .string()
  .regex(/^\d{10}$/, "Mobile must be 10 digits");

const purposeField = z.enum(["signup", "signin"]);

export const AdminLoginSchema = z.object({
  email: emailField.optional(),
  username: usernameField.optional(),
  password: passwordField,
  accessCode: safeString(64).optional(),
}).refine((d) => d.email || d.username, {
  message: "Email or username is required",
});

export const ChangePasswordSchema = z.object({
  currentPassword: z.string().min(1).max(128).transform(stripHtml).optional(),
  newPassword: z.string().min(1).max(128).transform(stripHtml).optional(),
  username: usernameField.optional(),
});

export const ForgotPasswordSendOtpSchema = z.object({
  email: emailField,
});

export const ForgotPasswordResetSchema = z.object({
  email: emailField,
  otp: otpField,
  newPassword: passwordField,
});

const customerPasswordField = z
  .string()
  .min(6)
  .max(20)
  .regex(/^\d+$/, "Password must contain numbers only");

const customerNameField = z
  .string()
  .min(2)
  .max(60)
  .regex(/^[a-zA-Z\u0080-\uFFFF\s'-]+$/, "Name must contain only letters")
  .transform((v) => v.trim());

export const CustomerSendOtpSchema = z.object({
  storeSlug: slugField,
  name: customerNameField.optional(),
  email: emailField,
  password: customerPasswordField,
  purpose: purposeField,
});

export const CustomerVerifySignupSchema = z.object({
  storeSlug: slugField,
  name: customerNameField,
  email: emailField,
  password: customerPasswordField,
  otp: otpField,
  source: safeString(50).optional(),
  campaign: safeString(100).optional(),
});

export const CustomerVerifySigninSchema = z.object({
  storeSlug: slugField,
  email: emailField,
  password: customerPasswordField,
  otp: otpField,
});
