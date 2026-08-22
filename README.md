# Verilog AI Devtools

A CLI toolkit that uses the Claude API to speed up two common RTL/DV
workflows: writing testbenches and debugging RTL.

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
# add your key from https://console.anthropic.com/settings/keys to .env
```

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

- `src/claudeClient.js` — thin wrapper around the Anthropic SDK.
- `src/testbenchGenerator.js` — builds a prompt instructing Claude to act
  as a senior DV engineer and return self-checking SystemVerilog with
  directed + randomized stimulus, no prose.
- `src/bugExplainer.js` — builds a prompt instructing Claude to review RTL
  like a code reviewer: cite specific signals/lines, distinguish real
  functional bugs from style issues, and end with a concrete fix.
- `src/index.js` — CLI wiring (`commander`).

## Results

*(What module descriptions were tested, whether the generated testbench
compiled cleanly on EDA Playground / Icarus Verilog, and what changed in
the prompts to get there.)*
