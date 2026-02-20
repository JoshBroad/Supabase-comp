"use client"

import * as React from "react"
import { useParams } from "next/navigation"
import { api } from "@/lib/api"
import { BuildSession, BuildEvent, PresenceState, SchemaNode, SchemaEdge, DriftAlert } from "@/lib/types"
import { supabase } from "@/lib/supabaseClient"
import { BuildTimeline } from "@/components/BuildTimeline"
import { PresenceBar } from "@/components/PresenceBar"
import { SchemaGraph2D } from "@/components/SchemaGraph2D"
import { SchemaGraph3D } from "@/components/SchemaGraph3D"
import { DriftAlerts } from "@/components/DriftAlerts"
import { ValidationPanel } from "@/components/ValidationPanel"
import { GraphQLExplorer } from "@/components/GraphQLExplorer"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Loader2, Database, ArrowLeft } from "lucide-react"

// Helper to derive schema from events
const deriveSchemaFromEvents = (events: BuildEvent[]) => {
  const nodes: SchemaNode[] = []
  const edges: SchemaEdge[] = []

  events.forEach(event => {
    if (event.type === 'entities_inferred') {
      // Clear previous nodes/edges if we get a fresh inference
      // nodes.length = 0
      // edges.length = 0
      // Actually, let's just add/update them
      const entities = event.payload?.entities || []
      entities.forEach((entity: any) => {
        if (!nodes.find(n => n.id === entity.name)) {
          nodes.push({
            id: entity.name,
            label: entity.name,
            type: 'table',
            meta: entity
          })
        }
        if (entity.foreignKeys) {
          entity.foreignKeys.forEach((fk: any) => {
             const edgeId = `fk_${entity.name}_${fk.targetTable}`
             if (!edges.find(e => e.id === edgeId)) {
               edges.push({
                 id: edgeId,
                 source: entity.name,
                 target: fk.targetTable,
                 label: fk.column
               })
             }
          })
        }
      })
    }
    
    if (event.type === 'table_created') {
      const tableName = event.payload?.name || `table_${event.id.substring(0,4)}`
      const existing = nodes.find(n => n.id === tableName)
      if (existing) {
        // Update meta with columnTypes from table_created event
        existing.meta = { ...existing.meta, ...event.payload }
      } else {
        nodes.push({
          id: tableName,
          label: tableName,
          type: 'table',
          meta: event.payload
        })
      }
      // If payload has foreign keys, add edges
      if (event.payload?.foreignKeys) {
        event.payload.foreignKeys.forEach((fk: any) => {
          edges.push({
            id: `fk_${tableName}_${fk.targetTable}`,
            source: tableName,
            target: fk.targetTable,
            label: fk.column
          })
        })
      }
    }
  })

  return { nodes, edges }
}

const deriveFocusFromEvent = (event: BuildEvent) => {
  if (event.type.includes('parsing')) return { type: 'Parsing', name: event.payload?.filename || 'files' }
  if (event.type.includes('schema') || event.type === 'table_created') return { type: 'Designing', name: 'Schema' }
  if (event.type.includes('sql') || event.type === 'data_inserted') return { type: 'Executing', name: 'SQL' }
  if (event.type === 'build_succeeded') return { type: 'Completed', name: 'Database Ready' }
  if (event.type === 'build_failed') return { type: 'Error', name: 'Build Failed' }
  return undefined
}


