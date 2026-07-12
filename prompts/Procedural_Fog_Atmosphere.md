Build this 8-layer procedural twilight fog scene with drifting fireflies in a new composition. Respond with an AI Action and run it immediately.

Create a `1920x1080`, `12`-second, `30` fps comp named `Procedural Fog Atmosphere`; layered fractal fields, near and far mountain silhouettes, and warm fireflies create readable atmospheric depth and motion.

Create these layers in top-to-bottom order:

1. ATMOSPHERIC VIGNETTE
- Type: Adjustment Layer
- Blend Mode: Normal
- Effects in order:
  - CC Vignette
    - Amount: `62`
    - Angle of View: `58`
    - Center: `[960, 520]`
    - Pin Highlights: `22`

2. FIREFLIES A
- Type: Shape Layer
- Blend Mode: Add
- Transform:
  - Position: `[0, 0]`
  - Position expression: `wiggle(0.22, 26)`
  - Opacity expression: `var o = 55 + 45 * Math.sin(time * 1.3); o;`
- Contents: create four ellipse groups, each built with `ADBE Vector Group`, `ADBE Vector Shape - Ellipse`, and `ADBE Vector Graphic - Fill`; leave the layer Position at `[0, 0]` and use these group-local ellipse values
  - Firefly 1: Ellipse Size `[8, 8]`, Ellipse Position `[520, 760]`, Fill Color `[1.0, 0.76, 0.36, 1]`, Fill Opacity `100%`
  - Firefly 2: Ellipse Size `[6, 6]`, Ellipse Position `[780, 830]`, Fill Color `[1.0, 0.76, 0.36, 1]`, Fill Opacity `100%`
  - Firefly 3: Ellipse Size `[10, 10]`, Ellipse Position `[1180, 790]`, Fill Color `[1.0, 0.76, 0.36, 1]`, Fill Opacity `100%`
  - Firefly 4: Ellipse Size `[7, 7]`, Ellipse Position `[1420, 740]`, Fill Color `[1.0, 0.76, 0.36, 1]`, Fill Opacity `100%`
- Effects in order:
  - Glow
    - Glow Based On: `Alpha Channel`
    - Glow Threshold: `30%`
    - Glow Radius: `16`
    - Glow Intensity: `1.5`
    - Glow Operation: `Add`

3. FIREFLIES B
- Type: Shape Layer
- Blend Mode: Add
- Transform:
  - Position: `[0, 0]`
  - Position expression: `wiggle(0.18, 32)`
  - Opacity expression: `var o = 50 + 50 * Math.sin(time * 1.7 + 2.1); o;`
- Contents: create three ellipse groups, each built with `ADBE Vector Group`, `ADBE Vector Shape - Ellipse`, and `ADBE Vector Graphic - Fill`; leave the layer Position at `[0, 0]` and use these group-local ellipse values
  - Firefly 1: Ellipse Size `[7, 7]`, Ellipse Position `[380, 880]`, Fill Color `[1.0, 0.76, 0.36, 1]`, Fill Opacity `100%`
  - Firefly 2: Ellipse Size `[9, 9]`, Ellipse Position `[980, 900]`, Fill Color `[1.0, 0.76, 0.36, 1]`, Fill Opacity `100%`
  - Firefly 3: Ellipse Size `[6, 6]`, Ellipse Position `[1620, 860]`, Fill Color `[1.0, 0.76, 0.36, 1]`, Fill Opacity `100%`
- Effects in order:
  - Glow
    - Glow Based On: `Alpha Channel`
    - Glow Threshold: `30%`
    - Glow Radius: `16`
    - Glow Intensity: `1.5`
    - Glow Operation: `Add`

4. FOG NEAR
- Type: Solid Layer
- Solid Color: `#000000`
- Size: full comp
- Blend Mode: Screen
- Transform:
  - Opacity: `52%`
