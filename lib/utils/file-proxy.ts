import type { SubmittedFile } from "@/lib/types"

/**
 * Firebase Storage URLs are always direct & permanent - no proxy needed at all.
 * These functions just return the url as-is.
 */

export function toProxyViewUrl(file: SubmittedFile): string {
  return file.url || ""
}

export function toProxyDownloadUrl(file: SubmittedFile): string {
  return file.downloadUrl || file.url || ""
}
