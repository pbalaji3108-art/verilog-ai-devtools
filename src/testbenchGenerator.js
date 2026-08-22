// testbenchGenerator.js
//
// GOAL: Turn a plain-English description of a Verilog/SystemVerilog module
// into a simulation-ready testbench (or UVM-style stub) that a verification
// engineer could actually drop into a simulator and run.
//
// This is the "interesting" part of the project: the quality of the output
// depends entirely on how well you engineer the prompt. Your job is to fill
// in buildPrompt() below.
//
// ---------------------------------------------------------------------------
// YOUR TASK
// ---------------------------------------------------------------------------
// Implement buildPrompt(moduleDescription) so that it returns a STRING
// containing the full instruction you'll send to Claude. Think about what
// you, as a verification engineer, would need to tell a very literal-minded
// junior engineer to get a *usable* testbench back. At minimum your prompt
// should tell Claude to:
//
//   1. Infer or ask for reasonable port names/widths if the description is
//      ambiguous (but default to sensible names rather than asking questions
//      back, since this is a non-interactive tool).
//   2. Generate a self-checking testbench (not just stimulus) -- i.e. it
//      should compare DUT outputs against expected values and print
//      PASS/FAIL, not just dump waveforms.
//   3. Include at least a handful of directed test cases AND some randomized
//      stimulus (constrained-random if you want to push yourself).
//   4. Output ONLY the SystemVerilog code, no prose before/after, so the
//      output can be saved straight to a .sv file.
//   5. Use `initial` blocks / `$display` / `$finish` in a way that's
//      compatible with Icarus Verilog or EDA Playground (avoid
//      simulator-specific syntax unless you say which simulator you're
//      targeting).
//
// TIP: system prompts are a great place to set Claude's "role" (e.g. "You are
// a senior design verification engineer who writes clean, synthesizable-style
// SystemVerilog testbenches...") and userPrompt is where the actual module
// description goes.
//
// Once you've written buildPrompt, generateTestbench() below already wires
// it up to Claude and writes the result to output/<name>_tb.sv -- you don't
// need to touch that part unless you want to.
// ---------------------------------------------------------------------------

const fs = require('fs');
const path = require('path');
const { askClaude } = require('./claudeClient');

const SYSTEM_PROMPT = `TODO: write a system prompt that sets Claude's role
as a senior DV engineer generating self-checking SystemVerilog testbenches.
See the numbered requirements in the comment block above.`;

/**
 * Build the user-facing prompt sent to Claude for a given module description.
 *
 * @param {string} moduleDescription - plain-English description of the DUT,
 *   e.g. "An 8-bit synchronous up/down counter with active-low async reset,
 *   an enable input, and a terminal-count output."
 * @returns {string} the full prompt to send as the user message.
 */
function buildPrompt(moduleDescription) {
  // TODO: implement this. Return a single string.
  throw new Error('buildPrompt() is not implemented yet -- see the TODOs above.');
}

/**
 * Generate a testbench for the given module description and save it to disk.
 * (This part is done for you.)
 */
async function generateTestbench(moduleDescription, outputName = 'generated') {
  const prompt = buildPrompt(moduleDescription);
  const result = await askClaude(SYSTEM_PROMPT, prompt, 3000);

  const outDir = path.join(__dirname, '..', 'output');
  if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });

  const outPath = path.join(outDir, `${outputName}_tb.sv`);
  fs.writeFileSync(outPath, result.trim() + '\n');

  console.log(`Testbench written to: ${outPath}`);
  return outPath;
}

module.exports = { buildPrompt, generateTestbench };
