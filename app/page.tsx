"use client";

import React, { useState, useCallback, useEffect } from "react";
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
import { getLayoutedElements } from "./utils/layout";

const EDGE_STYLE = { stroke: "#6366f1" };
const SIDEBAR_WIDTH = "20rem"; // 320px

function randomInRange(min: number, max: number) {
  return min + Math.random() * (max - min);
}

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

export default function GraphMindCanvas() {
  const [nodes, setNodes] = useState<Node[]>([]);
  const [edges, setEdges] = useState<Edge[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [inputText, setInputText] = useState("");
  const [isSynthesizing, setIsSynthesizing] = useState(false);

  const loadGraph = useCallback(async () => {
    const res = await fetch("/api/graph");
    if (!res.ok) return;
    const data = (await res.json()) as { nodes: Node[]; edges: Edge[] };

    // Pass database nodes through the layout engine on initial load
    const { nodes: layoutedNodes, edges: layoutedEdges } = getLayoutedElements(
      data.nodes ?? [],
      data.edges ?? [],
    );

    setNodes(layoutedNodes);
    setEdges(layoutedEdges);
  }, []);

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

  const handleSynthesize = useCallback(async () => {
    if (!inputText.trim()) return;

    setIsSynthesizing(true);
    setNodes([]);
    setEdges([]);

    try {
      const res = await fetch("/api/synthesize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: inputText }),
      });

      if (!res.ok) {
        console.log("Synthesize API error:", await res.text());
        return;
      }

      const data = (await res.json()) as {
        nodes: Array<{
          id: string;
          label: string;
          type: string;
          summary: string;
        }>;
        edges: Array<{
          source: string;
          target: string;
          relationship: string;
        }>;
      };

      // 1. Map the raw AI data into standard ReactFlow shapes (default x/y to 0)
      const mappedNodes: Node[] = data.nodes.map((node) => ({
        id: node.id,
        position: { x: 0, y: 0 },
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
        style: EDGE_STYLE,
      }));

      // 2. Push the mapped shapes through the Auto-Layout Engine
      const { nodes: layoutedNodes, edges: layoutedEdges } =
        getLayoutedElements(mappedNodes, mappedEdges);

      // 3. Render the perfectly spaced graph
      setNodes(layoutedNodes);
      setEdges(layoutedEdges);
    } catch (error) {
      console.log("Synthesize failed:", error);
    } finally {
      setIsSynthesizing(false);
    }
  }, [inputText]);

  return (
    <main className="flex h-screen w-screen flex-col bg-gray-950">
      <header className="z-10 shrink-0 border-b border-gray-800 bg-gray-900 p-6 shadow-lg">
        <h1 className="text-2xl font-bold tracking-tight text-white">
          GraphMind <span className="text-indigo-500">AI</span>
        </h1>
        <p className="mt-1 text-sm text-gray-400">
          Agentic Knowledge Synthesis Engine (Local Build)
        </p>
      </header>

      <div className="relative flex min-h-0 flex-1">
        <aside
          className="shrink-0 overflow-hidden border-r border-gray-800 bg-gray-900 transition-[width] duration-300 ease-in-out"
          style={{ width: sidebarOpen ? SIDEBAR_WIDTH : 0 }}
          aria-hidden={!sidebarOpen}
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
              placeholder="Paste raw research notes, papers, or meeting transcripts here..."
              className="min-h-[280px] flex-1 resize-y rounded-lg border border-gray-800 bg-gray-950 px-4 py-3 text-sm leading-relaxed text-gray-100 placeholder:text-gray-500 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/40"
            />
            <button
              type="button"
              onClick={handleSynthesize}
              disabled={!inputText.trim() || isSynthesizing}
              className="w-full rounded-lg bg-indigo-600 px-4 py-3 text-sm font-semibold text-white shadow-md transition hover:bg-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:ring-offset-2 focus:ring-offset-gray-900 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Synthesize Graph
            </button>
          </div>
        </aside>

        <button
          type="button"
          onClick={() => setSidebarOpen((open) => !open)}
          aria-label={sidebarOpen ? "Collapse sidebar" : "Expand sidebar"}
          aria-expanded={sidebarOpen}
          className="absolute top-1/2 z-30 flex h-12 w-7 -translate-y-1/2 items-center justify-center rounded-r-md border border-l-0 border-gray-700 bg-gray-800 text-gray-300 shadow-md transition-all duration-300 ease-in-out hover:bg-gray-700 hover:text-white"
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
              <div
                className="h-12 w-12 animate-spin rounded-full border-4 border-gray-700 border-t-indigo-500"
                role="status"
                aria-label="Parsing document"
              />
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
            fitView
            className="h-full w-full bg-gray-950"
          >
            <Background color="#374151" gap={16} />
            <Controls className="border-gray-700 bg-gray-800 fill-white" />

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
      </div>
    </main>
  );
}
