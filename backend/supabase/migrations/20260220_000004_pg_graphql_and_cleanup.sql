-- Enable pg_graphql extension
CREATE EXTENSION IF NOT EXISTS pg_graphql;

-- Create a public wrapper function for the GraphQL resolver
-- This allows calling GraphQL queries via Supabase RPC
CREATE OR REPLACE FUNCTION public.graphql(
  "operationName" text DEFAULT NULL,
  query text DEFAULT '',
  variables jsonb DEFAULT '{}'::jsonb,
  extensions jsonb DEFAULT '{}'::jsonb
)
RETURNS jsonb
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT graphql.resolve(query, coalesce(variables, '{}'));
$$;

GRANT EXECUTE ON FUNCTION public.graphql(text, text, jsonb, jsonb) TO anon;
GRANT EXECUTE ON FUNCTION public.graphql(text, text, jsonb, jsonb) TO authenticated;

-- Drop the obsolete 3-param session_create overload (replaced by 4-param version in migration 3)
DROP FUNCTION IF EXISTS public.session_create(text, text, jsonb);

-- Add comment on spec_chunks table noting it's reserved for future use (embeddings pipeline)
COMMENT ON TABLE public.spec_chunks IS 'Stores embedded chunks of parsed data lake files for semantic search. Populated by the embeddings pipeline (Stage 6).';
