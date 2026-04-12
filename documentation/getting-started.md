# Getting Started

## Install Dependencies

From the repository root:

```bash
npm install
npm run build
npm test
```

## Run A Deck

```bash
node dist/cli.js run examples/hello.deck
```

Expected output:

```text
Hello, World.
```

After publishing, the public command shape is:

```bash
npx consultinglang run examples/hello.deck
```

## Transpile A Deck

```bash
node dist/cli.js transpile examples/fizzbuzz.deck
```

This prints the generated JavaScript without running it.

## Audit A Deck

```bash
node dist/cli.js audit examples/fibonacci.deck
```

Successful audit output:

```text
This deck is aligned.
```

## Deck File Shape

Every `.deck` file must start with `kick off` and end with `close the loop`:

```deck
kick off

  socialise "Hello, World."

close the loop
```

Only blank lines and `// per my last email:` comments may appear between statements.