- Effects in order:
  - Fractal Noise
    - Fractal Type: `Dynamic`
    - Noise Type: `Soft Linear`
    - Contrast: `145`
    - Brightness: `-28`
    - Uniform Scaling: `Off`
    - Scale Width: `420`
    - Scale Height: `145`
    - Complexity: `4`
    - Offset Turbulence expression: `var p = value; [p[0] + time * 42, p[1] - time * 7];`
    - Evolution expression: `time * 28`
  - Turbulent Displace
    - Displacement: `Turbulent Smoother`
    - Amount: `22`
    - Size: `210`
    - Complexity: `2`
    - Evolution expression: `time * 18`
    - Pinning: `Pin All`
  - Tint
    - Map Black To: `[0.000, 0.010, 0.020, 1]`
    - Map White To: `[0.520, 0.780, 0.820, 1]`
    - Amount to Tint: `100%`
  - Gaussian Blur
    - Blurriness: `24`
    - Repeat Edge Pixels: `On`

5. FOG FAR
- Type: Solid Layer
- Solid Color: `#000000`
- Size: full comp
- Blend Mode: Screen
- Transform:
  - Opacity: `32%`
- Effects in order:
  - Fractal Noise
    - Fractal Type: `Cloudy`
    - Contrast: `120`
    - Brightness: `-18`
    - Uniform Scaling: `Off`
    - Scale Width: `650`
    - Scale Height: `230`
    - Complexity: `3`
    - Offset Turbulence expression: `var p = value; [p[0] - time * 18, p[1] + time * 3];`
    - Evolution expression: `time * 10`
  - Tint
    - Map Black To: `[0.000, 0.000, 0.015, 1]`
    - Map White To: `[0.340, 0.500, 0.650, 1]`
    - Amount to Tint: `100%`
  - Gaussian Blur
    - Blurriness: `48`
    - Repeat Edge Pixels: `On`

6. MOUNTAIN NEAR
- Type: Shape Layer
- Blend Mode: Normal
- Transform:
  - Position: `[0, 0]`
- Contents: one group built with `ADBE Vector Group`
  - Path (`ADBE Vector Shape - Group` and `ADBE Vector Shape`): create a closed polygon with vertices `[[-100, 1080], [-100, 810], [260, 690], [530, 790], [880, 610], [1210, 760], [1540, 640], [2020, 830], [2020, 1080]]`, zero in tangents, and zero out tangents
  - Fill (`ADBE Vector Graphic - Fill`)
    - Color: `[0.018, 0.035, 0.060, 1]`
    - Opacity: `100%`

7. MOUNTAIN FAR
- Type: Shape Layer
- Blend Mode: Normal
- Transform:
  - Position: `[0, 0]`
- Contents: one group built with `ADBE Vector Group`
  - Path (`ADBE Vector Shape - Group` and `ADBE Vector Shape`): create a closed polygon with vertices `[[-100, 1080], [-100, 700], [300, 600], [700, 680], [1100, 560], [1500, 660], [2020, 580], [2020, 1080]]`, zero in tangents, and zero out tangents
  - Fill (`ADBE Vector Graphic - Fill`)
    - Color: `[0.055, 0.085, 0.135, 1]`
    - Opacity: `100%`
- Do not add effects.

8. TWILIGHT SKY
- Type: Solid Layer
- Solid Color: `#11182B`
- Size: full comp
- Blend Mode: Normal
- Effects in order:
  - Gradient Ramp
    - Start of Ramp: `[960, 0]`
    - Start Color: `[0.025, 0.045, 0.110, 1]`
    - End of Ramp: `[960, 1080]`
    - End Color: `[0.280, 0.120, 0.180, 1]`
    - Ramp Shape: `Linear Ramp`
    - Ramp Scatter: `4`

Build notes:

- Set each shape/effect property's values immediately after its `addProperty` call; stale sibling references throw "Object is invalid".
- When easing keyframes, pass one `KeyframeEase` per value dimension; spatial properties (Position, Anchor Point) take exactly one per side (`prop.isSpatial`).
- ES3 only (`var`, no arrows/template literals), ASCII only, one `app.beginUndoGroup`/`app.endUndoGroup` around all changes.
