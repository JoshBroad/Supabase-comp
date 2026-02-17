import { readFileSync } from "fs";
import { join } from "path";
import { parseFile } from "../parsers/index.js";
import { getLLM } from "../llm/client.js";
import {
  inferEntitiesPrompt,
  generateSqlPrompt,
  validateSchemaPrompt,
  correctSchemaPrompt,
  generateInsertsPrompt,
} from "../llm/prompts.js";
import { emitEvent, updateSessionStatus } from "../broadcast.js";
import { getSupabaseAdmin } from "../supabase.js";
import type { AgentStateType, InferredEntity, ValidationIssue } from "./state.js";

function extractJson(text: string): string {
  // Strip markdown fences if present
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (fenced) return fenced[1].trim();
  
  // Find first { or [
  const start = text.search(/[{\[]/);
  if (start === -1) return text;
  
  // Find last } or ]
  let end = -1;
  for (let i = text.length - 1; i >= start; i--) {
    if (text[i] === "}" || text[i] === "]") {
      end = i;
      break;
    }
  }
  
  if (end !== -1) {
    return text.substring(start, end + 1);
  }
  
  return text.substring(start);
}

function extractSql(text: string): string {
  const fenced = text.match(/```(?:sql)?\s*([\s\S]*?)```/);
  if (fenced) return fenced[1].trim();
  
  // If no fences, try to find start of SQL
  const sqlStart = text.search(/(CREATE\s+TABLE|INSERT\s+INTO|DROP\s+TABLE|ALTER\s+TABLE)/i);
  if (sqlStart !== -1) {
    return text.substring(sqlStart);
  }
  
  return text.trim();
}

// ─── Node: parse_files ───
export async function parseFiles(
  state: AgentStateType
): Promise<Partial<AgentStateType>> {
  const { sessionId, fileKeys } = state;

  await emitEvent(sessionId, "parsing_started", `Parsing ${fileKeys.length} files...`);

  const parsedFiles = [];

  for (const fileKey of fileKeys) {
    try {
      let content: string;

      // Try Supabase Storage first
      const supabase = getSupabaseAdmin();
      const { data, error } = await supabase.storage
        .from("uploads")
        .download(fileKey);

      if (data && !error) {
        content = await data.text();
      } else {
        // Fallback: read from local filesystem (for sample data)
        const localPath = fileKey.startsWith("/")
          ? fileKey
          : join(process.cwd(), "..", "sample-data", fileKey);
        content = readFileSync(localPath, "utf-8");
      }

      const filename = fileKey.split("/").pop() || fileKey;
      const parsed = parseFile(filename, content);
      parsedFiles.push(parsed);

      await emitEvent(sessionId, "file_parsed", `Parsed ${filename}`, {
        filename,
        format: parsed.format,
        rowCount: parsed.rowCount,
        headers: parsed.headers,
      });
    } catch (err) {
      const filename = fileKey.split("/").pop() || fileKey;
      console.error(`Failed to parse ${filename}:`, err);
      await emitEvent(sessionId, "file_parsed", `Failed to parse ${filename}`, {
        filename,
        error: err instanceof Error ? err.message : "Unknown error",
      });
    }
  }

  return { parsedFiles, status: "inferring" };
}

// ─── Node: infer_entities ───
export async function inferEntities(
  state: AgentStateType
): Promise<Partial<AgentStateType>> {
  const { sessionId, parsedFiles } = state;

  await emitEvent(sessionId, "inferring_started", "Analyzing data to identify entities and relationships...");

  const llm = getLLM();
  const prompt = inferEntitiesPrompt(parsedFiles);
  const response = await llm.invoke(prompt);
  const content = typeof response.content === "string" ? response.content : "";

  let entities: InferredEntity[];
  try {
    const json = JSON.parse(extractJson(content));
    entities = json.entities;
  } catch {
    console.error("Failed to parse entity inference response:", content);
    throw new Error("LLM returned invalid JSON for entity inference");
  }

  await emitEvent(sessionId, "entities_inferred", `Identified ${entities.length} entities`, {
    entityCount: entities.length,
    entities: entities.map((e) => ({
      name: e.tableName,
      columnCount: e.columns.length,
      foreignKeyCount: e.foreignKeys.length,
      sourceFiles: e.sourceFiles,
    })),
  });

  return { entities, status: "generating" };
}

// ─── Node: generate_sql ───
export async function generateSql(
  state: AgentStateType
): Promise<Partial<AgentStateType>> {
  const { sessionId, entities } = state;

  await emitEvent(sessionId, "generating_schema", "Generating SQL schema...");

  const llm = getLLM();
  const prompt = generateSqlPrompt(entities);
  const response = await llm.invoke(prompt);
  const content = typeof response.content === "string" ? response.content : "";
  const sqlSchema = extractSql(content);

  // Emit table_created events — these drive the frontend graph visualization
  for (const entity of entities) {
    const fks = entity.foreignKeys.map((fk) => ({
      column: fk.column,
      targetTable: fk.referencesTable,
    }));

    await emitEvent(sessionId, "table_created", `Created table ${entity.tableName}`, {
      name: entity.tableName,
      columns: entity.columns.map((c) => c.name),
      columnTypes: entity.columns.map((c) => ({ name: c.name, type: c.type })),
      foreignKeys: fks,
    });
  }

  return { sqlSchema, status: "validating" };
}

// ─── Node: validate_schema ───
export async function validateSchema(
  state: AgentStateType
): Promise<Partial<AgentStateType>> {
  const { sessionId, sqlSchema, entities, parsedFiles, iterationCount } = state;

  await emitEvent(
    sessionId,
    "validating_schema",
    `Validating schema (pass ${iterationCount + 1})...`
  );

  // Programmatic checks
  const programmaticIssues: ValidationIssue[] = [];

  const tableNames = entities.map((e) => e.tableName);
  for (const entity of entities) {
    for (const fk of entity.foreignKeys) {
      if (!tableNames.includes(fk.referencesTable)) {
        programmaticIssues.push({
          severity: "error",
          entity: entity.tableName,
          description: `FK references non-existent table "${fk.referencesTable}"`,
          suggestion: `Add table "${fk.referencesTable}" or fix the FK target`,
        });
      }
    }

    // Check for duplicate column names
    const colNames = entity.columns.map((c) => c.name);
    const dupes = colNames.filter((n, i) => colNames.indexOf(n) !== i);
    if (dupes.length > 0) {
      programmaticIssues.push({
        severity: "error",
        entity: entity.tableName,
        description: `Duplicate columns: ${[...new Set(dupes)].join(", ")}`,
        suggestion: "Remove or rename duplicate columns",
      });
    }
  }

  // LLM validation
  const llm = getLLM();
  const prompt = validateSchemaPrompt(sqlSchema, entities, parsedFiles);
  const response = await llm.invoke(prompt);
  const content = typeof response.content === "string" ? response.content : "";

  let llmIssues: ValidationIssue[] = [];
  try {
    const json = JSON.parse(extractJson(content));
    llmIssues = json.issues || [];
  } catch {
    console.error("Failed to parse validation response:", content);
  }

  const allIssues = [...programmaticIssues, ...llmIssues];
  const errors = allIssues.filter((i) => i.severity === "error");

  if (allIssues.length > 0) {
    await emitEvent(sessionId, "validation_complete", `Found ${allIssues.length} issues (${errors.length} errors)`, {
      issueCount: allIssues.length,
      errorCount: errors.length,
      issues: allIssues,
    });

    // Broadcast each error as a drift_detected event (for the DriftAlerts UI)
    for (const issue of errors) {
      await emitEvent(sessionId, "drift_detected", `${issue.entity}: ${issue.description}`, {
        severity: issue.severity,
        resource: issue.entity,
        recommendation: issue.suggestion,
      });
    }
  } else {
    await emitEvent(sessionId, "validation_complete", "Schema validation passed", {
      issueCount: 0,
      errorCount: 0,
    });
  }

  return { validationIssues: allIssues, status: "validating" };
}

// ─── Node: correct_schema ───
export async function correctSchema(
  state: AgentStateType
): Promise<Partial<AgentStateType>> {
  const { sessionId, entities, validationIssues, iterationCount } = state;

  await emitEvent(
    sessionId,
    "schema_corrected",
    `Correcting schema (iteration ${iterationCount + 1})...`
  );

  const llm = getLLM();
  const prompt = correctSchemaPrompt(entities, validationIssues);
  const response = await llm.invoke(prompt);
  const content = typeof response.content === "string" ? response.content : "";

  let correctedEntities: InferredEntity[];
  try {
    const json = JSON.parse(extractJson(content));
    correctedEntities = json.entities;
  } catch {
    console.error("Failed to parse correction response:", content);
    correctedEntities = entities; // Fall through with original
  }

  await emitEvent(sessionId, "schema_corrected", `Schema corrected`, {
    entityCount: correctedEntities.length,
    iterationCount: iterationCount + 1,
  });

  return {
    entities: correctedEntities,
    iterationCount: iterationCount + 1,
    status: "generating",
  };
}

// ─── Node: generate_inserts ───
export async function generateInserts(
  state: AgentStateType
): Promise<Partial<AgentStateType>> {
  const { sessionId, sqlSchema, parsedFiles, entities } = state;

  await emitEvent(sessionId, "data_insertion_started", "Generating INSERT statements from source data...");

  const llm = getLLM();
  const prompt = generateInsertsPrompt(sqlSchema, parsedFiles, entities);
  const response = await llm.invoke(prompt);
  const content = typeof response.content === "string" ? response.content : "";
  const sqlInserts = extractSql(content);

  return { sqlInserts, status: "inserting" };
}

// ─── Node: execute_sql ───
export async function executeSql(
  state: AgentStateType
): Promise<Partial<AgentStateType>> {
  const { sessionId, sqlSchema, sqlInserts } = state;

  await emitEvent(sessionId, "executing_sql", "Executing SQL against database...");

  const supabase = getSupabaseAdmin();

  try {
    // Execute CREATE TABLE statements
    const { error: schemaError } = await supabase.rpc("exec_sql", {
      query: sqlSchema,
    });

    if (schemaError) {
      // Try executing statement by statement
      const statements = sqlSchema
        .split(";")
        .map((s) => s.trim())
        .filter((s) => s.length > 0);

      for (const stmt of statements) {
        const { error } = await supabase.rpc("exec_sql", {
          query: stmt + ";",
        });
        
        // Add delay to avoid rate limiting
        await new Promise((resolve) => setTimeout(resolve, 200));

        if (error) {
          console.error(`SQL error: ${error.message}\nStatement: ${stmt}`);
          await emitEvent(sessionId, "sql_error", `Schema error: ${error.message}`, {
            statement: stmt.substring(0, 200),
            error: error.message,
          });
        }
      }
    }

    await emitEvent(sessionId, "schema_applied", "Database schema created successfully");

    // Execute INSERT statements
    if (sqlInserts.trim()) {
      const insertStatements = sqlInserts
        .split(";")
        .map((s) => s.trim())
        .filter((s) => s.length > 0);

      let insertedCount = 0;
      for (const stmt of insertStatements) {
        const { error } = await supabase.rpc("exec_sql", {
          query: stmt + ";",
        });
        
        // Add delay to avoid rate limiting
        await new Promise((resolve) => setTimeout(resolve, 200));
        
        if (error) {
          console.error(`Insert error: ${error.message}`);
        } else {
          insertedCount++;
        }
      }

      await emitEvent(sessionId, "data_inserted", `Inserted data (${insertedCount} statements executed)`, {
        statementCount: insertedCount,
        totalStatements: insertStatements.length,
      });
    }

    await updateSessionStatus(sessionId, "succeeded");
    await emitEvent(sessionId, "build_succeeded", "Database built successfully!", {
      tableCount: state.entities.length,
    });

    return { status: "complete" };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    await updateSessionStatus(sessionId, "failed", { error: message });
    await emitEvent(sessionId, "build_failed", `Build failed: ${message}`, {
      error: message,
    });

    return { status: "failed", error: message };
  }
}
