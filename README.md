# address-match

Two address strings can point at the same mailbox and still look nothing
alike:

```
123 Main St, Springfield, IL 62704
123 main street springfield illinois 62704-1111
```

Different case, spelled-out suffixes and state names, a ZIP+4 on one side
and a bare ZIP on the other. This tool answers one question: do two US
postal address strings refer to the same place? It doesn't check whether
either address actually exists (no USPS lookup, no network calls) - it
just normalizes both into comparable parts and tells you where they
agree or disagree.

## Usage

```
npx tsc
node dist/cli.js "123 Main St, Springfield, IL 62704" -- "123 main street springfield illinois 62704-1111"
```

Output:

```
Address A:
123 MAIN ST
SPRINGFIELD, IL 62704

Address B:
123 MAIN ST
SPRINGFIELD, IL 62704-1111

MATCH
```

When something differs, the CLI lists which fields didn't agree:

```
node dist/cli.js "123 Main St, Springfield, IL 62704" -- "456 Main St, Springfield, IL 62704"

NO MATCH
  differs: houseNumber
```

## How it works

`src/address.ts` parses a free-form address string into house number,
street (with suffix and directional abbreviated to USPS Publication 28
style, e.g. "Street" -> "ST", "Northwest" -> "NW"), unit, city, state,
and ZIP. `src/match.ts` compares two parsed addresses field by field. A
ZIP and its ZIP+4 extension are treated as compatible. City is reported
but not required to match, since it's often a ZIP-derived alias (a
neighborhood name vs. the official USPS city) rather than a real
disagreement about location.

## Library use

```ts
import { parseAddress } from "./src/address.js";
import { addressesMatch } from "./src/match.js";

const result = addressesMatch(
  "1600 Pennsylvania Ave NW, Washington, DC 20500",
  "1600 Pennsylvania Avenue Northwest, Washington, District of Columbia 20500"
);
result.isMatch; // true
```

## Known limitations

- Addresses without commas can't reliably separate city from street name
  ("123 Main St Springfield IL 62704" parses the whole thing as one
  street line). Use commas to separate street / city / state+ZIP.
- PO Box, rural/highway contract route, and military unit/box lines
  ("PO Box 123", "RR 2 Box 45", "HC 65 Box 30", "Unit 2050 Box 4190",
  "PSC 1234 Box 12345", "CMR 456 Box 1907") are recognized and
  normalized. Military addresses also accept AA/AE/AP in the state
  position (Armed Forces Americas/Europe/Pacific) alongside APO/FPO/DPO
  as the city.
- US addresses only; no Canadian postal code handling.

## Tests

```
npm test
```

Runs the `node:test` suite in `src/address.test.ts` against the compiled
output (`tsc` first, then `node --test dist`). No test framework beyond
what Node and TypeScript already ship.

## Requirements

Standard library only, no runtime dependencies. You need a TypeScript
compiler available to build (`npx tsc`, or a global install) - it's a
build tool, not a project dependency.

## License

MIT
