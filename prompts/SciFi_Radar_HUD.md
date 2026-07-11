Build this animated 6-layer sci-fi radar HUD in a new composition. Respond with an AI Action and run it immediately.

Create a `1920x1080`, `10`-second, `30` fps comp named `SciFi Radar HUD`; radial repeaters, trim-path arcs, a sweeping wedge, and a luminous grid form a complete self-contained interface study.

Create these layers in top-to-bottom order:

1. HUD DATA
- Type: Text Layer
- Text: `SECTOR 07   //   TRACKING ACTIVE`
- Font: `ArialMT`
- Font Size: `28`
- Tracking: `90`
- TextDocument setup: set Apply Fill to `On`, Fill Color to RGB `[0.180, 0.920, 1.000]`, Justification to `Left`, then reset Anchor Point to `[0, 0]`
- Transform:
  - Position: `[120, 985]`
  - Opacity expression: `var f = 82 + 18 * Math.sin(time * 6); f;`
- Effects in order:
  - Glow
    - Glow Based On: `Alpha Channel`
    - Glow Threshold: `30%`
    - Glow Radius: `16`
    - Glow Intensity: `1.2`
    - Glow Operation: `Add`

2. RADAR SWEEP
- Type: Shape Layer
- Blend Mode: Add
- Transform:
  - Position: `[960, 520]`
  - Rotation expression: `time * 72`
  - Opacity: `42%`
- Contents: one group built with `ADBE Vector Group`
  - Path (`ADBE Vector Shape - Group` and `ADBE Vector Shape`): create a closed triangle with vertices `[[0, 0], [0, -360], [155, -325]]`, zero in tangents, and zero out tangents
  - Fill (`ADBE Vector Graphic - Fill`)
    - Color: `[0.080, 0.850, 0.720, 1]`
    - Opacity: `100%`
- Effects in order:
  - Gaussian Blur
    - Blurriness: `18`
    - Repeat Edge Pixels: `On`
  - Glow
    - Glow Based On: `Alpha Channel`
    - Glow Threshold: `20%`
    - Glow Radius: `48`
    - Glow Intensity: `1.2`
    - Glow Operation: `Add`

3. RADIAL TICKS
- Type: Shape Layer
- Blend Mode: Add
- Transform:
  - Position: `[960, 520]`
  - Rotation expression: `time * -9`
- Contents: one group built only with shape match names
  - Rectangle Path (`ADBE Vector Shape - Rect`)
    - Size: `[3, 18]`
    - Position: `[0, -350]`
  - Fill (`ADBE Vector Graphic - Fill`)
    - Color: `[0.180, 0.920, 1.000, 1]`
    - Opacity: `100%`
  - Repeater (`ADBE Vector Filter - Repeater`)
    - Copies: `60`
    - Offset: `0`
    - Transform (`ADBE Vector Repeater Transform`)
      - Position: `[0, 0]`
      - Rotation: `6`
      - Start Opacity: `100%`
      - End Opacity: `45%`
- Effects in order:
  - Glow
    - Glow Based On: `Alpha Channel`
    - Glow Threshold: `35%`
    - Glow Radius: `14`
    - Glow Intensity: `1.1`
    - Glow Operation: `Add`

4. RADAR RINGS
- Type: Shape Layer
- Blend Mode: Add
- Transform:
  - Position: `[960, 520]`
- Contents: create three ellipse groups, each with no fill and a stroke
  - Ring 1: Ellipse Size `[700, 700]`, Stroke Color `[0.180, 0.920, 1.000, 1]`, Stroke Width `3`, Stroke Opacity `75%`
  - Ring 2: Ellipse Size `[470, 470]`, Stroke Color `[0.080, 0.850, 0.720, 1]`, Stroke Width `2`, Stroke Opacity `65%`
  - Ring 3: Ellipse Size `[235, 235]`, Stroke Color `[1.000, 0.420, 0.180, 1]`, Stroke Width `3`, Stroke Opacity `80%`
  - Add Trim Paths (`ADBE Vector Filter - Trim`) to Ring 2 with Start `8%`, End `72%`, and Offset expression `time * -38`
  - Build every group with `ADBE Vector Group`, `ADBE Vector Shape - Ellipse`, and `ADBE Vector Graphic - Stroke`
- Effects in order:
  - Glow
    - Glow Based On: `Alpha Channel`
    - Glow Threshold: `35%`
    - Glow Radius: `20`
    - Glow Intensity: `1.0`
    - Glow Operation: `Add`

5. HUD GRID
- Type: Solid Layer
- Solid Color: `#000000`
- Size: full comp
- Blend Mode: Screen
- Transform:
  - Opacity: `24%`
- Effects in order:
  - Grid
    - Anchor: `[960, 540]`
    - Size From: `Corner Point`
    - Corner: `[1040, 620]`
    - Border: `1.5`
    - Invert Grid: `Off`
    - Color: `[0.040, 0.620, 0.760, 1]`
    - Opacity: `100%`
    - Blending Mode: `Add`
  - Glow
    - Glow Based On: `Color Channels`
    - Glow Threshold: `40%`
    - Glow Radius: `12`
    - Glow Intensity: `0.8`
    - Glow Operation: `Add`

6. HUD BACKGROUND
- Type: Solid Layer
- Solid Color: `#02070D`
- Size: full comp
- Blend Mode: Normal
- Effects in order:
  - Gradient Ramp
    - Start of Ramp: `[960, 520]`
    - Start Color: `[0.020, 0.100, 0.130, 1]`
    - End of Ramp: `[960, 1050]`
    - End Color: `[0.002, 0.008, 0.015, 1]`
    - Ramp Shape: `Radial Ramp`
    - Ramp Scatter: `3`
  - Noise
    - Amount of Noise: `2%`
