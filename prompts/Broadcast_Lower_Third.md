Build this rigged broadcast lower third at the current playhead. Respond with an AI Action and run it immediately.

Use the active comp, or create a `1920x1080`, `10`-second, `30` fps comp named `Broadcast Lower Third` if none is active. Let `t0` be the current comp time. Build one art-directable control rig: only the `Build` slider has keyframes, and every other animation and design value is driven by expressions.

Create these layers in top-to-bottom order. Position `LT CONTROLS` first, then parent every other layer to it with `layer.parent = ctrlLayer`; all positions below are in the null's parent space.

1. LT CONTROLS
- Type: Null created with `comp.layers.addNull(comp.duration)`
- Position: `[140, 855]`
- Add these Expression Controls in this exact order with `ADBE Effect Parade.addProperty(...)`, and rename each effect immediately with `fx.name = "..."`:
  - `Build` (`ADBE Slider Control`): `0` at `t0`, `100` at `t0 + 0.7s`, `100` at `t0 + 4.3s`, `0` at `t0 + 4.9s`
  - `Accent Color` (`ADBE Color Control`): `[0.784, 0.290, 0.141, 1]`
  - `Panel Color` (`ADBE Color Control`): `[0.030, 0.055, 0.090, 1]`
  - `Text Color` (`ADBE Color Control`): `[0.965, 0.975, 0.985, 1]`
  - `Panel Opacity` (`ADBE Slider Control`): `92`
  - `Panel Width` (`ADBE Slider Control`): `820`
  - `Panel Height` (`ADBE Slider Control`): `190`
  - `Corner Roundness` (`ADBE Slider Control`): `22`
  - `Name Size` (`ADBE Slider Control`): `58`
  - `Role Size` (`ADBE Slider Control`): `28`
  - `Role Tracking` (`ADBE Slider Control`): `120`
  - `Line Spacing` (`ADBE Slider Control`): `67`
- Ease all four `Build` keyframes with `setTemporalEaseAtKey` at influence `75`. The slider is 1-D, so pass exactly one `KeyframeEase` per incoming and outgoing side.

2. FONT SETTING
- Type: Guide Text Layer
- Source Text: `Arial-BoldMT` (the PostScript font name; users retype this text to change the rig font)
- Set `layer.guideLayer = true` and turn off its video switch with `layer.enabled = false`
- Position: `[0, 0]`

3. NAME
- Type: Text Layer
- Text: `JORDAN LEE`
- Build-time TextDocument setup: font `Arial-BoldMT`, font size `58`, set `applyFill = true` before Fill Color RGB `[0.965, 0.975, 0.985]`, set `ParagraphJustification.LEFT_JUSTIFY`, then reset Anchor Point to `[0, 0]`
- Position expression: `var b = thisComp.layer("LT CONTROLS").effect("Build")("Slider"); var spacing = thisComp.layer("LT CONTROLS").effect("Line Spacing")("Slider"); var rise = linear(b, 30, 65, 32, -6) + linear(b, 65, 80, 0, 6); [40, -spacing / 2 + 20 + rise];`
- Opacity expression: `var b = thisComp.layer("LT CONTROLS").effect("Build")("Slider"); linear(b, 30, 80, 0, 100);`
- Source Text expression:

```javascript
var fontName = thisComp.layer("FONT SETTING").text.sourceText.toString();
var fontSize = thisComp.layer("LT CONTROLS").effect("Name Size")("Slider");
var c = thisComp.layer("LT CONTROLS").effect("Text Color")("Color");
var style = text.sourceText.getStyleAt(0, 0);
style.setFont(fontName).setFontSize(fontSize).setFillColor([c[0], c[1], c[2]]);
```

4. ROLE
- Type: Text Layer
- Text: `DESIGN DIRECTOR`
- Build-time TextDocument setup: font `Arial-BoldMT`, font size `28`, tracking `120`, set `applyFill = true` before Fill Color RGB `[0.784, 0.290, 0.141]`, set `ParagraphJustification.LEFT_JUSTIFY`, then reset Anchor Point to `[0, 0]`
- Position expression: `var b = thisComp.layer("LT CONTROLS").effect("Build")("Slider"); var spacing = thisComp.layer("LT CONTROLS").effect("Line Spacing")("Slider"); var rise = linear(b, 40, 75, 28, -5) + linear(b, 75, 90, 0, 5); [40, spacing / 2 + 20 + rise];`
- Opacity expression: `var b = thisComp.layer("LT CONTROLS").effect("Build")("Slider"); linear(b, 40, 90, 0, 100);`
- Source Text expression:

```javascript
var fontName = thisComp.layer("FONT SETTING").text.sourceText.toString();
var fontSize = thisComp.layer("LT CONTROLS").effect("Role Size")("Slider");
var tracking = thisComp.layer("LT CONTROLS").effect("Role Tracking")("Slider");
var c = thisComp.layer("LT CONTROLS").effect("Accent Color")("Color");
var style = text.sourceText.getStyleAt(0, 0);
style.setFont(fontName).setFontSize(fontSize).setTracking(tracking).setFillColor([c[0], c[1], c[2]]);
```

5. ACCENT LINE
- Type: Shape Layer
- Contents: one group built with `ADBE Vector Group`
  - Rectangle Path (`ADBE Vector Shape - Rect`)
    - Size expression: `var h = thisComp.layer("LT CONTROLS").effect("Panel Height")("Slider"); [14, h * 0.8];`
  - Fill (`ADBE Vector Graphic - Fill`)
    - Color expression: `var c = thisComp.layer("LT CONTROLS").effect("Accent Color")("Color"); c;`
    - Opacity: `100%`
