/**
 * Secure file upload validator.
 *
 * Pipeline: Upload → Validate (extension + magic bytes + malicious-content scan) → Store → Display
 * Files are NEVER executed, parsed as code, or imported — only stored as passive binary.
 */

import { randomUUID } from "crypto";
import { User } from "../models/User";

/* ── Allowed extensions ───────────────────────────────────────────────────── */
const ALLOWED_IMAGE_EXTS  = new Set([".jpg", ".jpeg", ".png", ".webp"]);
const ALLOWED_MODEL_EXTS  = new Set([".glb", ".gltf"]);
const ALL_ALLOWED_EXTS    = new Set([...ALLOWED_IMAGE_EXTS, ...ALLOWED_MODEL_EXTS]);

/* ── Magic-byte / file-signature checks ──────────────────────────────────── */
const MAGIC: Array<{
  exts: string[];
  mime: string;
  check: (buf: Buffer) => boolean;
}> = [
  {
    exts: [".jpg", ".jpeg"],
    mime: "image/jpeg",
    check: (b) => b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff,
  },
  {
    exts: [".png"],
    mime: "image/png",
    check: (b) =>
      b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4e && b[3] === 0x47 &&
      b[4] === 0x0d && b[5] === 0x0a && b[6] === 0x1a && b[7] === 0x0a,
  },
  {
    exts: [".webp"],
    mime: "image/webp",
    // RIFF????WEBP
    check: (b) =>
      b.length >= 12 &&
      b[0] === 0x52 && b[1] === 0x49 && b[2] === 0x46 && b[3] === 0x46 &&
      b[8] === 0x57 && b[9] === 0x45 && b[10] === 0x42 && b[11] === 0x50,
  },
  {
    exts: [".glb"],
    mime: "model/gltf-binary",
    // glTF magic = 0x46546C67 little-endian → bytes "glTF"
    check: (b) =>
      b[0] === 0x67 && b[1] === 0x6c && b[2] === 0x54 && b[3] === 0x46,
  },
  {
    exts: [".gltf"],
    mime: "model/gltf+json",
    // GLTF is a UTF-8 JSON file; must start with '{' and contain "asset"
    check: (b) => {
      const head = b.slice(0, 512).toString("utf8");
      return head.trimStart().startsWith("{") && head.includes('"asset"');
    },
  },
];

/* ── Malicious-content patterns (checked on raw bytes as latin1 string) ──── */
const MALICIOUS: RegExp[] = [
  // Web / scripting
  /<script[\s>]/i,
  /javascript\s*:/i,
  /vbscript\s*:/i,
  /on\w+\s*=/i,              // onerror=, onclick=, etc.
  // Server-side scripts
  /<\?php/i,
  /<%[=@!]/,                 // ASP / JSP expressions
  // HTML shell
  /<!DOCTYPE\s+html/i,
  /<html[\s>]/i,
  // Shell / OS
  /\/bin\/(sh|bash|zsh|dash)/i,
  /\bsudo\b/,
  /\bcmd\.exe\b/i,
  /\bpowershell\b/i,
  // Executable magic bytes (as latin1 patterns)
  /\x4d\x5a/,               // MZ — Windows EXE / DLL
  /\x7fELF/,                // ELF — Linux binary
  // Eval / exec patterns
  /\beval\s*\(/i,
  /\bexec\s*\(/i,
  /\bsystem\s*\(/i,
  /\bshell_exec\s*\(/i,
  /\bpassthru\s*\(/i,
  // Python OS abuse
  /import\s+os\b/,
  /subprocess\s*\./,
];

/* ── Result type ─────────────────────────────────────────────────────────── */
export interface UploadValidationResult {
  ok: boolean;
  reason?: string;       // safe rejection message (no internals)
  safeFileName?: string; // UUID-based filename, extension preserved
  detectedMime?: string;
}

/* ── Main validator ──────────────────────────────────────────────────────── */
export function validateUploadedFile(
  base64Data: string,
  originalFileName: string,
  uploadType: "image" | "model"
): UploadValidationResult {

  /* 1. Extension must be in the allow-list */
  const rawExt = originalFileName?.includes(".")
    ? "." + originalFileName.split(".").pop()!.toLowerCase()
    : "";

  if (!ALL_ALLOWED_EXTS.has(rawExt)) {
    return { ok: false, reason: "File type not allowed. Accepted: jpg, jpeg, png, webp, glb, gltf" };
  }

  /* 2. Extension must match the upload category */
  if (uploadType === "image" && !ALLOWED_IMAGE_EXTS.has(rawExt)) {
    return { ok: false, reason: "Expected an image file (jpg, jpeg, png, webp)" };
  }
  if (uploadType === "model" && !ALLOWED_MODEL_EXTS.has(rawExt)) {
    return { ok: false, reason: "Expected a 3D model file (glb, gltf)" };
  }

  /* 3. Decode base64 safely */
  let buf: Buffer;
  try {
    buf = Buffer.from(base64Data, "base64");
  } catch {
    return { ok: false, reason: "Invalid file data" };
  }

  if (buf.length === 0) {
    return { ok: false, reason: "File is empty" };
  }

  /* 4. Magic-byte check — actual content must match declared extension */
  const magic = MAGIC.find((m) => m.exts.includes(rawExt));
  if (!magic) {
    return { ok: false, reason: "Unsupported file type" };
  }

  if (!magic.check(buf)) {
    return {
      ok: false,
      reason: "File content does not match its declared extension. Upload rejected.",
    };
  }

  /* 5. Malicious-content scan (read-only; file is never executed) */
  const raw = buf.toString("latin1"); // preserves all byte values
  for (const pattern of MALICIOUS) {
    if (pattern.test(raw)) {
      return { ok: false, reason: "File contains disallowed or potentially malicious content" };
    }
  }

  /* 6. All checks passed — generate a safe UUID filename */
  const safeFileName = `${randomUUID()}${rawExt}`;

  return { ok: true, safeFileName, detectedMime: magic.mime };
}

/* ── Violation tracker + auto-block ─────────────────────────────────────── */
const BLOCK_AFTER_VIOLATIONS = 3;

/**
 * Increments uploadViolationCount for the admin.
 * If it reaches BLOCK_AFTER_VIOLATIONS, sets isActive=false (account blocked).
 * Returns true if the account was just blocked.
 */
export async function recordUploadViolation(
  userId: string,
  log?: { warn: (obj: object, msg: string) => void; error: (obj: object, msg: string) => void }
): Promise<boolean> {
  try {
    const updated = await User.findByIdAndUpdate(
      userId,
      { $inc: { uploadViolationCount: 1 } },
      { new: true, select: "uploadViolationCount isActive" }
    );

    if (!updated) return false;

    const count = updated.uploadViolationCount ?? 0;

    if (count >= BLOCK_AFTER_VIOLATIONS && updated.isActive !== false) {
      await User.findByIdAndUpdate(userId, { isActive: false });
      log?.warn(
        { userId, violations: count },
        "Admin account blocked: repeated invalid file upload attempts"
      );
      return true; // just blocked
    }
  } catch (err) {
    log?.error({ err }, "Failed to record upload violation");
  }
  return false;
}
