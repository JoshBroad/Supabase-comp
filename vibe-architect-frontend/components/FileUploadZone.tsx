"use client"

import * as React from "react"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Upload, FileText, FileJson, FileCode, X, FileSpreadsheet, LucideProps } from "lucide-react"

interface FileUploadZoneProps {
  files: File[]
  onFilesChange: (files: File[]) => void
  maxFiles?: number
}

type IconComponent = React.ForwardRefExoticComponent<Omit<LucideProps, "ref"> & React.RefAttributes<SVGSVGElement>>

const FILE_ICONS: Record<string, IconComponent> = {
  csv: FileSpreadsheet,
  json: FileJson,
  xml: FileCode,
  txt: FileText,
}

function getFileIcon(filename: string): IconComponent {
  const ext = filename.split(".").pop()?.toLowerCase() || ""
  return FILE_ICONS[ext] || FileText
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

export function FileUploadZone({ files, onFilesChange, maxFiles = 10 }: FileUploadZoneProps) {
  const [isDragging, setIsDragging] = React.useState(false)
  const inputRef = React.useRef<HTMLInputElement>(null)

  const addFiles = (newFiles: FileList | File[]) => {
    const arr = Array.from(newFiles)
    const accepted = arr.filter((f) => {
      const ext = f.name.split(".").pop()?.toLowerCase()
      return ["csv", "json", "xml", "txt"].includes(ext || "")
    })
    const merged = [...files, ...accepted].slice(0, maxFiles)
    onFilesChange(merged)
  }

  const removeFile = (index: number) => {
    onFilesChange(files.filter((_, i) => i !== index))
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
    if (e.dataTransfer.files.length > 0) {
      addFiles(e.dataTransfer.files)
    }
  }

  return (
    <div className="space-y-4">
      {/* Drop zone */}
      <Card
        className={`relative border-2 border-dashed p-8 text-center cursor-pointer transition-colors ${
          isDragging
            ? "border-primary bg-primary/5"
            : "border-muted-foreground/25 hover:border-primary/50"
        }`}
        onDragOver={(e) => { e.preventDefault(); setIsDragging(true) }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={handleDrop}
        onClick={() => inputRef.current?.click()}
      >
        <input
          ref={inputRef}
          type="file"
          multiple
          accept=".csv,.json,.xml,.txt"
          className="hidden"
          onChange={(e) => e.target.files && addFiles(e.target.files)}
        />
        <Upload className="mx-auto h-10 w-10 text-muted-foreground mb-3" />
        <p className="text-sm font-medium">Drop files here or click to browse</p>
        <p className="text-xs text-muted-foreground mt-1">
          CSV, JSON, XML, TXT — up to {maxFiles} files
        </p>
      </Card>

      {/* File list */}
      {files.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium">
              {files.length} file{files.length !== 1 ? "s" : ""} selected
            </p>
            <Button variant="ghost" size="sm" onClick={() => onFilesChange([])}>
              Clear all
            </Button>
          </div>
          {files.map((file, i) => {
            const Icon = getFileIcon(file.name)
            const ext = file.name.split(".").pop()?.toUpperCase() || "?"
            return (
              <div
                key={`${file.name}-${i}`}
                className="flex items-center gap-3 px-3 py-2 rounded-lg bg-muted/50 group"
              >
                <Icon className="h-5 w-5 text-muted-foreground shrink-0" />
                <span className="text-sm font-mono truncate flex-1">{file.name}</span>
                <Badge variant="outline" className="text-xs shrink-0">{ext}</Badge>
                <span className="text-xs text-muted-foreground shrink-0">{formatBytes(file.size)}</span>
                <button
                  onClick={(e) => { e.stopPropagation(); removeFile(i) }}
                  className="opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded hover:bg-muted"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
