Build this 6-layer deep-space starfield flythrough in a new composition. Respond with an AI Action and run it immediately.

Create a `1920x1080`, `12`-second, `30` fps comp named `Deep Space Starfield`; three depth-separated star passes, a faint duotone nebula, and a dark vignette create a slow sense of deep parallax.

Create these layers in top-to-bottom order:

1. SPACE VIGNETTE
- Type: Adjustment Layer
- Blend Mode: Normal
- Effects in order:
  - CC Vignette
    - Amount: `58`
    - Angle of View: `55`
    - Center: `[960, 520]`

2. STARS NEAR
- Type: Solid Layer
- Solid Color: `#FFFFFF`
- Size: full comp
- Blend Mode: Add
- Effects in order:
  - CC Star Burst: Grid Spacing `26`, Size `100`, Shading `20`, Scatter `520`, Speed `1.5`, Phase `0`, Blend w. Original `0%`
  - Tint: Map White To `[1.000, 0.970, 0.920, 1]`, Amount to Tint `100%`
  - Glow: Glow Based On `Alpha Channel`, Glow Threshold `45%`, Glow Radius `12`, Glow Intensity `0.8`, Glow Operation `Add`

3. STARS MID
- Type: Solid Layer
- Solid Color: `#FFFFFF`
- Size: full comp
- Blend Mode: Screen
- Transform:
  - Opacity: `80%`
- Effects in order:
  - CC Star Burst: Grid Spacing `14`, Size `52`, Shading `30`, Scatter `380`, Speed `0.6`, Phase `90`, Blend w. Original `0%`
  - Tint: Map White To `[0.820, 0.900, 1.000, 1]`, Amount to Tint `100%`

4. STARS FAR
- Type: Solid Layer
- Solid Color: `#FFFFFF`
- Size: full comp
- Blend Mode: Screen
- Transform:
  - Opacity: `55%`
- Effects in order:
  - CC Star Burst: Grid Spacing `8`, Size `26`, Shading `40`, Scatter `300`, Speed `0.25`, Phase `200`, Blend w. Original `0%`
  - Tint: Map White To `[0.650, 0.750, 0.950, 1]`, Amount to Tint `100%`

5. NEBULA
- Type: Solid Layer
- Solid Color: `#000000`
- Size: full comp
- Blend Mode: Screen
- Transform:
  - Opacity: `32%`
- Effects in order:
  - Fractal Noise
    - Fractal Type: `Cloudy`
    - Noise Type: `Soft Linear`
    - Contrast: `105`
    - Brightness: `-30`
    - Uniform Scaling: `Off`
    - Scale Width: `900`
    - Scale Height: `480`
    - Complexity: `3`
    - Evolution expression: `time * 5`
  - Tint: Map Black To `[0.030, 0.020, 0.100, 1]`, Map White To `[0.160, 0.220, 0.420, 1]`, Amount to Tint `100%`
  - Gaussian Blur: Blurriness `60`, Repeat Edge Pixels `On`

6. DEEP SPACE
- Type: Solid Layer
- Solid Color: `#02030A`
- Size: full comp
- Blend Mode: Normal
- Effects in order:
  - Gradient Ramp: Ramp Shape `Radial Ramp`, Start of Ramp `[960, 500]`, Start Color `[0.020, 0.024, 0.055, 1]`, End of Ramp `[960, 1200]`, End Color `[0.004, 0.005, 0.014, 1]`, Ramp Scatter `3`
  - Noise: Amount of Noise `1.5%`

Build notes:

- Set each shape/effect property's values immediately after its `addProperty` call; stale sibling references throw "Object is invalid".
- When easing keyframes, pass one `KeyframeEase` per value dimension; spatial properties (Position, Anchor Point) take exactly one per side (`prop.isSpatial`).
- ES3 only (`var`, no arrows/template literals), ASCII only, one `app.beginUndoGroup`/`app.endUndoGroup` around all changes.
