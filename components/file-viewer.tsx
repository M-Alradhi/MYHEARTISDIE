"use client"

import { useState } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Download, FileIcon, ImageIcon, X, Loader2, Eye, ExternalLink } from "lucide-react"
import type { SubmittedFile } from "@/lib/types"

interface FileViewerProps {
  files: SubmittedFile[]
  title?: string
}

function isPdfFile(file: SubmittedFile): boolean {
  return (
    file.type === "application/pdf" ||
    file.name?.toLowerCase().endsWith(".pdf") ||
    false
  )
}

function handleDownload(file: SubmittedFile) {
  const href = file.downloadUrl || file.url
  if (!href) return
  const a = document.createElement("a")
  a.href = href
  a.download = file.name
  a.target = "_blank"
  a.rel = "noopener noreferrer"
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
}

function PdfViewer({ file }: { file: SubmittedFile }) {
  const [loadError, setLoadError] = useState(false)
  const [loading, setLoading] = useState(true)
  const url = file.url

  if (loadError) {
    return (
      <div className="flex flex-col items-center justify-center py-12 gap-4">
        <FileIcon className="w-16 h-16 text-muted-foreground" />
        <p className="text-sm text-muted-foreground text-center">تعذّر عرض PDF في المتصفح</p>
        <div className="flex gap-2 flex-wrap justify-center">
          <Button variant="outline" className="gap-2" onClick={() => window.open(url, "_blank", "noopener,noreferrer")}>
            <ExternalLink className="w-4 h-4" />فتح في تبويب جديد
          </Button>
          <Button className="gap-2" onClick={() => handleDownload(file)}>
            <Download className="w-4 h-4" />تحميل الملف
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="relative w-full" style={{ height: "70vh", minHeight: 400 }}>
      {loading && (
        <div className="absolute inset-0 flex items-center justify-center bg-muted/30 rounded-lg z-10">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      )}
      <iframe
        src={`${url}#toolbar=1&navpanes=1`}
        className="w-full h-full rounded-lg border bg-white"
        title={file.name}
        onLoad={() => setLoading(false)}
        onError={() => { setLoading(false); setLoadError(true) }}
        allow="fullscreen"
      />
    </div>
  )
}

export function FileViewer({ files, title = "الملفات المرفقة" }: FileViewerProps) {
  const [selectedFile, setSelectedFile] = useState<SubmittedFile | null>(null)
  const [downloading, setDownloading] = useState<string | null>(null)

  const formatFileSize = (bytes: number) => {
    if (!bytes) return ""
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  }

  return (
    <>
      <div className="space-y-2">
        <p className="text-sm font-medium">{title} ({files.length}):</p>
        <div className="grid gap-2 sm:grid-cols-2">
          {files.map((file, index) => {
            const isPdf = isPdfFile(file)
            return (
              <div key={index} className="flex items-center gap-3 p-3 bg-card rounded-lg border hover:border-primary/50 transition-colors">
                {file.isImage
                  ? <ImageIcon className="w-5 h-5 text-blue-500 flex-shrink-0" />
                  : <FileIcon className="w-5 h-5 text-red-500 flex-shrink-0" />}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{file.name}</p>
                  {file.size ? <p className="text-xs text-muted-foreground">{formatFileSize(file.size)}</p> : null}
                </div>
                <div className="flex items-center gap-1 flex-shrink-0">
                  {(isPdf || file.isImage) && (
                    <Button variant="ghost" size="sm" title="عرض" onClick={() => setSelectedFile(file)}>
                      <Eye className="w-4 h-4" />
                    </Button>
                  )}
                  <Button
                    variant="ghost"
                    size="sm"
                    title="تحميل"
                    disabled={downloading === file.name}
                    onClick={(e) => {
                      e.stopPropagation()
                      setDownloading(file.name)
                      handleDownload(file)
                      setTimeout(() => setDownloading(null), 1500)
                    }}
                  >
                    {downloading === file.name
                      ? <Loader2 className="w-4 h-4 animate-spin" />
                      : <Download className="w-4 h-4" />}
                  </Button>
                </div>
              </div>
            )
          })}
        </div>
      </div>

      <Dialog open={!!selectedFile} onOpenChange={() => setSelectedFile(null)}>
        <DialogContent className="w-[95vw] max-w-4xl max-h-[95vh] p-4 overflow-hidden flex flex-col">
          <DialogHeader className="flex-shrink-0">
            <DialogTitle className="flex items-center justify-between gap-2 pr-2">
              <span className="truncate text-sm font-medium">{selectedFile?.name}</span>
              <div className="flex items-center gap-1 flex-shrink-0">
                {selectedFile && (
                  <Button variant="ghost" size="sm" title="فتح في تبويب جديد"
                    onClick={() => window.open(selectedFile.url, "_blank", "noopener,noreferrer")}>
                    <ExternalLink className="w-4 h-4" />
                  </Button>
                )}
                {selectedFile && (
                  <Button variant="ghost" size="sm" title="تحميل"
                    disabled={downloading === selectedFile.name}
                    onClick={() => {
                      if (!selectedFile) return
                      setDownloading(selectedFile.name)
                      handleDownload(selectedFile)
                      setTimeout(() => setDownloading(null), 1500)
                    }}>
                    {downloading === selectedFile.name
                      ? <Loader2 className="w-4 h-4 animate-spin" />
                      : <Download className="w-4 h-4" />}
                  </Button>
                )}
                <Button variant="ghost" size="sm" onClick={() => setSelectedFile(null)}>
                  <X className="w-4 h-4" />
                </Button>
              </div>
            </DialogTitle>
          </DialogHeader>

          <div className="flex-1 overflow-auto min-h-0">
            {selectedFile?.isImage ? (
              <div className="flex items-center justify-center p-4 bg-muted/20 rounded-lg">
                <img
                  src={selectedFile.url || "/placeholder.svg"}
                  alt={selectedFile.name}
                  className="max-w-full max-h-[70vh] object-contain rounded"
                />
              </div>
            ) : selectedFile && isPdfFile(selectedFile) ? (
              <PdfViewer file={selectedFile} />
            ) : (
              <div className="text-center py-12">
                <FileIcon className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
                <p className="text-sm text-muted-foreground mb-4">معاينة هذا النوع من الملفات غير متاحة</p>
                <div className="flex gap-2 justify-center flex-wrap">
                  <Button variant="outline" className="gap-2"
                    onClick={() => selectedFile && window.open(selectedFile.url, "_blank", "noopener,noreferrer")}>
                    <ExternalLink className="w-4 h-4" />فتح في تبويب جديد
                  </Button>
                  <Button className="gap-2"
                    onClick={() => { if (selectedFile) handleDownload(selectedFile) }}>
                    <Download className="w-4 h-4" />تحميل الملف
                  </Button>
                </div>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}
