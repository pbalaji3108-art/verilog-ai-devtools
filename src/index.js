#!/usr/bin/env node
// index.js -- CLI entry point. This file is done for you; it just wires
// argument parsing (commander) to the two modules you're implementing.

const fs = require('fs');
const { Command } = require('commander');
const { generateTestbench } = require('./testbenchGenerator');
const { explainBug } = require('./bugExplainer');

const program = new Command();

program
  .name('ai-dev-tools')
  .description('Verilog testbench generator + RTL bug explainer (Claude-powered)');

program
  .command('gen-tb')
  .description('Generate a self-checking SystemVerilog testbench from a plain-English description')
  .requiredOption('-d, --description <text>', 'plain-English description of the module, OR a path to a .txt file containing it')
  .option('-o, --output <name>', 'output file base name (written to output/<name>_tb.sv)', 'generated')
  .action(async (opts) => {
    const description = fs.existsSync(opts.description)
      ? fs.readFileSync(opts.description, 'utf8')
      : opts.description;
    await generateTestbench(description, opts.output);
  });

program
  .command('explain-bug')
  .description('Get a plain-English explanation of a bug in an RTL file')
  .requiredOption('-f, --file <path>', 'path to the .v/.sv file to review')
  .option('-e, --error-log <path>', 'path to a simulator/compiler error log (optional)')
  .action(async (opts) => {
    const rtlCode = fs.readFileSync(opts.file, 'utf8');
    const errorLog = opts.errorLog ? fs.readFileSync(opts.errorLog, 'utf8') : '';
    const explanation = await explainBug(rtlCode, errorLog);
    console.log('\n' + explanation + '\n');
  });

program.parseAsync(process.argv);
