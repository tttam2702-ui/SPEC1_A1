// SPDX-License-Identifier: GPL-3.0-or-later
// Static checks for the instructor's submission folder; no browser build is needed.
import { readFileSync, readdirSync } from "node:fs";
import { parse } from "acorn";

const sourceFiles = readdirSync(".").filter((name) => name.endsWith(".js") && name !== "p5.js");
const functionSizes = [];
let failures = 0;

function assert(condition, message) {
  if (condition) return;
  console.error(message);
  failures++;
}

function visit(node, file, parent = {}) {
  if (!node || typeof node !== "object") return;
  if (/Function|ArrowFunction/.test(node.type)) recordFunction(node, file, parent);
  for (const value of Object.values(node)) {
    if (Array.isArray(value)) value.forEach((child) => visit(child, file, node));
    else if (value && typeof value.type === "string") visit(value, file, node);
  }
}

function recordFunction(node, file, parent) {
  const name = node.id?.name || parent.key?.name || parent.id?.name || "callback";
  const lines =
    node.body.type === "BlockStatement"
      ? Math.max(0, node.body.loc.end.line - node.body.loc.start.line - 1)
      : node.body.loc.end.line - node.body.loc.start.line + 1;
  functionSizes.push({ file, name, lines, line: node.loc.start.line });
}

function checkJavaScript(file) {
  const source = readFileSync(file, "utf8");
  assert(
    source.includes("SPDX-License-Identifier: GPL-3.0-or-later"),
    `${file}: missing licence header`,
  );
  try {
    const tree = parse(source, { ecmaVersion: "latest", sourceType: "module", locations: true });
    visit(tree, file);
  } catch (error) {
    assert(false, `${file}: ${error.message}`);
  }
}

function checkCanvasSize(file, widthName, heightName) {
  const source = readFileSync(file, "utf8");
  assert(new RegExp(`const ${widthName} = 1920;`).test(source), `${file}: expected 1920 width`);
  assert(new RegExp(`const ${heightName} = 1080;`).test(source), `${file}: expected 1080 height`);
}

function checkEntryPoints() {
  for (const file of ["index.html", "offer.html", "challenge.html"]) {
    const html = readFileSync(file, "utf8");
    for (const match of html.matchAll(/(?:src|href)="([^"#?]+)(?:\?[^"#]*)?"/g)) {
      if (/^(https?:|data:)/.test(match[1])) continue;
      try {
        readFileSync(decodeURIComponent(match[1]));
      } catch (_) {
        assert(false, `${file}: missing ${match[1]}`);
      }
    }
  }
}

function reportLengths() {
  const longFunctions = functionSizes.filter((item) => item.lines >= 15);
  for (const item of longFunctions) {
    console.warn(`${item.file}:${item.line} ${item.name}: ${item.lines} body lines`);
  }
  console.log(
    `${functionSizes.length - longFunctions.length}/${functionSizes.length} functions have fewer than 15 body lines.`,
  );
  assert(longFunctions.length === 0, "Split the functions listed above into named helpers.");
}

sourceFiles.forEach(checkJavaScript);
checkJavaScript("scripts/check-code.mjs");
checkCanvasSize("sketch.js", "W", "H");
checkCanvasSize("offer-wheel.js", "OFFER_WIDTH", "OFFER_HEIGHT");
checkCanvasSize("challenge-model.js", "CHALLENGE_WIDTH", "CHALLENGE_HEIGHT");
checkEntryPoints();
reportLengths();
assert(readFileSync("LICENSE", "utf8").includes("Version 3, 29 June 2007"), "GPL v3 text missing");
if (failures) process.exitCode = 1;
else
  console.log(
    `PASS: ${sourceFiles.length} application scripts, entry points, canvas sizes and licence.`,
  );
