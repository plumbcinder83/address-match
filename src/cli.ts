// Minimal ambient declarations so this compiles without @types/node.
declare const process: { argv: string[]; exit: (code: number) => never };
declare const console: { log: (...args: unknown[]) => void; error: (...args: unknown[]) => void };

import { parseAddress, formatAddress } from "./address.js";
import { compareAddresses } from "./match.js";

function usage(): never {
  console.error("usage: address-match <address one> -- <address two>");
  console.error(
    'example: address-match "123 Main St, Springfield, IL 62704" -- "123 main street springfield illinois 62704-1111"'
  );
  process.exit(1);
}

function main(): void {
  const args = process.argv.slice(2);
  const sep = args.indexOf("--");
  if (sep <= 0 || sep === args.length - 1) usage();

  const rawA = args.slice(0, sep).join(" ");
  const rawB = args.slice(sep + 1).join(" ");

  const a = parseAddress(rawA);
  const b = parseAddress(rawB);
  const result = compareAddresses(a, b);

  console.log("Address A:");
  console.log(formatAddress(a));
  console.log("\nAddress B:");
  console.log(formatAddress(b));
  console.log(`\n${result.isMatch ? "MATCH" : "NO MATCH"}`);

  for (const [field, ok] of Object.entries(result.fields)) {
    if (!ok) console.log(`  differs: ${field}`);
  }
}

main();
