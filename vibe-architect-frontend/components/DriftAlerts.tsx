import * as React from "react"
import { DriftAlert } from "@/lib/types"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { AlertTriangle, Info, AlertCircle } from "lucide-react"
import { Badge } from "@/components/ui/badge"

interface DriftAlertsProps {
  alerts: DriftAlert[]
}

export function DriftAlerts({ alerts }: DriftAlertsProps) {
  if (alerts.length === 0) return null

  const getIcon = (severity: DriftAlert["severity"]) => {
    switch (severity) {
      case "error":
        return <AlertCircle className="h-4 w-4 text-rose-500" />
      case "warning":
        return <AlertTriangle className="h-4 w-4 text-amber-500" />
      default:
        return <Info className="h-4 w-4 text-blue-500" />
    }
  }

  const getBadgeVariant = (severity: DriftAlert["severity"]) => {
    switch (severity) {
      case "error":
        return "error"
      case "warning":
        return "warning"
      default:
        return "secondary"
    }
  }

  return (
    <Card className="border-amber-200 bg-amber-50 dark:bg-amber-950/20 dark:border-amber-900/50">
      <CardHeader className="py-3">
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          <AlertTriangle className="h-4 w-4 text-amber-500" />
          Drift Detected
          <Badge variant="outline" className="ml-auto">
            {alerts.length}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3 py-3">
        {alerts.map((alert) => (
          <div key={alert.id} className="flex gap-3 text-sm bg-background/50 p-2 rounded-md border">
            <div className="mt-0.5 shrink-0">
              {getIcon(alert.severity)}
            </div>
            <div className="flex-1 space-y-1">
              <div className="flex items-center justify-between">
                <span className="font-medium">{alert.resource}</span>
                <Badge variant={getBadgeVariant(alert.severity)} className="text-[10px] h-5 px-1.5">
                  {alert.severity}
                </Badge>
              </div>
              <p className="text-muted-foreground text-xs">
                {alert.recommendation}
              </p>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  )
}
