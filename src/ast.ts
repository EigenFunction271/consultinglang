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
  | ArraySetStatement
  | ArrayRemoveStatement
  | ObjectSetStatement
  | ExpressionStatement;

export interface VariableDeclaration {
  kind: "VariableDeclaration";
  line: number;
  name: string;
  value?: Expression;
}

export interface AssignmentStatement {
  kind: "AssignmentStatement";
  line: number;
  name: string;
  value: Expression;
}

export interface PrintStatement {
  kind: "PrintStatement";
  line: number;
  value: Expression;
}

export interface FunctionDeclaration {
  kind: "FunctionDeclaration";
  line: number;
  name: string;
  params: string[];
  body: Statement[];
}

export interface ReturnStatement {
  kind: "ReturnStatement";
  line: number;
  value?: Expression;
}

export interface IfBranch {
  line: number;
  condition?: Expression;
  body: Statement[];
}

export interface IfStatement {
  kind: "IfStatement";
  line: number;
  branches: IfBranch[];
}

export interface ForStatement {
  kind: "ForStatement";
  line: number;
  iterator: string;
  from: Expression;
  to: Expression;
  body: Statement[];
}

export interface WhileStatement {
  kind: "WhileStatement";
  line: number;
  until: Expression;
  body: Statement[];
}

export interface ArrayPushStatement {
  kind: "ArrayPushStatement";
  line: number;
  array: Expression;
  value: Expression;
}

export interface ArraySetStatement {
  kind: "ArraySetStatement";
  line: number;
  array: Expression;
  index: Expression;
  value: Expression;
}

export interface ArrayRemoveStatement {
  kind: "ArrayRemoveStatement";
  line: number;
  array: Expression;
  index: Expression;
}

export interface ObjectSetStatement {
  kind: "ObjectSetStatement";
  line: number;
  object: Expression;
  key: Expression;
  value: Expression;
}

export interface ExpressionStatement {
  kind: "ExpressionStatement";
  line: number;
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
  | ArrayIndexExpression
  | ArrayMapExpression
  | ArrayFilterExpression
  | ArraySortExpression
  | ObjectLiteralExpression
  | ObjectAccessExpression;

export interface LiteralExpression {
  kind: "LiteralExpression";
  line: number;
  value: string | number | boolean | null;
}

export interface IdentifierExpression {
  kind: "IdentifierExpression";
  line: number;
  name: string;
}

export interface UnaryExpression {
  kind: "UnaryExpression";
  line: number;
  operator: "!";
  argument: Expression;
}

export interface BinaryExpression {
  kind: "BinaryExpression";
  line: number;
  operator: "+" | "-" | "*" | "/" | "%" | "==" | "!=" | "<" | ">" | "&&" | "||";
  left: Expression;
  right: Expression;
}

export interface CallExpression {
  kind: "CallExpression";
  line: number;
  callee: string;
  args: Expression[];
}

export interface ArrayLiteralExpression {
  kind: "ArrayLiteralExpression";
  line: number;
  items: Expression[];
}

export interface ArrayLengthExpression {
  kind: "ArrayLengthExpression";
  line: number;
  array: Expression;
}

export interface ArrayIndexExpression {
  kind: "ArrayIndexExpression";
  line: number;
  index: Expression;
  array: Expression;
}

export interface ArrayMapExpression {
  kind: "ArrayMapExpression";
  line: number;
  array: Expression;
  mapper: string;
}

export interface ArrayFilterExpression {
  kind: "ArrayFilterExpression";
  line: number;
  array: Expression;
  predicate: string;
}

export interface ArraySortExpression {
  kind: "ArraySortExpression";
  line: number;
  array: Expression;
}

export interface ObjectProperty {
  key: string;
  value: Expression;
}

export interface ObjectLiteralExpression {
  kind: "ObjectLiteralExpression";
  line: number;
  properties: ObjectProperty[];
}

export interface ObjectAccessExpression {
  kind: "ObjectAccessExpression";
  line: number;
  key: Expression;
  object: Expression;
}
