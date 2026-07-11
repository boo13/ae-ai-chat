Build this 5-layer geometric loader as a seamless animated loop in a new composition. Respond with an AI Action and run it immediately.

Create a `1920x1080`, `6`-second, `30` fps comp named `Geometric Loader Loop`; verified Trim Paths and Repeater primitives create a clean motion-system study with no footage or plugins.

Create these layers in top-to-bottom order:

1. PULSE CORE
- Type: Shape Layer
- Blend Mode: Add
- Contents: one group built with `ADBE Vector Group`
  - Ellipse Path (`ADBE Vector Shape - Ellipse`)
    - Size: `[44, 44]`
  - Fill (`ADBE Vector Graphic - Fill`)
    - Color: `[1.000, 0.420, 0.180, 1]`
    - Opacity: `100%`
- Transform:
  - Position: `[960, 540]`
  - Scale expression: `var s = 92 + 8 * Math.sin(time * 2 * Math.PI); [s, s];`
- Effects in order:
  - Glow
    - Glow Based On: `Alpha Channel`
    - Glow Threshold: `20%`
    - Glow Radius: `32`
    - Glow Intensity: `1.8`
    - Glow Operation: `Add`

2. RADIAL TICKS
- Type: Shape Layer
- Blend Mode: Add
- Transform:
  - Position: `[960, 540]`
  - Rotation expression: `time * -45`
- Contents: one group built only with shape match names
  - Rectangle Path (`ADBE Vector Shape - Rect`)
    - Size: `[5, 24]`
    - Position: `[0, -185]`
    - Roundness: `2.5`
  - Fill (`ADBE Vector Graphic - Fill`)
    - Color: `[0.200, 0.900, 1.000, 1]`
    - Opacity: `100%`
  - Repeater (`ADBE Vector Filter - Repeater`)
    - Copies: `24`
    - Offset: `0`
    - Transform (`ADBE Vector Repeater Transform`)
      - Position: `[0, 0]`
      - Rotation: `15`
      - Start Opacity: `100%`
      - End Opacity: `15%`

3. ARC MAIN
- Type: Shape Layer
- Blend Mode: Add
- Transform:
  - Position: `[960, 540]`
- Contents: one group built with `ADBE Vector Group`
  - Ellipse Path (`ADBE Vector Shape - Ellipse`)
    - Size: `[270, 270]`
  - Stroke (`ADBE Vector Graphic - Stroke`)
    - Color: `[0.200, 0.900, 1.000, 1]`
    - Stroke Width: `12`
  - Trim Paths (`ADBE Vector Filter - Trim`)
    - Start: `0%`
    - End keyframes: `8%` at `0.00s`, `82%` at `0.75s`, `8%` at `1.50s`
    - End expression: `numKeys >= 2 ? loopOut("cycle") : value;`
    - Offset expression: `time * 180`
- Effects in order:
  - Glow
    - Glow Based On: `Alpha Channel`
    - Glow Threshold: `25%`
    - Glow Radius: `28`
    - Glow Intensity: `1.4`
    - Glow Operation: `Add`

4. ARC HALO
- Type: Shape Layer
- Blend Mode: Screen
- Transform:
  - Position: `[960, 540]`
- Contents: one group built with `ADBE Vector Group`
  - Ellipse Path (`ADBE Vector Shape - Ellipse`)
    - Size: `[270, 270]`
  - Stroke (`ADBE Vector Graphic - Stroke`)
    - Color: `[0.120, 0.520, 1.000, 1]`
    - Stroke Width: `24`
  - Trim Paths (`ADBE Vector Filter - Trim`)
    - Start: `0%`
    - End keyframes: `8%` at `0.00s`, `82%` at `0.75s`, `8%` at `1.50s`
    - End expression: `numKeys >= 2 ? loopOut("cycle") : value;`
    - Offset expression: `time * 180`
- Effects in order:
  - Gaussian Blur
    - Blurriness: `18`
    - Repeat Edge Pixels: `On`

5. LOADER BACKGROUND
- Type: Solid Layer
- Solid Color: `#071019`
- Size: full comp
- Blend Mode: Normal
- Effects in order:
  - Gradient Ramp
    - Start of Ramp: `[960, 540]`
    - Start Color: `[0.035, 0.100, 0.145, 1]`
    - End of Ramp: `[960, 1050]`
    - End Color: `[0.005, 0.012, 0.022, 1]`
    - Ramp Shape: `Radial Ramp`
    - Ramp Scatter: `3`
