import { StateGraph, END } from "@langchain/langgraph";
import { SupabaseSaver } from "@skroyc/langgraph-supabase-checkpointer";
import { AgentState } from "./state.js";
import type { AgentStateType } from "./state.js";
import { getSupabaseAdmin } from "../supabase.js";
import {
  parseFiles,
  inferEntities,
  generateSql,
  validateSchema,
  correctSchema,
  generateInserts,
  executeSql,
} from "./nodes.js";

/**
 * Build the LangGraph agent with self-correction loop:
 *
 * [START] → parse_files → infer_entities → generate_sql → validate_schema
 *                                                              │
 *                           issues + iterations < max → correct_schema → generate_sql
 *                           no issues or max reached → generate_inserts → execute_sql → [END]
 */
export function buildGraph() {
  const checkpointer = new SupabaseSaver(getSupabaseAdmin());

  const graph = new StateGraph(AgentState)
    .addNode("parse_files", parseFiles)
    .addNode("infer_entities", inferEntities)
    .addNode("generate_sql", generateSql)
    .addNode("validate_schema", validateSchema)
    .addNode("correct_schema", correctSchema)
    .addNode("generate_inserts", generateInserts)
    .addNode("execute_sql", executeSql)

    // Linear edges
    .addEdge("__start__", "parse_files")
    .addEdge("parse_files", "infer_entities")
    .addEdge("infer_entities", "generate_sql")
    .addEdge("generate_sql", "validate_schema")

    // Self-correction conditional edge
    .addConditionalEdges("validate_schema", (state: AgentStateType) => {
      const errors = state.validationIssues.filter(
        (i) => i.severity === "error"
      );
      const hasErrors = errors.length > 0;
      const canRetry = state.iterationCount < state.maxIterations;

      if (hasErrors && canRetry) {
        return "correct_schema";
      }
      return "generate_inserts";
    })

    // After correction, regenerate SQL
    .addEdge("correct_schema", "generate_sql")

    // After inserts generated, execute
    .addEdge("generate_inserts", "execute_sql")
    .addEdge("execute_sql", END);

  return graph.compile({ checkpointer });
}
