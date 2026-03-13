/**
 * @deprecated ImgBB is no longer used. All uploads go to Firebase Storage.
 * This file is kept only for backward compatibility with any old imports.
 * Safe to delete once all references are removed.
 */

export function isImageFile(file: File): boolean {
  const ALLOWED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/gif", "image/webp", "image/bmp"]
  const ALLOWED_IMAGE_EXTENSIONS = [".jpg", ".jpeg", ".png", ".gif", ".webp", ".bmp"]
  return ALLOWED_IMAGE_TYPES.includes(file.type) &&
    ALLOWED_IMAGE_EXTENSIONS.some((ext) => file.name.toLowerCase().endsWith(ext))
}

export function isFileSafeToUpload(file: File): { safe: boolean; reason?: string } {
  const BLOCKED = [".exe",".bat",".cmd",".js",".vbs",".php",".asp",".html",".htm"]
  const name = file.name.toLowerCase()
  if (BLOCKED.some((ext) => name.endsWith(ext))) return { safe: false, reason: "نوع الملف غير مسموح به" }
  if (file.name.includes("\0") || file.name.includes("..")) return { safe: false, reason: "اسم الملف غير صالح" }
  return { safe: true }
}

export function sanitizeFileName(name: string): string {
  return name.replace(/[^\w.\-\u0600-\u06FF]/g, "_").replace(/\.{2,}/g, ".").replace(/^\./, "_").slice(0, 100)
}

export function validateImageSize(file: File, maxSizeMB = 50): boolean {
  return file.size <= maxSizeMB * 1024 * 1024
}

// @deprecated - use uploadFileToStorage from lib/firebase/storage instead
export async function uploadToImgBB(file: File): Promise<any> {
  throw new Error("ImgBB is deprecated. Use uploadFileToStorage from lib/firebase/storage instead.")
}
