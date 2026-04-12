import type {
  ArrayIndexExpression,
  ArrayLengthExpression,
  ArrayLiteralExpression,
  ArrayPushStatement,
  AssignmentStatement,
  BinaryExpression,
  CallExpression,
  Expression,
  ExpressionStatement,
  ForStatement,
  FunctionDeclaration,
  IdentifierExpression,
  IfStatement,
  LiteralExpression,
  PrintStatement,
  Program,
  ReturnStatement,
  Statement,
  UnaryExpression,
  VariableDeclaration,
  WhileStatement,
} from "./ast.js";

export function transpile(program: Program): string {
  const emitter = new Emitter();
  return emitter.emit(program);
}

class Emitter {
  private indentLevel = 0;
  private loopId = 0;
  private readonly functionNames = new Map<string, string>();

  emit(program: Program): string {
    this.collectFunctionNames(program.body);
    return [
      "\"use strict\";",
      ...program.body.map((statement) => this.statement(statement)),
      "",
    ].join("\n");
  }

  private collectFunctionNames(statements: Statement[]): void {
    for (const statement of statements) {
      if (statement.kind === "FunctionDeclaration") {
        this.functionNames.set(statement.name, this.safeFunctionName(statement.name));
      }
      if (statement.kind === "IfStatement") {
        statement.branches.forEach((branch) => this.collectFunctionNames(branch.body));
      }
      if (statement.kind === "ForStatement" || statement.kind === "WhileStatement") {
        this.collectFunctionNames(statement.body);
      }
    }
  }

  private statement(statement: Statement): string {
    switch (statement.kind) {
      case "VariableDeclaration":
        return this.variableDeclaration(statement);
      case "AssignmentStatement":
        return this.assignment(statement);
      case "PrintStatement":
        return this.print(statement);
      case "FunctionDeclaration":
        return this.functionDeclaration(statement);
      case "ReturnStatement":
        return this.returnStatement(statement);
      case "IfStatement":
        return this.ifStatement(statement);
      case "ForStatement":
        return this.forStatement(statement);
      case "WhileStatement":
        return this.whileStatement(statement);
      case "ArrayPushStatement":
        return this.arrayPush(statement);
      case "ExpressionStatement":
        return this.expressionStatement(statement);
    }
  }

  private variableDeclaration(statement: VariableDeclaration): string {
    const value = statement.value ? this.expression(statement.value) : "undefined";
    return this.line(`let ${statement.name} = ${value};`);
  }

  private assignment(statement: AssignmentStatement): string {
    return this.line(`${statement.name} = ${this.expression(statement.value)};`);
  }

  private print(statement: PrintStatement): string {
    return this.line(`__consulting.print(${this.expression(statement.value)});`);
  }

  private functionDeclaration(statement: FunctionDeclaration): string {
    const name = this.functionNames.get(statement.name) ?? this.safeFunctionName(statement.name);
    const lines = [
      this.line(`function ${name}(${statement.params.join(", ")}) {`),
      this.withIndent(() => [
        this.line(`__consulting.checkArgs(arguments.length, ${statement.params.length});`),
        ...statement.body.map((child) => this.statement(child)),
      ]),
      this.line("}"),
    ];
    return lines.flat().join("\n");
  }

  private returnStatement(statement: ReturnStatement): string {
    return this.line(`return ${statement.value ? this.expression(statement.value) : "undefined"};`);
  }

  private ifStatement(statement: IfStatement): string {
    const lines: string[] = [];
    statement.branches.forEach((branch, index) => {
      if (index === 0) {
        lines.push(this.line(`if (${this.expression(branch.condition!)}) {`));
      } else if (branch.condition) {
        lines.push(this.line(`else if (${this.expression(branch.condition)}) {`));
      } else {
        lines.push(this.line("else {"));
      }
      lines.push(...this.withIndent(() => branch.body.map((child) => this.statement(child))));
      lines.push(this.line("}"));
    });
    return lines.join("\n");
  }

