-- Fix vector dimension: switch from 1536 (OpenAI) to 384 (HuggingFace all-MiniLM-L6-v2)
ALTER TABLE public.spec_chunks
  ALTER COLUMN embedding TYPE vector(384);

-- Create HNSW index for fast similarity search
CREATE INDEX IF NOT EXISTS spec_chunks_embedding_idx
  ON public.spec_chunks
  USING hnsw (embedding vector_cosine_ops);

-- Similarity search function
CREATE OR REPLACE FUNCTION public.match_documents(
  query_embedding vector(384),
  match_count int DEFAULT 5,
  filter jsonb DEFAULT '{}'::jsonb
)
RETURNS TABLE (
  id uuid,
  session_id uuid,
  content text,
  metadata jsonb,
  similarity float
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT
    sc.id,
    sc.session_id,
    sc.content,
    sc.metadata,
    1 - (sc.embedding <=> query_embedding) AS similarity
  FROM public.spec_chunks sc
  WHERE
    CASE
      WHEN filter ? 'session_id' THEN sc.session_id = (filter->>'session_id')::uuid
      ELSE true
    END
  ORDER BY sc.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;

GRANT EXECUTE ON FUNCTION public.match_documents(vector, int, jsonb) TO service_role;
