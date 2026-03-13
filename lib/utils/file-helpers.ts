/**
 * Shared file validation helpers (previously split between imgbb.ts and cloudinary.ts)
 */

const BLOCKED_EXTENSIONS = [
  ".exe", ".bat", ".cmd", ".com", ".msi", ".scr", ".pif",
  ".js", ".vbs", ".wsf", ".wsh", ".ps1", ".sh", ".bash",
  ".php", ".asp", ".aspx", ".jsp", ".cgi", ".py", ".pl",
  ".html", ".htm",
]

export function isFileSafeToUpload(file: File): { safe: boolean; reason?: string } {
  const fileName = file.name.toLowerCase()

  const isBlocked = BLOCKED_EXTENSIONS.some((ext) => fileName.endsWith(ext))
  if (isBlocked) return { safe: false, reason: "نوع الملف غير مسموح به" }

  const parts = fileName.split(".")
  if (parts.length > 2) {
    const lastExt = `.${parts[parts.length - 1]}`
    if (BLOCKED_EXTENSIONS.includes(lastExt)) {
      return { safe: false, reason: "نوع الملف غير مسموح به" }
    }
  }

  if (file.name.includes("\0") || file.name.includes("..")) {
    return { safe: false, reason: "اسم الملف غير صالح" }
  }

  return { safe: true }
}

export function sanitizeFileName(name: string): string {
  return name
    .replace(/[^\w.\-\u0600-\u06FF]/g, "_")
    .replace(/\.{2,}/g, ".")
    .replace(/^\./, "_")
    .slice(0, 100)
}

export function formatFileSize(bytes: number): string {
  if (!bytes) return ""
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

export function isPdfFile(file: { type?: string; name?: string; url?: string }): boolean {
  return (
    file.type === "application/pdf" ||
    file.name?.toLowerCase().endsWith(".pdf") ||
    file.url?.toLowerCase().includes(".pdf") ||
    false
  )
}
