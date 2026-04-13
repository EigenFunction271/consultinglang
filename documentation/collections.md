# Collections

ConsultingLang supports arrays and object/dictionary/map values.

## Arrays

Arrays are called pipelines.

```deck
align on backlog is a key deliverable of pipeline
align on team is a key deliverable of pipeline "Alice", "Bob"
```

Push a value:

```deck
add to pipeline team "Carol"
```

Read length:

```deck
socialise headcount of team
```

Read by zero-based index:

```deck
socialise stakeholder 0 of team
```

Assign an existing index:

```deck
stakeholder 1 of team is a key deliverable of "Barbara"
```

Remove by index:

```deck
remove from pipeline team 0
```

Strict rules:

- Pipeline operations require arrays.
- Indexes must be whole numbers.
- Out-of-bounds access, assignment, or removal is rejected.

## Map

`map pipeline` returns a new array.

```deck
synergize double with n
  take this offline n * 2
end of day

align on numbers is a key deliverable of pipeline 1, 2, 3
align on doubled is a key deliverable of map pipeline numbers with double
```

Strict rule: the mapper must be a known one-argument function.

## Filter

`filter pipeline` returns a new array.

```deck
synergize is material with n
  take this offline n > 5
end of day

align on numbers is a key deliverable of pipeline 3, 6, 9
align on material is a key deliverable of filter pipeline numbers with is material
```

Strict rules:

- The predicate must be a known one-argument function.
- The predicate must return a boolean at runtime.

## Sort

`sort pipeline` returns a sorted copy.

```deck
align on numbers is a key deliverable of pipeline 3, 1, 2
align on sorted is a key deliverable of sort pipeline numbers
```

Strict rule: sorting only accepts arrays containing all numbers or all strings.

## Objects, Dictionaries, And Maps

Objects are called briefs.

```deck
align on memo is a key deliverable of brief owner: "Ada", "status": "greenlit"
align on seen is a key deliverable of brief
```

Keys may be bare identifiers in literals:

```deck
brief owner: "Ada"
```

Keys may also be quoted strings:

```deck
brief "status": "greenlit"
```

Runtime key expressions may be strings or numbers:

```deck
briefing 7 of seen is a key deliverable of 0
```

Read a key:

```deck
socialise briefing "owner" of memo
```

Check whether a key exists:

```deck
going forward if has briefing "owner" of memo
  socialise "Owner is in the room."
end of day
```

Assign a key:

```deck
briefing "status" of memo is a key deliverable of "socialised"
```

Strict rules:

- `briefing [key] of [object]` requires an object and a string or number key.
- Reading a missing key is rejected.
- `has briefing [key] of [object]` returns a boolean instead of reading the value.
- Assigning a key creates or replaces that entry.
