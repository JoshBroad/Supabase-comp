export interface BuildSession {
  id: string;
  status: 'pending' | 'building' | 'succeeded' | 'failed';
  template: string;
  vibeText: string;
  environment?: {
    projectRef?: string;
    branchRef?: string;
    dashboardUrl?: string;
    previewConfig?: any;
  };
  options: {
    enableAnalytics: boolean;
    enableDriftSentinel: boolean;
  };
}

export interface BuildEvent {
  id: string;
  ts: string;
  type: 'plan_created' | 'environment_created' | 'table_created' | 'rls_enabled' | 'policy_created' | 'edge_function_deployed' | 'analytics_configured' | 'build_succeeded' | 'build_failed' | 'drift_detected';
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
