import type {
  ArrayIndexExpression,
  ArrayFilterExpression,
  ArrayLengthExpression,
  ArrayLiteralExpression,
  ArrayMapExpression,
  ArrayRemoveStatement,
  ArraySetStatement,
  ArraySortExpression,
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
  ObjectAccessExpression,
  ObjectLiteralExpression,
  ObjectSetStatement,
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
      case "ArraySetStatement":
        return this.arraySet(statement);
      case "ArrayRemoveStatement":
        return this.arrayRemove(statement);
      case "ObjectSetStatement":
        return this.objectSet(statement);
      case "ExpressionStatement":
        return this.expressionStatement(statement);
    }
  }

  private variableDeclaration(statement: VariableDeclaration): string {
    const value = statement.value ? this.expression(statement.value) : "undefined";
    return [this.sourceLine(statement.line), this.line(`let ${statement.name} = ${value};`)].join("\n");
  }

  private assignment(statement: AssignmentStatement): string {
    return [this.sourceLine(statement.line), this.line(`${statement.name} = ${this.expression(statement.value)};`)].join("\n");
  }

  private print(statement: PrintStatement): string {
    return [this.sourceLine(statement.line), this.line(`__consulting.print(${this.expression(statement.value)});`)].join("\n");
  }

  private functionDeclaration(statement: FunctionDeclaration): string {
    const name = this.functionNames.get(statement.name) ?? this.safeFunctionName(statement.name);
    const lines = [
      this.sourceLine(statement.line),
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
    return [this.sourceLine(statement.line), this.line(`return ${statement.value ? this.expression(statement.value) : "undefined"};`)].join("\n");
  }

  private ifStatement(statement: IfStatement): string {
    const lines: string[] = [this.sourceLine(statement.line)];
    statement.branches.forEach((branch, index) => {
      if (index === 0) {
        lines.push(this.line(`if (__consulting.truthy(${this.expression(branch.condition!)}, ${branch.line})) {`));
      } else if (branch.condition) {
        lines.push(this.line(`else if (__consulting.truthy(${this.expression(branch.condition)}, ${branch.line})) {`));
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
      this.sourceLine(statement.line),
      this.line("{"),
      ...this.withIndent(() => [
        this.line(`let ${guard} = 0;`),
        this.line(`const ${from} = __consulting.number(${this.expression(statement.from)}, ${statement.line});`),
        this.line(`const ${to} = __consulting.number(${this.expression(statement.to)}, ${statement.line});`),
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
      this.sourceLine(statement.line),
      this.line("{"),
      ...this.withIndent(() => [
        this.line(`let ${guard} = 0;`),
        this.line(`while (!__consulting.truthy(${this.expression(statement.until)}, ${statement.line})) {`),
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
    return [this.sourceLine(statement.line), this.line(`__consulting.addToPipeline(${this.expression(statement.array)}, ${this.expression(statement.value)}, ${statement.line});`)].join("\n");
  }

  private arraySet(statement: ArraySetStatement): string {
    return [this.sourceLine(statement.line), this.line(`__consulting.setStakeholder(${this.expression(statement.array)}, ${this.expression(statement.index)}, ${this.expression(statement.value)}, ${statement.line});`)].join("\n");
  }

  private arrayRemove(statement: ArrayRemoveStatement): string {
    return [this.sourceLine(statement.line), this.line(`__consulting.removeFromPipeline(${this.expression(statement.array)}, ${this.expression(statement.index)}, ${statement.line});`)].join("\n");
  }

  private objectSet(statement: ObjectSetStatement): string {
    return [this.sourceLine(statement.line), this.line(`__consulting.setBriefing(${this.expression(statement.object)}, ${this.expression(statement.key)}, ${this.expression(statement.value)}, ${statement.line});`)].join("\n");
  }

  private expressionStatement(statement: ExpressionStatement): string {
    return [this.sourceLine(statement.line), this.line(`${this.expression(statement.expression)};`)].join("\n");
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
      case "ArrayMapExpression":
        return this.arrayMap(expression);
      case "ArrayFilterExpression":
        return this.arrayFilter(expression);
      case "ArraySortExpression":
        return this.arraySort(expression);
      case "ObjectLiteralExpression":
        return this.objectLiteral(expression);
      case "ObjectAccessExpression":
        return this.objectAccess(expression);
    }
  }

  private literal(expression: LiteralExpression): string {
    return JSON.stringify(expression.value);
  }

  private identifier(expression: IdentifierExpression): string {
    return expression.name;
  }

  private unary(expression: UnaryExpression): string {
    return `__consulting.not(${this.expression(expression.argument)}, ${expression.line})`;
  }

  private binary(expression: BinaryExpression): string {
    if (expression.operator === "+") {
      return `__consulting.add(${this.expression(expression.left)}, ${this.expression(expression.right)}, ${expression.line})`;
    }
    if (expression.operator === "-") {
      return `__consulting.subtract(${this.expression(expression.left)}, ${this.expression(expression.right)}, ${expression.line})`;
    }
    if (expression.operator === "*") {
      return `__consulting.multiply(${this.expression(expression.left)}, ${this.expression(expression.right)}, ${expression.line})`;
    }
    if (expression.operator === "/") {
      return `__consulting.divide(${this.expression(expression.left)}, ${this.expression(expression.right)}, ${expression.line})`;
    }
    if (expression.operator === "%") {
      return `__consulting.modulo(${this.expression(expression.left)}, ${this.expression(expression.right)}, ${expression.line})`;
    }
    if (expression.operator === "<" || expression.operator === ">") {
      return `__consulting.compare(${JSON.stringify(expression.operator)}, ${this.expression(expression.left)}, ${this.expression(expression.right)}, ${expression.line})`;
    }
    if (expression.operator === "==" || expression.operator === "!=") {
      return `__consulting.equal(${expression.operator === "!="}, ${this.expression(expression.left)}, ${this.expression(expression.right)}, ${expression.line})`;
    }
    if (expression.operator === "&&") {
      return `__consulting.and(${this.expression(expression.left)}, ${this.expression(expression.right)}, ${expression.line})`;
    }
    if (expression.operator === "||") {
      return `__consulting.or(${this.expression(expression.left)}, ${this.expression(expression.right)}, ${expression.line})`;
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
    return `__consulting.headcount(${this.expression(expression.array)}, ${expression.line})`;
  }

  private arrayIndex(expression: ArrayIndexExpression): string {
    return `__consulting.stakeholder(${this.expression(expression.array)}, ${this.expression(expression.index)}, ${expression.line})`;
  }

  private arrayMap(expression: ArrayMapExpression): string {
    return `__consulting.mapPipeline(${this.expression(expression.array)}, ${this.functionReference(expression.mapper)}, ${expression.line})`;
  }

  private arrayFilter(expression: ArrayFilterExpression): string {
    return `__consulting.filterPipeline(${this.expression(expression.array)}, ${this.functionReference(expression.predicate)}, ${expression.line})`;
  }

  private arraySort(expression: ArraySortExpression): string {
    return `__consulting.sortPipeline(${this.expression(expression.array)}, ${expression.line})`;
  }

  private objectLiteral(expression: ObjectLiteralExpression): string {
    const properties = expression.properties.map((property) => {
      return `${JSON.stringify(property.key)}: ${this.expression(property.value)}`;
    });
    return `__consulting.brief({ ${properties.join(", ")} }, ${expression.line})`;
  }

  private objectAccess(expression: ObjectAccessExpression): string {
    return `__consulting.briefing(${this.expression(expression.object)}, ${this.expression(expression.key)}, ${expression.line})`;
  }

  private sourceLine(line: number): string {
    return this.line(`// deck line ${line}`);
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

  private functionReference(name: string): string {
    return this.functionNames.get(name) ?? this.safeFunctionName(name);
  }
}
