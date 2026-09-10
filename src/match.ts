import { parseAddress, ParsedAddress } from "./address.js";

export interface MatchResult {
  isMatch: boolean;
  fields: {
    houseNumber: boolean;
    street: boolean;
    unit: boolean;
    city: boolean;
    state: boolean;
    zip: boolean;
  };
}

function fieldsEqual(a: string | null, b: string | null): boolean {
  return a === b;
}

// ZIP+4 is treated as compatible with its 5-digit prefix: "62704-1234"
// and "62704" can describe the same delivery point at different precision.
function zipCompatible(a: string | null, b: string | null): boolean {
  if (a === null || b === null) return a === b;
  return a.slice(0, 5) === b.slice(0, 5);
}

export function compareAddresses(a: ParsedAddress, b: ParsedAddress): MatchResult {
  const fields = {
    houseNumber: fieldsEqual(a.houseNumber, b.houseNumber),
    street: fieldsEqual(a.street, b.street),
    unit: fieldsEqual(a.unit, b.unit),
    city: fieldsEqual(a.city, b.city),
    state: fieldsEqual(a.state, b.state),
    zip: zipCompatible(a.zip, b.zip),
  };

  // City is left out of the pass/fail decision on purpose: it is often a
  // ZIP-derived alias (e.g. a neighborhood name vs. the official city),
  // so a mismatch there alone shouldn't override a solid house/street/zip
  // match. It is still reported in `fields` for the caller to inspect.
  const isMatch = fields.houseNumber && fields.street && fields.unit && fields.state && fields.zip;

  return { isMatch, fields };
}

export function addressesMatch(rawA: string, rawB: string): MatchResult {
  return compareAddresses(parseAddress(rawA), parseAddress(rawB));
}
