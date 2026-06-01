"use client";

import React, { useState, useCallback } from "react";
import ReactFlow, {
  Background,
  Controls,
  Panel,
  applyNodeChanges,
  applyEdgeChanges,
  type Edge,
  type Node,
  type NodeChange,
  type EdgeChange,
} from "reactflow";
import "reactflow/dist/style.css";

const initialNodes: Node[] = [
  {
    id: "1",
    position: { x: 100, y: 100 },
    data: { label: "Machine Learning" },
    type: "input",
  },
  {
    id: "2",
    position: { x: 300, y: 50 },
    data: { label: "Supervised Learning" },
  },
  {
    id: "3",
    position: { x: 300, y: 200 },
    data: { label: "Neural Networks" },
  },
];

const initialEdges: Edge[] = [
  {
    id: "e1-2",
    source: "1",
    target: "2",
    animated: true,
    style: { stroke: "#6366f1" },
  },
  {
    id: "e1-3",
    source: "1",
    target: "3",
    animated: true,
    style: { stroke: "#6366f1" },
  },
];

const EDGE_STYLE = { stroke: "#6366f1" };

function randomInRange(min: number, max: number) {
  return min + Math.random() * (max - min);
}

export default function GraphMindCanvas() {
  const [nodes, setNodes] = useState(initialNodes);
  const [edges, setEdges] = useState(initialEdges);

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

  const addDeepLearningNode = useCallback(() => {
    const newId = `deep-learning-${crypto.randomUUID()}`;
    const position = {
      x: randomInRange(200, 500),
      y: randomInRange(350, 500),
    };

    setNodes((nds) => [
      ...nds,
      {
        id: newId,
        position,
        data: { label: "Deep Learning" },
      },
    ]);

    setEdges((eds) => [
      ...eds,
      {
        id: `e-${newId}-3`,
        source: newId,
        target: "3",
        animated: true,
        style: EDGE_STYLE,
      },
    ]);
  }, []);

  return (
    <main className="w-screen h-screen bg-gray-950 flex flex-col">
      <header className="p-6 border-b border-gray-800 bg-gray-900 z-10 shadow-lg">
        <h1 className="text-2xl font-bold text-white tracking-tight">
          GraphMind <span className="text-indigo-500">AI</span>
        </h1>
        <p className="text-sm text-gray-400 mt-1">
          Agentic Knowledge Synthesis Engine (Local Build)
        </p>
      </header>

      <div className="flex-grow w-full h-full">
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          fitView
          className="bg-gray-950"
        >
          <Background color="#374151" gap={16} />
          <Controls className="bg-gray-800 fill-white border-gray-700" />

          <Panel
            position="top-right"
            className="m-4 flex flex-col gap-2 rounded-xl border border-gray-700 bg-gray-900/95 p-3 shadow-xl backdrop-blur-sm"
          >
            <span className="text-xs font-medium uppercase tracking-wider text-gray-500">
              Graph actions
            </span>
            <button
              type="button"
              onClick={addDeepLearningNode}
              className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-md transition hover:bg-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:ring-offset-2 focus:ring-offset-gray-900"
            >
              Add Deep Learning
            </button>
          </Panel>
        </ReactFlow>
      </div>
    </main>
  );
}
