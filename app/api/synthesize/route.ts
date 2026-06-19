import { NextResponse } from "next/server";
import { groq } from "@ai-sdk/groq";
import { generateObject } from "ai";
import { z } from "zod";
import { createClient } from "@supabase/supabase-js";
import { v4 as uuidv4 } from "uuid";

// 1. Initialize Supabase Client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";
const supabase = createClient(supabaseUrl, supabaseAnonKey);

const SYSTEM_PROMPT = `You are an advanced knowledge graph extraction engine. Your sole task is to analyze text and extract entities and their relationships into a flawless JSON format matching the TypeScript interfaces provided below.

### Output Constraints
1. DO NOT include any conversational text, markdown blocks, introductory phrasing, or concluding remarks.
2. The output must be completely raw, valid JSON.
3. Every single key defined in the structure below is MANDATORY. Do not omit any key.
4. You MUST use the word "JSON" explicitly in your generation process to satisfy the engine constraints.

### Target Typescript Interface Schema
interface Node {
  id: string;        // A unique, concise alphanumeric identifier (e.g., "node_1", "barter_platform")
  label: string;     // The literal common name of the entity or concept
  type: string;      // The category of the node (e.g., "Platform", "Architecture", "Methodology")
  summary: string;   // A comprehensive, single-sentence summary detailing its role or context
}

interface Edge {
  source: string;       // Must exactly match the 'id' of a defined Node
  target: string;       // Must exactly match the 'id' of a defined Node
  relationship: string; // A concise action verb describing the connection (e.g., "relies_on", "implements", "validates")
}

interface KnowledgeGraphResponse {
  nodes: Node[];
  edges: Edge[];
}

### Core Task Rules
* Extract all key concepts, technologies, architectures, frameworks, operations, and methodologies as individual nodes.
* Map their interdependencies as directional edges.
* Ensure no trailing commas or unescaped quote marks break the valid JSON syntax.

Produce the KnowledgeGraphResponse payload now:`;

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const text = body.text ?? body.content ?? body.input;
    const graphId = body.graphId; // <-- Extract the active session ID

    if (!text || typeof text !== "string" || !text.trim()) {
      return NextResponse.json(
        { error: "Valid text is required." },
        { status: 400 },
      );
    }

    if (!graphId) {
      return NextResponse.json(
        { error: "Graph ID is required to save session data." },
        { status: 400 },
      );
    }

    // 2. Generate Graph Data via official Groq provider
    const { object } = await generateObject({
      model: groq("llama-3.3-70b-versatile"),
      system: SYSTEM_PROMPT,
      prompt: text,
      providerOptions: {
        groq: {
          structuredOutputs: false,
        },
      },
      schema: z.object({
        nodes: z.array(
          z.object({
            id: z.string().describe("Simple ID like '1' or 'node_1'"),
            label: z.string().describe("The concept name"),
            type: z.string().optional().default("default"),
            summary: z.string().describe("Brief summary"),
          }),
        ),
        edges: z.array(
          z.object({
            source: z.string().describe("Source node ID"),
            target: z.string().describe("Target node ID"),
            relationship: z.string().describe("Relationship label"),
          }),
        ),
      }),
    });

    // 3. Remap string IDs to valid Postgres UUIDs and inject graph_id
    const idMap: Record<string, string> = {};

    const sanitizedNodes = object.nodes.map((node) => {
      const secureUuid = uuidv4();
      idMap[node.id] = secureUuid;

      return {
        id: secureUuid,
        graph_id: graphId, // <-- Bind to session
        label: node.label,
        type: node.type,
        summary: node.summary,
        position_x: Math.random() * 400 + 100,
        position_y: Math.random() * 400 + 100,
      };
    });

    const sanitizedEdges = object.edges
      .map((edge) => ({
        graph_id: graphId, // <-- Bind to session
        source: idMap[edge.source],
        target: idMap[edge.target],
        relationship: edge.relationship,
      }))
      .filter((edge) => edge.source && edge.target);

    // 4. Save to Supabase Postgres
    if (sanitizedNodes.length > 0) {
      const { error } = await supabase.from("nodes").insert(sanitizedNodes);
      if (error)
        throw new Error(`Supabase Node Insert Error: ${error.message}`);
    }

    if (sanitizedEdges.length > 0) {
      const { error } = await supabase.from("edges").insert(sanitizedEdges);
      if (error)
        throw new Error(`Supabase Edge Insert Error: ${error.message}`);
    }

    // 5. Return mapped data to the frontend ReactFlow canvas
    return NextResponse.json({
      success: true,
      nodes: sanitizedNodes,
      edges: sanitizedEdges,
    });
  } catch (error: any) {
    console.error("Synthesis pipeline failed:", error);
    return NextResponse.json(
      { error: "Internal Server Error", details: error.message },
      { status: 500 },
    );
  }
}
