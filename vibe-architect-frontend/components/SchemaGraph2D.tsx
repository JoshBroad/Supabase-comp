 "use client"
 
import * as React from "react"
import ReactFlow, { 
  Node, 
  Edge, 
  Controls, 
  Background, 
  useNodesState, 
  useEdgesState,
  MarkerType
} from "reactflow"
import "reactflow/dist/style.css"
import { SchemaNode, SchemaEdge } from "@/lib/types"

interface SchemaGraph2DProps {
  nodes: SchemaNode[]
  edges: SchemaEdge[]
  activeFocus?: { type: string; name: string }
}

const nodeTypes = {
  // Custom node types can be defined here
}

export function SchemaGraph2D({ nodes: initialSchemaNodes, edges: initialSchemaEdges, activeFocus }: SchemaGraph2DProps) {
  // Transform schema nodes to ReactFlow nodes
  const transformNodes = (schemaNodes: SchemaNode[]): Node[] => {
    return schemaNodes.map((node, index) => ({
      id: node.id,
      position: { x: index * 250 % 1000, y: Math.floor(index / 4) * 150 }, // Simple layout
      data: { label: node.label },
      type: 'default', // or custom
      style: activeFocus?.name === node.label ? { border: '2px solid var(--primary)', boxShadow: '0 0 10px var(--primary)' } : undefined
    }))
  }

  const transformEdges = (schemaEdges: SchemaEdge[]): Edge[] => {
    return schemaEdges.map((edge) => ({
      id: edge.id,
      source: edge.source,
      target: edge.target,
      label: edge.label,
      animated: true,
      markerEnd: { type: MarkerType.ArrowClosed },
    }))
  }

  const [nodes, setNodes, onNodesChange] = useNodesState(transformNodes(initialSchemaNodes))
  const [edges, setEdges, onEdgesChange] = useEdgesState(transformEdges(initialSchemaEdges))

  // Update nodes/edges when props change
  React.useEffect(() => {
    setNodes(transformNodes(initialSchemaNodes))
    setEdges(transformEdges(initialSchemaEdges))
  }, [initialSchemaNodes, initialSchemaEdges, activeFocus])

  return (
    <div className="h-full w-full bg-background/50 rounded-xl border overflow-hidden">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        fitView
        attributionPosition="bottom-right"
      >
        <Background />
        <Controls />
      </ReactFlow>
    </div>
  )
}
