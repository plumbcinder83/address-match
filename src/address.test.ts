import { test } from "node:test";
import assert from "node:assert/strict";
import { parseAddress, formatAddress } from "./address.js";

test("full three-part address with standard abbreviations", () => {
  const a = parseAddress("123 Main St, Springfield, IL 62704");
  assert.equal(a.houseNumber, "123");
  assert.equal(a.street, "MAIN ST");
  assert.equal(a.unit, null);
  assert.equal(a.city, "SPRINGFIELD");
  assert.equal(a.state, "IL");
  assert.equal(a.zip, "62704");
});

test("spelled-out suffix and state name normalize the same as their abbreviations", () => {
  const a = parseAddress("123 main street, springfield, illinois 62704");
  assert.equal(a.street, "MAIN ST");
  assert.equal(a.city, "SPRINGFIELD");
  assert.equal(a.state, "IL");
});

test("trailing directional abbreviates the same whether spelled out or not", () => {
  const a = parseAddress("1600 Pennsylvania Ave NW, Washington, DC 20500");
  assert.equal(a.street, "PENNSYLVANIA AVE NW");
  const b = parseAddress("1600 Pennsylvania Avenue Northwest, Washington, DC 20500");
  assert.equal(b.street, "PENNSYLVANIA AVE NW");
});

test("ZIP+4 is captured in full", () => {
  const a = parseAddress("123 Main St, Springfield, IL 62704-1111");
  assert.equal(a.zip, "62704-1111");
});

test("two-letter state code is accepted directly", () => {
  const a = parseAddress("123 Main St, Springfield, il 62704");
  assert.equal(a.state, "IL");
});

test("two-word state name is preferred over a one-word partial match", () => {
  const a = parseAddress("1 Broadway, Albany, New York 12207");
  assert.equal(a.state, "NY");
  assert.equal(a.city, "ALBANY");
});

test("unit designator word is parsed out of the street line", () => {
  const a = parseAddress("123 Main St Apt 4B, Springfield, IL 62704");
  assert.equal(a.street, "MAIN ST");
  assert.equal(a.unit, "APT 4B");
});

test("hash-prefixed unit with no designator word", () => {
  const a = parseAddress("123 Main St #4B, Springfield, IL 62704");
  assert.equal(a.street, "MAIN ST");
  assert.equal(a.unit, "#4B");
});

test("house number with a trailing letter is uppercased and kept whole", () => {
  const a = parseAddress("123b Main St, Springfield, IL 62704");
  assert.equal(a.houseNumber, "123B");
});

test("comma-free input cannot separate city from street, per documented limitation", () => {
  const a = parseAddress("123 Main St Springfield IL 62704");
  assert.equal(a.city, null);
  assert.equal(a.state, "IL");
  assert.equal(a.zip, "62704");
  assert.equal(a.street, "MAIN ST SPRINGFIELD");
});

test("no state or zip present leaves those fields null and remainder as street", () => {
  const a = parseAddress("123 Main St");
  assert.equal(a.houseNumber, "123");
  assert.equal(a.street, "MAIN ST");
  assert.equal(a.state, null);
  assert.equal(a.zip, null);
});

test("empty input produces all-null fields without throwing", () => {
  const a = parseAddress("");
  assert.equal(a.houseNumber, null);
  assert.equal(a.street, null);
  assert.equal(a.city, null);
  assert.equal(a.state, null);
  assert.equal(a.zip, null);
});

test("formatAddress round-trips a parsed address into the two-line USPS layout", () => {
  const a = parseAddress("123 Main St, Springfield, IL 62704");
  assert.equal(formatAddress(a), "123 MAIN ST\nSPRINGFIELD, IL 62704");
});

test("formatAddress omits a blank street line when there is no street data", () => {
  const a = parseAddress("IL 62704");
  assert.equal(a.street, null);
  assert.equal(formatAddress(a), "IL 62704");
});