  private forStatement(statement: ForStatement): string {
    const guard = this.nextLoopGuard();
    const from = `__from_${guard}`;
    const to = `__to_${guard}`;
    return [
      this.line("{"),
      ...this.withIndent(() => [
        this.line(`let ${guard} = 0;`),
        this.line(`const ${from} = ${this.expression(statement.from)};`),
        this.line(`const ${to} = ${this.expression(statement.to)};`),
        this.line(`const __step_${guard} = ${from} <= ${to} ? 1 : -1;`),
        this.line(
          `for (let ${statement.iterator} = ${from}; __step_${guard} > 0 ? ${statement.iterator} <= ${to} : ${statement.iterator} >= ${to}; ${statement.iterator} += __step_${guard}) {`,
        ),
        ...this.withIndent(() => [
          this.line(`__consulting.guard(++${guard});`),
          ...statement.body.map((child) => this.statement(child)),
        ]),
        this.line("}"),
      ]),
      this.line("}"),
    ].join("\n");
  }

  private whileStatement(statement: WhileStatement): string {
    const guard = this.nextLoopGuard();
    return [
      this.line("{"),
      ...this.withIndent(() => [
        this.line(`let ${guard} = 0;`),
        this.line(`while (!(${this.expression(statement.until)})) {`),
        ...this.withIndent(() => [
          this.line(`__consulting.guard(++${guard});`),
          ...statement.body.map((child) => this.statement(child)),
        ]),
        this.line("}"),
      ]),
      this.line("}"),
    ].join("\n");
  }

  private arrayPush(statement: ArrayPushStatement): string {
    return this.line(`__consulting.addToPipeline(${this.expression(statement.array)}, ${this.expression(statement.value)});`);
  }

  private expressionStatement(statement: ExpressionStatement): string {
    return this.line(`${this.expression(statement.expression)};`);
  }

  private expression(expression: Expression): string {
    switch (expression.kind) {
      case "LiteralExpression":
        return this.literal(expression);
      case "IdentifierExpression":
        return this.identifier(expression);
      case "UnaryExpression":
        return this.unary(expression);
      case "BinaryExpression":
        return this.binary(expression);
      case "CallExpression":
        return this.call(expression);
      case "ArrayLiteralExpression":
        return this.arrayLiteral(expression);
      case "ArrayLengthExpression":
        return this.arrayLength(expression);
      case "ArrayIndexExpression":
        return this.arrayIndex(expression);
    }
  }

  private literal(expression: LiteralExpression): string {
    return JSON.stringify(expression.value);
  }

  private identifier(expression: IdentifierExpression): string {
    return expression.name;
  }

  private unary(expression: UnaryExpression): string {
    return `(!${this.expression(expression.argument)})`;
  }

  private binary(expression: BinaryExpression): string {
    if (expression.operator === "/") {
      return `__consulting.divide(${this.expression(expression.left)}, ${this.expression(expression.right)})`;
    }
    if (expression.operator === "%") {
      return `__consulting.modulo(${this.expression(expression.left)}, ${this.expression(expression.right)})`;
    }
    return `(${this.expression(expression.left)} ${expression.operator} ${this.expression(expression.right)})`;
  }

  private call(expression: CallExpression): string {
    const callee = this.functionNames.get(expression.callee) ?? this.safeFunctionName(expression.callee);
    return `${callee}(${expression.args.map((arg) => this.expression(arg)).join(", ")})`;
  }

  private arrayLiteral(expression: ArrayLiteralExpression): string {
    return `[${expression.items.map((item) => this.expression(item)).join(", ")}]`;
  }

  private arrayLength(expression: ArrayLengthExpression): string {
    return `__consulting.headcount(${this.expression(expression.array)})`;
  }

  private arrayIndex(expression: ArrayIndexExpression): string {
    return `__consulting.stakeholder(${this.expression(expression.array)}, ${this.expression(expression.index)})`;
  }

  private line(text: string): string {
    return `${"  ".repeat(this.indentLevel)}${text}`;
  }

  private withIndent<T>(callback: () => T): T {
    this.indentLevel += 1;
    try {
      return callback();
    } finally {
      this.indentLevel -= 1;
    }
  }

  private nextLoopGuard(): string {
    this.loopId += 1;
    return `__loop_${this.loopId}`;
  }

  private safeFunctionName(name: string): string {
    return `__fn_${name.replace(/[^A-Za-z0-9_]/g, "_")}`;
  }
}
