import { Annotation } from "@langchain/langgraph";

export interface ParsedFile {
  filename: string;
  format: "csv" | "json" | "xml" | "text";
  headers: string[];
  sampleRows: Record<string, any>[];
  rowCount: number;
  rawPreview: string;
}

export interface InferredColumn {
  name: string;
  type: string;
  nullable: boolean;
  isPrimaryKey: boolean;
}

export interface ForeignKey {
  column: string;
  referencesTable: string;
  referencesColumn: string;
}

export interface InferredEntity {
  tableName: string;
  columns: InferredColumn[];
  sourceFiles: string[];
  foreignKeys: ForeignKey[];
}

export interface ValidationIssue {
  severity: "error" | "warning";
  entity: string;
  description: string;
  suggestion: string;
}

export const AgentState = Annotation.Root({
  sessionId: Annotation<string>,
  fileKeys: Annotation<string[]>,
  parsedFiles: Annotation<ParsedFile[]>({
    reducer: (_, update) => update,
    default: () => [],
  }),
  entities: Annotation<InferredEntity[]>({
    reducer: (_, update) => update,
    default: () => [],
  }),
  sqlSchema: Annotation<string>({
    reducer: (_, update) => update,
    default: () => "",
  }),
  sqlInserts: Annotation<string>({
    reducer: (_, update) => update,
    default: () => "",
  }),
  validationIssues: Annotation<ValidationIssue[]>({
    reducer: (_, update) => update,
    default: () => [],
  }),
  iterationCount: Annotation<number>({
    reducer: (_, update) => update,
    default: () => 0,
  }),
  maxIterations: Annotation<number>({
    reducer: (_, update) => update,
    default: () => 3,
  }),
  status: Annotation<string>({
    reducer: (_, update) => update,
    default: () => "parsing",
  }),
  error: Annotation<string | null>({
    reducer: (_, update) => update,
    default: () => null,
  }),
  targetDialect: Annotation<string>({
    reducer: (_, update) => update,
    default: () => "postgres",
  }),
  totalCost: Annotation<number>({
    reducer: (prev, update) => prev + update,
    default: () => 0,
  }),
});

export type AgentStateType = typeof AgentState.State;
