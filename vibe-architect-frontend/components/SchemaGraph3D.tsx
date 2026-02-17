 "use client"
 
import * as React from "react"
import { Canvas, useFrame } from "@react-three/fiber"
import { OrbitControls, Text, Line } from "@react-three/drei"
import * as THREE from "three"
import { SchemaNode, SchemaEdge } from "@/lib/types"

interface SchemaGraph3DProps {
  nodes: SchemaNode[]
  edges: SchemaEdge[]
  activeFocus?: { type: string; name: string }
}

function Node({ position, label, active }: { position: [number, number, number], label: string, active: boolean }) {
  const meshRef = React.useRef<THREE.Mesh>(null)
  
  useFrame((state) => {
    if (meshRef.current && active) {
      meshRef.current.rotation.y += 0.02
      meshRef.current.scale.setScalar(1 + Math.sin(state.clock.elapsedTime * 5) * 0.1)
    }
  })

  return (
    <group position={position}>
      <mesh ref={meshRef}>
        <sphereGeometry args={[0.5, 32, 32]} />
        <meshStandardMaterial color={active ? "#10b981" : "#6366f1"} />
      </mesh>
      <Text
        position={[0, 0.8, 0]}
        fontSize={0.3}
        color="white"
        anchorX="center"
        anchorY="middle"
      >
        {label}
      </Text>
    </group>
  )
}

function Connection({ start, end }: { start: [number, number, number], end: [number, number, number] }) {
  return (
    <Line
      points={[start, end]}
      color="#94a3b8"
      lineWidth={1}
      dashed={false}
    />
  )
}

export function SchemaGraph3D({ nodes, edges, activeFocus }: SchemaGraph3DProps) {
  // Simple force-directed layout or random layout for 3D
  // For V1, we'll just place them in a circle or helix
  const nodePositions = React.useMemo(() => {
    const positions = new Map<string, [number, number, number]>()
    const count = nodes.length
    const radius = Math.max(2, count * 0.5)
    
    nodes.forEach((node, i) => {
      const theta = (i / count) * Math.PI * 2
      const x = Math.cos(theta) * radius
      const z = Math.sin(theta) * radius
      positions.set(node.id, [x, 0, z])
    })
    return positions
  }, [nodes])

  return (
    <div className="h-full w-full bg-zinc-950 rounded-xl overflow-hidden border">
      <Canvas camera={{ position: [0, 5, 10], fov: 60 }}>
        <ambientLight intensity={0.5} />
        <pointLight position={[10, 10, 10]} />
        
        {nodes.map((node) => {
          const pos = nodePositions.get(node.id) || [0, 0, 0]
          return (
            <Node 
              key={node.id} 
              position={pos} 
              label={node.label} 
              active={activeFocus?.name === node.label}
            />
          )
        })}

        {edges.map((edge) => {
          const start = nodePositions.get(edge.source)
          const end = nodePositions.get(edge.target)
          if (start && end) {
            return <Connection key={edge.id} start={start} end={end} />
          }
          return null
        })}

        <OrbitControls />
        <gridHelper args={[20, 20, 0x222222, 0x222222]} />
      </Canvas>
    </div>
  )
}
