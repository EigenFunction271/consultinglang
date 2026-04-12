# Language Reference

ConsultingLang decks are strict, line-oriented programs with explicit boardroom boundaries.

## Program Boundaries

```deck
kick off

  socialise "Hello, World."

close the loop
```

Code outside those boundaries is a syntax misalignment.

## Variables

Declare a variable:

```deck
align on revenue
```

Declare and assign:

```deck
align on revenue is a key deliverable of 42
```

Assign to an existing variable:

```deck
revenue is a key deliverable of revenue + 10
```

Strict rules:

- Variables must be declared before use.
- Assigning undeclared variables is rejected.
- Redeclaring the same variable in the same scope is rejected.
- Reassigning a known variable to a conflicting known type is rejected.

## Values

Supported values:

- Numbers: `42`, `3.14`
- Strings: `"Hello"`
- Booleans: `greenlit`, `deprioritised`
- Null: `no bandwidth`
- Arrays: `pipeline "Alice", "Bob"`
- Objects, dictionaries, maps: `brief owner: "Ada", "status": "greenlit"`

## Operators

Arithmetic:

```deck
socialise 1 + 2 * 3
socialise 10 / 2
socialise 10 % 3
```

Comparison:

```deck
going forward if revenue > 100
  socialise "Upside case."
end of day
```

Logical:

```deck
going forward if greenlit in alignment with it is not the case that deprioritised
  socialise "Aligned."
end of day
```

Strict rules:

- Arithmetic operators require numbers.
- `<` and `>` require numbers.
- Logical operators require booleans.
- Equality requires both sides to have aligned types when known.
- Division and modulo by zero are rejected.

## Functions

Define a function:

```deck
synergize add numbers with a, b
  take this offline a + b
end of day
```

Call a function:

```deck
socialise leverage add numbers with 10, 20
```

Strict rules:

- Function calls must target a known function.
- Function calls must pass exactly the expected number of arguments.
- `take this offline` is only valid inside a function.

V1 limitation: function calls are supported as full expressions at the beginning of an expression, such as `socialise leverage add numbers with 1, 2`. Nested infix call expressions are deferred.

## Conditionals

```deck
going forward if revenue > 100
  socialise "We're crushing it."
pivoting if revenue > 50
  socialise "Solid trajectory."
that said
  socialise "Let's discuss in a smaller room."
end of day
```

Strict rule: all conditions must evaluate to booleans.

## Loops

For loop:

```deck
loop back on i from 1 to 5
  socialise i
end of day
```

Descending loops are supported:

```deck
loop back on i from 5 to 1
  socialise i
end of day
```

While loop:

```deck
circle back until done
  done is a key deliverable of greenlit
end of day
```

`circle back until [condition]` runs while the condition is false and stops once it is true.

Strict rules:

- Loop bounds must be numbers.
- While conditions must be booleans.
- Loops are guarded after 10,000 cycles.

## Printing

```deck
socialise "Hello, stakeholder."
socialise revenue
```

`socialise` writes values to stdout when the deck runs.

## Comments

```deck
// per my last email: this will not be actioned
socialise "This string keeps // per my last email: intact"
```

Only the consultant comment form is recognized.
