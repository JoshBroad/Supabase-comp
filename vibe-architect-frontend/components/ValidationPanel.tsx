"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { AlertTriangle, CheckCircle2, RotateCcw } from "lucide-react"
import type { BuildEvent } from "@/lib/types"

interface ValidationPanelProps {
  events: BuildEvent[]
}

export function ValidationPanel({ events }: ValidationPanelProps) {
  const validationEvents = events.filter(
    (e) => e.type === "validation_complete" || e.type === "schema_corrected"
  )

  if (validationEvents.length === 0) return null

  const lastValidation = [...events]
    .reverse()
    .find((e) => e.type === "validation_complete")

  const corrections = events.filter((e) => e.type === "schema_corrected")
  const issueCount = lastValidation?.payload?.issueCount ?? 0
  const errorCount = lastValidation?.payload?.errorCount ?? 0
  const passed = issueCount === 0

  return (
    <Card className="w-full">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm flex items-center gap-2">
          {passed ? (
            <CheckCircle2 className="h-4 w-4 text-green-500" />
          ) : (
            <AlertTriangle className="h-4 w-4 text-yellow-500" />
          )}
          Schema Validation
          {corrections.length > 0 && (
            <Badge variant="outline" className="ml-auto text-xs">
              <RotateCcw className="h-3 w-3 mr-1" />
              {corrections.length} correction{corrections.length !== 1 ? "s" : ""}
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-0">
        {passed ? (
          <p className="text-xs text-green-600">All checks passed</p>
        ) : (
          <p className="text-xs text-muted-foreground">
            {errorCount} error{errorCount !== 1 ? "s" : ""}, {issueCount - errorCount} warning{issueCount - errorCount !== 1 ? "s" : ""}
          </p>
        )}
      </CardContent>
    </Card>
  )
}
