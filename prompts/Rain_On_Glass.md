Build this 7-layer rain-on-glass blue-hour city scene in a new composition. Respond with an AI Action and run it immediately.

Create a `1920x1080`, `12`-second, `30` fps comp named `Rain On Glass`; cool dusk fading into a sodium-lit horizon separates two rain depths from two softly drifting bokeh fields.

Create these layers in top-to-bottom order:

1. DROPS NEAR
- Type: Solid Layer
- Solid Color: `#000000`
- Size: full comp
- Blend Mode: Screen
- Effects in order:
  - CC Rainfall: Drops `700`, Size `7`, Scene Depth `2000`, Speed `4600`, Wind `-140`, Variation % (Wind) `30%`, Spread `12`, Color `[0.750, 0.860, 1.000, 1]`, Opacity `80%`, Transfer Mode `Lighten`, Composite With Original `Off`, Random Seed `17`
  - Gaussian Blur: Blurriness `1`, Repeat Edge Pixels `On`

2. DROPS FAR
- Type: Solid Layer
- Solid Color: `#000000`
- Size: full comp
- Blend Mode: Screen
- Transform:
  - Opacity: `60%`
- Effects in order:
  - CC Rainfall: Drops `3200`, Size `3`, Scene Depth `5000`, Speed `3200`, Wind `-80`, Variation % (Wind) `45%`, Spread `8`, Color `[0.550, 0.680, 0.950, 1]`, Opacity `45%`, Transfer Mode `Lighten`, Composite With Original `Off`, Random Seed `43`

3. GLASS BLUR
- Type: Adjustment Layer
- Blend Mode: Normal
- Effects in order:
  - Gaussian Blur: Blurriness `9`, Repeat Edge Pixels `On`
  - CC Vignette: Amount `62`, Angle of View `58`, Center `[960, 500]`

4. BOKEH WARM
- Type: Shape Layer
- Blend Mode: Add
- Transform:
  - Position: `[0, 0]`
  - Position expression: `wiggle(0.1, 8)`
  - Opacity: `85%`
  - Opacity expression: `78 + 14 * Math.sin(time * 0.9)`
- Contents: create five ellipse groups, each with `ADBE Vector Group`, `ADBE Vector Shape - Ellipse`, and `ADBE Vector Graphic - Fill`; set every fill Opacity to `70%`
  - Ellipse 1: Size `[300, 300]`, Position `[1500, 700]`, Fill Color `[1.000, 0.550, 0.220, 1]`
  - Ellipse 2: Size `[180, 180]`, Position `[1170, 760]`, Fill Color `[1.000, 0.710, 0.360, 1]`
  - Ellipse 3: Size `[120, 120]`, Position `[340, 780]`, Fill Color `[0.920, 0.420, 0.160, 1]`
  - Ellipse 4: Size `[220, 220]`, Position `[660, 700]`, Fill Color `[1.000, 0.860, 0.620, 1]`
  - Ellipse 5: Size `[90, 90]`, Position `[1780, 740]`, Fill Color `[0.880, 0.270, 0.130, 1]`
- Effects in order:
  - Gaussian Blur: Blurriness `55`, Repeat Edge Pixels `On`
  - Glow: Glow Based On `Alpha Channel`, Glow Threshold `35%`, Glow Radius `80`, Glow Intensity `0.8`, Glow Operation `Add`

5. BOKEH COOL
- Type: Shape Layer
- Blend Mode: Screen
- Transform:
  - Position: `[0, 0]`
  - Position expression: `wiggle(0.07, 6)`
  - Opacity: `65%`
- Contents: create four ellipse groups, each with `ADBE Vector Group`, `ADBE Vector Shape - Ellipse`, and `ADBE Vector Graphic - Fill`; set every fill Opacity to `60%`
  - Ellipse 1: Size `[240, 240]`, Position `[420, 330]`, Fill Color `[0.620, 0.780, 1.000, 1]`
  - Ellipse 2: Size `[130, 130]`, Position `[980, 260]`, Fill Color `[0.550, 0.900, 1.000, 1]`
  - Ellipse 3: Size `[170, 170]`, Position `[1560, 300]`, Fill Color `[0.820, 0.880, 1.000, 1]`
  - Ellipse 4: Size `[80, 80]`, Position `[180, 520]`, Fill Color `[0.350, 0.850, 0.800, 1]`
- Effects in order:
  - Gaussian Blur: Blurriness `48`, Repeat Edge Pixels `On`
  - Glow: Glow Based On `Alpha Channel`, Glow Threshold `35%`, Glow Radius `60`, Glow Intensity `0.7`, Glow Operation `Add`

6. CITY HAZE
- Type: Solid Layer
- Solid Color: `#000000`
- Size: full comp
- Blend Mode: Screen
- Transform:
  - Position: `[960, 760]`
  - Opacity: `26%`
- Effects in order:
  - Fractal Noise: Fractal Type `Cloudy`, Contrast `110`, Brightness `-25`, Uniform Scaling `Off`, Scale Width `1400`, Scale Height `220`, Evolution expression `time * 4`
  - Tint: Map Black To `[0.000, 0.000, 0.000, 1]`, Map White To `[0.780, 0.450, 0.200, 1]`, Amount to Tint `100%`
  - Gaussian Blur: Blurriness `40`, Repeat Edge Pixels `On`
- Keep this glowing city-horizon band low in the frame.

7. DUSK SKY
- Type: Solid Layer
- Solid Color: `#0A1428`
- Size: full comp
- Blend Mode: Normal
- Effects in order:
  - 4-Color Gradient: Point 1 `[0, 0]`, Color 1 `[0.030, 0.055, 0.120, 1]`, Point 2 `[1920, 0]`, Color 2 `[0.045, 0.065, 0.140, 1]`, Point 3 `[0, 1080]`, Color 3 `[0.300, 0.160, 0.080, 1]`, Point 4 `[1920, 1080]`, Color 4 `[0.220, 0.100, 0.060, 1]`, Blend `85`, Jitter `3`
  - Noise: Amount of Noise `2%`

Build notes:

- Set each shape/effect property's values immediately after its `addProperty` call; stale sibling references throw "Object is invalid".
- When easing keyframes, pass one `KeyframeEase` per value dimension; spatial properties (Position, Anchor Point) take exactly one per side (`prop.isSpatial`).
- ES3 only (`var`, no arrows/template literals), ASCII only, one `app.beginUndoGroup`/`app.endUndoGroup` around all changes.
