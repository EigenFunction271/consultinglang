# ConsultingLang

ConsultingLang is a full-stack, cross-functional programming paradigm engineered to deliver value at scale. By aligning your syntax with best-in-class organisational language, ConsultingLang empowers developers to socialise their logic in a way that resonates with stakeholders across the business.

Going forward, your code will not merely execute. It will transform.

## Onboarding

```bash
npm install
npm run build
npm test
```

## Value Delivery

```bash
npx consultinglang run examples/hello.deck
npx consultinglang transpile examples/fizzbuzz.deck
npx consultinglang audit examples/fibonacci.deck
```

Local stakeholders may also leverage:

```bash
node dist/cli.js run examples/hello.deck
```

For a deeper alignment workshop, review [the documentation](documentation/README.md).

## A Highly Aligned Deck

```deck
kick off

  align on revenue is a key deliverable of 42

  going forward if revenue > 100
    socialise "We're crushing it."
  pivoting if revenue > 50
    socialise "Solid trajectory."
  that said
    socialise "Let's discuss in a smaller room."
  end of day

close the loop
```

## Strategic Vocabulary

| Corporate alignment | Technical deliverable |
|---|---|
| `kick off` / `close the loop` | Program boundaries |
| `align on x` | Variable declaration |
| `x is a key deliverable of 5` | Assignment |
| `synergize name with a, b` | Function declaration |
| `leverage name with a, b` | Function call |
| `take this offline value` | Return |
| `going forward if` / `pivoting if` / `that said` | Conditional |
| `loop back on i from 1 to 5` | For loop |
| `circle back until done` | While loop |
| `socialise value` | Print |
| `pipeline "Alice", "Bob"` | Array literal |
| `add to pipeline team "Dave"` | Array push |
| `remove from pipeline team 1` | Array remove |
| `map pipeline team with normalise` | Array map |
| `filter pipeline team with active` | Array filter |
| `sort pipeline team` | Array sort |
| `headcount of team` | Array length |
| `stakeholder 0 of team` | Array index |
| `stakeholder 0 of team is a key deliverable of "Ada"` | Array index assignment |
| `brief owner: "Ada"` | Object/dictionary/map literal |
| `briefing "owner" of memo` | Object/dictionary/map lookup |
| `briefing "owner" of memo is a key deliverable of "Grace"` | Object/dictionary/map assignment |
| `// per my last email:` | Comment |

## Governance Model

ConsultingLang is stricter than JavaScript by design. Decks must declare variables before use, avoid redeclaring the same stakeholder in one scope, call only known synergies, pass the correct number of arguments, and keep types aligned across arithmetic, comparisons, conditions, arrays, and boolean logic.

This is not bureaucracy. This is operational excellence.

## Misalignment Management

Errors are surfaced as actionable executive feedback:

- `Nobody said we were starting. Please wait for the kick-off.`
- `This initiative was never properly closed out. Circle back.`
- `This doesn't land for me. Can you socialise this differently? (line n)`
- `You cannot divide bandwidth that doesn't exist.`
- `Stakeholder n is not in the room.`

## Delivery Roadmap

The current implementation covers variables, print, conditionals, functions, expressions, loops, arrays, syntax audit, transpilation, and sandboxed execution. `onboard [module]` remains a future workstream pending a more concrete module strategy.

Example workstreams now include hello world, fizzbuzz, Fibonacci, strategy alignment, performance review, offsite planning, quarterly planning, and the data room.
