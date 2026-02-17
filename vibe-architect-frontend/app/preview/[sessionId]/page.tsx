"use client"

import * as React from "react"
import { useParams, useRouter } from "next/navigation"
import { PreviewTabs } from "@/components/PreviewTabs"
import { Button } from "@/components/ui/button"
import { ArrowLeft } from "lucide-react"

export default function PreviewPage() {
  const params = useParams()
  const router = useRouter()
  const sessionId = params.sessionId as string

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 p-4 md:p-8">
      <div className="max-w-5xl mx-auto space-y-8">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" onClick={() => router.push(`/build/${sessionId}`)}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Build Room
          </Button>
          <h1 className="text-2xl font-bold">App Preview</h1>
        </div>

        <div className="grid gap-8">
          <div className="bg-background rounded-xl border p-8 shadow-sm">
            <div className="text-center mb-8">
              <h2 className="text-3xl font-bold tracking-tight">Your Generated App</h2>
              <p className="text-muted-foreground mt-2">
                This is a live preview of your application connected to the provisioned backend.
              </p>
            </div>
            
            <PreviewTabs sessionId={sessionId} />
          </div>
        </div>
      </div>
    </div>
  )
}
