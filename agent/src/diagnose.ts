
import "dotenv/config";
import { createClient } from "@supabase/supabase-js";
import { getLLM } from "./llm/client.js";

async function diagnose() {
  console.log("Starting diagnostics...");
  console.log("--------------------------------------------------");

  // 1. Check Env Vars
  console.log("Checking Environment Variables:");
  const requiredVars = ["SUPABASE_URL", "SUPABASE_SERVICE_ROLE_KEY", "OPENROUTER_API_KEY"];
  const missing = requiredVars.filter((v) => !process.env[v]);
  if (missing.length > 0) {
    console.error(`❌ MISSING ENV VARS: ${missing.join(", ")}`);
    process.exit(1);
  }
  console.log("✅ All required env vars present.");

  // 2. Test Supabase Connection & Storage
  console.log("\nTesting Supabase Connection (Storage):");
  const supabase = createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
  
  try {
    const { data: buckets, error: bucketError } = await supabase.storage.listBuckets();
    if (bucketError) throw bucketError;
    console.log(`✅ Connected to Supabase. Found ${buckets.length} buckets.`);
    const uploadsBucket = buckets.find(b => b.name === 'uploads');
    if (uploadsBucket) {
        console.log("✅ 'uploads' bucket exists.");
    } else {
        console.error("❌ 'uploads' bucket NOT found!");
    }
  } catch (err: any) {
    console.error("❌ Supabase Storage Error:", err.message);
  }

  // 3. Test exec_sql RPC
  console.log("\nTesting 'exec_sql' RPC:");
  try {
    const { error: rpcError } = await supabase.rpc("exec_sql", {
      query: "SELECT 1;",
    });
    if (rpcError) {
      console.error(`❌ exec_sql failed: ${rpcError.message}`);
      console.error("   (Check if function exists and service_role has permission)");
    } else {
      console.log("✅ exec_sql RPC works!");
    }
  } catch (err: any) {
    console.error("❌ RPC Execution Error:", err.message);
  }

  // 4. Test LLM Connection
  console.log("\nTesting LLM Connection (OpenRouter):");
  try {
    const llm = getLLM();
    console.log("   Sending test prompt...");
    const response = await llm.invoke("Say 'Hello' and nothing else.");
    console.log(`✅ LLM Responded: "${response.content}"`);
  } catch (err: any) {
    console.error("❌ LLM Error:", err.message);
  }

  console.log("--------------------------------------------------");
  console.log("Diagnostics complete.");
}

diagnose();
