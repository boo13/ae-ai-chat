Build this punchy 6-layer kinetic-typography title sequence in a new composition. Respond with an AI Action and run it immediately.

Create a `1920x1080`, `8`-second, `30` fps comp named `Kinetic Typography Slam`; this uses opposing motion, a one-frame flash, and crisp graphic accents to make a tutorial-grade title reveal.

Create these layers in top-to-bottom order:

1. IMPACT FLASH
- Type: Shape Layer
- Blend Mode: Add
- Contents: one group built with `ADBE Vector Group`
  - Rectangle Path (`ADBE Vector Shape - Rect`)
    - Size: `[1920, 1080]`
  - Fill (`ADBE Vector Graphic - Fill`)
    - Color: `[1, 1, 1, 1]`
- Transform:
  - Position: `[960, 540]`
  - Opacity keyframes: `0%` at `1.10s`, `70%` at `1.13s`, `0%` at `1.20s`

2. MOVE
- Type: Text Layer
- Text: `MOVE`
- Font: `Arial-BoldMT`
- Font Size: `190`
- TextDocument setup: set Apply Fill to `On`, Fill Color to RGB `[0.957, 0.945, 0.918]`, Justification to `Left`, then reset Anchor Point to `[0, 0]`
- Transform:
  - Position keyframes: `[2050, 600]` at `0.45s`, `[300, 600]` at `1.10s`, `[320, 600]` at `1.32s`
  - Scale keyframes: `[125, 125]` at `0.45s`, `[100, 100]` at `1.10s`
  - Opacity keyframes: `0%` at `0.45s`, `100%` at `0.58s`
- Enable Motion Blur
- Apply temporal Bezier easing to all keyframes, with `75%` incoming influence on the landing keys

3. MAKE IT
- Type: Text Layer
- Text: `MAKE IT`
- Font: `Arial-BoldMT`
- Font Size: `190`
- TextDocument setup: set Apply Fill to `On`, Fill Color to RGB `[0.957, 0.945, 0.918]`, Justification to `Left`, then reset Anchor Point to `[0, 0]`
- Transform:
  - Position keyframes: `[-900, 375]` at `0.00s`, `[300, 375]` at `0.65s`, `[280, 375]` at `0.87s`
  - Scale keyframes: `[125, 125]` at `0.00s`, `[100, 100]` at `0.65s`
  - Opacity keyframes: `0%` at `0.00s`, `100%` at `0.12s`
- Enable Motion Blur
- Apply temporal Bezier easing to all keyframes, with `75%` incoming influence on the landing keys

4. ACCENT BAR
- Type: Shape Layer
- Contents: one group built with `ADBE Vector Group`
  - Rectangle Path (`ADBE Vector Shape - Rect`)
    - Size: `[18, 390]`
  - Fill (`ADBE Vector Graphic - Fill`)
    - Color: `[0.784, 0.290, 0.141, 1]`
- Transform:
  - Position: `[255, 520]`
  - Scale keyframes: `[100, 0]` at `0.10s`, `[100, 100]` at `0.55s`
  - Opacity keyframes: `0%` at `0.10s`, `100%` at `0.18s`
- Apply temporal Bezier easing to the Scale keyframes

5. UNDERLINE
- Type: Shape Layer
- Contents: one group built with `ADBE Vector Group`
  - Rectangle Path (`ADBE Vector Shape - Rect`)
    - Size: `[1120, 12]`
  - Fill (`ADBE Vector Graphic - Fill`)
    - Color: `[0.784, 0.290, 0.141, 1]`
- Transform:
  - Position: `[255, 835]`
  - Anchor Point: `[-560, 0]`
  - Scale keyframes: `[0, 100]` at `0.85s`, `[100, 100]` at `1.35s`
- Apply temporal Bezier easing to the Scale keyframes

6. INK BACKGROUND
- Type: Solid Layer
- Solid Color: `#10141A`
- Size: full comp
- Blend Mode: Normal
- Effects in order:
  - 4-Color Gradient
    - Point 1: `[0, 0]`
    - Color 1: `[0.024, 0.035, 0.055, 1]`
    - Point 2: `[1920, 0]`
    - Color 2: `[0.075, 0.090, 0.120, 1]`
    - Point 3: `[0, 1080]`
    - Color 3: `[0.010, 0.016, 0.028, 1]`
    - Point 4: `[1920, 1080]`
    - Color 4: `[0.030, 0.040, 0.060, 1]`
    - Blend: `80`
    - Jitter: `2`
