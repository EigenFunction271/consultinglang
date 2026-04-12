export interface SourceLine {
  line: number;
  raw: string;
  text: string;
}

export interface Token {
  type: string;
  value: string;
  line: number;
  column: number;
}

const keywordPhrases = [
  "it is not the case that",
  "a key deliverable of",
  "in alignment with",
  "close the loop",
  "going forward if",
  "take this offline",
  "or alternatively",
  "circle back until",
  "add to pipeline",
  "loop back on",
  "pivoting if",
  "end of day",
  "that said",
  "kick off",
  "align on",
  "synergize",
  "socialise",
  "leverage",
  "pipeline",
  "headcount of",
  "remove from pipeline",
  "map pipeline",
  "filter pipeline",
  "sort pipeline",
  "briefing",
  "brief",
  "stakeholder",
  "greenlit",
  "deprioritised",
  "no bandwidth",
  "from",
  "to",
  "with",
  "of",
  "is",
] as const;

function stripConsultantComment(line: string): string {
  let inString = false;
  let escaped = false;

  for (let i = 0; i < line.length; i += 1) {
    const char = line[i];
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
    if (!inString && line.startsWith("// per my last email:", i)) {
      return line.slice(0, i);
    }
  }

  return line;
}

export function getMeaningfulLines(source: string): SourceLine[] {
  return source
    .split(/\r?\n/)
    .map((raw, index) => ({
      line: index + 1,
      raw,
      text: stripConsultantComment(raw).trim(),
    }))
    .filter((line) => line.text.length > 0);
}

export function lex(source: string): Token[] {
  const tokens: Token[] = [];

  for (const sourceLine of getMeaningfulLines(source)) {
    let index = 0;
    const text = sourceLine.text;

    while (index < text.length) {
      const rest = text.slice(index);

      if (/^\s/.test(rest)) {
        index += 1;
        continue;
      }

      if (rest.startsWith("\"")) {
        let end = index + 1;
        let escaped = false;
        while (end < text.length) {
          const char = text[end];
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
        tokens.push({
          type: "string",
          value: text.slice(index, end),
          line: sourceLine.line,
          column: index + 1,
        });
        index = end;
        continue;
      }

      const phrase = keywordPhrases.find((candidate) => {
        if (!rest.startsWith(candidate)) return false;
        const next = rest[candidate.length];
        return next === undefined || /\s|,|\(|\)|\+|-|\*|\/|%|=|!|<|>/.test(next);
      });

      if (phrase) {
        tokens.push({
          type: "keyword",
          value: phrase,
          line: sourceLine.line,
          column: index + 1,
        });
        index += phrase.length;
        continue;
      }

      const twoChar = rest.match(/^(==|!=)/);
      if (twoChar) {
        tokens.push({
          type: "operator",
          value: twoChar[1],
          line: sourceLine.line,
          column: index + 1,
        });
        index += twoChar[1].length;
        continue;
      }

      if (/^[(),:+\-*/%<>]/.test(rest)) {
        tokens.push({
          type: "punctuation",
          value: rest[0],
          line: sourceLine.line,
          column: index + 1,
        });
        index += 1;
        continue;
      }

      const number = rest.match(/^\d+(?:\.\d+)?/);
      if (number) {
        tokens.push({
          type: "number",
          value: number[0],
          line: sourceLine.line,
          column: index + 1,
        });
        index += number[0].length;
        continue;
      }

      const identifier = rest.match(/^[A-Za-z_][A-Za-z0-9_]*/);
      if (identifier) {
        tokens.push({
          type: "identifier",
          value: identifier[0],
          line: sourceLine.line,
          column: index + 1,
        });
        index += identifier[0].length;
        continue;
      }

      tokens.push({
        type: "unknown",
        value: rest[0],
        line: sourceLine.line,
        column: index + 1,
      });
      index += 1;
    }
  }

  return tokens;
}
