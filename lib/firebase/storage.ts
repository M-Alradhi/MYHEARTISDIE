/**
 * Firebase Storage - unified upload for ALL files (images + PDFs + docs)
 * replaces ImgBB + Cloudinary completely
 */

import { ref, uploadBytesResumable, getDownloadURL, deleteObject } from "firebase/storage"
import { getFirebaseStorage } from "./config"
import { isFileSafeToUpload, sanitizeFileName } from "@/lib/utils/file-helpers"

export interface StorageUploadResult {
  url: string         // direct Firebase Storage URL (permanent, no proxy needed)
  downloadUrl: string // same url - Firebase URLs always work as download too
  path: string        // storage path e.g. "uploads/uid/timestamp_file.pdf"
  name: string
  size: number
  type: string
  isImage: boolean
}

const ALLOWED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/gif", "image/webp", "image/bmp"]
const ALLOWED_IMAGE_EXTENSIONS = [".jpg", ".jpeg", ".png", ".gif", ".webp", ".bmp"]

export function isImageFile(file: File): boolean {
  const mimeCheck = ALLOWED_IMAGE_TYPES.includes(file.type)
  const extCheck = ALLOWED_IMAGE_EXTENSIONS.some((ext) => file.name.toLowerCase().endsWith(ext))
  return mimeCheck && extCheck
}

/**
 * Upload any file (image or document) to Firebase Storage.
 * Returns a permanent public download URL.
 */
export async function uploadFileToStorage(
  file: File,
  userId: string,
  folder: string = "uploads",
  onProgress?: (progress: number) => void
): Promise<StorageUploadResult> {
  const safetyCheck = isFileSafeToUpload(file)
  if (!safetyCheck.safe) {
    throw new Error(safetyCheck.reason || "نوع الملف غير مسموح به")
  }

  const storage = getFirebaseStorage()
  const safeName = sanitizeFileName(file.name)
  const timestamp = Date.now()
  const path = `${folder}/${userId}/${timestamp}_${safeName}`
  const storageRef = ref(storage, path)

  await new Promise<void>((resolve, reject) => {
    const uploadTask = uploadBytesResumable(storageRef, file, {
      contentType: file.type,
      customMetadata: {
        originalName: file.name,
        uploadedBy: userId,
      },
    })

    uploadTask.on(
      "state_changed",
      (snapshot) => {
        const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100
        onProgress?.(Math.round(progress))
      },
      (error) => reject(new Error(`فشل رفع الملف: ${error.message}`)),
      () => resolve()
    )
  })

  const url = await getDownloadURL(storageRef)

  return {
    url,
    downloadUrl: url,
    path,
    name: safeName,
    size: file.size,
    type: file.type,
    isImage: isImageFile(file),
  }
}

/**
 * Delete a file from Firebase Storage by its path
 */
export async function deleteFileFromStorage(path: string): Promise<void> {
  try {
    const storage = getFirebaseStorage()
    const storageRef = ref(storage, path)
    await deleteObject(storageRef)
  } catch (error) {
    console.error("Error deleting file from storage:", error)
  }
}

// Keep legacy exports for backward compatibility
export { isFileSafeToUpload }