export default function BuildRoomPage() {
  const params = useParams()
  const sessionId = params.sessionId as string

  const [session, setSession] = React.useState<BuildSession | null>(null)
  const [events, setEvents] = React.useState<BuildEvent[]>([])
  const [presence, setPresence] = React.useState<PresenceState[]>([])
  const [schema, setSchema] = React.useState<{ nodes: SchemaNode[], edges: SchemaEdge[] }>({ nodes: [], edges: [] })
  const [driftAlerts, setDriftAlerts] = React.useState<DriftAlert[]>([])
  const [totalCost, setTotalCost] = React.useState(0)
  const [virtualArchitect, setVirtualArchitect] = React.useState<PresenceState | null>(null)
  const [loading, setLoading] = React.useState(true)
  const [activeTab, setActiveTab] = React.useState("2d")

  // Initial fetch
  React.useEffect(() => {
    const fetchData = async () => {
      try {
        const [sessionData, eventsData] = await Promise.all([
          api.getSession(sessionId),
          api.getEvents(sessionId)
        ])
        setSession(sessionData)
        setEvents(eventsData)
        setSchema(deriveSchemaFromEvents(eventsData))
        
        // Restore cost from events
        const lastCostEvent = [...eventsData].reverse().find(e => e.payload?.totalCost !== undefined)
        if (lastCostEvent?.payload?.totalCost) {
          setTotalCost(lastCostEvent.payload.totalCost)
        }

        // Restore virtual architect state from last event
        const lastEvent = eventsData[eventsData.length - 1]
        if (lastEvent) {
          setVirtualArchitect({
            actor: 'architect',
            step: lastEvent.message,
            progress: 0,
            focus: deriveFocusFromEvent(lastEvent)
          })
        }
      } catch (err) {
        console.error(err)
        // toast.error("Failed to load session")
      } finally {
        setLoading(false)
      }
    }

    if (sessionId) {
      fetchData()
    }
  }, [sessionId])

  // Realtime subscription
  React.useEffect(() => {
    if (!sessionId) return

    const channel = supabase.channel(`build:${sessionId}`)

    channel
      .on('presence', { event: 'sync' }, () => {
        const newState = channel.presenceState()
        const presenceList: PresenceState[] = []
        Object.values(newState).forEach((presences: any) => {
          presences.forEach((p: any) => {
             // Adapt presence payload to our type if needed
             if (p.actor) presenceList.push(p as PresenceState)
          })
        })
        setPresence(presenceList)
      })
      .on('broadcast', { event: 'build_event' }, (payload) => {
        const newEvent = payload.payload as BuildEvent
        setEvents(prev => {
          const newEvents = [...prev, newEvent]
          setSchema(deriveSchemaFromEvents(newEvents))
          return newEvents
        })
        
        // Update virtual architect
        setVirtualArchitect({
          actor: 'architect',
          step: newEvent.message,
          progress: 0,
          focus: deriveFocusFromEvent(newEvent)
        })

        if (newEvent.payload?.totalCost) {
          setTotalCost(newEvent.payload.totalCost)
        }
        
        if (newEvent.type === 'drift_detected') {
          setDriftAlerts(prev => [...prev, {
            id: newEvent.id,
            severity: 'warning',
            resource: 'Schema',
            recommendation: newEvent.message
          }])
        }
      })
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          await channel.track({
            actor: 'user',
            step: 'watching',
            progress: 0
          })
        }
      })

    return () => {
      supabase.removeChannel(channel)
    }
  }, [sessionId])

  const finalPresence = React.useMemo(() => {
    const architect = presence.find(p => p.actor === 'architect')
    if (architect) return presence
    
    // If no real architect presence, use virtual
    if (virtualArchitect) {
        return [virtualArchitect, ...presence]
    }
    return presence
  }, [presence, virtualArchitect])

  const architectPresence = finalPresence.find(p => p.actor === 'architect')

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  if (!session) {
    return (
      <div className="flex h-screen items-center justify-center flex-col gap-4">
        <h1 className="text-2xl font-bold">Session Not Found</h1>
        <Button variant="outline" onClick={() => window.location.href = '/'}>Go Home</Button>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-screen bg-background overflow-hidden">
      {/* Header / Presence Bar */}
      <PresenceBar presence={finalPresence} currentFocus={architectPresence?.focus} totalCost={totalCost} />

      <div className="flex-1 flex overflow-hidden">
        {/* Left Panel: Timeline */}
        <div className="w-80 md:w-96 border-r flex flex-col bg-muted/10">
          <BuildTimeline sessionId={sessionId} events={events} />
        </div>

        {/* Center/Right Panel: Visualization */}
        <div className="flex-1 flex flex-col relative">
          <div className="absolute top-4 right-4 z-10 flex items-center gap-2">
            {session.status === 'succeeded' && (
               <Button variant="outline" onClick={() => window.location.href = '/'} className="gap-2 shadow-lg">
                 <Database className="h-4 w-4" />
                 Database Ready
               </Button>
            )}
            <Tabs value={activeTab} onValueChange={setActiveTab} className={session.status === 'succeeded' ? "w-[300px]" : "w-[200px]"}>
              <TabsList className={session.status === 'succeeded' ? "grid w-full grid-cols-3" : "grid w-full grid-cols-2"}>
                <TabsTrigger value="2d">2D Graph</TabsTrigger>
                <TabsTrigger value="3d">3D Graph</TabsTrigger>
                {session.status === 'succeeded' && <TabsTrigger value="graphql">GraphQL</TabsTrigger>}
              </TabsList>
            </Tabs>
          </div>

          <div className="flex-1 bg-zinc-50/50 dark:bg-zinc-950/50 relative flex items-center justify-center">
            {activeTab === 'graphql' ? (
              <div className="w-full h-full overflow-auto p-6">
                <GraphQLExplorer tables={schema.nodes.map(n => n.label)} />
              </div>
            ) : schema.nodes.length === 0 ? (
              <div className="flex flex-col items-center gap-2 text-muted-foreground animate-pulse">
                <Loader2 className="h-8 w-8 animate-spin" />
                <span>Waiting for schema generation...</span>
              </div>
            ) : (
              activeTab === '2d' ? (
                <SchemaGraph2D
                  nodes={schema.nodes}
                  edges={schema.edges}
                  activeFocus={architectPresence?.focus}
                />
              ) : (
                <SchemaGraph3D
                  nodes={schema.nodes}
                  edges={schema.edges}
                  activeFocus={architectPresence?.focus}
                />
              )
            )}
          </div>

          {/* Validation Panel */}
          <div className="absolute bottom-4 left-4 w-72 z-20">
            <ValidationPanel events={events} />
          </div>

          {/* Drift Alerts Overlay */}
          {driftAlerts.length > 0 && (
            <div className="absolute bottom-4 right-4 w-80 z-20">
              <DriftAlerts alerts={driftAlerts} />
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
