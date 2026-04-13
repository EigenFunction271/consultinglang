import type {
  ArrayIndexExpression,
  ArrayLengthExpression,
  ArrayLiteralExpression,
  ArrayFilterExpression,
  ArrayMapExpression,
  ArrayPushStatement,
  ArrayRemoveStatement,
  ArraySetStatement,
  ArraySortExpression,
  AssignmentStatement,
  BinaryExpression,
  CallExpression,
  Expression,
  ForStatement,
  FunctionDeclaration,
  IfStatement,
  ObjectAccessExpression,
  ObjectHasExpression,
  ObjectLiteralExpression,
  ObjectSetStatement,
  Program,
  Statement,
  UnaryExpression,
  VariableDeclaration,
  WhileStatement,
} from "./ast.js";
import { ConsultingLangError, errors, syntaxError } from "./errors.js";

type ValueType = "number" | "string" | "boolean" | "null" | "array" | "object" | "unknown";

interface SymbolInfo {
  type: ValueType;
}

interface FunctionInfo {
  params: string[];
}

class Scope {
  private readonly symbols = new Map<string, SymbolInfo>();

  constructor(private readonly parent?: Scope) {}

  declare(name: string, info: SymbolInfo, line: number): void {
    if (this.symbols.has(name)) {
      throw new ConsultingLangError(`${name} is already aligned.`, line);
    }
    this.symbols.set(name, info);
  }

  assign(name: string, info: SymbolInfo, line: number): void {
    const existing = this.resolveLocal(name);
    if (!existing) {
      throw new ConsultingLangError(errors.undefinedVariable(name), line);
    }

    if (existing.type !== "unknown" && info.type !== "unknown" && existing.type !== info.type) {
      throw new ConsultingLangError(errors.typeError, line);
    }

    existing.type = info.type === "unknown" ? existing.type : info.type;
  }

  resolve(name: string, line: number): SymbolInfo {
    const info = this.resolveLocal(name);
    if (!info) {
      throw new ConsultingLangError(errors.undefinedVariable(name), line);
    }
    return info;
  }

  private resolveLocal(name: string): SymbolInfo | undefined {
    return this.symbols.get(name) ?? this.parent?.resolveLocal(name);
  }
}

export function analyze(program: Program): void {
  const analyzer = new Analyzer();
  analyzer.analyze(program);
}

class Analyzer {
  private readonly functions = new Map<string, FunctionInfo>();

  analyze(program: Program): void {
    this.collectFunctions(program.body);
    const scope = new Scope();
    this.analyzeStatements(program.body, scope, false);
  }

  private collectFunctions(statements: Statement[]): void {
    for (const statement of statements) {
      if (statement.kind === "FunctionDeclaration") {
        if (this.functions.has(statement.name)) {
          throw new ConsultingLangError(`${statement.name} is already aligned.`, statement.line);
        }
        this.functions.set(statement.name, { params: statement.params });
      }
    }
  }

  private analyzeStatements(statements: Statement[], scope: Scope, inFunction: boolean): void {
    for (const statement of statements) {
      this.analyzeStatement(statement, scope, inFunction);
    }
  }

  private analyzeStatement(statement: Statement, scope: Scope, inFunction: boolean): void {
    switch (statement.kind) {
      case "VariableDeclaration":
        this.variableDeclaration(statement, scope);
        return;
      case "AssignmentStatement":
        this.assignment(statement, scope);
        return;
      case "PrintStatement":
        this.expression(statement.value, scope);
        return;
      case "FunctionDeclaration":
        this.functionDeclaration(statement, scope);
        return;
      case "ReturnStatement":
        if (!inFunction) {
          throw syntaxError(statement.line);
        }
        if (statement.value) {
          this.expression(statement.value, scope);
        }
        return;
      case "IfStatement":
        this.ifStatement(statement, scope, inFunction);
        return;
      case "ForStatement":
        this.forStatement(statement, scope, inFunction);
        return;
      case "WhileStatement":
        this.whileStatement(statement, scope, inFunction);
        return;
      case "ArrayPushStatement":
        this.arrayPush(statement, scope);
        return;
      case "ArraySetStatement":
        this.arraySet(statement, scope);
        return;
      case "ArrayRemoveStatement":
        this.arrayRemove(statement, scope);
        return;
      case "ObjectSetStatement":
        this.objectSet(statement, scope);
        return;
      case "ExpressionStatement":
        this.expression(statement.expression, scope);
        return;
    }
  }