- Transform:
  - Position: `[14, 0]`
  - Scale expression: `var b = thisComp.layer("LT CONTROLS").effect("Build")("Slider"); var sy = linear(b, 15, 65, 0, 112) + linear(b, 65, 80, 0, -12); [100, sy];`

6. ID BUG
- Type: Shape Layer
- Contents: one group built with `ADBE Vector Group`
  - Ellipse Path (`ADBE Vector Shape - Ellipse`): Size `[92, 92]`
  - Fill (`ADBE Vector Graphic - Fill`)
    - Color expression: `var c = thisComp.layer("LT CONTROLS").effect("Accent Color")("Color"); c;`
    - Opacity: `100%`
- Transform:
  - Position expression: `var w = thisComp.layer("LT CONTROLS").effect("Panel Width")("Slider"); [w - 60, 0];`
  - Scale expression: `var b = thisComp.layer("LT CONTROLS").effect("Build")("Slider"); var s = linear(b, 20, 60, 0, 118) + linear(b, 60, 70, 0, -18); [s, s];`
  - Rotation expression: `var b = thisComp.layer("LT CONTROLS").effect("Build")("Slider"); linear(b, 20, 70, -90, 0);`
- Keep this layer above `GLASS PANEL`; the width-driven position keeps the circle at the panel's right inside edge at any panel width.

7. GLASS PANEL
- Type: Shape Layer
- Contents: one group built with `ADBE Vector Group`
  - Rectangle Path (`ADBE Vector Shape - Rect`)
    - Size expression: `var w = thisComp.layer("LT CONTROLS").effect("Panel Width")("Slider"); var h = thisComp.layer("LT CONTROLS").effect("Panel Height")("Slider"); [w, h];`
    - Roundness expression: `var r = thisComp.layer("LT CONTROLS").effect("Corner Roundness")("Slider"); r;`
  - Fill (`ADBE Vector Graphic - Fill`)
    - Color expression: `var c = thisComp.layer("LT CONTROLS").effect("Panel Color")("Color"); c;`
    - Opacity: `100%`
- Transform:
  - Position expression: `var b = thisComp.layer("LT CONTROLS").effect("Build")("Slider"); var w = thisComp.layer("LT CONTROLS").effect("Panel Width")("Slider"); [w / 2 + linear(b, 0, 70, -(w + 300), 0), 0];`
  - Opacity expression: `var b = thisComp.layer("LT CONTROLS").effect("Build")("Slider"); var o = thisComp.layer("LT CONTROLS").effect("Panel Opacity")("Slider"); linear(b, 0, 45, 0, 100) * (o / 100);`
- Effects in order:
  - Drop Shadow (`ADBE Drop Shadow`)
    - Shadow Color (`ADBE Drop Shadow-0001`): `[0, 0, 0, 1]`
    - Opacity (`ADBE Drop Shadow-0002`): `45%`
    - Direction (`ADBE Drop Shadow-0003`): `135`
    - Distance (`ADBE Drop Shadow-0004`): `18`
    - Softness (`ADBE Drop Shadow-0005`): `36`
    - Shadow Only (`ADBE Drop Shadow-0006`): `Off`
  - CC Light Sweep (`CC Light Sweep`)
    - Center (`CC Light Sweep-0001`) expression: `var b = thisComp.layer("LT CONTROLS").effect("Build")("Slider"); var w = thisComp.layer("LT CONTROLS").effect("Panel Width")("Slider"); [linear(b, 70, 100, -w / 2 - 80, w / 2 + 80), 0];`
    - Direction (`CC Light Sweep-0002`): `25`
    - Shape (`CC Light Sweep-0003`): `Smooth` / enum `2`
    - Width (`CC Light Sweep-0004`): `55`
    - Sweep Intensity (`CC Light Sweep-0005`): `18`
    - Edge Intensity (`CC Light Sweep-0006`): `35`
    - Edge Thickness (`CC Light Sweep-0007`): `4`
    - Light Color (`CC Light Sweep-0008`): `[0.85, 0.95, 1.0, 1]`

Build notes:

- Do not create a separate panel-shadow layer; the Drop Shadow effect is the only shadow.
- Create all layers before looking them up by name. Adding layers shifts indices, so assign parents and configure named layers only after layer creation is complete.
- Set every shape/effect property's value or expression immediately after its `addProperty` call; stale sibling references throw "Object is invalid".
- Add controls with `ADBE Slider Control` and `ADBE Color Control`, rename each effect exactly, and reference its display name from expressions with `thisComp.layer("LT CONTROLS").effect("Name")("Slider" or "Color")`.
- Use RGBA 4-element arrays for every AE Color property. TextDocument `fillColor` and expression `setFillColor` take RGB values; `setFillColor` channels are normalized `0-1` values `[r, g, b]`.
- When easing keyframes, pass one `KeyframeEase` per value dimension; spatial properties take exactly one per side, and the 1-D `Build` slider takes exactly one per side.
- The two Source Text style expressions require the modern JavaScript expressions engine so `getStyleAt`, `setFont`, `setFontSize`, `setTracking`, and `setFillColor` are available. Every other expression uses legacy-compatible `var` syntax and still works on the legacy expression engine.
- Percent-styled scripting properties do not all share a storage range. Use normalized `0-1` fractions whenever the verified property uses a normalized range; do not blindly write a UI percent as `0-100`.
- The script itself must be ES3 only (`var`, function keyword syntax, string concatenation, no arrows/template literals/destructuring), ASCII only, with one `app.beginUndoGroup`/`app.endUndoGroup` pair around all changes via `try/finally`.
- End with `comp.openInViewer()` only when the script created the comp.
