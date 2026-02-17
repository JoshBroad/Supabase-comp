import * as React from "react"
import { BuildEvent } from "@/lib/types"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import { CheckCircle2, AlertCircle, Info, Activity, Terminal } from "lucide-react"

// Since I didn't implement ScrollArea yet, I'll use a div with overflow-y-auto
// Or I can implement ScrollArea from Radix. I'll stick to div for simplicity.

interface BuildTimelineProps {
  sessionId: string
  events: BuildEvent[]
}

export function BuildTimeline({ sessionId, events }: BuildTimelineProps) {
  const scrollRef = React.useRef<HTMLDivElement>(null)

  React.useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [events])

  const getEventIcon = (type: BuildEvent["type"]) => {
    switch (type) {
      case "build_succeeded":
        return <CheckCircle2 className="h-4 w-4 text-emerald-500" />
      case "build_failed":
        return <AlertCircle className="h-4 w-4 text-rose-500" />
      case "drift_detected":
        return <AlertCircle className="h-4 w-4 text-amber-500" />
      case "plan_created":
      case "environment_created":
        return <Activity className="h-4 w-4 text-blue-500" />
      default:
        return <Terminal className="h-4 w-4 text-muted-foreground" />
    }
  }

  const getEventBadgeVariant = (type: BuildEvent["type"]) => {
    switch (type) {
      case "build_succeeded":
        return "success"
      case "build_failed":
        return "error"
      case "drift_detected":
        return "warning"
      default:
        return "secondary"
    }
  }

  return (
    <Card className="h-full flex flex-col">
      <CardHeader className="py-4">
        <CardTitle className="text-lg flex items-center gap-2">
          <Terminal className="h-5 w-5" />
          Build Timeline
        </CardTitle>
      </CardHeader>
      <CardContent className="flex-1 overflow-hidden p-0 relative">
        <div 
          ref={scrollRef}
          className="h-full overflow-y-auto p-4 space-y-4"
        >
          {events.length === 0 ? (
            <div className="text-center text-muted-foreground py-8 text-sm">
              Waiting for build events...
            </div>
          ) : (
            events.map((event) => (
              <div key={event.id} className="flex gap-3 text-sm animate-in fade-in slide-in-from-bottom-2 duration-300">
                <div className="mt-0.5 shrink-0">
                  {getEventIcon(event.type)}
                </div>
                <div className="flex-1 space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="font-medium text-foreground">
                      {event.type.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')}
                    </span>
                    <span className="text-xs text-muted-foreground font-mono">
                      {new Date(event.ts).toLocaleTimeString()}
                    </span>
                  </div>
                  <p className="text-muted-foreground leading-relaxed">
                    {event.message}
                  </p>
                  {event.payload && (
                    <div className="mt-2 rounded-md bg-muted p-2 text-xs font-mono overflow-x-auto">
                      <pre>{JSON.stringify(event.payload, null, 2)}</pre>
                    </div>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </CardContent>
    </Card>
  )
}
