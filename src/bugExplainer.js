// bugExplainer.js
//
// GOAL: Given a chunk of RTL (and optionally a simulator error/log), produce
// a plain-English explanation of what's likely wrong and how to fix it --
// the kind of thing a senior engineer would say when they glance at your
// code and immediately spot the bug.
//
// ---------------------------------------------------------------------------
// YOUR TASK
// ---------------------------------------------------------------------------
// Implement buildPrompt(rtlCode, errorLog) below. Your prompt should push
// Claude to:
//
//   1. Actually read the RTL like a reviewer, not just paraphrase it.
//   2. Call out SPECIFIC line(s) or signal(s), not vague generalities.
//   3. Distinguish between (a) syntax/compile errors, (b) functional bugs
//      that would sim but produce wrong results (e.g. blocking vs.
//      non-blocking assignment misuse, missing reset in a sequential
//      always block, incomplete sensitivity list, latch inference from an
//      incomplete if/case), and (c) style/lint issues that aren't bugs.
//   4. If an errorLog is provided, use it to ground the explanation (e.g.
//      tie a specific error message to a specific line) instead of just
//      guessing generically.
//   5. End with a concrete suggested fix (a short code snippet is great).
//
// Common categories worth explicitly prompting Claude to check for, since
// these are the classic Verilog/SystemVerilog bugs:
//   - blocking (=) vs non-blocking (<=) assignment in sequential logic
//   - incomplete sensitivity list in an old-style `always @(...)`
//   - missing `else`/`default` branch causing unintended latch inference
//   - reset not covering all state (async vs sync reset mismatch)
//   - signed vs unsigned comparison/arithmetic mistakes
//   - off-by-one in loop bounds or bit-width mismatches
//
// errorLog can be an empty string -- handle that case (don't reference "the
// error log below" if there isn't one).
// ---------------------------------------------------------------------------

const { askClaude } = require('./claudeClient');

const SYSTEM_PROMPT = `TODO: write a system prompt that sets Claude's role
as a senior RTL/verification engineer doing a focused code review to find a
bug. See the numbered requirements in the comment block above.`;

/**
 * @param {string} rtlCode  - the Verilog/SystemVerilog source to review.
 * @param {string} errorLog - optional simulator/compiler error output ('' if none).
 * @returns {string} the full prompt to send as the user message.
 */
function buildPrompt(rtlCode, errorLog) {
  // TODO: implement this. Return a single string.
  throw new Error('buildPrompt() is not implemented yet -- see the TODOs above.');
}

/**
 * Explain a bug in the given RTL file. (This part is done for you.)
 */
async function explainBug(rtlCode, errorLog = '') {
  const prompt = buildPrompt(rtlCode, errorLog);
  const explanation = await askClaude(SYSTEM_PROMPT, prompt, 1500);
  return explanation;
}

module.exports = { buildPrompt, explainBug };
