Build this 5-layer retro VHS and CRT glitch treatment in the active composition. Respond with an AI Action and run it immediately.

Use the active `1920x1080` comp, or create a `10`-second, `30` fps comp if none is active; the stack combines scanlines, stepped motion, chroma softness, and horizontal sync distortion without external footage.

Create these new layers in top-to-bottom order, keeping any existing footage below the three adjustment layers and above `VHS SOURCE`:

1. FRAME JITTER
- Type: Adjustment Layer
- Blend Mode: Normal
- Effects in order:
  - Transform
    - Uniform Scale: `On`
    - Scale Height: `102`
    - Position expression: `posterizeTime(12); var p = wiggle(8, 4); [p[0], value[1]];`

2. CHROMA BLEED
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

3. SIGNAL WARP
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

4. CRT SCANLINES
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

5. VHS SOURCE
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
