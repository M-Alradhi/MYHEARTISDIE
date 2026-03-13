/**
 * @deprecated Cloudinary is no longer used. All uploads go to Firebase Storage.
 * This file is kept only for backward compatibility with any old imports.
 * Safe to delete once all references are removed.
 */

export interface CloudinaryUploadResponse {
  success: boolean
  url: string
  downloadUrl?: string
  publicId: string
  size: number
  name?: string
  contentType?: string
}

// @deprecated - use uploadFileToStorage from lib/firebase/storage instead
export async function uploadToCloudinary(file: File, name?: string): Promise<CloudinaryUploadResponse> {
  throw new Error("Cloudinary is deprecated. Use uploadFileToStorage from lib/firebase/storage instead.")
}
