import * as React from "react"
import { PresenceState } from "@/lib/types"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import { User, Cpu } from "lucide-react"

interface PresenceBarProps {
  presence: PresenceState[]
  currentFocus?: { type: string; name: string }
  totalCost?: number
}

export function PresenceBar({ presence, currentFocus, totalCost = 0 }: PresenceBarProps) {
  // Filter for architect and users
  const architect = presence.find(p => p.actor === 'architect')
  const users = presence.filter(p => p.actor === 'user')

  return (
    <div className="flex items-center justify-between w-full h-16 px-4 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b z-10 sticky top-0">
      <div className="flex items-center gap-4">
        {architect ? (
          <div className="flex items-center gap-2">
            <div className="relative">
              <div className="h-8 w-8 rounded-full bg-primary flex items-center justify-center text-primary-foreground">
                <Cpu className="h-4 w-4" />
              </div>
              <span className="absolute bottom-0 right-0 block h-2.5 w-2.5 rounded-full bg-emerald-500 ring-2 ring-background" />
            </div>
            <div className="flex flex-col">
              <span className="text-sm font-medium leading-none">Data Lake Agent</span>
              <span className="text-xs text-muted-foreground animate-pulse">
                {architect.step || "Thinking..."}
              </span>
            </div>
          </div>
        ) : (
          <div className="flex items-center gap-2 opacity-50">
            <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center">
              <Cpu className="h-4 w-4 text-muted-foreground" />
            </div>
            <span className="text-sm text-muted-foreground">Architect offline</span>
          </div>
        )}

        {currentFocus && (
          <Badge variant="outline" className="ml-4 gap-1">
            <span className="text-muted-foreground">Focus:</span>
            <span className="font-medium">{currentFocus.type} / {currentFocus.name}</span>
          </Badge>
        )}

        {(totalCost || 0) > 0 && (
          <Badge variant="secondary" className="ml-4 gap-1 font-mono">
            <span className="text-muted-foreground">Cost:</span>
            <span>${(totalCost || 0).toFixed(4)}</span>
          </Badge>
        )}
      </div>

      <div className="flex items-center -space-x-2">
        {users.map((user, i) => (
          <div key={i} className="relative group">
            <div className="h-8 w-8 rounded-full bg-secondary border-2 border-background flex items-center justify-center text-secondary-foreground" title="User">
              <User className="h-4 w-4" />
            </div>
          </div>
        ))}
        {users.length === 0 && (
          <span className="text-xs text-muted-foreground">No other users</span>
        )}
      </div>
    </div>
  )
}
