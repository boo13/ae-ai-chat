Build this 8-layer retro VHS and CRT glitch treatment in the active composition. Respond with an AI Action and run it immediately.

Use the active `1920x1080` comp, or create a `10`-second, `30` fps comp if none is active; the stack combines scanlines, stepped motion, chroma softness, and horizontal sync distortion without external footage.

Create these new layers in top-to-bottom order, keeping any existing footage below the four adjustment layers, `CRT SCANLINES`, and `TIMECODE OSD`, and above `VHS SOURCE`:

1. OSD PLAY
- Type: Text Layer
- Text: `PLAY >`
- Font: `Courier` (fall back to `Arial-BoldMT` if unavailable)
- Font Size: `52`
- TextDocument setup: set Apply Fill to `On`, Fill Color to RGB `[0.92, 0.94, 0.90]`, Justification to `Left`, then reset Anchor Point to `[0, 0]`
- Transform:
  - Position: `[120, 150]`
  - Opacity: `85%`

2. FRAME JITTER
- Type: Adjustment Layer
- Blend Mode: Normal
- Effects in order:
  - Transform
    - Uniform Scale: `On`
    - Scale Height: `102`
    - Position expression: `posterizeTime(12); var p = wiggle(8, 4); [p[0], value[1]];`

3. TRACKING TEAR
- Type: Adjustment Layer
- Blend Mode: Normal
- Effects in order:
  - Transform
    - Position expression: `seedRandom(3, false); posterizeTime(24); var r = random(); var off = 0; if (r < 0.05) { off = random(-60, 60); } value + [off, 0];`

4. CHROMA BLEED
- Type: Adjustment Layer
- Blend Mode: Normal
- Effects in order:
  - Channel Blur
    - Red Blurriness: `5`
    - Green Blurriness: `1`
    - Blue Blurriness: `9`
    - Alpha Blurriness: `0`
    - Blur Dimensions: `Horizontal`
  - Noise
    - Amount of Noise: `7%`

5. SIGNAL WARP
- Type: Adjustment Layer
- Blend Mode: Normal
- Effects in order:
  - Wave Warp
    - Wave Type: `Square`
    - Wave Height: `7`
    - Wave Width: `420`
    - Direction: `0`
    - Wave Speed: `1.6`
    - Pinning: `All Edges`
    - Antialiasing (Best Quality): `High`
  - Posterize Time
    - Frame Rate: `15`
  - Optics Compensation
    - Field Of View: `30`
    - Reverse Lens Distortion: `On`

6. CRT SCANLINES
- Type: Shape Layer
- Blend Mode: Overlay
- Transform:
  - Position: `[960, 1]`
  - Opacity: `24%`
- Contents: one group built only with shape match names
  - Rectangle Path (`ADBE Vector Shape - Rect`)
    - Size: `[1920, 2]`
    - Position: `[0, 0]`
  - Fill (`ADBE Vector Graphic - Fill`)
    - Color: `[0.02, 0.03, 0.04, 1]`
    - Opacity: `100%`
  - Repeater (`ADBE Vector Filter - Repeater`)
    - Copies: `270`
    - Offset: `0`
    - Transform (`ADBE Vector Repeater Transform`)
      - Position: `[0, 4]`
      - Start Opacity: `100%`
      - End Opacity: `100%`

7. TIMECODE OSD
- Type: Solid Layer
- Solid Color: `#000000`
- Size: full comp
- Blend Mode: Screen
- Transform:
  - Opacity: `80%`
- Effects in order:
  - Timecode
    - Display Format: `SMPTE HH:MM:SS:FF`
    - Time Units: `30`
    - Text Position: `[1460, 960]`
    - Text Size: `46`
    - Text Color: `[0.92, 0.94, 0.90, 1]`

8. VHS SOURCE
- Type: Solid Layer
- Solid Color: `#151728`
- Size: full comp
- Place at the bottom of the composition
- Effects in order:
  - 4-Color Gradient
    - Point 1: `[0, 0]`
    - Color 1: `[0.055, 0.075, 0.180, 1]`
    - Point 2: `[1920, 0]`
    - Color 2: `[0.510, 0.090, 0.260, 1]`
    - Point 3: `[0, 1080]`
    - Color 3: `[0.020, 0.280, 0.310, 1]`
    - Point 4: `[1920, 1080]`
    - Color 4: `[0.035, 0.020, 0.080, 1]`
    - Blend: `65`
    - Jitter: `3`
  - Noise
    - Amount of Noise: `4%`

Build notes:

- Set each shape/effect property's values immediately after its `addProperty` call; stale sibling references throw "Object is invalid".
- When easing keyframes, pass one `KeyframeEase` per value dimension; spatial properties (Position, Anchor Point) take exactly one per side (`prop.isSpatial`).
- ES3 only (`var`, no arrows/template literals), ASCII only, one `app.beginUndoGroup`/`app.endUndoGroup` around all changes.
