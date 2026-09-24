"use strict";

// WCAG 2.2 AAA: text 7:1 (1.4.6), the border 3:1 (1.4.11), each against the
// indicator's own background. See docs/design.md.

const { describe, it } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const css = fs.readFileSync(
  path.join(
    __dirname,
    "../ui/mods/com.pa.quitch.lobbyportcheck/shared/port_check.css"
  ),
  "utf8"
);

function expand(hex) {
  const digits = hex.slice(1);
  return digits.length === 3
    ? digits
        .split("")
        .map((d) => d + d)
        .join("")
    : digits;
}

function luminance(hex) {
  const digits = expand(hex);
  const [r, g, b] = [0, 2, 4].map((i) => {
    const v = parseInt(digits.slice(i, i + 2), 16) / 255;
    return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function ratio(a, b) {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}

function values(property) {
  const pattern = new RegExp(
    "(?:^|[;{\\s])" + property + ":\\s*(?:1px solid )?(#[0-9a-f]{3,6})",
    "gi"
  );
  return [...css.matchAll(pattern)].map((m) => m[1]);
}

describe("indicator contrast", () => {
  const backgrounds = values("background");

  it("draws exactly one solid background", () => {
    assert.equal(backgrounds.length, 1);
  });

  it("gives every text colour at least 7:1", () => {
    const colours = values("color");
    assert.equal(colours.length >= 4, true);
    for (const colour of colours) {
      const r = ratio(colour, backgrounds[0]);
      assert.equal(r >= 7, true, colour + " is " + r.toFixed(2) + ":1");
    }
  });

  it("gives the border at least 3:1", () => {
    const borders = values("border");
    assert.equal(borders.length, 1);
    const r = ratio(borders[0], backgrounds[0]);
    assert.equal(r >= 3, true, borders[0] + " is " + r.toFixed(2) + ":1");
  });
});
