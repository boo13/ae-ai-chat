Build this 6-layer day-for-night cinematic grade over the active composition. Respond with an AI Action and run it immediately.

Use the active `1920x1080` comp, or create a `10`-second, `30` fps comp if none is active; the stack compresses daylight, cools highlights, adds moon haze, and remains visible even when the starting comp is empty.

Create these new layers in top-to-bottom order, leaving any existing footage below `CLOUD SHADOWS` and `MOON HAZE`, and above `NIGHT SKY BASE`:

1. NIGHT VIGNETTE
- Type: Adjustment Layer
- Blend Mode: Normal
- Effects in order:
  - CC Vignette
    - Amount: `72`
    - Angle of View: `54`
    - Center: `[960, 500]`
    - Pin Highlights: `28`

2. NIGHT COLOR
- Type: Adjustment Layer
- Blend Mode: Normal
- Effects in order:
  - Tint
    - Map Black To: `[0.010, 0.035, 0.090, 1]`
    - Map White To: `[0.310, 0.540, 0.650, 1]`
    - Amount to Tint: `58%`
  - Color Balance (HLS)
    - Hue: `-8`
    - Lightness: `-6`
    - Saturation: `-24`
  - Exposure
    - Exposure: `-0.85`
    - Offset: `-0.015`
    - Gamma Correction: `0.92`

3. NIGHT CONTRAST
- Type: Adjustment Layer
- Blend Mode: Normal
- Effects in order:
  - Brightness & Contrast
    - Brightness: `-8`
    - Contrast: `28`
    - Use Legacy (supports HDR): `Off`
  - Levels
    - Input Black: `0.035`
    - Input White: `0.88`
    - Gamma: `0.82`
    - Output Black: `0.015`
    - Output White: `0.82`

4. CLOUD SHADOWS
- Type: Solid Layer
- Solid Color: `#000000`
- Size: full comp
- Blend Mode: Multiply
- Transform:
  - Opacity: `14%`
- Effects in order:
  - Fractal Noise
    - Fractal Type: `Cloudy`
    - Contrast: `120`
    - Brightness: `10`
    - Uniform Scaling: `Off`
    - Scale Width: `1600`
    - Scale Height: `700`
    - Complexity: `2`
    - Offset Turbulence expression: `var p = value; [p[0] + time * 25, p[1]];`
    - Evolution expression: `time * 3`
  - Gaussian Blur
    - Blurriness: `40`
    - Repeat Edge Pixels: `On`

5. MOON HAZE
- Type: Solid Layer
- Solid Color: `#000000`
- Size: full comp
- Blend Mode: Screen
- Transform:
  - Opacity expression: `var o = 30 + 4 * Math.sin(time * 0.5); o;`
- Effects in order:
  - Gradient Ramp
    - Start of Ramp: `[1500, 180]`
    - Start Color: `[0.420, 0.720, 0.900, 1]`
    - End of Ramp: `[920, 760]`
    - End Color: `[0, 0, 0, 1]`
    - Ramp Shape: `Radial Ramp`
    - Ramp Scatter: `4`
  - Gaussian Blur
    - Blurriness: `85`
    - Repeat Edge Pixels: `On`

6. NIGHT SKY BASE
- Type: Solid Layer
- Solid Color: `#061020`
- Size: full comp
- Place at the bottom of the composition
- Blend Mode: Normal
- Effects in order:
  - Gradient Ramp
    - Start of Ramp: `[960, 0]`
    - Start Color: `[0.015, 0.045, 0.110, 1]`
    - End of Ramp: `[960, 1080]`
    - End Color: `[0.004, 0.010, 0.025, 1]`
    - Ramp Shape: `Linear Ramp`
    - Ramp Scatter: `3`

Build notes:

- Set each shape/effect property's values immediately after its `addProperty` call; stale sibling references throw "Object is invalid".
- When easing keyframes, pass one `KeyframeEase` per value dimension; spatial properties (Position, Anchor Point) take exactly one per side (`prop.isSpatial`).
- ES3 only (`var`, no arrows/template literals), ASCII only, one `app.beginUndoGroup`/`app.endUndoGroup` around all changes.
