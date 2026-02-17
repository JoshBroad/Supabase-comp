export interface BuildSession {
  id: string;
  status: 'pending' | 'queued' | 'running' | 'succeeded' | 'failed';
  template: string;
  file_keys: string[];
  options: Record<string, any>;
  environment?: Record<string, any>;
  outputs?: Record<string, any>;
  error?: string;
}

export interface BuildEvent {
  id: string;
  ts: string;
  type:
    | 'session_created'
    | 'parsing_started'
    | 'file_parsed'
    | 'inferring_started'
    | 'entities_inferred'
    | 'generating_schema'
    | 'table_created'
    | 'validating_schema'
    | 'validation_complete'
    | 'schema_corrected'
    | 'data_insertion_started'
    | 'data_inserted'
    | 'executing_sql'
    | 'schema_applied'
    | 'sql_error'
    | 'build_succeeded'
    | 'build_failed'
    | 'drift_detected'
    | string;
  message: string;
  payload?: any;
}

export interface PresenceState {
  actor: 'architect' | 'user';
  step: string;
  focus?: { type: string; name: string };
  progress: number;
}

export interface DriftAlert {
  id: string;
  severity: 'info' | 'warning' | 'error';
  resource: string;
  recommendation: string;
  specChunkId?: string;
}

export interface SchemaNode {
  id: string;
  label: string;
  type: 'table' | 'view' | 'function';
  meta?: any;
}

export interface SchemaEdge {
  id: string;
  source: string;
  target: string;
  label?: string;
}
