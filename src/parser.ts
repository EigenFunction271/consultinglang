import type { IfBranch, Program, Statement } from "./ast.js";
import { getMeaningfulLines, type SourceLine } from "./lexer.js";
import { errors, syntaxError, ConsultingLangError } from "./errors.js";
import { parseExpression, splitTopLevel } from "./expression.js";

export function parse(source: string): Program {
  const lines = getMeaningfulLines(source);

  if (lines[0]?.text !== "kick off") {
    throw new ConsultingLangError(errors.missingKickOff, lines[0]?.line ?? 1);
  }

  if (lines[lines.length - 1]?.text !== "close the loop") {
    throw new ConsultingLangError(errors.missingCloseTheLoop, lines[lines.length - 1]?.line ?? 1);
  }

  const parser = new Parser(lines.slice(1, -1));
  return { kind: "Program", body: parser.parseStatements(new Set()) };
}

class Parser {
  private current = 0;

  constructor(private readonly lines: SourceLine[]) {}

  parseStatements(stopWords: Set<string>): Statement[] {
    const statements: Statement[] = [];

    while (!this.isAtEnd()) {
      const line = this.peek();
      if (this.isStopLine(line.text, stopWords)) {
        break;
      }
      statements.push(this.parseStatement());
    }

    return statements;
  }

  private parseStatement(): Statement {
    const line = this.advance();
    const text = line.text;

    if (text.startsWith("align on ")) {
      return this.parseVariableDeclaration(text, line.line);
    }

    if (text.startsWith("socialise ")) {
      return { kind: "PrintStatement", value: parseExpression(text.slice("socialise ".length), line.line) };
    }

    if (text.startsWith("synergize ")) {
      return this.parseFunction(text, line.line);
    }

    if (text.startsWith("take this offline")) {
      const value = text.slice("take this offline".length).trim();
      return { kind: "ReturnStatement", value: value ? parseExpression(value, line.line) : undefined };
    }

    if (text.startsWith("going forward if ")) {
      return this.parseIf(text, line.line);
    }

    if (text.startsWith("loop back on ")) {
      return this.parseFor(text, line.line);
    }

    if (text.startsWith("circle back until ")) {
      return this.parseWhile(text, line.line);
    }

    if (text.startsWith("add to pipeline ")) {
      const rest = text.slice("add to pipeline ".length).trim();
      const [arrayText, valueText] = splitFirst(rest);
      if (!arrayText || !valueText) {
        throw syntaxError(line.line);
      }
      return {
        kind: "ArrayPushStatement",
        array: parseExpression(arrayText, line.line),
        value: parseExpression(valueText, line.line),
      };
    }

    const assignmentIndex = text.indexOf(" is a key deliverable of ");
    if (assignmentIndex > 0) {
      const name = text.slice(0, assignmentIndex).trim();
      assertIdentifier(name, line.line);
      return {
        kind: "AssignmentStatement",
        name,
        value: parseExpression(text.slice(assignmentIndex + " is a key deliverable of ".length), line.line),
      };
    }

    if (text.startsWith("leverage ")) {
      return { kind: "ExpressionStatement", expression: parseExpression(text, line.line) };
    }

    throw syntaxError(line.line);
  }

  private parseVariableDeclaration(text: string, line: number): Statement {
    const rest = text.slice("align on ".length).trim();
    const assignmentIndex = rest.indexOf(" is a key deliverable of ");

    if (assignmentIndex === -1) {
      assertIdentifier(rest, line);
      return { kind: "VariableDeclaration", name: rest };
    }

    const name = rest.slice(0, assignmentIndex).trim();
    assertIdentifier(name, line);

    return {
      kind: "VariableDeclaration",
      name,
      value: parseExpression(rest.slice(assignmentIndex + " is a key deliverable of ".length), line),
    };
  }

  private parseFunction(text: string, line: number): Statement {
    const rest = text.slice("synergize ".length);
    const withIndex = rest.indexOf(" with ");
    if (withIndex === -1) {
      throw syntaxError(line);
    }

    const name = rest.slice(0, withIndex).trim();
    if (!name) {
      throw syntaxError(line);
    }
    const paramText = rest.slice(withIndex + " with ".length).trim();
    const params = paramText ? splitTopLevel(paramText).map((param) => {
      assertIdentifier(param, line);
      return param;
    }) : [];

    const body = this.parseStatements(new Set(["end of day"]));
    this.consumeExact("end of day", line);

    return { kind: "FunctionDeclaration", name, params, body };
  }

  private parseIf(firstLineText: string, line: number): Statement {
    const branches: IfBranch[] = [
      {
        condition: parseExpression(firstLineText.slice("going forward if ".length), line),
        body: this.parseStatements(new Set(["pivoting if", "that said", "end of day"])),
      },
    ];

    while (!this.isAtEnd() && this.peek().text.startsWith("pivoting if ")) {
      const pivot = this.advance();
      branches.push({
        condition: parseExpression(pivot.text.slice("pivoting if ".length), pivot.line),
        body: this.parseStatements(new Set(["pivoting if", "that said", "end of day"])),
      });
    }

    if (!this.isAtEnd() && this.peek().text === "that said") {
      this.advance();
      branches.push({
        body: this.parseStatements(new Set(["end of day"])),
      });
    }

    this.consumeExact("end of day", line);
    return { kind: "IfStatement", branches };
  }

  private parseFor(text: string, line: number): Statement {
    const match = /^loop back on\s+([A-Za-z_][A-Za-z0-9_]*)\s+from\s+(.+)\s+to\s+(.+)$/.exec(text);
    if (!match) {
      throw syntaxError(line);
    }
    const body = this.parseStatements(new Set(["end of day"]));
    this.consumeExact("end of day", line);
    return {
      kind: "ForStatement",
      iterator: match[1],
      from: parseExpression(match[2], line),
      to: parseExpression(match[3], line),
      body,
    };
  }

  private parseWhile(text: string, line: number): Statement {
    const until = text.slice("circle back until ".length).trim();
    const body = this.parseStatements(new Set(["end of day"]));
    this.consumeExact("end of day", line);
    return {
      kind: "WhileStatement",
      until: parseExpression(until, line),
      body,
    };
  }

  private consumeExact(text: string, openerLine: number): void {
    if (this.isAtEnd() || this.peek().text !== text) {
      throw syntaxError(openerLine);
    }
    this.advance();
  }

  private isStopLine(text: string, stopWords: Set<string>): boolean {
    for (const stopWord of stopWords) {
      if (text === stopWord || text.startsWith(`${stopWord} `)) {
        return true;
      }
    }
    return false;
  }

  private advance(): SourceLine {
    const line = this.peek();
    this.current += 1;
    return line;
  }

  private peek(): SourceLine {
    return this.lines[this.current];
  }

  private isAtEnd(): boolean {
    return this.current >= this.lines.length;
  }
}

function splitFirst(input: string): [string | undefined, string | undefined] {
  const match = /^([A-Za-z_][A-Za-z0-9_]*|stakeholder\s+.+?\s+of\s+.+?)\s+(.+)$/.exec(input);
  if (!match) {
    return [undefined, undefined];
  }
  return [match[1].trim(), match[2].trim()];
}

function assertIdentifier(input: string, line: number): void {
  if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(input)) {
    throw syntaxError(line);
  }
}
