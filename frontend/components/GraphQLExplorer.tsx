"use client"

import * as React from "react"
import { Button } from "@/components/ui/button"
import { Loader2, Play, ChevronDown, ChevronUp, ExternalLink } from "lucide-react"

const AGENT_URL = process.env.NEXT_PUBLIC_AGENT_URL || "http://localhost:3001"

const DEFAULT_QUERY = `{
  __schema {
    queryType { name }
    types {
      name
      kind
    }
  }
}`

interface GraphQLExplorerProps {
  tables?: string[]
}

export function GraphQLExplorer({ tables }: GraphQLExplorerProps) {
  const [query, setQuery] = React.useState(() => {
    if (tables && tables.length > 0) {
      const collectionName = `${tables[0]}Collection`
      return `{
  ${collectionName}(first: 5) {
    edges {
      node {
        nodeId
      }
    }
  }
}`
    }
    return DEFAULT_QUERY
  })
  const [variables, setVariables] = React.useState("{}")
  const [result, setResult] = React.useState<string>("")
  const [loading, setLoading] = React.useState(false)
  const [showVars, setShowVars] = React.useState(false)

  const runQuery = async () => {
    setLoading(true)
    setResult("")
    try {
      let parsedVars = {}
      try {
        parsedVars = JSON.parse(variables)
      } catch {
        // ignore parse error, send empty
      }

      const response = await fetch(`${AGENT_URL}/graphql`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query, variables: parsedVars }),
      })
      const data = await response.json()
      setResult(JSON.stringify(data, null, 2))
    } catch (err) {
      setResult(JSON.stringify({ error: err instanceof Error ? err.message : "Request failed" }, null, 2))
    } finally {
      setLoading(false)
    }
  }

  const studioUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    ? `${process.env.NEXT_PUBLIC_SUPABASE_URL.replace(/\/+$/, "")}`
    : "http://localhost:54323"

  return (
    <div className="rounded-xl border bg-card text-card-foreground shadow-sm">
      <div className="flex items-center justify-between px-4 py-3 border-b">
        <h3 className="text-sm font-semibold">GraphQL Explorer</h3>
        <div className="flex items-center gap-2">
          <a
            href={`${studioUrl.replace(':54321', ':54323')}/graphiql`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            Open in Studio <ExternalLink className="h-3 w-3" />
          </a>
        </div>
      </div>

      <div className="p-4 space-y-3">
        {/* Query textarea */}
        <div>
          <label className="text-xs font-medium text-muted-foreground mb-1 block">Query</label>
          <textarea
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            rows={8}
            className="w-full rounded-md border bg-muted/50 px-3 py-2 text-sm font-mono resize-y focus:outline-none focus:ring-2 focus:ring-ring"
            placeholder="Enter GraphQL query..."
            spellCheck={false}
          />
        </div>

        {/* Collapsible variables */}
        <div>
          <button
            onClick={() => setShowVars(!showVars)}
            className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            {showVars ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
            Variables
          </button>
          {showVars && (
            <textarea
              value={variables}
              onChange={(e) => setVariables(e.target.value)}
              rows={3}
              className="w-full mt-1 rounded-md border bg-muted/50 px-3 py-2 text-sm font-mono resize-y focus:outline-none focus:ring-2 focus:ring-ring"
              placeholder="{}"
              spellCheck={false}
            />
          )}
        </div>

        {/* Run button */}
        <Button onClick={runQuery} disabled={loading} size="sm" className="gap-2">
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" />}
          Run Query
        </Button>

        {/* Results */}
        {result && (
          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1 block">Result</label>
            <pre className="max-h-64 overflow-auto rounded-md border bg-muted/50 px-3 py-2 text-xs font-mono whitespace-pre-wrap">
              {result}
            </pre>
          </div>
        )}
      </div>
    </div>
  )
}
