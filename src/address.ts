// US postal address parsing and normalization.
//
// Scope is deliberately narrow: enough of USPS Publication 28 (the street
// suffix and directional abbreviation tables) to make two differently
// formatted address strings comparable. It is not a CASS-certified
// validator and does not check that an address actually exists.

export interface ParsedAddress {
  raw: string;
  houseNumber: string | null;
  street: string | null;
  unit: string | null;
  city: string | null;
  state: string | null;
  zip: string | null;
}

const STREET_SUFFIXES: Record<string, string> = {
  street: "ST", st: "ST",
  avenue: "AVE", ave: "AVE",
  boulevard: "BLVD", blvd: "BLVD",
  drive: "DR", dr: "DR",
  lane: "LN", ln: "LN",
  road: "RD", rd: "RD",
  court: "CT", ct: "CT",
  place: "PL", pl: "PL",
  circle: "CIR", cir: "CIR",
  terrace: "TER", ter: "TER",
  parkway: "PKWY", pkwy: "PKWY",
  highway: "HWY", hwy: "HWY",
  trail: "TRL", trl: "TRL",
  way: "WAY",
  square: "SQ", sq: "SQ",
  loop: "LOOP",
  crossing: "XING", xing: "XING",
  alley: "ALY", aly: "ALY",
  point: "PT", pt: "PT",
};

const DIRECTIONALS: Record<string, string> = {
  north: "N", n: "N",
  south: "S", s: "S",
  east: "E", e: "E",
  west: "W", w: "W",
  northeast: "NE", ne: "NE",
  northwest: "NW", nw: "NW",
  southeast: "SE", se: "SE",
  southwest: "SW", sw: "SW",
};

const UNIT_DESIGNATORS: Record<string, string> = {
  apartment: "APT", apt: "APT",
  suite: "STE", ste: "STE",
  unit: "UNIT",
  building: "BLDG", bldg: "BLDG",
  floor: "FL", fl: "FL",
  room: "RM", rm: "RM",
};

const STATE_NAMES: Record<string, string> = {
  alabama: "AL", alaska: "AK", arizona: "AZ", arkansas: "AR", california: "CA",
  colorado: "CO", connecticut: "CT", delaware: "DE", florida: "FL", georgia: "GA",
  hawaii: "HI", idaho: "ID", illinois: "IL", indiana: "IN", iowa: "IA",
  kansas: "KS", kentucky: "KY", louisiana: "LA", maine: "ME", maryland: "MD",
  massachusetts: "MA", michigan: "MI", minnesota: "MN", mississippi: "MS", missouri: "MO",
  montana: "MT", nebraska: "NE", nevada: "NV", "new hampshire": "NH", "new jersey": "NJ",
  "new mexico": "NM", "new york": "NY", "north carolina": "NC", "north dakota": "ND", ohio: "OH",
  oklahoma: "OK", oregon: "OR", pennsylvania: "PA", "rhode island": "RI", "south carolina": "SC",
  "south dakota": "SD", tennessee: "TN", texas: "TX", utah: "UT", vermont: "VT",
  virginia: "VA", washington: "WA", "west virginia": "WV", wisconsin: "WI", wyoming: "WY",
  "district of columbia": "DC",
};

const VALID_STATE_CODES = new Set(Object.values(STATE_NAMES));

function normalizeWhitespace(s: string): string {
  return s.replace(/\s+/g, " ").trim();
}

function stripPunctuation(s: string): string {
  return s.replace(/[.,]/g, "");
}

function mapWord(word: string, table: Record<string, string>): string | null {
  const key = word.toLowerCase();
  return key in table ? table[key] : null;
}

function normalizeStateToken(token: string): string | null {
  const clean = stripPunctuation(token).toLowerCase();
  if (clean.length === 2 && VALID_STATE_CODES.has(clean.toUpperCase())) {
    return clean.toUpperCase();
  }
  return clean in STATE_NAMES ? STATE_NAMES[clean] : null;
}

