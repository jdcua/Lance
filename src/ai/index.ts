// v3 · Local AI inference not yet implemented.
// This stub will be replaced with an on-device LLM (e.g. llama.cpp / mistral.rs).
// All AI UI surfaces are already gated behind the ai_enabled profile flag (default false).
export async function queryLocalAI(prompt: string): Promise<string> {
  console.log('[Lance AI] prompt:', prompt);
  return '';
}
