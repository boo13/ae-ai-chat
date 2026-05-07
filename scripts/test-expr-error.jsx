// Bedrock test: verify prop.expressionError populates synchronously
// Run this in AE via File > Scripts > Run Script File...
// Requires: an active composition with at least one layer selected.
// Passes if the ExtendScript console shows PASS for all checks.

var comp = app.project.activeItem;
if (!comp || !(comp instanceof CompItem)) {
    alert("FAIL: No active composition.");
} else if (!comp.selectedLayers.length) {
    alert("FAIL: No layers selected.");
} else {
    var layer = comp.selectedLayers[0];
    var opacityProp = layer.property("ADBE Transform Group").property("ADBE Opacity");
    var results = [];

    // -- Test 1: Good expression should produce no error --
    opacityProp.expression = "wiggle(2, 20)";
    try { opacityProp.valueAtTime(0, false); } catch (e) {}
    if (opacityProp.expressionError === "") {
        results.push("PASS 1: valid expression has no error");
    } else {
        results.push("FAIL 1: valid expression reported error: " + opacityProp.expressionError);
    }

    // -- Test 2: Parse error (extra semicolon) --
    opacityProp.expression = "wiggle(2, 20);;";
    try { opacityProp.valueAtTime(0, false); } catch (e) {}
    if (opacityProp.expressionError !== "") {
        results.push("PASS 2: parse error caught: " + opacityProp.expressionError);
    } else {
        results.push("FAIL 2: parse error NOT caught (expressionError was empty)");
    }

    // -- Test 3: Identifier typo (wggl instead of wiggle) --
    opacityProp.expression = "wggl(2, 30)";
    try { opacityProp.valueAtTime(0, false); } catch (e) {}
    if (opacityProp.expressionError !== "") {
        results.push("PASS 3: identifier typo caught: " + opacityProp.expressionError);
    } else {
        results.push("FAIL 3: identifier typo NOT caught (expressionError was empty) — need alternate strategy");
    }

    // Cleanup: restore a valid expression
    opacityProp.expression = "";

    alert(results.join("\n"));
}