// Pulls "STATE ZIP" off the end of a fragment, trying a two-word state
// name ("new york") before a one-word name or two-letter code.
function extractStateZip(text: string): { state: string | null; zip: string | null; remainder: string } {
  const tokens = stripPunctuation(text).split(/\s+/).filter(Boolean);
  if (tokens.length === 0) return { state: null, zip: null, remainder: "" };

  const zipMatch = tokens[tokens.length - 1].match(/^(\d{5})(-\d{4})?$/);
  if (!zipMatch) return { state: null, zip: null, remainder: tokens.join(" ") };
  const zip = zipMatch[2] ? `${zipMatch[1]}${zipMatch[2]}` : zipMatch[1];
  const rest = tokens.slice(0, -1);

  for (const wordCount of [2, 1]) {
    if (rest.length < wordCount) continue;
    const candidate = rest.slice(rest.length - wordCount).join(" ");
    const state = normalizeStateToken(candidate);
    if (state) return { state, zip, remainder: rest.slice(0, rest.length - wordCount).join(" ") };
  }
  return { state: null, zip, remainder: rest.join(" ") };
}

// Splits "123 Main St Apt 4B" style text into number/name/unit.
function parseStreetLine(line: string): { houseNumber: string | null; street: string | null; unit: string | null } {
  const tokens = stripPunctuation(line).split(" ").filter(Boolean);
  if (tokens.length === 0) return { houseNumber: null, street: null, unit: null };

  let houseNumber: string | null = null;
  let start = 0;
  if (/^\d+[A-Za-z]?$/.test(tokens[0])) {
    houseNumber = tokens[0].toUpperCase();
    start = 1;
  }

  let unit: string | null = null;
  let end = tokens.length;
  for (let i = start; i < tokens.length - 1; i++) {
    const designator = mapWord(tokens[i], UNIT_DESIGNATORS);
    if (designator) {
      unit = `${designator} ${tokens.slice(i + 1).join(" ").toUpperCase()}`;
      end = i;
      break;
    }
  }
  if (!unit && end > start && tokens[end - 1].startsWith("#")) {
    unit = tokens[end - 1].toUpperCase();
    end -= 1;
  }

  const streetTokens = tokens.slice(start, end).map((token, i, arr) => {
    const isLast = i === arr.length - 1;
    const dir = mapWord(token, DIRECTIONALS);
    if (dir && (isLast || i === 0)) return dir;
    const suffix = isLast ? mapWord(token, STREET_SUFFIXES) : null;
    return suffix ?? token.toUpperCase();
  });

  return { houseNumber, street: streetTokens.length ? streetTokens.join(" ") : null, unit };
}

export function parseAddress(input: string): ParsedAddress {
  const cleaned = normalizeWhitespace(input);
  const parts = cleaned.split(",").map((p) => p.trim()).filter(Boolean);

  let streetLine: string;
  let city: string | null = null;
  let state: string | null;
  let zip: string | null;

  if (parts.length >= 3) {
    streetLine = parts[0];
    city = parts[1];
    ({ state, zip } = extractStateZip(parts.slice(2).join(" ")));
  } else if (parts.length === 2) {
    streetLine = parts[0];
    const extracted = extractStateZip(parts[1]);
    state = extracted.state;
    zip = extracted.zip;
    city = extracted.remainder || null;
  } else {
    // No commas: city can't reliably be told apart from the street name,
    // so everything before state/zip is treated as the street line.
    const extracted = extractStateZip(cleaned);
    state = extracted.state;
    zip = extracted.zip;
    streetLine = extracted.remainder;
  }

  const { houseNumber, street, unit } = parseStreetLine(streetLine);

  return {
    raw: input,
    houseNumber,
    street,
    unit,
    city: city ? stripPunctuation(city).toUpperCase() : null,
    state,
    zip,
  };
}

export function formatAddress(a: ParsedAddress): string {
  const lines: string[] = [];
  const streetLine = [a.houseNumber, a.street, a.unit].filter(Boolean).join(" ");
  if (streetLine) lines.push(streetLine);
  const cityStateZip = [a.city, [a.state, a.zip].filter(Boolean).join(" ")].filter(Boolean).join(", ");
  if (cityStateZip) lines.push(cityStateZip);
  return lines.join("\n");
}
