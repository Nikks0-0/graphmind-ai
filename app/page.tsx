"use client";

import React, { useState, useCallback } from "react";
import ReactFlow, {
  Background,
  Controls,
  applyNodeChanges,
  applyEdgeChanges,
  NodeChange,
  EdgeChange,
} from "reactflow";
import "reactflow/dist/style.css";

// --- THE DUMMY DATA ---
// 4 Nodes representing technical concepts
const initialNodes = [
  {
    id: "1",
    position: { x: 400, y: 100 },
    data: { label: "PDF Document (Root)" },
    type: "input",
  },
  {
    id: "2",
    position: { x: 200, y: 300 },
    data: { label: "Concept: Vector Search" },
  },
  {
    id: "3",
    position: { x: 600, y: 300 },
    data: { label: "Concept: Graph Traversal" },
  },
  {
    id: "4",
    position: { x: 400, y: 500 },
    data: { label: "LLM Synthesis" },
    type: "output",
  },
];

// 3 Edges connecting them
const initialEdges = [
  {
    id: "e1-2",
    source: "1",
    target: "2",
    animated: true,
    style: { stroke: "#6366f1" },
  }, // Indigo color
  {
    id: "e1-3",
    source: "1",
    target: "3",
    animated: true,
    style: { stroke: "#6366f1" },
  },
  { id: "e2-4", source: "2", target: "4", style: { stroke: "#4b5563" } },
  {
    id: "e3-4",
    source: "3",
    target: "4",
    animated: true,
    style: { stroke: "#10b981" },
  }, // Green color
];

export default function GraphMindCanvas() {
  const [nodes, setNodes] = useState(initialNodes);
  const [edges, setEdges] = useState(initialEdges);

  // Handlers to make nodes draggable and interactive
  const onNodesChange = useCallback(
    (changes: NodeChange[]) =>
      setNodes((nds) => applyNodeChanges(changes, nds)),
    [],
  );
  const onEdgesChange = useCallback(
    (changes: EdgeChange[]) =>
      setEdges((eds) => applyEdgeChanges(changes, eds)),
    [],
  );

  return (
    <main className="w-screen h-screen bg-gray-950 flex flex-col">
      {/* Header / Vibe Check */}
      <header className="p-6 border-b border-gray-800 bg-gray-900 z-10 shadow-lg">
        <h1 className="text-2xl font-bold text-white tracking-tight">
          GraphMind <span className="text-indigo-500">AI</span>
        </h1>
        <p className="text-sm text-gray-400 mt-1">
          Agentic Knowledge Synthesis Engine (Local Build)
        </p>
      </header>

      {/* The React Flow Canvas */}
      <div className="flex-grow w-full h-full">
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          fitView
          className="bg-gray-950" // Tailwind dark mode background
        >
          {/* Visual enhancements */}
          <Background color="#374151" gap={16} />
          <Controls className="bg-gray-800 fill-white border-gray-700" />
        </ReactFlow>
      </div>
    </main>
  );
}
