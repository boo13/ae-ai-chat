Build this 7-layer editorial three-word kinetic-typography slam in a new composition. Respond with an AI Action and run it immediately.

Create a `1920x1080`, `8`-second, `30` fps comp named `Kinetic Typography Slam`; alternating side entries, impact flashes, and restrained ember accents make the stacked message feel forceful without visual clutter.

Create these layers in top-to-bottom order:

For every word, use only two Position keyframes: an off-screen start and its landing position `0.45s` later. Ease only the second keyframe with `setTemporalEaseAtKey`, using one `KeyframeEase(0, 80)` per incoming and outgoing side because Position is spatial. Enable Motion Blur on all three word layers.

1. IMPACT FLASH
- Type: Shape Layer
- Blend Mode: Add
- Contents: one group built with `ADBE Vector Group`
  - Rectangle Path (`ADBE Vector Shape - Rect`): Size `[1920, 1080]`
  - Fill (`ADBE Vector Graphic - Fill`): Color `[1.000, 1.000, 1.000, 1]`, Opacity `100%`
- Transform:
  - Position: `[960, 540]`
  - Opacity expression: `var impacts = [0.45, 0.95, 1.45]; var o = 0; var i; for (i = 0; i < impacts.length; i++) { var t = time - impacts[i]; if (t > 0) o = Math.max(o, 55 * Math.exp(-22 * t)); } o;`
- Each impact spikes near `55%` for roughly two frames, then decays quickly.

2. IMPACT SHAKE
- Type: Adjustment Layer
- Blend Mode: Normal
- Effects in order:
  - Transform
    - Position expression: `var impacts = [0.45, 0.95, 1.45]; var v = [0, 0]; var i; for (i = 0; i < impacts.length; i++) { var t = time - impacts[i]; if (t > 0) { var a = 16 * Math.exp(-9 * t); v = [v[0] + a * Math.sin(47 * t), v[1] + a * Math.cos(31 * t)]; } } value + v;`
    - Uniform Scale: `On`
    - Scale Height keyframes: `100` at `2.20s`, `103` at `8.00s`
- The Transform effect applies the three decaying impacts, then adds an almost imperceptible slow push after the slam; everything holds compositionally after `2.20s`.

3. STOP
- Type: Text Layer
- Text: `STOP`
- Font: `HelveticaNeue-CondensedBlack` (fall back to `Arial-BoldMT` if unavailable)
- Font Size: `260`
- TextDocument setup: set Apply Fill to `On`, Fill Color to RGB `[1.000, 1.000, 1.000, 1]`, Justification to `Left`, then reset Anchor Point to `[0, 0]`
- Transform:
  - Position keyframes: `[-1600, 330]` at `0.00s`, `[240, 330]` at `0.45s`
  - Scale expression: `var t = time - 0.45; var s = (t > 0) ? 100 + 12 * Math.exp(-6 * t) * Math.cos(16 * t) : 104; [s, s];`

4. MAKING
- Type: Text Layer
- Text: `MAKING`
- Font: `HelveticaNeue-CondensedBlack` (fall back to `Arial-BoldMT` if unavailable)
- Font Size: `260`
- TextDocument setup: set Apply Fill to `On`, Fill Color to RGB `[1.000, 1.000, 1.000, 1]`, Justification to `Left`, then reset Anchor Point to `[0, 0]`
- Transform:
  - Position keyframes: `[2100, 620]` at `0.50s`, `[240, 620]` at `0.95s`
  - Scale expression: `var t = time - 0.95; var s = (t > 0) ? 100 + 12 * Math.exp(-6 * t) * Math.cos(16 * t) : 104; [s, s];`

5. STATIC
- Type: Text Layer
- Text: `STATIC`
- Font: `HelveticaNeue-CondensedBlack` (fall back to `Arial-BoldMT` if unavailable)
- Font Size: `260`
- TextDocument setup: set Apply Fill to `On`, Fill Color to RGB `[0.784, 0.290, 0.141, 1]`, Justification to `Left`, then reset Anchor Point to `[0, 0]`
- Transform:
  - Position keyframes: `[-1600, 910]` at `1.00s`, `[240, 910]` at `1.45s`
  - Scale expression: `var t = time - 1.45; var s = (t > 0) ? 100 + 12 * Math.exp(-6 * t) * Math.cos(16 * t) : 104; [s, s];`

6. UNDERLINE
- Type: Shape Layer
- Blend Mode: Normal
- Contents: one group built with `ADBE Vector Group`
  - Rectangle Path (`ADBE Vector Shape - Rect`): Size `[1440, 14]`
  - Fill (`ADBE Vector Graphic - Fill`): Color `[0.784, 0.290, 0.141, 1]`, Opacity `100%`
- Transform:
  - Position: `[240, 1000]`
  - Anchor Point: `[-720, 0]`
  - Scale keyframes: `[0, 100]` at `1.50s`, `[100, 100]` at `2.00s`
- Draw left-to-right. Scale is not spatial and its value is 2-D, so pass two `KeyframeEase` objects per incoming and outgoing array when easing these keyframes.

7. INK BACKGROUND
- Type: Solid Layer
- Solid Color: `#0B0B0D`
- Size: full comp
- Blend Mode: Normal
- Effects in order:
  - 4-Color Gradient: Point 1 `[0, 0]`, Color 1 `[0.020, 0.022, 0.026, 1]`, Point 2 `[1920, 0]`, Color 2 `[0.055, 0.058, 0.065, 1]`, Point 3 `[0, 1080]`, Color 3 `[0.028, 0.030, 0.036, 1]`, Point 4 `[1920, 1080]`, Color 4 `[0.065, 0.067, 0.070, 1]`, Blend `85`, Jitter `2`
  - Noise: Amount of Noise `3%`

Build notes:

- Set each shape/effect property's values immediately after its `addProperty` call; stale sibling references throw "Object is invalid".
- When easing keyframes, pass one `KeyframeEase` per value dimension; spatial properties (Position, Anchor Point) take exactly one per side (`prop.isSpatial`).
- ES3 only (`var`, no arrows/template literals), ASCII only, one `app.beginUndoGroup`/`app.endUndoGroup` around all changes.
