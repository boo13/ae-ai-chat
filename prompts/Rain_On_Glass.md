Build this 8-layer rain-on-glass blue-hour city scene in a new composition. Respond with an AI Action and run it immediately.

Create a `1920x1080`, `12`-second, `30` fps comp named `Rain On Glass`; sharp, specular droplets cling to the window and creep downward while soft warm and cool city bokeh glows behind the glass.

Create these layers in top-to-bottom order:

1. DROPLETS
- Type: Solid Layer
- Solid Color: `#000000`
- Size: full comp
- Blend Mode: Screen
- Transform:
  - Opacity: `75%`
- Effects in order:
  - CC Mr. Mercury
    - Radius X: `920`
    - Radius Y: `560`
    - Producer: `[960, 540]`
    - Animation: `Direction Normalized`
    - Direction: `180`
    - Velocity: `0.14`
    - Birth Rate: `0.35`
    - Longevity (sec): `6`
    - Gravity: `0.02` (keep gravity near zero -- higher values pool merged blobs at the frame bottom over a 12s comp)
    - Resistance: `0`
    - Blob Influence: `0.5`
    - Influence Map: `Blob in & out`
    - Blob Birth Size: `0.18`
    - Blob Death Size: `0.42`
    - Using: `Effect Light`
    - Light Intensity: `170`
    - Light Color: `[0.820, 0.900, 1.000, 1]`

2. RUN STREAKS
- Type: Solid Layer
- Solid Color: `#000000`
- Size: full comp
- Blend Mode: Screen
- Transform:
  - Opacity: `55%`
- Effects in order:
  - CC Rainfall
    - Drops: `260`
    - Size: `11`
    - Scene Depth: `1800`
    - Speed: `420`
    - Wind: `-16`
    - Variation % (Wind): `18%`
    - Spread: `4`
    - Color: `[0.680, 0.800, 0.950, 1]`
    - Opacity: `42%`
    - Transfer Mode: `Lighten`
    - Composite With Original: `Off`
    - Appearance: `Refracting`
    - Random Seed: `29`
  - Gaussian Blur
    - Blurriness: `2.5`
    - Blur Dimensions: `Vertical`
    - Repeat Edge Pixels: `On`

3. CONDENSATION
- Type: Solid Layer
- Solid Color: `#000000`
- Size: full comp
- Blend Mode: Screen
- Transform:
  - Opacity: `10%`
- Effects in order:
  - Fractal Noise
    - Fractal Type: `Cloudy`
    - Noise Type: `Soft Linear`
    - Contrast: `65`
    - Brightness: `-22`
    - Uniform Scaling: `Off`
    - Scale Width: `900`
    - Scale Height: `520`
    - Complexity: `2`
    - Evolution expression: `time * 2`
  - Gaussian Blur
    - Blurriness: `28`
    - Repeat Edge Pixels: `On`
  - CC Vignette
    - Amount: `-55`
    - Angle of View: `68`
    - Center: `[960, 540]`

4. GLASS BLUR
- Type: Adjustment Layer
- Blend Mode: Normal
- Effects in order:
  - Gaussian Blur
    - Blurriness: `11`
    - Repeat Edge Pixels: `On`
  - CC Vignette
    - Amount: `62`
    - Angle of View: `58`
    - Center: `[960, 500]`

5. BOKEH WARM
- Type: Shape Layer
- Blend Mode: Add
- Transform:
  - Position: `[0, 0]`
  - Position expression: `wiggle(0.1, 8)`
  - Opacity: `85%`
  - Opacity expression: `78 + 14 * Math.sin(time * 0.9)`
- Contents: create five ellipse groups, each built with `ADBE Vector Group`, `ADBE Vector Shape - Ellipse`, and `ADBE Vector Graphic - Fill`; leave the layer Position at `[0, 0]` and use these group-local ellipse values
  - Ellipse 1: Ellipse Size `[300, 300]`, Ellipse Position `[1500, 700]`, Fill Color `[1.000, 0.550, 0.220, 1]`, Fill Opacity `70%`
  - Ellipse 2: Ellipse Size `[180, 180]`, Ellipse Position `[1170, 760]`, Fill Color `[1.000, 0.710, 0.360, 1]`, Fill Opacity `70%`
  - Ellipse 3: Ellipse Size `[120, 120]`, Ellipse Position `[340, 780]`, Fill Color `[0.920, 0.420, 0.160, 1]`, Fill Opacity `70%`
  - Ellipse 4: Ellipse Size `[220, 220]`, Ellipse Position `[660, 700]`, Fill Color `[1.000, 0.860, 0.620, 1]`, Fill Opacity `70%`
  - Ellipse 5: Ellipse Size `[90, 90]`, Ellipse Position `[1780, 740]`, Fill Color `[0.880, 0.270, 0.130, 1]`, Fill Opacity `70%`
