"use client"

import * as React from "react"
import { Handle, Position } from "reactflow"

interface Column {
  name: string
  type: string
  isPrimaryKey?: boolean
  isForeignKey?: boolean
}

interface TableNodeData {
  label: string
  columns: Column[]
}

const TABLE_COLORS = [
  "bg-blue-500",
  "bg-emerald-500",
  "bg-violet-500",
  "bg-amber-500",
  "bg-rose-500",
  "bg-cyan-500",
  "bg-pink-500",
  "bg-teal-500",
]

function getColorForTable(name: string): string {
  let hash = 0
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash)
  }
  return TABLE_COLORS[Math.abs(hash) % TABLE_COLORS.length]
}

export function TableNode({ data }: { data: TableNodeData }) {
  const color = getColorForTable(data.label)
  const columns: Column[] = data.columns || []

  return (
    <div className="rounded-lg border bg-card text-card-foreground shadow-md min-w-[180px] overflow-hidden">
      <Handle type="target" position={Position.Top} className="!bg-muted-foreground" />

      {/* Header */}
      <div className={`${color} px-3 py-2 text-white font-semibold text-xs tracking-wide uppercase`}>
        {data.label}
      </div>

      {/* Columns */}
      {columns.length > 0 ? (
        <div className="divide-y divide-border">
          {columns.map((col, i) => (
            <div key={i} className="flex items-center justify-between px-3 py-1.5 text-xs">
              <span className="flex items-center gap-1.5">
                {col.isPrimaryKey && (
                  <span className="text-amber-500 font-bold" title="Primary Key">PK</span>
                )}
                {col.isForeignKey && (
                  <span className="text-blue-500 font-bold" title="Foreign Key">FK</span>
                )}
                <span className="font-medium">{col.name}</span>
              </span>
              <span className="text-muted-foreground ml-3 font-mono">{col.type}</span>
            </div>
          ))}
        </div>
      ) : (
        <div className="px-3 py-2 text-xs text-muted-foreground italic">No columns</div>
      )}

      <Handle type="source" position={Position.Bottom} className="!bg-muted-foreground" />
    </div>
  )
}
