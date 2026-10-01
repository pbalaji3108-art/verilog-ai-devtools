// bugExplainer.js
//
// Given RTL (and optionally a simulator/compiler log), produce a focused,
// reviewer-style explanation of what's wrong and how to fix it -- the way a
// senior engineer would point at the exact line instead of speaking in
// generalities.
//
// How it works:
//   SYSTEM_PROMPT  -> role + a checklist of classic RTL bug categories +
//                     a fixed output structure so every report reads the same.
//   numberLines()  -> prefixes each RTL line with its line number so Claude
//                     can cite "line 14" accurately instead of guessing.
//   buildPrompt()  -> wraps the numbered RTL and (only if present) the error
//                     log in tags, so the model never refers to a log that
//                     doesn't exist.

const { askLLM } = require('./llmClient');

const SYSTEM_PROMPT = `You are a senior RTL design and verification engineer
doing a focused code review. Your job is to find real bugs, not to paraphrase
the code.

Review method:
- Read the RTL line by line like a reviewer. Every finding must cite the
  specific line number(s) and signal name(s) involved.
- Classify every finding as exactly one of:
    [SYNTAX]     will not compile / elaborate
    [FUNCTIONAL] compiles and simulates, but produces wrong behavior or
                 synthesizes to different hardware than intended
    [STYLE]      not a bug, but a lint/readability/maintainability issue
- Check explicitly for these classic Verilog/SystemVerilog bugs:
    * blocking (=) used in clocked logic, or non-blocking (<=) in
      combinational logic; mixing both on the same signal
    * incomplete sensitivity list in an old-style always @(a or b)
    * missing else/default in combinational logic -> unintended latch
    * reset that doesn't cover every state register; sync vs async reset
      mismatched with the design intent described in comments
    * signed vs unsigned mix-ups in comparisons and arithmetic
    * bit-width mismatches, truncation, overflow, off-by-one loop bounds
    * multiple drivers on the same signal
- Use the design intent stated in comments and names. If the code
  contradicts its own comments, that is a finding.
- If an error log is provided, tie each error message to the line that
  causes it. If no log is provided, never mention one.
- Do not invent problems. If the code is correct, say so plainly.

Output format (plain text with these exact headings):

SUMMARY
One or two sentences: what is wrong, in plain English.

FINDINGS
A numbered list, most severe first. For each:
  [CATEGORY] line N, signal <name> -- what is wrong
  Why it matters: what you would see in simulation or in synthesized hardware.

SUGGESTED FIX
A corrected version of only the affected block(s), in a code block, with
// comments on the changed lines.`;

/**
 * Prefix each line with its 1-based line number so findings can cite lines.
 */
function numberLines(code) {
  const lines = code.replace(/\r\n/g, '\n').split('\n');
  const width = String(lines.length).length;
  return lines.map((l, i) => `${String(i + 1).padStart(width)}| ${l}`).join('\n');
}

/**
 * @param {string} rtlCode  - the Verilog/SystemVerilog source to review.
 * @param {string} errorLog - optional simulator/compiler output ('' if none).
 * @returns {string} the full prompt to send as the user message.
 */
function buildPrompt(rtlCode, errorLog = '') {
  let prompt = `Review this RTL and explain the bug(s). Line numbers are shown
before the "|" -- cite them in your findings.

<rtl>
${numberLines(rtlCode)}
</rtl>
`;

  if (errorLog && errorLog.trim()) {
    prompt += `
This is the simulator/compiler output for the code above. Ground your
explanation in it: tie each error to the line that causes it.

<error_log>
${errorLog.trim()}
</error_log>
`;
  } else {
    prompt += `
No simulator or compiler log is available -- find the bugs by reading the code.
`;
  }

  prompt += `
Follow the review method and output format from your instructions.`;
  return prompt;
}

/**
 * Explain a bug in the given RTL.
 */
async function explainBug(rtlCode, errorLog = '') {
  const prompt = buildPrompt(rtlCode, errorLog);
  return askLLM(SYSTEM_PROMPT, prompt, 2500);
}

module.exports = { SYSTEM_PROMPT, numberLines, buildPrompt, explainBug };
