"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { FileUploadZone } from "@/components/FileUploadZone"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { api } from "@/lib/api"
import { supabase } from "@/lib/supabaseClient"
import { Loader2, Database, Upload, Sparkles } from "lucide-react"

const SAMPLE_FILES = [
  "customers.csv",
  "orders.json",
  "products.xml",
  "inventory_log.txt",
  "reviews.csv",
  "shipping.json",
  "categories.csv",
  "payments.txt",
  "returns.xml",
  "employee_notes.json",
]

export default function HomePage() {
  const router = useRouter()
  const [files, setFiles] = React.useState<File[]>([])
  const [loading, setLoading] = React.useState(false)
  const [loadingSample, setLoadingSample] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)

  const loadSampleData = async () => {
    setLoadingSample(true)
    setError(null)
    try {
      const sampleFiles: File[] = []
      for (const name of SAMPLE_FILES) {
        const res = await fetch(`/sample-data/${name}`)
        if (!res.ok) throw new Error(`Failed to load ${name}`)
        const blob = await res.blob()
        sampleFiles.push(new File([blob], name))
      }
      setFiles(sampleFiles)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load sample data")
    } finally {
      setLoadingSample(false)
    }
  }

  const startAnalysis = async () => {
    if (files.length === 0) return
    setLoading(true)
    setError(null)

    try {
      // Generate a temporary session ID for upload paths
      const tempId = crypto.randomUUID()

      // Upload files to Supabase Storage
      const fileKeys: string[] = []
      for (const file of files) {
        const path = `${tempId}/${file.name}`
        const { error: uploadError } = await supabase.storage
          .from("uploads")
          .upload(path, file)

        if (uploadError) {
          console.error(`Upload failed for ${file.name}:`, uploadError)
          // Fall back to using local filenames (agent can read from sample-data/)
          fileKeys.push(file.name)
        } else {
          fileKeys.push(path)
        }
      }

      // Create session
      const { sessionId } = await api.createSession(fileKeys)

      // Trigger agent
      await api.triggerAgent(sessionId, fileKeys)

      // Navigate to build room
      router.push(`/build/${sessionId}`)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to start analysis")
      setLoading(false)
    }
  }

  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-4 md:p-24 bg-zinc-50 dark:bg-zinc-950">
      <div className="w-full max-w-2xl space-y-8">
        {/* Header */}
        <div className="text-center space-y-3">
          <div className="flex items-center justify-center gap-3">
            <Database className="h-10 w-10 text-primary" />
            <h1 className="text-4xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50 sm:text-5xl">
              Data Lake <span className="text-primary">&rarr;</span> SQL
            </h1>
          </div>
          <p className="text-muted-foreground text-lg">
            Upload messy data files. Watch an AI agent build a normalized database.
          </p>
        </div>

        {/* Upload Card */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Upload className="h-5 w-5" />
              Upload Data Files
            </CardTitle>
            <CardDescription>
              Drop your CSV, JSON, XML, and text files. The agent will analyze them,
              infer entities and relationships, and build a SQL database.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <FileUploadZone files={files} onFilesChange={setFiles} />

            <div className="flex items-center gap-2">
              <div className="flex-1 border-t" />
              <span className="text-xs text-muted-foreground">or</span>
              <div className="flex-1 border-t" />
            </div>

            <Button
              variant="outline"
              className="w-full"
              onClick={loadSampleData}
              disabled={loadingSample || loading}
            >
              {loadingSample ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <Sparkles className="h-4 w-4 mr-2" />
              )}
              Load Sample E-Commerce Data (10 files)
            </Button>

            {error && (
              <p className="text-sm text-destructive">{error}</p>
            )}

            <Button
              className="w-full"
              size="lg"
              onClick={startAnalysis}
              disabled={files.length === 0 || loading}
            >
              {loading ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <Database className="h-4 w-4 mr-2" />
              )}
              {loading ? "Starting Analysis..." : `Analyze ${files.length} File${files.length !== 1 ? "s" : ""} & Build Database`}
            </Button>
          </CardContent>
        </Card>

        {/* Footer */}
        <p className="text-center text-sm text-muted-foreground">
          Powered by Supabase, LangGraph, and Claude.
        </p>
      </div>
    </main>
  )
}
