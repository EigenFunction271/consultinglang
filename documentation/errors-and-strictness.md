# Errors And Strictness

ConsultingLang is stricter than JavaScript by design. The goal is to make deck behavior coherent and misalignment messages useful.

## Core Misalignments

| Situation | Message |
|---|---|
| Missing `kick off` | `Nobody said we were starting. Please wait for the kick-off.` |
| Missing `close the loop` | `This initiative was never properly closed out. Circle back.` |
| Generic syntax error | `This doesn't land for me. Can you socialise this differently? (line n)` |
| Undefined variable or function | `[x] hasn't been onboarded yet.` |
| Wrong function argument count | `This synergy requires more stakeholders.` |
| Type mismatch | `These deliverables are not aligned.` |
| Division or modulo by zero | `You cannot divide bandwidth that doesn't exist.` |
| Index out of bounds | `Stakeholder n is not in the room.` |
| Infinite loop guard | `This initiative has been looping back for n cycles. Escalating to leadership.` |

## Compile-Time Strictness

The analyzer rejects:

- Variables used before declaration.
- Assignment to undeclared variables.
- Redeclaring a variable in the same scope.
- Calling unknown functions.
- Calling functions with the wrong number of arguments.
- Returning outside a function.
- Non-boolean conditional and while expressions.
- Non-number arithmetic, modulo, ordering, and loop bounds.
- Known mismatched equality comparisons.
- Invalid array and object operations.

## Runtime Strictness

Runtime checks still exist because function parameters may be unknown during analysis.

The runtime rejects:

- Function parameters used with the wrong type.
- Filter callbacks that do not return booleans.
- Sorting mixed arrays or arrays with unsupported item types.
- Missing object keys.
- Out-of-bounds array access, assignment, or removal.
- Division and modulo by zero.

## Source Context

The transpiler emits source-line comments in generated JavaScript:

```js
// deck line 12
```

Runtime helper calls also receive line numbers where practical, so future versions can attach line context to more misalignment messages.
