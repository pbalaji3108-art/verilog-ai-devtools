// claudeClient.js
// Thin wrapper around the Anthropic SDK so the rest of the app never has to
// think about API plumbing (auth, model name, message format).
//
// This file is fully written for you -- it's boilerplate, not the interesting
// part of this project. Read it once so you understand what askClaude() does,
// then move on to testbenchGenerator.js and bugExplainer.js, which are yours.

require('dotenv').config();
const Anthropic = require('@anthropic-ai/sdk');

if (!process.env.ANTHROPIC_API_KEY) {
  console.error(
    'ERROR: ANTHROPIC_API_KEY is not set.\n' +
    'Copy .env.example to .env and paste in your key from console.anthropic.com'
  );
  process.exit(1);
}

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

/**
 * Send a single prompt to Claude and return the plain-text response.
 *
 * @param {string} systemPrompt - Instructions that set Claude's role/behavior.
 * @param {string} userPrompt   - The actual request/content for this call.
 * @param {number} [maxTokens]  - Cap on response length.
 * @returns {Promise<string>}   - Claude's text response.
 */
async function askClaude(systemPrompt, userPrompt, maxTokens = 2000) {
  const response = await client.messages.create({
    model: 'claude-sonnet-4-5-20250929',
    max_tokens: maxTokens,
    system: systemPrompt,
    messages: [{ role: 'user', content: userPrompt }],
  });

  // response.content is an array of blocks; for a plain text reply it's
  // a single block of type "text".
  return response.content
    .filter((block) => block.type === 'text')
    .map((block) => block.text)
    .join('\n');
}

module.exports = { askClaude };
