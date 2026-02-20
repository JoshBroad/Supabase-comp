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
import dagre from "dagre"
import { SchemaNode, SchemaEdge } from "@/lib/types"
import { TableNode } from "./TableNode"

interface SchemaGraph2DProps {
  nodes: SchemaNode[]
  edges: SchemaEdge[]
  activeFocus?: { type: string; name: string }
}

const NODE_WIDTH = 200
const NODE_HEIGHT = 60

function applyDagreLayout(nodes: Node[], edges: Edge[]): Node[] {
  const g = new dagre.graphlib.Graph()
  g.setDefaultEdgeLabel(() => ({}))
  g.setGraph({ rankdir: "TB", nodesep: 80, ranksep: 100 })

  nodes.forEach((node) => {
    const cols = node.data.columns?.length || 0
    const height = cols > 0 ? 40 + cols * 28 : NODE_HEIGHT
    g.setNode(node.id, { width: NODE_WIDTH, height })
  })

  edges.forEach((edge) => {
    g.setEdge(edge.source, edge.target)
  })

  dagre.layout(g)

  return nodes.map((node) => {
    const pos = g.node(node.id)
    const cols = node.data.columns?.length || 0
    const height = cols > 0 ? 40 + cols * 28 : NODE_HEIGHT
    return {
      ...node,
      position: {
        x: pos.x - NODE_WIDTH / 2,
        y: pos.y - height / 2,
      },
    }
  })
}

const nodeTypes = {
  tableNode: TableNode,
}

export function SchemaGraph2D({ nodes: initialSchemaNodes, edges: initialSchemaEdges, activeFocus }: SchemaGraph2DProps) {
  const transformNodes = (schemaNodes: SchemaNode[]): Node[] => {
    return schemaNodes.map((node) => {
      const columnTypes = node.meta?.columnTypes || []
      // Derive FK column names from edges for this table
      const fkColumns = new Set(
        initialSchemaEdges
          .filter(e => e.source === node.id)
          .map(e => e.label)
          .filter(Boolean)
      )

      const columns = columnTypes.map((c: { name: string; type: string; isPrimaryKey?: boolean }) => ({
        name: c.name,
        type: c.type,
        isPrimaryKey: c.isPrimaryKey || false,
        isForeignKey: fkColumns.has(c.name),
      }))

      return {
        id: node.id,
        position: { x: 0, y: 0 },
        data: {
          label: node.label,
          columns,
        },
        type: columns.length > 0 ? 'tableNode' : 'default',
        style: activeFocus?.name === node.label
          ? { border: '2px solid var(--primary)', boxShadow: '0 0 10px var(--primary)', borderRadius: '8px' }
          : undefined,
      }
    })
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

  const initialRfNodes = transformNodes(initialSchemaNodes)
  const initialRfEdges = transformEdges(initialSchemaEdges)
  const laidOut = applyDagreLayout(initialRfNodes, initialRfEdges)

  const [nodes, setNodes, onNodesChange] = useNodesState(laidOut)
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialRfEdges)

  React.useEffect(() => {
    const rfNodes = transformNodes(initialSchemaNodes)
    const rfEdges = transformEdges(initialSchemaEdges)
    const laid = applyDagreLayout(rfNodes, rfEdges)
    setNodes(laid)
    setEdges(rfEdges)
  }, [initialSchemaNodes, initialSchemaEdges, activeFocus])

  return (
    <div className="h-full w-full bg-background/50 rounded-xl border overflow-hidden">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        nodeTypes={nodeTypes}
        fitView
        attributionPosition="bottom-right"
      >
        <Background />
        <Controls />
      </ReactFlow>
    </div>
  )
}
