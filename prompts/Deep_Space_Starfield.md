Build this 5-layer deep-space starfield flythrough in a new composition. Respond with an AI Action and run it immediately.

Create a `1920x1080`, `12`-second, `30` fps comp named `Deep Space Starfield`; three CC Star Burst passes at different speeds create parallax while a slow procedural nebula adds scale and color.

Create these layers in top-to-bottom order:

1. STARS NEAR
- Type: Solid Layer
- Solid Color: `#000000`
- Size: full comp
- Blend Mode: Add
- Effects in order:
  - CC Star Burst
    - Grid Spacing: `18`
    - Size: `145`
    - Shading: `35`
    - Scatter: `320`
    - Speed: `2.6`
    - Phase: `120`
    - Blend w. Original: `0%`
  - Glow
    - Glow Based On: `Color Channels`
    - Glow Threshold: `55%`
    - Glow Radius: `28`
    - Glow Intensity: `1.3`
    - Glow Operation: `Add`

2. STARS MID
- Type: Solid Layer
- Solid Color: `#000000`
- Size: full comp
- Blend Mode: Screen
- Transform:
  - Opacity: `82%`
- Effects in order:
  - CC Star Burst
    - Grid Spacing: `10`
    - Size: `82`
    - Shading: `18`
    - Scatter: `220`
    - Speed: `1.2`
    - Phase: `45`
    - Blend w. Original: `0%`

3. STARS FAR
- Type: Solid Layer
- Solid Color: `#000000`
- Size: full comp
- Blend Mode: Screen
- Transform:
  - Opacity: `62%`
- Effects in order:
  - CC Star Burst
    - Grid Spacing: `5`
    - Size: `42`
    - Shading: `8`
    - Scatter: `145`
    - Speed: `0.42`
    - Phase: `210`
    - Blend w. Original: `0%`
  - Gaussian Blur
    - Blurriness: `0.8`
    - Repeat Edge Pixels: `On`

4. NEBULA
- Type: Solid Layer
- Solid Color: `#000000`
- Size: full comp
- Blend Mode: Screen
- Transform:
  - Opacity: `34%`
- Effects in order:
  - Fractal Noise
    - Fractal Type: `Dynamic Twist`
    - Noise Type: `Soft Linear`
    - Contrast: `185`
    - Brightness: `-48`
    - Uniform Scaling: `Off`
    - Scale Width: `580`
    - Scale Height: `310`
    - Complexity: `4`
    - Offset Turbulence expression: `var p = value; [p[0] + time * 6, p[1] - time * 2];`
    - Evolution expression: `time * 7`
  - Tint
    - Map Black To: `[0.000, 0.000, 0.018, 1]`
    - Map White To: `[0.150, 0.420, 0.850, 1]`
    - Amount to Tint: `100%`
  - Gaussian Blur
    - Blurriness: `62`
    - Repeat Edge Pixels: `On`

5. DEEP SPACE
- Type: Solid Layer
- Solid Color: `#01030A`
- Size: full comp
- Blend Mode: Normal
- Effects in order:
  - Gradient Ramp
    - Start of Ramp: `[960, 470]`
    - Start Color: `[0.018, 0.035, 0.105, 1]`
    - End of Ramp: `[960, 1080]`
    - End Color: `[0.001, 0.003, 0.012, 1]`
    - Ramp Shape: `Radial Ramp`
    - Ramp Scatter: `3`
