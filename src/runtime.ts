import vm from "node:vm";
import { errors, ConsultingLangError, normalizeError } from "./errors.js";
import { parse } from "./parser.js";
import { transpile } from "./transpiler.js";

export interface RunResult {
  js: string;
  output: string[];
}

export function compile(source: string): string {
  return transpile(parse(source));
}

export function run(source: string): RunResult {
  const js = compile(source);
  const output: string[] = [];
  const context = vm.createContext({
    __consulting: createRuntimeHelpers(output),
  });

  try {
    vm.runInContext(js, context, {
      timeout: 1000,
      displayErrors: false,
    });
  } catch (error) {
    throw normalizeError(error);
  }

  return { js, output };
}

function createRuntimeHelpers(output: string[]) {
  return {
    print(value: unknown): void {
      output.push(String(value));
    },

    checkArgs(actual: number, expected: number): void {
      if (actual !== expected) {
        throw new ConsultingLangError(errors.wrongArgumentCount);
      }
    },

    divide(left: unknown, right: unknown): number {
      if (typeof left !== "number" || typeof right !== "number") {
        throw new ConsultingLangError(errors.typeError);
      }
      if (right === 0) {
        throw new ConsultingLangError(errors.divisionByZero);
      }
      return left / right;
    },

    modulo(left: unknown, right: unknown): number {
      if (typeof left !== "number" || typeof right !== "number") {
        throw new ConsultingLangError(errors.typeError);
      }
      if (right === 0) {
        throw new ConsultingLangError(errors.divisionByZero);
      }
      return left % right;
    },

    headcount(value: unknown): number {
      if (!Array.isArray(value)) {
        throw new ConsultingLangError(errors.typeError);
      }
      return value.length;
    },

    stakeholder(value: unknown, index: unknown): unknown {
      if (!Array.isArray(value) || typeof index !== "number" || !Number.isInteger(index)) {
        throw new ConsultingLangError(errors.typeError);
      }
      if (index < 0 || index >= value.length) {
        throw new ConsultingLangError(errors.indexOutOfBounds(index));
      }
      return value[index];
    },

    addToPipeline(value: unknown, item: unknown): void {
      if (!Array.isArray(value)) {
        throw new ConsultingLangError(errors.typeError);
      }
      value.push(item);
    },

    guard(cycles: number): void {
      if (cycles > 10000) {
        throw new ConsultingLangError(errors.infiniteLoop(cycles));
      }
    },
  };
}
