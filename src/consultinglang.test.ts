import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { lex } from "./lexer.js";
import { parse } from "./parser.js";
import { compile, run } from "./runtime.js";

const distRoot = fileURLToPath(new URL(".", import.meta.url));
const cli = join(distRoot, "cli.js");
const projectRoot = join(distRoot, "..");

describe("lexer", () => {
  it("recognizes multi-word keywords and consultant comments", () => {
    const tokens = lex(`kick off
      going forward if greenlit // per my last email: ignore this
      close the loop`);

    assert.equal(tokens.some((token) => token.value === "kick off"), true);
    assert.equal(tokens.some((token) => token.value === "going forward if"), true);
    assert.equal(tokens.some((token) => token.value === "ignore"), false);
  });
});

describe("parser", () => {
  it("enforces kick off", () => {
    assert.throws(
      () => parse(`socialise "Nope"\nclose the loop`),
      /Nobody said we were starting/,
    );
  });

  it("enforces close the loop", () => {
    assert.throws(
      () => parse(`kick off\nsocialise "Nope"`),
      /never properly closed out/,
    );
  });
});

describe("runtime", () => {
  it("runs hello world", () => {
    const result = run(`kick off
      socialise "Hello, World."
      close the loop`);

    assert.deepEqual(result.output, ["Hello, World."]);
  });

  it("handles functions, returns, and precedence", () => {
    const result = run(`kick off
      synergize add numbers with a, b
        take this offline a + b * 2
      end of day

      socialise leverage add numbers with 10, 20
      close the loop`);

    assert.deepEqual(result.output, ["50"]);
  });

  it("handles conditionals, arrays, and loops", () => {
    const result = run(`kick off
      align on team is a key deliverable of pipeline "Alice", "Bob"
      add to pipeline team "Carol"
      socialise headcount of team
      socialise stakeholder 1 of team
      loop back on i from 1 to 3
        going forward if i == 2
          socialise "middle"
        that said
          socialise i
        end of day
      end of day
      close the loop`);

    assert.deepEqual(result.output, ["3", "Bob", "1", "middle", "3"]);
  });

  it("detects division by zero", () => {
    assert.throws(
      () => run(`kick off
        socialise 1 / 0
        close the loop`),
      /cannot divide bandwidth/,
    );
  });

  it("detects out-of-bounds stakeholders", () => {
    assert.throws(
      () => run(`kick off
        align on team is a key deliverable of pipeline "Alice"
        socialise stakeholder 2 of team
        close the loop`),
      /Stakeholder 2 is not in the room/,
    );
  });

  it("detects wrong argument counts", () => {
    assert.throws(
      () => run(`kick off
        synergize add numbers with a, b
          take this offline a + b
        end of day
        socialise leverage add numbers with 1
        close the loop`),
      /requires more stakeholders/,
    );
  });

  it("detects infinite loops", () => {
    assert.throws(
      () => run(`kick off
        align on done is a key deliverable of deprioritised
        circle back until done
          socialise "again"
        end of day
        close the loop`),
      /looping back for 10001 cycles/,
    );
  });

  it("can compile fizzbuzz", () => {
    const js = compile(`kick off
      loop back on i from 1 to 3
        going forward if i % 3 == 0
          socialise "Fizz"
        that said
          socialise i
        end of day
      end of day
      close the loop`);

    assert.match(js, /__consulting\.modulo/);
  });
});

describe("cli", () => {
  it("runs an example deck", () => {
    const output = execFileSync(process.execPath, [cli, "run", join(projectRoot, "examples", "hello.deck")], {
      encoding: "utf8",
    });

    assert.equal(output.trim(), "Hello, World.");
  });

  it("audits an example deck", () => {
    const output = execFileSync(process.execPath, [cli, "audit", join(projectRoot, "examples", "hello.deck")], {
      encoding: "utf8",
    });

    assert.equal(output.trim(), "This deck is aligned.");
  });
});
