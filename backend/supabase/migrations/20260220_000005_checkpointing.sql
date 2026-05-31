-- LangGraph checkpoint tables for crash recovery and resumption

CREATE TABLE IF NOT EXISTS public.checkpoints (
  thread_id text NOT NULL,
  checkpoint_ns text NOT NULL DEFAULT '',
  checkpoint_id text NOT NULL,
  parent_checkpoint_id text,
  type text,
  checkpoint jsonb NOT NULL DEFAULT '{}'::jsonb,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (thread_id, checkpoint_ns, checkpoint_id)
);

CREATE INDEX IF NOT EXISTS checkpoints_thread_id_idx ON public.checkpoints (thread_id);

CREATE TABLE IF NOT EXISTS public.checkpoint_writes (
  thread_id text NOT NULL,
  checkpoint_ns text NOT NULL DEFAULT '',
  checkpoint_id text NOT NULL,
  task_id text NOT NULL,
  idx integer NOT NULL,
  channel text NOT NULL,
  type text,
  value jsonb,
  PRIMARY KEY (thread_id, checkpoint_ns, checkpoint_id, task_id, idx)
);

CREATE INDEX IF NOT EXISTS checkpoint_writes_thread_id_idx ON public.checkpoint_writes (thread_id);

-- RLS: only service_role can access checkpoints
ALTER TABLE public.checkpoints ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.checkpoint_writes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "checkpoints_service_role_all"
ON public.checkpoints FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

CREATE POLICY "checkpoint_writes_service_role_all"
ON public.checkpoint_writes FOR ALL
TO service_role
USING (true)
WITH CHECK (true);
