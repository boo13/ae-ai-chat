import assert from "node:assert/strict";
import test from "node:test";
import { decodeHtmlEntities } from "../src/js/lib/utils/html-entities";

test("decodes less-than entities", () => {
  assert.equal(decodeHtmlEntities("i &lt; 6"), "i < 6");
});

test("decodes ampersand entities", () => {
  assert.equal(decodeHtmlEntities("a &amp;&amp; b"), "a && b");
});

test("decodes quote entities", () => {
  assert.equal(decodeHtmlEntities("&quot;str&quot;"), '"str"');
});

test("does not double-decode nested entities", () => {
  assert.equal(decodeHtmlEntities("&amp;lt;"), "&lt;");
});

test("passes scripts without entities through byte-identical", () => {
  const script = "for (var i = 0; i < 6; i++) {\r\n  value += i;\r\n}";
  assert.equal(decodeHtmlEntities(script), script);
});
