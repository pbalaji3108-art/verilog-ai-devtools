// llmClient.js
// One function, askLLM(), that the rest of the app calls. Which model answers
// is decided by LLM_PROVIDER in .env:
//
//   ollama    (default) -- a free model running locally via Ollama
//                          (https://ollama.com). No API key, no cost, and the
//                          RTL never leaves your machine.
//   anthropic           -- the Claude API. Needs ANTHROPIC_API_KEY and credits.
//                          Stronger output.
//
// The prompts in testbenchGenerator.js / bugExplainer.js are identical for
// both providers -- only the transport changes.

require('dotenv').config();

const PROVIDER = (process.env.LLM_PROVIDER || 'ollama').toLowerCase();

function fail(msg) {
  console.error(msg);
  process.exit(1);
}

// ---------------------------------------------------------------------------
// Ollama (local)
// ---------------------------------------------------------------------------
const OLLAMA_URL = (process.env.OLLAMA_URL || 'http://localhost:11434').replace(/\/$/, '');
const OLLAMA_MODEL = process.env.OLLAMA_MODEL || 'qwen2.5-coder:7b';

async function askOllama(systemPrompt, userPrompt, maxTokens) {
  let res;
  try {
    res = await fetch(`${OLLAMA_URL}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: OLLAMA_MODEL,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        // Streaming keeps the connection alive while a slow CPU-only model
        // generates, and lets us show progress.
        stream: true,
        options: {
          num_predict: maxTokens,
          // Default context (2-4k tokens) is too small for system prompt +
          // RTL + a full testbench; without this the output gets cut off.
          num_ctx: 8192,
          temperature: 0.2,
        },
      }),
    });
  } catch (err) {
    fail(
      `Could not reach Ollama at ${OLLAMA_URL} (${err.cause?.code || err.message}).\n` +
      'Is it installed and running? Install from https://ollama.com, then run:\n' +
      `  ollama pull ${OLLAMA_MODEL}`
    );
  }

  if (!res.ok) {
    const body = await res.text();
    if (res.status === 404 && body.includes('not found')) {
      fail(`Ollama model "${OLLAMA_MODEL}" is not downloaded yet. Run:\n  ollama pull ${OLLAMA_MODEL}`);
    }
    fail(`Ollama error (${res.status}): ${body}`);
  }

  // The streamed response is one JSON object per line.
  process.stderr.write(`Generating with ${OLLAMA_MODEL} (local)`);
  const decoder = new TextDecoder();
  let buffer = '';
  let text = '';
  let chunks = 0;
  for await (const piece of res.body) {
    buffer += decoder.decode(piece, { stream: true });
    let nl;
    while ((nl = buffer.indexOf('\n')) >= 0) {
      const line = buffer.slice(0, nl).trim();
      buffer = buffer.slice(nl + 1);
      if (!line) continue;
      const msg = JSON.parse(line);
      if (msg.error) fail(`\nOllama error: ${msg.error}`);
      text += msg.message?.content || '';
      if (++chunks % 50 === 0) process.stderr.write('.');
    }
  }
  process.stderr.write(' done\n');
  return text;
}

// ---------------------------------------------------------------------------
// Anthropic (Claude API)
// ---------------------------------------------------------------------------
async function askAnthropic(systemPrompt, userPrompt, maxTokens) {
  if (!process.env.ANTHROPIC_API_KEY) {
    fail(
      'ERROR: LLM_PROVIDER=anthropic but ANTHROPIC_API_KEY is not set.\n' +
      'Add your key from console.anthropic.com to .env, or set LLM_PROVIDER=ollama.'
    );
  }
  const Anthropic = require('@anthropic-ai/sdk');
  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

  let response;
  try {
    response = await client.messages.create({
      model: process.env.CLAUDE_MODEL || 'claude-sonnet-5-5',
      max_tokens: maxTokens,
      system: systemPrompt,
      messages: [{ role: 'user', content: userPrompt }],
    });
  } catch (err) {
    // Print the API's own message (bad key, no credits, unknown model...)
    // instead of a long stack trace.
    const msg = err?.error?.error?.message || err.message;
    fail(`Claude API error${err.status ? ` (${err.status})` : ''}: ${msg}`);
  }

  // response.content is an array of blocks; keep only the text ones.
  return response.content
    .filter((block) => block.type === 'text')
    .map((block) => block.text)
    .join('\n');
}

/**
 * Send one prompt to the configured LLM and return its plain-text reply.
 *
 * @param {string} systemPrompt - instructions that set the model's role/rules.
 * @param {string} userPrompt   - the actual request for this call.
 * @param {number} [maxTokens]  - cap on response length.
 * @returns {Promise<string>}
 */
async function askLLM(systemPrompt, userPrompt, maxTokens = 2000) {
  if (PROVIDER === 'ollama') return askOllama(systemPrompt, userPrompt, maxTokens);
  if (PROVIDER === 'anthropic') return askAnthropic(systemPrompt, userPrompt, maxTokens);
  fail(`Unknown LLM_PROVIDER "${PROVIDER}". Use "ollama" or "anthropic".`);
}

module.exports = { askLLM, PROVIDER };