  private variableDeclaration(statement: VariableDeclaration, scope: Scope): void {
    const type = statement.value ? this.expression(statement.value, scope) : "unknown";
    scope.declare(statement.name, { type }, statement.line);
  }

  private assignment(statement: AssignmentStatement, scope: Scope): void {
    const type = this.expression(statement.value, scope);
    scope.assign(statement.name, { type }, statement.line);
  }

  private functionDeclaration(statement: FunctionDeclaration, outerScope: Scope): void {
    const scope = new Scope(outerScope);
    for (const param of statement.params) {
      scope.declare(param, { type: "unknown" }, statement.line);
    }
    this.analyzeStatements(statement.body, scope, true);
  }

  private ifStatement(statement: IfStatement, scope: Scope, inFunction: boolean): void {
    for (const branch of statement.branches) {
      if (branch.condition) {
        this.requireType(this.expression(branch.condition, scope), "boolean", branch.line);
      }
      this.analyzeStatements(branch.body, new Scope(scope), inFunction);
    }
  }

  private forStatement(statement: ForStatement, scope: Scope, inFunction: boolean): void {
    this.requireType(this.expression(statement.from, scope), "number", statement.line);
    this.requireType(this.expression(statement.to, scope), "number", statement.line);
    const loopScope = new Scope(scope);
    loopScope.declare(statement.iterator, { type: "number" }, statement.line);
    this.analyzeStatements(statement.body, loopScope, inFunction);
  }

  private whileStatement(statement: WhileStatement, scope: Scope, inFunction: boolean): void {
    this.requireType(this.expression(statement.until, scope), "boolean", statement.line);
    this.analyzeStatements(statement.body, new Scope(scope), inFunction);
  }

  private arrayPush(statement: ArrayPushStatement, scope: Scope): void {
    this.requireType(this.expression(statement.array, scope), "array", statement.line);
    this.expression(statement.value, scope);
  }

  private arraySet(statement: ArraySetStatement, scope: Scope): void {
    this.requireType(this.expression(statement.array, scope), "array", statement.line);
    this.requireType(this.expression(statement.index, scope), "number", statement.line);
    this.expression(statement.value, scope);
  }

  private arrayRemove(statement: ArrayRemoveStatement, scope: Scope): void {
    this.requireType(this.expression(statement.array, scope), "array", statement.line);
    this.requireType(this.expression(statement.index, scope), "number", statement.line);
  }

  private objectSet(statement: ObjectSetStatement, scope: Scope): void {
    this.requireType(this.expression(statement.object, scope), "object", statement.line);
    this.requireKeyType(this.expression(statement.key, scope), statement.line);
    this.expression(statement.value, scope);
  }

  private expression(expression: Expression, scope: Scope): ValueType {
    switch (expression.kind) {
      case "LiteralExpression":
        if (expression.value === null) return "null";
        if (typeof expression.value === "number") return "number";
        if (typeof expression.value === "string") return "string";
        if (typeof expression.value === "boolean") return "boolean";
        return "unknown";
      case "IdentifierExpression":
        return scope.resolve(expression.name, expression.line).type;
      case "UnaryExpression":
        return this.unary(expression, scope);
      case "BinaryExpression":
        return this.binary(expression, scope);
      case "CallExpression":
        return this.call(expression, scope);
      case "ArrayLiteralExpression":
        return this.arrayLiteral(expression, scope);
      case "ArrayLengthExpression":
        return this.arrayLength(expression, scope);
      case "ArrayIndexExpression":
        return this.arrayIndex(expression, scope);
      case "ArrayMapExpression":
        return this.arrayMap(expression, scope);
      case "ArrayFilterExpression":
        return this.arrayFilter(expression, scope);
      case "ArraySortExpression":
        return this.arraySort(expression, scope);
      case "ObjectLiteralExpression":
        return this.objectLiteral(expression, scope);
      case "ObjectAccessExpression":
        return this.objectAccess(expression, scope);
      case "ObjectHasExpression":
        return this.objectHas(expression, scope);
    }
  }

  private unary(expression: UnaryExpression, scope: Scope): ValueType {
    this.requireType(this.expression(expression.argument, scope), "boolean", expression.line);
    return "boolean";
  }

