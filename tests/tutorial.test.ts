import assert from "node:assert/strict";
import test from "node:test";
import {
  outlineForHistory,
  parseTutorialResponse,
} from "../src/js/lib/tutorial";

test("passes through responses without a tutorial block", () => {
  assert.deepEqual(parseTutorialResponse("  Plain response.  "), {
    displayText: "Plain response.",
  });
});

test("uses a default title when the tutorial omits one", () => {
  const parsed = parseTutorialResponse("<tutorial><section></section></tutorial>");

  assert.equal(parsed.tutorial?.title, "After Effects Tutorial");
  assert.equal(parsed.displayText, "Tutorial ready: After Effects Tutorial");
});

test("extracts and decodes step scripts before inserting action markers", () => {
  const parsed = parseTutorialResponse(`Summary.
<tutorial title="Camera &amp; Motion">
  <section class="step">
    <h3>Build the rig</h3>
    <step-script label="Create &amp; animate">app.beginUndoGroup(&quot;Rig&quot;);\nvar value = 1 &lt; 2;\napp.endUndoGroup();</step-script>
  </section>
</tutorial>`);
  const tutorial = parsed.tutorial;

  assert.ok(tutorial);
  assert.equal(tutorial.title, "Camera & Motion");
  assert.equal(tutorial.actions.length, 1);
  assert.equal(tutorial.actions[0].index, 0);
  assert.equal(tutorial.actions[0].label, "Create & animate");
  assert.match(tutorial.actions[0].script, /var value = 1 < 2;/);
  assert.match(tutorial.html, /data-tutorial-action="0"/);
  assert.match(tutorial.html, /Create &amp; animate/);
  assert.doesNotMatch(tutorial.html, /beginUndoGroup|var value/);
});

test("retains validation errors for invalid step scripts", () => {
  const parsed = parseTutorialResponse(
    '<tutorial title="Invalid"><section class="step"><h3>Bad syntax</h3><step-script>const x = 1;</step-script></section></tutorial>'
  );

  assert.ok(parsed.tutorial);
  assert.ok(parsed.tutorial.actions[0].validation.errors.length > 0);
  assert.equal(parsed.tutorial.actions[0].validation.errors[0].code, "ES3_LET_CONST");
});

test("parses only the first tutorial and flags multiple blocks", () => {
  const parsed = parseTutorialResponse(
    'Intro<tutorial title="First"><h3>One</h3></tutorial>Middle<tutorial title="Second"><h3>Two</h3></tutorial>End'
  );

  assert.equal(parsed.tutorial?.title, "First");
  assert.equal(parsed.multipleBlocks, true);
  assert.equal(parsed.displayText, "IntroMiddleEnd");
});

test("passes through an unclosed tutorial block", () => {
  const content = 'Summary <tutorial title="Open"><section class="step">';
  assert.deepEqual(parseTutorialResponse(content), { displayText: content });
});

test("parses a tutorial wrapped in an html fence", () => {
  const parsed = parseTutorialResponse(
    '```html\n<tutorial title="Fenced"><section class="step"><h3>Step</h3></section></tutorial>\n```'
  );

  assert.equal(parsed.tutorial?.title, "Fenced");
  assert.equal(parsed.displayText, "Tutorial ready: Fenced");
});

test("leaves ai-action text outside the tutorial untouched", () => {
  const parsed = parseTutorialResponse(
    'Summary<ai-action run="true">var x = 1;</ai-action><tutorial title="Coexist"><h3>Step</h3></tutorial>'
  );

  assert.equal(
    parsed.displayText,
    'Summary<ai-action run="true">var x = 1;</ai-action>'
  );
});

test("builds a hidden history outline from tutorial step headings", () => {
  const parsed = parseTutorialResponse(
    '<tutorial title="Camera Basics"><section class="step"><h3>Frame the shot</h3></section><section class="step"><h3>Add <em>depth</em></h3></section></tutorial>'
  );

  assert.ok(parsed.tutorial);
  assert.equal(
    outlineForHistory(parsed.tutorial),
    "<!--\nTutorial outline: Camera Basics\n1. Frame the shot\n2. Add depth\n-->"
  );
});
