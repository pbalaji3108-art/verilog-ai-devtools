# Verilog AI Devtools

A CLI toolkit that uses an LLM to speed up two common RTL/DV workflows:
writing testbenches and debugging RTL. It runs **free and fully local** with
[Ollama](https://ollama.com) by default, or with the Claude API for stronger
output — same prompts, one setting to switch.

- **`gen-tb`** — describe a module in plain English, get back a
  self-checking SystemVerilog testbench.
- **`explain-bug`** — point it at an RTL file (and optionally a simulator
  error log), get back a plain-English root-cause explanation and a
  suggested fix.

## Why

Writing a first-pass testbench and tracking down classic RTL bugs
(blocking vs. non-blocking assignment misuse, incomplete sensitivity
lists, unintended latch inference, reset issues) both follow patterns
well-suited to an LLM — the hard part is prompting it to produce output
that's actually usable in a simulator rather than generic filler. This
project is a practical exercise in that: constraining an LLM's output to
be self-checking, simulator-compatible SystemVerilog, and grounding its
debugging in specific signals and line behavior rather than vague
generalities.

## Setup

```bash
npm install
cp .env.example .env
```

**Option A — free, local (default).** Install [Ollama](https://ollama.com),
then download a code model:

```bash
ollama pull qwen2.5-coder:7b
```

No API key, no cost, and your RTL never leaves your machine. A 7B model is
weaker than Claude and slower on a CPU-only laptop (expect about a minute per
run), so generated testbenches may need a manual fix more often. Any model
Ollama can run works: set `OLLAMA_MODEL` in `.env`.

**Option B — Claude API.** In `.env`, set `LLM_PROVIDER=anthropic` and add
`ANTHROPIC_API_KEY` from https://console.anthropic.com/settings/keys
(requires API credits).

## Usage

```bash
# Generate a testbench from a description
npm run gen-tb -- -d examples/mux_description.txt -o mux4to1

# Or describe inline
npm run gen-tb -- -d "An 8-bit shift register with serial in, serial out, and shift enable" -o shiftreg

# Explain a bug in a file
npm run explain-bug -- -f examples/buggy_counter.sv
```

Generated testbenches are written to `output/` (gitignored by default —
commit specific results worth keeping with `git add -f`).

## Architecture

- `src/llmClient.js` — `askLLM()`: one interface, two backends. Ollama
  (streams the response so slow local models don't time out, and raises the
  context window to 8k so long testbenches aren't truncated) or the
  Anthropic SDK. Clear one-line errors for "Ollama not running", "model not
  pulled", bad key, or no credits.
- `src/testbenchGenerator.js` — builds a prompt instructing Claude to act
  as a senior DV engineer and return self-checking SystemVerilog with
  directed + randomized stimulus, no prose. Rules are pinned to what Icarus
  Verilog 12 actually supports (no classes/`randomize()`/UVM), and
  `extractCode()` strips markdown fences if the model adds them anyway.
- `src/bugExplainer.js` — builds a prompt instructing Claude to review RTL
  like a code reviewer. RTL is sent with line numbers so findings can cite
  exact lines; every finding is tagged `[SYNTAX]`, `[FUNCTIONAL]` or
  `[STYLE]`; the error-log section is only included when a log is given.
- `src/index.js` — CLI wiring (`commander`).

## Results

### Testbench prompt check — `mux4to1`

To validate the prompt rules before wiring up a model, a testbench was
written by following `SYSTEM_PROMPT` + `buildPrompt()` exactly for
`examples/mux_description.txt`, and run against a reference DUT with
Icarus Verilog 12.0 (`iverilog -g2012 -Wall`):

| DUT | Result |
|---|---|
| `examples/mux4to1.sv` (correct) | 218 checks, 0 errors — `TEST PASSED` |
| Mutant: `sel=2` routed to `in3` | 218 checks, 48 errors — `TEST FAILED` |

The mutant run confirms the testbench is genuinely self-checking (its
reference model catches a wrong select), not just driving stimulus.
Testbench: [`examples/results/mux4to1_tb.sv`](examples/results/mux4to1_tb.sv).

```bash
iverilog -g2012 -o sim examples/results/mux4to1_tb.sv examples/mux4to1.sv && vvp sim
```

### Bug explainer — `buggy_counter.sv`

The example has two functional bugs (blocking `=` in clocked reset logic,
and a missing `posedge rst` that makes a documented async reset behave
synchronously) plus one style issue (`count + 1` with an unsized 32-bit
literal — simulated to confirm it still wraps 15 → 0, so it's lint, not a
bug). A good review should report exactly those three, correctly tagged.

### Pending

- Run both tools end-to-end on a local Ollama model and record output
  quality vs. the reference above.