  private binary(expression: BinaryExpression, scope: Scope): ValueType {
    const left = this.expression(expression.left, scope);
    const right = this.expression(expression.right, scope);

    if (["+", "-", "*", "/", "%"].includes(expression.operator)) {
      this.requireType(left, "number", expression.line);
      this.requireType(right, "number", expression.line);
      return "number";
    }

    if (["<", ">"].includes(expression.operator)) {
      this.requireType(left, "number", expression.line);
      this.requireType(right, "number", expression.line);
      return "boolean";
    }

    if (["&&", "||"].includes(expression.operator)) {
      this.requireType(left, "boolean", expression.line);
      this.requireType(right, "boolean", expression.line);
      return "boolean";
    }

    if (expression.operator === "==" || expression.operator === "!=") {
      if (left !== "unknown" && right !== "unknown" && left !== right) {
        throw new ConsultingLangError(errors.typeError, expression.line);
      }
      return "boolean";
    }

    return "unknown";
  }

  private call(expression: CallExpression, scope: Scope): ValueType {
    const info = this.functions.get(expression.callee);
    if (!info) {
      throw new ConsultingLangError(errors.undefinedVariable(expression.callee), expression.line);
    }
    if (expression.args.length !== info.params.length) {
      throw new ConsultingLangError(errors.wrongArgumentCount, expression.line);
    }
    expression.args.forEach((arg) => this.expression(arg, scope));
    return "unknown";
  }

  private arrayLiteral(expression: ArrayLiteralExpression, scope: Scope): ValueType {
    expression.items.forEach((item) => this.expression(item, scope));
    return "array";
  }

  private arrayLength(expression: ArrayLengthExpression, scope: Scope): ValueType {
    this.requireType(this.expression(expression.array, scope), "array", expression.line);
    return "number";
  }

  private arrayIndex(expression: ArrayIndexExpression, scope: Scope): ValueType {
    this.requireType(this.expression(expression.array, scope), "array", expression.line);
    this.requireType(this.expression(expression.index, scope), "number", expression.line);
    return "unknown";
  }

  private arrayMap(expression: ArrayMapExpression, scope: Scope): ValueType {
    this.requireType(this.expression(expression.array, scope), "array", expression.line);
    this.requireFunction(expression.mapper, 1, expression.line);
    return "array";
  }

  private arrayFilter(expression: ArrayFilterExpression, scope: Scope): ValueType {
    this.requireType(this.expression(expression.array, scope), "array", expression.line);
    this.requireFunction(expression.predicate, 1, expression.line);
    return "array";
  }

  private arraySort(expression: ArraySortExpression, scope: Scope): ValueType {
    this.requireType(this.expression(expression.array, scope), "array", expression.line);
    return "array";
  }

  private objectLiteral(expression: ObjectLiteralExpression, scope: Scope): ValueType {
    const keys = new Set<string>();
    for (const property of expression.properties) {
      if (keys.has(property.key)) {
        throw new ConsultingLangError(`${property.key} is already aligned.`, expression.line);
      }
      keys.add(property.key);
      this.expression(property.value, scope);
    }
    return "object";
  }

  private objectAccess(expression: ObjectAccessExpression, scope: Scope): ValueType {
    this.requireType(this.expression(expression.object, scope), "object", expression.line);
    this.requireKeyType(this.expression(expression.key, scope), expression.line);
    return "unknown";
  }

  private objectHas(expression: ObjectHasExpression, scope: Scope): ValueType {
    this.requireType(this.expression(expression.object, scope), "object", expression.line);
    this.requireKeyType(this.expression(expression.key, scope), expression.line);
    return "boolean";
  }

  private requireType(actual: ValueType, expected: ValueType, line: number): void {
    if (actual !== "unknown" && actual !== expected) {
      throw new ConsultingLangError(errors.typeError, line);
    }
  }

  private requireKeyType(actual: ValueType, line: number): void {
    if (actual !== "unknown" && actual !== "string" && actual !== "number") {
      throw new ConsultingLangError(errors.typeError, line);
    }
  }

  private requireFunction(name: string, arity: number, line: number): void {
    const info = this.functions.get(name);
    if (!info) {
      throw new ConsultingLangError(errors.undefinedVariable(name), line);
    }
    if (info.params.length !== arity) {
      throw new ConsultingLangError(errors.wrongArgumentCount, line);
    }
  }
}
