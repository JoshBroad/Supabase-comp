import type { ParsedFile, InferredEntity, ValidationIssue } from "../graph/state.js";

function fileSummary(f: ParsedFile): string {
  // Minimized for token efficiency
  return `File: ${f.filename}
Headers: ${f.headers.join(",")}
Sample: ${JSON.stringify(f.sampleRows.slice(0, 3))}`;
}

export function inferEntitiesPrompt(files: ParsedFile[], dialect: string = "PostgreSQL"): string {
  return `You are a data architect. Analyze these parsed data files from a messy data lake and identify all database entities (tables) and their relationships.

FILES:
${files.map(fileSummary).join("\n---\n")}

TASK:
1. Identify all distinct entities (tables) that should exist in a normalized relational database.
2. For each entity, define columns with appropriate ${dialect} types.
3. Identify primary keys (use auto-increment/SERIAL or UUID as appropriate for ${dialect}).
4. Identify foreign key relationships ACROSS files (e.g., orders reference customers).
5. Normalize inconsistent naming (e.g., "customer_id", "customerId", "cust_id" should all map to the same FK).
6. Handle cross-references by name (e.g., if reviews reference products by "product_name" instead of ID, the FK should point to the products table).
7. For nested data (e.g., order items), create separate junction/detail tables.

Respond with ONLY valid JSON in this exact format (no markdown, no explanation):
{
  "entities": [
    {
      "tableName": "string",
      "columns": [
        { "name": "string", "type": "${dialect} type", "nullable": true/false, "isPrimaryKey": true/false }
      ],
      "sourceFiles": ["filename1.csv"],
      "foreignKeys": [
        { "column": "string", "referencesTable": "string", "referencesColumn": "string" }
      ]
    }
  ]
}`;
}

export function generateSqlPrompt(entities: InferredEntity[], dialect: string = "PostgreSQL"): string {
  return `You are a ${dialect} expert. Generate CREATE TABLE statements for these entities.

ENTITIES:
${JSON.stringify(entities)}

REQUIREMENTS:
1. Use ${dialect} syntax.
2. Include PRIMARY KEY constraints.
3. Include FOREIGN KEY constraints with ON DELETE CASCADE.
4. Add CREATE INDEX on all foreign key columns.
5. Use appropriate types (TEXT, INTEGER, NUMERIC(10,2) for money, TIMESTAMPTZ/DATETIME for dates, BOOLEAN, etc.).
6. Tables must be ordered so that referenced tables come before referencing tables (dependency order).
7. Use auto-incrementing primary keys where appropriate (e.g., SERIAL for Postgres, AUTO_INCREMENT for MySQL).
8. Do NOT use CREATE SCHEMA — all tables go in the default schema.

Respond with ONLY the SQL statements. No markdown fences, no explanation. Just raw SQL.`;
}

export function validateSchemaPrompt(
  sql: string,
  entities: InferredEntity[],
  files: ParsedFile[],
  dialect: string = "PostgreSQL"
): string {
  return `You are a database QA engineer. Review this ${dialect} SQL schema against the source data and entity definitions.

SQL SCHEMA:
${sql}

ENTITY DEFINITIONS:
${JSON.stringify(entities)}

SOURCE FILE SUMMARIES:
${files.map((f) => `- ${f.filename}: ${f.rowCount} rows, headers: ${f.headers.join(", ")}`).join("\n")}

CHECK FOR:
1. All FK target tables and columns exist in the schema.
2. No duplicate table names.
3. Data types are appropriate for the source data and ${dialect}.
4. No data from source files is left unmapped (every file should contribute to at least one table).
5. Proper normalization (e.g., nested arrays should be separate tables).
6. Missing indexes on FK columns.

Respond with ONLY valid JSON (no markdown, no explanation):
{
  "issues": [
    { "severity": "error" or "warning", "entity": "table_name", "description": "what's wrong", "suggestion": "how to fix" }
  ]
}

If there are no issues, respond with: {"issues": []}`;
}

export function correctSchemaPrompt(
  entities: InferredEntity[],
  issues: ValidationIssue[],
  dialect: string = "PostgreSQL"
): string {
  return `You are a data architect. Fix these issues in the entity definitions.

CURRENT ENTITIES:
${JSON.stringify(entities)}

ISSUES TO FIX:
${JSON.stringify(issues)}

Fix all issues and return the corrected entities. Respond with ONLY valid JSON (no markdown, no explanation):
{
  "entities": [
    {
      "tableName": "string",
      "columns": [
        { "name": "string", "type": "${dialect} type", "nullable": true/false, "isPrimaryKey": true/false }
      ],
      "sourceFiles": ["filename1.csv"],
      "foreignKeys": [
        { "column": "string", "referencesTable": "string", "referencesColumn": "string" }
      ]
    }
  ]
}`;
}

export function generateInsertsPrompt(
  sql: string,
  files: ParsedFile[],
  entities: InferredEntity[],
  dialect: string = "PostgreSQL"
): string {
  return `You are a data engineer. Generate INSERT statements to populate these tables from the source data.

SQL SCHEMA:
${sql}

ENTITIES:
${JSON.stringify(entities)}

SOURCE DATA:
${files.map((f) => `--- ${f.filename} ---
${JSON.stringify(f.sampleRows.slice(0, 5))}`).join("\n")}

REQUIREMENTS:
1. Generate INSERT statements that map source data to the normalized schema using ${dialect} syntax.
2. Use integer IDs starting from 1 for auto-increment columns.
3. For FK resolution: when source data references by name/email, use subselects or hardcode the known ID.
4. Handle type conversions (e.g., string dates to native date types, string numbers to numeric).
5. Only generate inserts for the SAMPLE rows shown — this is a demo.
6. Tables must be inserted in dependency order (parents before children).
7. Handle NULL values properly.

Respond with ONLY the SQL INSERT statements. No markdown fences, no explanation. Just raw SQL.`;
}
