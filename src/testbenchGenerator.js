// testbenchGenerator.js
//
// Turns a plain-English description of a Verilog/SystemVerilog module into a
// self-checking testbench that compiles and runs on Icarus Verilog 12
// (`iverilog -g2012`) -- the same simulator EDA Playground uses by default.
//
// How it works:
//   SYSTEM_PROMPT  -> sets Claude's role and the hard rules every testbench
//                     must follow (self-checking, Icarus-safe syntax, code only).
//   buildPrompt()  -> wraps the user's module description with the specific
//                     structure we want back.
//   extractCode()  -> safety net: if Claude wraps the answer in ```markdown
//                     fences anyway, strip them so the .sv file compiles.

const fs = require('fs');
const path = require('path');
const { askClaude } = require('./claudeClient');

const SYSTEM_PROMPT = `You are a senior design verification engineer. You write
clean, self-checking SystemVerilog testbenches that compile and run on the
first try.

Hard rules -- every testbench you write MUST follow these:

1. TARGET SIMULATOR: Icarus Verilog 12 with "iverilog -g2012".
   Icarus does NOT support: classes, randomize()/constraints, covergroups,
   concurrent assertions (assert property), interfaces with modports,
   program blocks, or the UVM library. Never use them.
   Use instead: $urandom / $urandom_range for random stimulus, tasks and
   functions for reuse, logic/reg/wire, always/initial blocks, and
   $display("ERROR: ...") with an error counter for reporting failures.

2. SELF-CHECKING: the testbench computes the EXPECTED value for every check
   with its own reference model (a function or simple behavioral code), then
   compares it to the DUT output. Every mismatch prints one line containing
   "ERROR:", the inputs, the expected value and the actual value, and
   increments an error counter. Never just dump stimulus without checking.

3. STIMULUS: a directed section first (corner cases: all zeros, all ones,
   max/min values, every select/opcode value, reset behavior), then a
   randomized section of at least 50 iterations.

4. TIMING:
   - Combinational DUT: apply inputs, wait #1, then check.
   - Sequential DUT: generate a clock (always #5 clk = ~clk), drive inputs
     on the negedge, check outputs after the posedge (e.g. @(posedge clk); #1;).
     Assert reset at time 0 for at least 2 cycles, then release it.
   - Include a watchdog timeout that ends the sim with an ERROR if it hangs.

5. ENDING: print a summary with the number of checks and errors, then exactly
   "TEST PASSED" if errors == 0, otherwise "TEST FAILED", then $finish.
   Also dump waves: $dumpfile("dump.vcd"); $dumpvars(0, <tb_name>);

6. OUTPUT FORMAT: output ONLY SystemVerilog source code. No markdown fences,
   no prose before or after. Explanations go in // comments.`;

/**
 * Build the user message for a given module description.
 *
 * @param {string} moduleDescription - plain-English description of the DUT.
 * @returns {string} the full prompt to send as the user message.
 */
function buildPrompt(moduleDescription) {
  return `Write a self-checking testbench for the following module.

<module_description>
${moduleDescription.trim()}
</module_description>

Requirements:
- If the description does not give exact port names or widths, choose
  sensible conventional ones (clk, rst_n, en, data_in, ...) instead of
  asking questions -- this is a non-interactive tool.
- Start the file with a header comment block listing: the DUT module name,
  every port (direction, width, name) you assumed, and the reset type and
  polarity. A designer will use this list to write a DUT that matches.
- Name the testbench module tb_<dut_module_name> and instantiate the DUT
  as "dut" with named port connections (.port(signal)).
- Follow every rule from your instructions. Output only the code.`;
}

/**
 * Remove ```systemverilog ... ``` fences if the model added them anyway.
 */
function extractCode(text) {
  const fenced = text.match(/```[a-zA-Z]*\s*\n([\s\S]*?)```/);
  return (fenced ? fenced[1] : text).trim();
}

/**
 * Generate a testbench for the given module description and save it to disk.
 */
async function generateTestbench(moduleDescription, outputName = 'generated') {
  const prompt = buildPrompt(moduleDescription);
  const result = await askClaude(SYSTEM_PROMPT, prompt, 6000);

  const outDir = path.join(__dirname, '..', 'output');
  if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });

  const outPath = path.join(outDir, `${outputName}_tb.sv`);
  fs.writeFileSync(outPath, extractCode(result) + '\n');

  console.log(`Testbench written to: ${outPath}`);
  return outPath;
}

module.exports = { SYSTEM_PROMPT, buildPrompt, extractCode, generateTestbench };
