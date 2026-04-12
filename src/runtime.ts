import vm from "node:vm";
import { analyze } from "./analyzer.js";
import { errors, ConsultingLangError, normalizeError } from "./errors.js";
import { parse } from "./parser.js";
import { transpile } from "./transpiler.js";

export interface RunResult {
  js: string;
  output: string[];
}

export function compile(source: string): string {
  const program = parse(source);
  analyze(program);
  return transpile(program);
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

    number(value: unknown, line?: number): number {
      if (typeof value !== "number") {
        throw new ConsultingLangError(errors.typeError, line);
      }
      return value;
    },

    truthy(value: unknown, line?: number): boolean {
      if (typeof value !== "boolean") {
        throw new ConsultingLangError(errors.typeError, line);
      }
      return value;
    },

    add(left: unknown, right: unknown, line?: number): number {
      const [leftNumber, rightNumber] = numberPair(left, right, line);
      return leftNumber + rightNumber;
    },

    subtract(left: unknown, right: unknown, line?: number): number {
      const [leftNumber, rightNumber] = numberPair(left, right, line);
      return leftNumber - rightNumber;
    },

    multiply(left: unknown, right: unknown, line?: number): number {
      const [leftNumber, rightNumber] = numberPair(left, right, line);
      return leftNumber * rightNumber;
    },

    divide(left: unknown, right: unknown, line?: number): number {
      const [leftNumber, rightNumber] = numberPair(left, right, line);
      if (rightNumber === 0) {
        throw new ConsultingLangError(errors.divisionByZero, line);
      }
      return leftNumber / rightNumber;
    },

    modulo(left: unknown, right: unknown, line?: number): number {
      const [leftNumber, rightNumber] = numberPair(left, right, line);
      if (rightNumber === 0) {
        throw new ConsultingLangError(errors.divisionByZero, line);
      }
      return leftNumber % rightNumber;
    },

    compare(operator: "<" | ">", left: unknown, right: unknown, line?: number): boolean {
      const [leftNumber, rightNumber] = numberPair(left, right, line);
      return operator === "<" ? leftNumber < rightNumber : leftNumber > rightNumber;
    },

    equal(negated: boolean, left: unknown, right: unknown, line?: number): boolean {
      if (runtimeType(left) !== runtimeType(right)) {
        throw new ConsultingLangError(errors.typeError, line);
      }
      return negated ? left !== right : left === right;
    },

    and(left: unknown, right: unknown, line?: number): boolean {
      const [leftBoolean, rightBoolean] = booleanPair(left, right, line);
      return leftBoolean && rightBoolean;
    },

    or(left: unknown, right: unknown, line?: number): boolean {
      const [leftBoolean, rightBoolean] = booleanPair(left, right, line);
      return leftBoolean || rightBoolean;
    },

    not(value: unknown, line?: number): boolean {
      if (typeof value !== "boolean") {
        throw new ConsultingLangError(errors.typeError, line);
      }
      return !value;
    },

    headcount(value: unknown, line?: number): number {
      if (!Array.isArray(value)) {
        throw new ConsultingLangError(errors.typeError, line);
      }
      return value.length;
    },

    stakeholder(value: unknown, index: unknown, line?: number): unknown {
      if (!Array.isArray(value) || typeof index !== "number" || !Number.isInteger(index)) {
        throw new ConsultingLangError(errors.typeError, line);
      }
      if (index < 0 || index >= value.length) {
        throw new ConsultingLangError(errors.indexOutOfBounds(index), line);
      }
      return value[index];
    },

    addToPipeline(value: unknown, item: unknown, line?: number): void {
      if (!Array.isArray(value)) {
        throw new ConsultingLangError(errors.typeError, line);
      }
      value.push(item);
    },

    setStakeholder(value: unknown, index: unknown, item: unknown, line?: number): void {
      if (!Array.isArray(value) || typeof index !== "number" || !Number.isInteger(index)) {
        throw new ConsultingLangError(errors.typeError, line);
      }
      if (index < 0 || index >= value.length) {
        throw new ConsultingLangError(errors.indexOutOfBounds(index), line);
      }
      value[index] = item;
    },

    removeFromPipeline(value: unknown, index: unknown, line?: number): void {
      if (!Array.isArray(value) || typeof index !== "number" || !Number.isInteger(index)) {
        throw new ConsultingLangError(errors.typeError, line);
      }
      if (index < 0 || index >= value.length) {
        throw new ConsultingLangError(errors.indexOutOfBounds(index), line);
      }
      value.splice(index, 1);
    },

    mapPipeline(value: unknown, mapper: unknown, line?: number): unknown[] {
      if (!Array.isArray(value) || typeof mapper !== "function") {
        throw new ConsultingLangError(errors.typeError, line);
      }
      return value.map((item) => mapper(item));
    },

    filterPipeline(value: unknown, predicate: unknown, line?: number): unknown[] {
      if (!Array.isArray(value) || typeof predicate !== "function") {
        throw new ConsultingLangError(errors.typeError, line);
      }
      return value.filter((item) => {
        const result = predicate(item);
        if (typeof result !== "boolean") {
          throw new ConsultingLangError(errors.typeError, line);
        }
        return result;
      });
    },

    sortPipeline(value: unknown, line?: number): unknown[] {
      if (!Array.isArray(value)) {
        throw new ConsultingLangError(errors.typeError, line);
      }
      const sorted = [...value];
      if (sorted.length === 0) {
        return sorted;
      }
      const kind = runtimeType(sorted[0]);
      if (!["number", "string"].includes(kind) || sorted.some((item) => runtimeType(item) !== kind)) {
        throw new ConsultingLangError(errors.typeError, line);
      }
      return sorted.sort((left, right) => {
        if (kind === "number") {
          return (left as number) - (right as number);
        }
        return String(left).localeCompare(String(right));
      });
    },

    brief(value: unknown, line?: number): Record<string, unknown> {
      if (!isRecord(value)) {
        throw new ConsultingLangError(errors.typeError, line);
      }
      return value;
    },

    briefing(value: unknown, key: unknown, line?: number): unknown {
      if (!isRecord(value) || typeof key !== "string") {
        throw new ConsultingLangError(errors.typeError, line);
      }
      if (!Object.hasOwn(value, key)) {
        throw new ConsultingLangError(errors.undefinedVariable(key), line);
      }
      return value[key];
    },

    setBriefing(value: unknown, key: unknown, item: unknown, line?: number): void {
      if (!isRecord(value) || typeof key !== "string") {
        throw new ConsultingLangError(errors.typeError, line);
      }
      value[key] = item;
    },

    guard(cycles: number): void {
      if (cycles > 10000) {
        throw new ConsultingLangError(errors.infiniteLoop(cycles));
      }
    },
  };
}

function numberPair(left: unknown, right: unknown, line?: number): [number, number] {
  if (typeof left !== "number" || typeof right !== "number") {
    throw new ConsultingLangError(errors.typeError, line);
  }
  return [left, right];
}

function booleanPair(left: unknown, right: unknown, line?: number): [boolean, boolean] {
  if (typeof left !== "boolean" || typeof right !== "boolean") {
    throw new ConsultingLangError(errors.typeError, line);
  }
  return [left, right];
}

function runtimeType(value: unknown): string {
  return Array.isArray(value) ? "array" : value === null ? "null" : typeof value;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
