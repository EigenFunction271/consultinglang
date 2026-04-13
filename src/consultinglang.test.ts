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

  it("keeps consultant comments inside strings", () => {
    const result = run(`kick off
      socialise "This keeps // per my last email: the phrase"
      close the loop`);

    assert.deepEqual(result.output, ["This keeps // per my last email: the phrase"]);
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

  it("handles descending loops", () => {
    const result = run(`kick off
      loop back on i from 3 to 1
        socialise i
      end of day
      close the loop`);

    assert.deepEqual(result.output, ["3", "2", "1"]);
  });

  it("exits circle back until immediately when already aligned", () => {
    const result = run(`kick off
      align on done is a key deliverable of greenlit
      circle back until done
        socialise "should not print"
      end of day
      socialise "done"
      close the loop`);

    assert.deepEqual(result.output, ["done"]);
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

  it("supports array removal, indexed assignment, map, filter, and sort", () => {
    const result = run(`kick off
      synergize double with x
        take this offline x * 2
      end of day

      synergize is big with x
        take this offline x > 5
      end of day

      align on numbers is a key deliverable of pipeline 3, 1, 4, 2
      stakeholder 1 of numbers is a key deliverable of 6
      remove from pipeline numbers 2

      align on doubled is a key deliverable of map pipeline numbers with double
      align on big is a key deliverable of filter pipeline doubled with is big
      align on sorted is a key deliverable of sort pipeline big

      socialise stakeholder 0 of sorted
      socialise stakeholder 1 of sorted
      close the loop`);

    assert.deepEqual(result.output, ["6", "12"]);
  });

  it("supports object literals, lookup, and assignment", () => {
    const result = run(`kick off
      align on plan is a key deliverable of brief "owner": "Ada", score: 5
      socialise briefing "owner" of plan
      briefing "owner" of plan is a key deliverable of "Grace"
      socialise briefing "owner" of plan
      socialise briefing "score" of plan
      close the loop`);

    assert.deepEqual(result.output, ["Ada", "Grace", "5"]);
  });

  it("supports object membership and numeric keys", () => {
    const result = run(`kick off
      align on seen is a key deliverable of brief
      briefing 7 of seen is a key deliverable of 0
      socialise has briefing 7 of seen
      socialise briefing 7 of seen
      socialise has briefing 2 of seen
      close the loop`);

    assert.deepEqual(result.output, ["true", "0", "false"]);
  });

  it("runs two sum with a hashmap-style brief", () => {
    const result = run(`kick off
      synergize two sum with numbers, target
        align on seen is a key deliverable of brief
        align on answer is a key deliverable of pipeline
        align on last is a key deliverable of headcount of numbers

        loop back on i from 0 to last - 1
          align on value is a key deliverable of stakeholder i of numbers
          align on needed is a key deliverable of target - value

          going forward if has briefing needed of seen
            add to pipeline answer briefing needed of seen
            add to pipeline answer i
            take this offline answer
          end of day

          briefing value of seen is a key deliverable of i
        end of day

        take this offline answer
      end of day

      align on nums is a key deliverable of pipeline 2, 7, 11, 15
      align on result is a key deliverable of leverage two sum with nums, 9

      socialise stakeholder 0 of result
      socialise stakeholder 1 of result
      close the loop`);

    assert.deepEqual(result.output, ["0", "1"]);
  });

  it("rejects missing object keys", () => {
    assert.throws(
      () => run(`kick off
        align on plan is a key deliverable of brief owner: "Ada"
        socialise briefing "budget" of plan
        close the loop`),
      /budget hasn't been onboarded yet/,
    );
  });

  it("rejects map and filter callbacks with the wrong arity", () => {
    assert.throws(
      () => run(`kick off
        synergize bad mapper with a, b
          take this offline a
        end of day
        align on numbers is a key deliverable of pipeline 1, 2
        socialise headcount of map pipeline numbers with bad mapper
        close the loop`),
      /requires more stakeholders/,
    );
  });

  it("rejects sorting mixed pipelines", () => {
    assert.throws(
      () => run(`kick off
        align on mixed is a key deliverable of pipeline 1, "two"
        socialise headcount of sort pipeline mixed
        close the loop`),
      /These deliverables are not aligned/,
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

  it("rejects assignment before declaration", () => {
    assert.throws(
      () => run(`kick off
        revenue is a key deliverable of 10
        close the loop`),
      /revenue hasn't been onboarded yet/,
    );
  });

  it("rejects redeclaration in the same scope", () => {
    assert.throws(
      () => run(`kick off
        align on revenue is a key deliverable of 10
        align on revenue is a key deliverable of 20
        close the loop`),
      /revenue is already aligned/,
    );
  });

  it("rejects non-boolean conditions", () => {
    assert.throws(
      () => run(`kick off
        going forward if 1
          socialise "no"
        end of day
        close the loop`),
      /These deliverables are not aligned/,
    );
  });

  it("rejects arithmetic on strings", () => {
    assert.throws(
      () => run(`kick off
        socialise "1" + 2
        close the loop`),
      /These deliverables are not aligned/,
    );
  });

  it("rejects unknown function calls", () => {
    assert.throws(
      () => run(`kick off
        socialise leverage missing synergy with 1
        close the loop`),
      /missing synergy hasn't been onboarded yet/,
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
    assert.match(js, /deck line/);
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

  it("runs the expanded example decks", () => {
    for (const deck of [
      "fizzbuzz.deck",
      "fibonacci.deck",
      "strategy.deck",
      "performance-review.deck",
      "offsite.deck",
      "quarterly-planning.deck",
      "data-room.deck",
    ]) {
      const output = execFileSync(process.execPath, [cli, "run", join(projectRoot, "examples", deck)], {
        encoding: "utf8",
      });

      assert.notEqual(output.trim(), "");
    }
  });
});
