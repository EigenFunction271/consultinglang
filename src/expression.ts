import type { BinaryExpression, Expression } from "./ast.js";
import { syntaxError } from "./errors.js";

interface ExprToken {
  type: "number" | "string" | "identifier" | "keyword" | "operator" | "punctuation" | "eof";
  value: string;
  line: number;
  column: number;
}

const phraseTokens: Array<[string, string]> = [
  ["it is not the case that", "!"],
  ["in alignment with", "&&"],
  ["or alternatively", "||"],
  ["no bandwidth", "null"],
  ["greenlit", "true"],
  ["deprioritised", "false"],
  ["headcount of", "headcount of"],
];

function tokenizeExpression(input: string, line: number): ExprToken[] {
  const tokens: ExprToken[] = [];
  let index = 0;

  while (index < input.length) {
    const rest = input.slice(index);
    if (/^\s/.test(rest)) {
      index += 1;
      continue;
    }

    if (rest.startsWith("\"")) {
      let end = index + 1;
      let escaped = false;
      while (end < input.length) {
        const char = input[end];
        if (escaped) {
          escaped = false;
        } else if (char === "\\") {
          escaped = true;
        } else if (char === "\"") {
          end += 1;
          break;
        }
        end += 1;
      }
      if (!input.slice(index, end).endsWith("\"")) {
        throw syntaxError(line, index + 1);
      }
      tokens.push({ type: "string", value: input.slice(index, end), line, column: index + 1 });
      index = end;
      continue;
    }

    const phrase = phraseTokens.find(([text]) => {
      if (!rest.startsWith(text)) return false;
      const next = rest[text.length];
      return next === undefined || /\s|,|\)/.test(next);
    });
    if (phrase) {
      tokens.push({ type: "keyword", value: phrase[1], line, column: index + 1 });
      index += phrase[0].length;
      continue;
    }

    const twoChar = rest.match(/^(==|!=)/);
    if (twoChar) {
      tokens.push({ type: "operator", value: twoChar[1], line, column: index + 1 });
      index += twoChar[1].length;
      continue;
    }

    if (/^[()+\-*/%<>,]/.test(rest)) {
      tokens.push({ type: "punctuation", value: rest[0], line, column: index + 1 });
      index += 1;
      continue;
    }

    const number = rest.match(/^\d+(?:\.\d+)?/);
    if (number) {
      tokens.push({ type: "number", value: number[0], line, column: index + 1 });
      index += number[0].length;
      continue;
    }

    const identifier = rest.match(/^[A-Za-z_][A-Za-z0-9_]*/);
    if (identifier) {
      tokens.push({ type: "identifier", value: identifier[0], line, column: index + 1 });
      index += identifier[0].length;
      continue;
    }

    throw syntaxError(line, index + 1);
  }

  tokens.push({ type: "eof", value: "", line, column: input.length + 1 });
  return tokens;
}

const precedence: Record<string, number> = {
  "||": 1,
  "&&": 2,
  "==": 3,
  "!=": 3,
  "<": 4,
  ">": 4,
  "+": 5,
  "-": 5,
  "*": 6,
  "/": 6,
  "%": 6,
};

export function splitTopLevel(input: string, separator = ","): string[] {
  const parts: string[] = [];
  let start = 0;
  let depth = 0;
  let inString = false;
  let escaped = false;

  for (let i = 0; i < input.length; i += 1) {
    const char = input[i];
    if (escaped) {
      escaped = false;
      continue;
    }
    if (char === "\\") {
      escaped = true;
      continue;
    }
    if (char === "\"") {
      inString = !inString;
      continue;
    }
    if (inString) continue;
    if (char === "(") depth += 1;
    if (char === ")") depth -= 1;
    if (depth === 0 && char === separator) {
      parts.push(input.slice(start, i).trim());
      start = i + 1;
    }
  }

  const finalPart = input.slice(start).trim();
  if (finalPart.length > 0) {
    parts.push(finalPart);
  }
  return parts;
}

function findTopLevelPhrase(input: string, phrase: string): number {
  let depth = 0;
  let inString = false;
  let escaped = false;

  for (let i = 0; i <= input.length - phrase.length; i += 1) {
    const char = input[i];
    if (escaped) {
      escaped = false;
      continue;
    }
    if (char === "\\") {
      escaped = true;
      continue;
    }
    if (char === "\"") {
      inString = !inString;
      continue;
    }
    if (inString) continue;
    if (char === "(") depth += 1;
    if (char === ")") depth -= 1;
    if (depth === 0 && input.startsWith(phrase, i)) {
      return i;
    }
  }

  return -1;
}

class ExpressionParser {
  private current = 0;

