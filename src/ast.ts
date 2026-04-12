export interface Program {
  kind: "Program";
  body: Statement[];
}

export type Statement =
  | VariableDeclaration
  | AssignmentStatement
  | PrintStatement
  | FunctionDeclaration
  | ReturnStatement
  | IfStatement
  | ForStatement
  | WhileStatement
  | ArrayPushStatement
  | ExpressionStatement;

export interface VariableDeclaration {
  kind: "VariableDeclaration";
  name: string;
  value?: Expression;
}

export interface AssignmentStatement {
  kind: "AssignmentStatement";
  name: string;
  value: Expression;
}

export interface PrintStatement {
  kind: "PrintStatement";
  value: Expression;
}

export interface FunctionDeclaration {
  kind: "FunctionDeclaration";
  name: string;
  params: string[];
  body: Statement[];
}

export interface ReturnStatement {
  kind: "ReturnStatement";
  value?: Expression;
}

export interface IfBranch {
  condition?: Expression;
  body: Statement[];
}

export interface IfStatement {
  kind: "IfStatement";
  branches: IfBranch[];
}

export interface ForStatement {
  kind: "ForStatement";
  iterator: string;
  from: Expression;
  to: Expression;
  body: Statement[];
}

export interface WhileStatement {
  kind: "WhileStatement";
  until: Expression;
  body: Statement[];
}

export interface ArrayPushStatement {
  kind: "ArrayPushStatement";
  array: Expression;
  value: Expression;
}

export interface ExpressionStatement {
  kind: "ExpressionStatement";
  expression: Expression;
}

export type Expression =
  | LiteralExpression
  | IdentifierExpression
  | UnaryExpression
  | BinaryExpression
  | CallExpression
  | ArrayLiteralExpression
  | ArrayLengthExpression
  | ArrayIndexExpression;

export interface LiteralExpression {
  kind: "LiteralExpression";
  value: string | number | boolean | null;
}

export interface IdentifierExpression {
  kind: "IdentifierExpression";
  name: string;
}

export interface UnaryExpression {
  kind: "UnaryExpression";
  operator: "!";
  argument: Expression;
}

export interface BinaryExpression {
  kind: "BinaryExpression";
  operator: "+" | "-" | "*" | "/" | "%" | "==" | "!=" | "<" | ">" | "&&" | "||";
  left: Expression;
  right: Expression;
}

export interface CallExpression {
  kind: "CallExpression";
  callee: string;
  args: Expression[];
}

export interface ArrayLiteralExpression {
  kind: "ArrayLiteralExpression";
  items: Expression[];
}

export interface ArrayLengthExpression {
  kind: "ArrayLengthExpression";
  array: Expression;
}

export interface ArrayIndexExpression {
  kind: "ArrayIndexExpression";
  index: Expression;
  array: Expression;
}
