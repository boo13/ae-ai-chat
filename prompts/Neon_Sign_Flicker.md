Build this 5-layer warm amber back-alley neon sign with synchronized electrical flicker in a new composition. Respond with an AI Action and run it immediately.

Create a `1920x1080`, `10`-second, `30` fps comp named `Neon Sign Flicker`; one restrained amber hue family and a shared seeded flicker make the sign feel like practical neon against a dark brick wall.

Create these layers in top-to-bottom order:

Use the exact `seedRandom(7, false)` seed and `posterizeTime(10)` rate on every glowing layer so all four opacity expressions generate the same random state and flicker in sync; only each layer's base level changes.

1. NEON TUBE
- Type: Text Layer
- Text: `NIGHT OWL`
- Font: `SignPainter-HouseScript` (fall back to `Arial-BoldMT` if unavailable)
- Font Size: `210`
- TextDocument setup: set Apply Fill to `On`, Fill Color to RGB `[1.000, 0.950, 0.870, 1]`, Justification to `Left`, then reset Anchor Point to `[0, 0]`
- Transform:
  - Position: after setting the source text, measure `var r = layer.sourceRectAtTime(0, false);` and set Position to `[960 - r.width / 2 - r.left, 560]`
  - Opacity expression: `seedRandom(7, false); posterizeTime(10); var r = random(); var base = 100; r < 0.06 ? base * 0.25 : (r < 0.14 ? base * 0.80 : base);`
- Effects in order:
  - Glow: Glow Based On `Alpha Channel`, Glow Threshold `25%`, Glow Radius `14`, Glow Intensity `1.6`, Glow Operation `Add`, Glow Colors `A & B Colors`, Color A `[1.000, 0.480, 0.180, 1]`, Color B `[0.780, 0.290, 0.140, 1]`
  - Glow: Glow Based On `Alpha Channel`, Glow Threshold `40%`, Glow Radius `80`, Glow Intensity `0.7`, Glow Operation `Add`

2. NEON HALO
- Type: Text Layer
- Text: `NIGHT OWL`
- Font: `SignPainter-HouseScript` (fall back to `Arial-BoldMT` if unavailable)
- Font Size: `210`
- TextDocument setup: set Apply Fill to `On`, Fill Color to RGB `[1.000, 0.480, 0.180, 1]`, Justification to `Left`, then reset Anchor Point to `[0, 0]`
- Blend Mode: Screen
- Transform:
  - Position: reuse the exact Position computed for `NEON TUBE`
  - Opacity expression: `seedRandom(7, false); posterizeTime(10); var r = random(); var base = 55; r < 0.06 ? base * 0.25 : (r < 0.14 ? base * 0.80 : base);`
- Effects in order:
  - Gaussian Blur: Blurriness `42`, Repeat Edge Pixels `On`

3. SIGN FRAME
- Type: Shape Layer
- Blend Mode: Add
- Transform:
  - Position: `[960, 540]`
  - Opacity expression: `seedRandom(7, false); posterizeTime(10); var r = random(); var base = 85; r < 0.06 ? base * 0.25 : (r < 0.14 ? base * 0.80 : base);`
- Contents: one rounded rectangle group built with `ADBE Vector Group`
  - Rectangle Path (`ADBE Vector Shape - Rect`): Size `[1240, 420]`, Roundness `60`
  - Stroke (`ADBE Vector Graphic - Stroke`): Color `[1.000, 0.480, 0.180, 1]`, Stroke Width `6`, Opacity `100%`
  - Do not add a fill
- Effects in order:
  - Glow: Glow Based On `Alpha Channel`, Glow Threshold `25%`, Glow Radius `30`, Glow Intensity `1.2`, Glow Operation `Add`

4. WALL GLOW
- Type: Solid Layer
- Solid Color: `#000000`
- Size: full comp
- Blend Mode: Screen
- Transform:
  - Opacity expression: `seedRandom(7, false); posterizeTime(10); var r = random(); var base = 30; r < 0.06 ? base * 0.25 : (r < 0.14 ? base * 0.80 : base);`
- Effects in order:
  - Gradient Ramp: Ramp Shape `Radial Ramp`, Start of Ramp `[960, 540]`, Start Color `[0.420, 0.160, 0.050, 1]`, End of Ramp `[960, 1240]`, End Color `[0.000, 0.000, 0.000, 1]`
  - Gaussian Blur: Blurriness `70`, Repeat Edge Pixels `On`

5. BRICK WALL
- Type: Solid Layer
- Solid Color: `#131009`
- Size: full comp
- Blend Mode: Normal
- Effects in order:
  - Fractal Noise: Fractal Type `Basic`, Contrast `120`, Brightness `-18`, Scale `60`, Complexity `4`, Evolution expression `time * 2`
  - Tint: Map Black To `[0.045, 0.032, 0.022, 1]`, Map White To `[0.120, 0.090, 0.060, 1]`, Amount to Tint `100%`
- Keep Fractal Noise fully applied; do not add Gradient Ramp or use Blend w. Original on this layer.

Build notes:

- Set each shape/effect property's values immediately after its `addProperty` call; stale sibling references throw "Object is invalid".
- When easing keyframes, pass one `KeyframeEase` per value dimension; spatial properties (Position, Anchor Point) take exactly one per side (`prop.isSpatial`).
- ES3 only (`var`, no arrows/template literals), ASCII only, one `app.beginUndoGroup`/`app.endUndoGroup` around all changes.
