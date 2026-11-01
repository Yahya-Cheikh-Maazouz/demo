// Upload rules shared by the browser (instant feedback) and the Server Action (the real check).
// The backend applies them again and runs the antivirus: the browser is never trusted.

import { formatFileSize } from "@/lib/format";

export const MAX_FILE_BYTES = 10 * 1024 * 1024;
/** Non-breaking space: "10" and "Mo" never land on two lines. */
export const MAX_FILE_LABEL = "10 Mo";

/** For <input type="file" accept>. No `capture`: the student chooses between camera and files. */
export const ACCEPT_ATTRIBUTE = ".pdf,.jpg,.jpeg,.png,application/pdf,image/jpeg,image/png";

export type FileKind = "pdf" | "jpg" | "png";

const KIND_BY_TYPE: Record<string, FileKind> = {
  "application/pdf": "pdf",
  "image/jpeg": "jpg",
  "image/png": "png",
};

const KIND_BY_EXTENSION: Record<string, FileKind> = { pdf: "pdf", jpg: "jpg", jpeg: "jpg", png: "png" };

export const FILE_KIND_LABEL: Record<FileKind, string> = { pdf: "PDF", jpg: "JPG", png: "PNG" };

function extensionOf(name: string): string {
  const dot = name.lastIndexOf(".");
  return dot === -1 ? "" : name.slice(dot + 1).toLowerCase();
}

/**
 * Declared kind of a file. The MIME type wins; the extension decides when the browser gives no type
 * or a generic one (some Android file pickers send "application/octet-stream" for a PDF).
 * The Server Action reads the first bytes anyway.
 */
export function fileKind(file: { name: string; type: string }): FileKind | null {
  const byType = KIND_BY_TYPE[file.type];
  if (byType) return byType;
  if (file.type && file.type !== "application/octet-stream") return null;
  return KIND_BY_EXTENSION[extensionOf(file.name)] ?? null;
}

/** Ready-to-display reason why a file cannot be sent, or null when it can. */
export function checkFile(file: { name: string; type: string; size: number }): string | null {
  if (!fileKind(file)) return "Ce format n'est pas accepté. Envoyez un fichier PDF, JPG ou PNG.";
  if (file.size === 0) return "Ce fichier est vide. Choisissez-en un autre.";
  if (file.size > MAX_FILE_BYTES) {
    return `Ce fichier pèse ${formatFileSize(file.size)} : la taille maximale est de ${MAX_FILE_LABEL}. Réduisez-le ou prenez une photo moins lourde.`;
  }
  return null;
}

/** Kind read from the first bytes of the file, whatever its name or declared type says. */
export function sniffFileKind(head: Uint8Array): FileKind | null {
  const starts = (...bytes: number[]) => bytes.every((byte, i) => head[i] === byte);
  if (starts(0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a)) return "png";
  if (starts(0xff, 0xd8, 0xff)) return "jpg";
  // The PDF header may come after a few bytes of junk (up to 1 024 per the spec).
  const text = String.fromCharCode(...head.subarray(0, 1024));
  if (text.includes("%PDF-")) return "pdf";
  return null;
}

/** Keeps the base name only (some browsers send a path) and caps its length. */
export function cleanFileName(name: string): string {
  const base = name.split(/[\\/]/).pop()?.trim() ?? "";
  const safe = Array.from(base)
    .filter((char) => char.charCodeAt(0) >= 0x20 && char.charCodeAt(0) !== 0x7f)
    .join("");
  if (safe.length <= 120) return safe || "document";
  const ext = extensionOf(safe);
  return `${safe.slice(0, 110)}…${ext ? `.${ext}` : ""}`;
}