- Effects in order:
  - Gaussian Blur
    - Blurriness: `55`
    - Repeat Edge Pixels: `On`
  - Glow
    - Glow Based On: `Alpha Channel`
    - Glow Threshold: `89` (stored 0-255; this is the UI's 35% -- multiply UI percent by 2.55)
    - Glow Radius: `80`
    - Glow Intensity: `0.8`
    - Glow Operation: `Add`

6. BOKEH COOL
- Type: Shape Layer
- Blend Mode: Screen
- Transform:
  - Position: `[0, 0]`
  - Position expression: `wiggle(0.07, 6)`
  - Opacity: `65%`
- Contents: create four ellipse groups, each built with `ADBE Vector Group`, `ADBE Vector Shape - Ellipse`, and `ADBE Vector Graphic - Fill`; leave the layer Position at `[0, 0]` and use these group-local ellipse values
  - Ellipse 1: Ellipse Size `[240, 240]`, Ellipse Position `[420, 330]`, Fill Color `[0.620, 0.780, 1.000, 1]`, Fill Opacity `60%`
  - Ellipse 2: Ellipse Size `[130, 130]`, Ellipse Position `[980, 260]`, Fill Color `[0.550, 0.900, 1.000, 1]`, Fill Opacity `60%`
  - Ellipse 3: Ellipse Size `[170, 170]`, Ellipse Position `[1560, 300]`, Fill Color `[0.820, 0.880, 1.000, 1]`, Fill Opacity `60%`
  - Ellipse 4: Ellipse Size `[80, 80]`, Ellipse Position `[180, 520]`, Fill Color `[0.350, 0.850, 0.800, 1]`, Fill Opacity `60%`
- Effects in order:
  - Gaussian Blur
    - Blurriness: `48`
    - Repeat Edge Pixels: `On`
  - Glow
    - Glow Based On: `Alpha Channel`
    - Glow Threshold: `89` (stored 0-255; this is the UI's 35% -- multiply UI percent by 2.55)
    - Glow Radius: `60`
    - Glow Intensity: `0.7`
    - Glow Operation: `Add`

7. CITY HAZE
- Type: Solid Layer
- Solid Color: `#000000`
- Size: full comp
- Blend Mode: Screen
- Transform:
  - Position: `[960, 760]`
  - Opacity: `20%`
- Effects in order:
  - Fractal Noise
    - Fractal Type: `Cloudy`
    - Contrast: `110`
    - Brightness: `-25`
    - Uniform Scaling: `Off`
    - Scale Width: `1400`
    - Scale Height: `220`
    - Evolution expression: `time * 4`
  - Tint
    - Map Black To: `[0.000, 0.000, 0.000, 1]`
    - Map White To: `[0.780, 0.450, 0.200, 1]`
    - Amount to Tint: `100%`
  - Gaussian Blur
    - Blurriness: `40`
    - Repeat Edge Pixels: `On`
- Keep this glowing city-horizon band low in the frame.

8. DUSK SKY
- Type: Solid Layer
- Solid Color: `#0A1428`
- Size: full comp
- Blend Mode: Normal
- Effects in order:
  - 4-Color Gradient
    - Point 1: `[0, 0]`
    - Color 1: `[0.030, 0.055, 0.120, 1]`
    - Point 2: `[1920, 0]`
    - Color 2: `[0.045, 0.065, 0.140, 1]`
    - Point 3: `[0, 1080]`
    - Color 3: `[0.300, 0.160, 0.080, 1]`
    - Point 4: `[1920, 1080]`
    - Color 4: `[0.220, 0.100, 0.060, 1]`
    - Blend: `85`
    - Jitter: `3`
  - Noise
    - Amount of Noise: `2%`

Build notes:

- Set each shape/effect property's values immediately after its `addProperty` call; stale sibling references throw "Object is invalid".
- When easing keyframes, pass one `KeyframeEase` per value dimension; spatial properties (Position, Anchor Point) take exactly one per side (`prop.isSpatial`).
- ES3 only (`var`, no arrows/template literals), ASCII only, one `app.beginUndoGroup`/`app.endUndoGroup` around all changes.
