#!/usr/bin/env node
import { existsSync, readFileSync } from "node:fs";
import { extname } from "node:path";
import { compile, run } from "./runtime.js";
import { errors, normalizeError } from "./errors.js";
import { parse } from "./parser.js";

const [, , command, file] = process.argv;

function main(): void {
  if (!command || ["--help", "-h"].includes(command)) {
    printHelp();
    return;
  }

  if (!["run", "transpile", "audit"].includes(command)) {
    fail(errors.unknownCommand(command));
  }

  if (!file) {
    fail("No deck was socialised. Please provide a .deck file.");
  }

  if (extname(file) !== ".deck") {
    fail(errors.invalidDeckExtension);
  }

  if (!existsSync(file)) {
    fail(errors.missingFile(file));
  }

  const source = readFileSync(file, "utf8");

  try {
    if (command === "run") {
      const result = run(source);
      process.stdout.write(result.output.join("\n"));
      if (result.output.length > 0) {
        process.stdout.write("\n");
      }
      return;
    }

    if (command === "transpile") {
      process.stdout.write(compile(source));
      return;
    }

    parse(source);
    process.stdout.write("This deck is aligned.\n");
  } catch (error) {
    const normal = normalizeError(error);
    fail(normal.message);
  }
}

function printHelp(): void {
  process.stdout.write(`ConsultingLang: Deliver value. At scale. Going forward.

Usage:
  consultinglang run <file.deck>
  consultinglang transpile <file.deck>
  consultinglang audit <file.deck>
`);
}

function fail(message: string): never {
  process.stderr.write(`${message}\n`);
  process.exit(1);
}

main();
