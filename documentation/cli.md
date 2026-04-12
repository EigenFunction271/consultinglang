# CLI Reference

The CLI entrypoint is `consultinglang`.

During local development, use:

```bash
node dist/cli.js <command> <file.deck>
```

After publishing, use:

```bash
npx consultinglang <command> <file.deck>
```

## `run`

```bash
node dist/cli.js run examples/hello.deck
```

Pipeline:

```text
.deck source -> parser -> analyzer -> transpiler -> Node vm runtime
```

The command prints `socialise` output to stdout.

## `transpile`

```bash
node dist/cli.js transpile examples/fizzbuzz.deck
```

Prints generated JavaScript without executing it.

Generated JavaScript includes comments like:

```js
// deck line 8
```

Those comments preserve source context for debugging and future error reporting.

## `audit`

```bash
node dist/cli.js audit examples/fibonacci.deck
```

Parses and analyzes a deck without running it.

Successful output:

```text
This deck is aligned.
```

## Exit Behavior

- Successful commands exit with code `0`.
- Misalignments print a consultant-flavored error to stderr and exit nonzero.
- The CLI requires `.deck` files.
