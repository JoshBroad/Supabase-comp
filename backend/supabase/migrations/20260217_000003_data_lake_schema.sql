-- Add file_keys column to build_sessions for data lake file references
ALTER TABLE public.build_sessions
  ADD COLUMN IF NOT EXISTS file_keys text[] DEFAULT '{}';

-- Make template and vibe_text optional (defaults for data lake mode)
ALTER TABLE public.build_sessions
  ALTER COLUMN template SET DEFAULT 'data_lake',
  ALTER COLUMN vibe_text SET DEFAULT '';

-- Create storage bucket for file uploads
INSERT INTO storage.buckets (id, name, public)
VALUES ('uploads', 'uploads', false)
ON CONFLICT (id) DO NOTHING;

-- Allow anonymous and authenticated users to upload files
CREATE POLICY "allow_upload" ON storage.objects
  FOR INSERT TO anon, authenticated
  WITH CHECK (bucket_id = 'uploads');

-- Allow reading uploaded files (service role always can, but also allow session participants)
CREATE POLICY "allow_read_uploads" ON storage.objects
  FOR SELECT TO anon, authenticated
  USING (bucket_id = 'uploads');

-- Helper function for the agent to execute arbitrary SQL (used by the agent server)
-- This is a service-role-only function for executing generated DDL/DML
CREATE OR REPLACE FUNCTION public.exec_sql(query text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  EXECUTE query;
END;
$$;

-- Only service_role can call exec_sql
REVOKE ALL ON FUNCTION public.exec_sql(text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.exec_sql(text) FROM anon;
REVOKE ALL ON FUNCTION public.exec_sql(text) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.exec_sql(text) TO service_role;

-- Update session_create RPC to support file_keys
CREATE OR REPLACE FUNCTION public.session_create(
  p_vibe_text text DEFAULT '',
  p_template text DEFAULT 'data_lake',
  p_options jsonb DEFAULT '{}',
  p_file_keys text[] DEFAULT '{}'
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_session_id uuid;
BEGIN
  INSERT INTO public.build_sessions (
    status, template, vibe_text, options, file_keys, share_token
  ) VALUES (
    'queued', p_template, p_vibe_text, p_options, p_file_keys,
    encode(gen_random_bytes(18), 'base64')
  )
  RETURNING id INTO v_session_id;

  -- Create initial event
  INSERT INTO public.build_events (session_id, type, message, payload)
  VALUES (v_session_id, 'session_created', 'Build session created', jsonb_build_object('fileCount', array_length(p_file_keys, 1)));

  RETURN v_session_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.session_create(text, text, jsonb, text[]) TO anon;
GRANT EXECUTE ON FUNCTION public.session_create(text, text, jsonb, text[]) TO authenticated;
