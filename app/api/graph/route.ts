import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";

type DbNode = {
  id: string;
  graph_id: string; // <-- Added graph_id
  label: string;
  type: string | null;
  summary: string | null;
  position_x: number | null;
  position_y: number | null;
};

type DbEdge = {
  id?: string;
  graph_id: string; // <-- Added graph_id
  source: string;
  target: string;
  relationship: string | null;
};

function toReactFlowNode(row: DbNode) {
  return {
    id: row.id,
    position: {
      x: Number(row.position_x) || 0,
      y: Number(row.position_y) || 0,
    },
    data: {
      label: row.label,
      ...(row.type != null && { type: row.type }),
      ...(row.summary != null && { summary: row.summary }),
    },
  };
}

function toReactFlowEdge(row: DbEdge, index: number) {
  return {
    id: row.id ?? `e-${row.source}-${row.target}-${index}`,
    source: row.source,
    target: row.target,
    ...(row.relationship != null && { label: row.relationship }),
  };
}

export async function GET(request: Request) {
  // <-- Pass request object
  const { searchParams } = new URL(request.url);
  const graphId = searchParams.get("graphId");

  // If no graphId is provided, return an empty canvas
  if (!graphId) {
    return NextResponse.json({ nodes: [], edges: [] });
  }

  const supabase = createServerSupabaseClient();

  if (!supabase) {
    return NextResponse.json(
      {
        error:
          "Supabase is not configured. Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY or NEXT_PUBLIC_SUPABASE_ANON_KEY.",
      },
      { status: 500 },
    );
  }

  // Filter queries explicitly by the active graphId
  const [nodesResult, edgesResult] = await Promise.all([
    supabase.from("nodes").select("*").eq("graph_id", graphId),
    supabase.from("edges").select("*").eq("graph_id", graphId),
  ]);

  if (nodesResult.error) {
    console.error("Failed to fetch nodes:", nodesResult.error);
    return NextResponse.json(
      { error: "Failed to fetch graph nodes." },
      { status: 500 },
    );
  }

  if (edgesResult.error) {
    console.error("Failed to fetch edges:", edgesResult.error);
    return NextResponse.json(
      { error: "Failed to fetch graph edges." },
      { status: 500 },
    );
  }

  const nodes = (nodesResult.data as DbNode[]).map(toReactFlowNode);
  const edges = (edgesResult.data as DbEdge[]).map(toReactFlowEdge);

  return NextResponse.json({ nodes, edges });
}
