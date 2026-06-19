"use client";

import React, { useState, useCallback, useEffect } from "react";
import ReactFlow, {
  Background,
  Controls,
  MiniMap,
  ReactFlowProvider,
  useReactFlow,
  applyNodeChanges,
  applyEdgeChanges,
  type Edge,
  type Node,
  type NodeChange,
  type EdgeChange,
} from "reactflow";
import "reactflow/dist/style.css";
import { getLayoutedElements } from "./utils/layout";

const EDGE_STYLE = { stroke: "#6366f1" };
const SIDEBAR_WIDTH = "20rem"; // 320px

function SidebarToggleIcon({ collapsed }: { collapsed: boolean }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={`transition-transform duration-300 ${collapsed ? "" : "rotate-180"}`}
      aria-hidden
    >
      <path d="M15 18l-6-6 6-6" />
    </svg>
  );
}

// 1. Core Engine inside the Provider Context
function FlowEngine() {
  const [nodes, setNodes] = useState<Node[]>([]);
  const [edges, setEdges] = useState<Edge[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [inputText, setInputText] = useState("");
  const [isSynthesizing, setIsSynthesizing] = useState(false);

  // Session ID to isolate graphs
  const [currentGraphId, setCurrentGraphId] = useState<string>("");

  const { fitView } = useReactFlow();

  // Initialize a fresh session ID when the app first loads
  useEffect(() => {
    setCurrentGraphId(crypto.randomUUID());
  }, []);

  const loadGraph = useCallback(async () => {
    if (!currentGraphId) return;
    try {
      const res = await fetch(`/api/graph?graphId=${currentGraphId}`);
      if (!res.ok) return;
      const data = (await res.json()) as { nodes: Node[]; edges: Edge[] };

      const incomingNodes = data.nodes ?? [];
      const incomingEdges = data.edges ?? [];

      if (incomingNodes.length === 0) {
        setNodes([]);
        setEdges([]);
        return;
      }

      const preparedNodes = incomingNodes.map((node: any) => ({
        ...node,
        type: "default",
        width: 180,
        height: 80,
        data: {
          label: node.label || node.data?.label || "Unnamed Concept",
          type: node.type,
          summary: node.summary,
        },
      }));

      const { nodes: layoutedNodes, edges: layoutedEdges } =
        getLayoutedElements(preparedNodes, incomingEdges);

      setNodes(layoutedNodes);
      setEdges(layoutedEdges);

      setTimeout(() => fitView({ padding: 0.2, duration: 800 }), 100);
    } catch (err) {
      console.error("Failed to load graph:", err);
    }
  }, [currentGraphId, fitView]);

  useEffect(() => {
    let cancelled = false;
    async function init() {
      try {
        if (!cancelled) await loadGraph();
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    }
    init();
    return () => {
      cancelled = true;
    };
  }, [loadGraph]);

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

  const handleNewCanvas = () => {
    setCurrentGraphId(crypto.randomUUID()); // Generate new ID
    setNodes([]); // Clear frontend nodes
    setEdges([]); // Clear frontend edges
    setInputText(""); // Clear text box
  };

  const handleSynthesize = useCallback(async () => {
    if (!inputText.trim() || !currentGraphId) return;

    setIsSynthesizing(true);
    setNodes([]);
    setEdges([]);

    try {
      const res = await fetch("/api/synthesize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: inputText, graphId: currentGraphId }),
      });

      if (!res.ok) {
        console.error("Synthesize API error:", await res.text());
        return;
      }

      const data = (await res.json()) as { nodes: any[]; edges: any[] };

      if (!data.nodes || data.nodes.length === 0) return;

      const mappedNodes: Node[] = data.nodes.map((node) => ({
        id: node.id,
        type: "default",
        position: { x: 0, y: 0 },
        width: 180,
        height: 80,
        data: {
          label: node.label,
          type: node.type,
          summary: node.summary,
        },
      }));

      const mappedEdges: Edge[] = data.edges.map((edge, index) => ({
        id: `e-${edge.source}-${edge.target}-${index}`,
        source: edge.source,
        target: edge.target,
        label: edge.relationship,
        type: "smoothstep", // Clean 90-degree angles
        animated: true, // Flowing animation
        style: EDGE_STYLE,
      }));

      const { nodes: layoutedNodes, edges: layoutedEdges } =
        getLayoutedElements(mappedNodes, mappedEdges);

      setNodes(layoutedNodes);
      setEdges(layoutedEdges);

      setTimeout(() => fitView({ padding: 0.2, duration: 800 }), 100);
    } catch (error) {
      console.error("Frontend visualization failed:", error);
    } finally {
      setIsSynthesizing(false);
    }
  }, [inputText, currentGraphId, fitView]);

  return (
    <main className="flex h-screen w-screen flex-col bg-gray-950">
      <header className="z-10 flex justify-between items-center shrink-0 border-b border-gray-800 bg-gray-900 p-6 shadow-lg">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white">
            GraphMind <span className="text-indigo-500">AI</span>
          </h1>
          <p className="mt-1 text-sm text-gray-400">
            Agentic Knowledge Synthesis Engine
          </p>
        </div>
        <button
          onClick={handleNewCanvas}
          className="rounded-lg border border-gray-700 bg-gray-800 px-4 py-2 text-sm font-medium text-gray-300 shadow hover:bg-gray-700 hover:text-white transition focus:outline-none focus:ring-2 focus:ring-indigo-500"
        >
          + New Graph
        </button>
      </header>

      <div className="relative flex min-h-0 flex-1">
        <aside
          className="shrink-0 overflow-hidden border-r border-gray-800 bg-gray-900 transition-[width] duration-300 ease-in-out"
          style={{ width: sidebarOpen ? SIDEBAR_WIDTH : 0 }}
        >
          <div
            className="flex h-full w-80 flex-col gap-4 p-5"
            style={{ width: SIDEBAR_WIDTH }}
          >
            <h2 className="text-lg font-semibold tracking-tight text-white">
              Knowledge Ingestion
            </h2>
            <textarea
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              placeholder="Paste raw research notes here..."
              className="min-h-[280px] flex-1 resize-y rounded-lg border border-gray-800 bg-gray-950 px-4 py-3 text-sm leading-relaxed text-gray-100 placeholder:text-gray-500 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/40"
            />
            <button
              type="button"
              onClick={handleSynthesize}
              disabled={!inputText.trim() || isSynthesizing}
              className="w-full rounded-lg bg-indigo-600 px-4 py-3 text-sm font-semibold text-white shadow-md transition hover:bg-indigo-500 focus:outline-none disabled:opacity-50"
            >
              Synthesize Graph
            </button>
          </div>
        </aside>

        <button
          type="button"
          onClick={() => setSidebarOpen((open) => !open)}
          className="absolute top-1/2 z-30 flex h-12 w-7 -translate-y-1/2 items-center justify-center rounded-r-md border border-l-0 border-gray-700 bg-gray-800 text-gray-300 transition-all hover:bg-gray-700 hover:text-white"
          style={{ left: sidebarOpen ? SIDEBAR_WIDTH : 0 }}
        >
          <SidebarToggleIcon collapsed={!sidebarOpen} />
        </button>

        <div className="relative min-h-0 min-w-0 flex-1">
          {isLoading && (
            <div className="absolute inset-0 z-20 flex items-center justify-center bg-gray-950/80">
              <p className="text-lg font-medium text-gray-300">
                Loading graph data...
              </p>
            </div>
          )}
          {isSynthesizing && (
            <div className="absolute inset-0 z-30 flex flex-col items-center justify-center gap-4 bg-gray-950/90 backdrop-blur-sm">
              <div className="h-12 w-12 animate-spin rounded-full border-4 border-gray-700 border-t-indigo-500" />
              <p className="animate-pulse text-xl font-semibold tracking-tight text-white">
                Parsing Document...
              </p>
            </div>
          )}

          <ReactFlow
            nodes={nodes}
            edges={edges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            className="h-full w-full bg-gray-950"
          >
            <Background color="#374151" gap={16} />
            <Controls className="border-gray-700 bg-gray-800 fill-white" />
            <MiniMap
              className="border border-gray-700 rounded-lg overflow-hidden bg-gray-900 shadow-xl"
              nodeColor="#6366f1"
              maskColor="rgba(17, 24, 39, 0.7)"
            />
          </ReactFlow>
        </div>
      </div>
    </main>
  );
}

// 2. Wrap the application in the Provider
export default function GraphMindCanvas() {
  return (
    <ReactFlowProvider>
      <FlowEngine />
    </ReactFlowProvider>
  );
}