  constructor(private readonly tokens: ExprToken[]) {}

  parse(): Expression {
    const expression = this.parsePrecedence(0);
    if (!this.match("eof")) {
      throw syntaxError(this.peek().line, this.peek().column);
    }
    return expression;
  }

  private parsePrecedence(minPrecedence: number): Expression {
    let left = this.parsePrefix();

    while (true) {
      const token = this.peek();
      const operator = this.operatorValue(token);
      const tokenPrecedence = operator ? precedence[operator] : undefined;
      if (!operator || tokenPrecedence === undefined || tokenPrecedence < minPrecedence) {
        break;
      }
      this.advance();
      const right = this.parsePrecedence(tokenPrecedence + 1);
      left = {
        kind: "BinaryExpression",
        operator: operator as BinaryExpression["operator"],
        left,
        right,
      };
    }

    return left;
  }

  private parsePrefix(): Expression {
    const token = this.advance();

    if (token.type === "number") {
      return { kind: "LiteralExpression", value: Number(token.value) };
    }

    if (token.type === "string") {
      return { kind: "LiteralExpression", value: JSON.parse(token.value) as string };
    }

    if (token.type === "identifier") {
      return { kind: "IdentifierExpression", name: token.value };
    }

    if (token.value === "true") {
      return { kind: "LiteralExpression", value: true };
    }

    if (token.value === "false") {
      return { kind: "LiteralExpression", value: false };
    }

    if (token.value === "null") {
      return { kind: "LiteralExpression", value: null };
    }

    if (token.value === "!") {
      return { kind: "UnaryExpression", operator: "!", argument: this.parsePrecedence(7) };
    }

    if (token.value === "-") {
      return {
        kind: "BinaryExpression",
        operator: "-",
        left: { kind: "LiteralExpression", value: 0 },
        right: this.parsePrecedence(7),
      };
    }

    if (token.value === "(") {
      const expression = this.parsePrecedence(0);
      this.consume(")", token.line);
      return expression;
    }

    throw syntaxError(token.line, token.column);
  }

  private operatorValue(token: ExprToken): string | undefined {
    if (token.type === "operator") return token.value;
    if (token.type === "punctuation" && ["+", "-", "*", "/", "%", "<", ">"].includes(token.value)) {
      return token.value;
    }
    if (token.type === "keyword" && ["&&", "||"].includes(token.value)) {
      return token.value;
    }
    return undefined;
  }

  private consume(value: string, line: number): void {
    if (!this.match(value)) {
      throw syntaxError(line);
    }
  }

  private match(value: string): boolean {
    if (this.peek().value === value || this.peek().type === value) {
      this.current += 1;
      return true;
    }
    return false;
  }

  private advance(): ExprToken {
    const token = this.peek();
    this.current += 1;
    return token;
  }

  private peek(): ExprToken {
    return this.tokens[this.current] ?? this.tokens[this.tokens.length - 1];
  }
}

export function parseExpression(input: string, line: number): Expression {
  const trimmed = input.trim();
  if (!trimmed) {
    throw syntaxError(line);
  }

  if (trimmed.startsWith("leverage ")) {
    const rest = trimmed.slice("leverage ".length);
    const withIndex = findTopLevelPhrase(rest, " with ");
    if (withIndex === -1) {
      throw syntaxError(line);
    }
    const callee = rest.slice(0, withIndex).trim();
    const argText = rest.slice(withIndex + " with ".length).trim();
    return {
      kind: "CallExpression",
      callee,
      args: argText ? splitTopLevel(argText).map((part) => parseExpression(part, line)) : [],
    };
  }

  if (trimmed.startsWith("pipeline ")) {
    const argText = trimmed.slice("pipeline ".length).trim();
    return {
      kind: "ArrayLiteralExpression",
      items: argText ? splitTopLevel(argText).map((part) => parseExpression(part, line)) : [],
    };
  }

  if (trimmed.startsWith("headcount of ")) {
    return {
      kind: "ArrayLengthExpression",
      array: parseExpression(trimmed.slice("headcount of ".length), line),
    };
  }

  if (trimmed.startsWith("stakeholder ")) {
    const rest = trimmed.slice("stakeholder ".length);
    const ofIndex = findTopLevelPhrase(rest, " of ");
    if (ofIndex === -1) {
      throw syntaxError(line);
    }
    return {
      kind: "ArrayIndexExpression",
      index: parseExpression(rest.slice(0, ofIndex), line),
      array: parseExpression(rest.slice(ofIndex + " of ".length), line),
    };
  }

  return new ExpressionParser(tokenizeExpression(trimmed, line)).parse();
}
