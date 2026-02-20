import { HuggingFaceInferenceEmbeddings } from "@langchain/community/embeddings/hf";
import { getSupabaseAdmin } from "../supabase.js";
import type { ParsedFile } from "../graph/state.js";

const CHUNK_SIZE = 500; // characters per chunk
const CHUNK_OVERLAP = 50;

function chunkText(text: string, chunkSize = CHUNK_SIZE, overlap = CHUNK_OVERLAP): string[] {
  const chunks: string[] = [];
  let start = 0;
  while (start < text.length) {
    const end = Math.min(start + chunkSize, text.length);
    chunks.push(text.slice(start, end));
    start += chunkSize - overlap;
  }
  return chunks;
}

function parsedFileToText(file: ParsedFile): string {
  const headerLine = file.headers.join(", ");
  const sampleLines = file.sampleRows
    .slice(0, 10)
    .map((row) => JSON.stringify(row))
    .join("\n");
  return `File: ${file.filename} (${file.format})\nHeaders: ${headerLine}\nSample data:\n${sampleLines}`;
}

/**
 * Index parsed files into spec_chunks with embeddings.
 * Uses HuggingFace Inference API with all-MiniLM-L6-v2 (384 dims).
 * Non-blocking: failures are logged but do not throw.
 */
export async function indexParsedFiles(
  sessionId: string,
  parsedFiles: ParsedFile[]
): Promise<void> {
  const apiKey = process.env.HUGGINGFACE_API_KEY;
  if (!apiKey) {
    console.warn("[Embeddings] HUGGINGFACE_API_KEY not set, skipping indexing");
    return;
  }

  try {
    const embeddings = new HuggingFaceInferenceEmbeddings({
      apiKey,
      model: "sentence-transformers/all-MiniLM-L6-v2",
    });

    const supabase = getSupabaseAdmin();
    const allChunks: { content: string; metadata: Record<string, unknown>; chunkIndex: number }[] = [];

    for (const file of parsedFiles) {
      const text = parsedFileToText(file);
      const chunks = chunkText(text);
      chunks.forEach((chunk, i) => {
        allChunks.push({
          content: chunk,
          metadata: { filename: file.filename, format: file.format },
          chunkIndex: i,
        });
      });
    }

    if (allChunks.length === 0) return;

    // Generate embeddings in batches
    const batchSize = 20;
    for (let i = 0; i < allChunks.length; i += batchSize) {
      const batch = allChunks.slice(i, i + batchSize);
      const texts = batch.map((c) => c.content);
      const vectors = await embeddings.embedDocuments(texts);

      const rows = batch.map((chunk, j) => ({
        session_id: sessionId,
        chunk_index: chunk.chunkIndex,
        content: chunk.content,
        embedding: JSON.stringify(vectors[j]),
        metadata: chunk.metadata,
      }));

      const { error } = await supabase.from("spec_chunks").insert(rows);
      if (error) {
        console.error("[Embeddings] Insert error:", error.message);
      }
    }

    console.log(`[Embeddings] Indexed ${allChunks.length} chunks for session ${sessionId}`);
  } catch (err) {
    console.error("[Embeddings] Indexing failed (non-fatal):", err instanceof Error ? err.message : err);
  }
}

/**
 * Perform semantic similarity search over indexed chunks.
 */
export async function searchDocuments(
  query: string,
  sessionId?: string,
  matchCount = 5
): Promise<Array<{ content: string; metadata: Record<string, unknown>; similarity: number }>> {
  const apiKey = process.env.HUGGINGFACE_API_KEY;
  if (!apiKey) {
    throw new Error("HUGGINGFACE_API_KEY not set");
  }

  const embeddings = new HuggingFaceInferenceEmbeddings({
    apiKey,
    model: "sentence-transformers/all-MiniLM-L6-v2",
  });

  const queryEmbedding = await embeddings.embedQuery(query);
  const supabase = getSupabaseAdmin();

  const filter = sessionId ? { session_id: sessionId } : {};

  const { data, error } = await supabase.rpc("match_documents", {
    query_embedding: JSON.stringify(queryEmbedding),
    match_count: matchCount,
    filter,
  });

  if (error) throw error;
  return data || [];
}
