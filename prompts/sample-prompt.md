Build this 4-layer film treatment in the active composition. Respond with an AI Action and run it immediately.

Create these adjustment layers in top-to-bottom order:

1. GATE WEAVE
- Type: Adjustment Layer
- Blend Mode: Normal
- Effects in order:
  - Transform
    - Uniform Scale: `On`
    - Scale Height: `101.5`
    - Position expression: `x = wiggle(12, .5)[0]; y = wiggle(3, .15, 3, 4)[1]; [x, y]`

2. GRAIN
- Type: Adjustment Layer
- Blend Mode: Normal
- Effects in order:
  - Noise
    - Amount of Noise: `10%`
  - Gaussian Blur
    - Blurriness: `6`
  - Unsharp Mask
    - Amount: `300`
    - Radius: `3`

3. FLICKER
- Type: Adjustment Layer
- Blend Mode: Normal
- Effects in order:
  - Exposure
    - Exposure expression: `wiggle(12, .1)`

4. COLOR GRADE
- Type: Adjustment Layer
- Blend Mode: Normal
- Effects in order:
  - Glow
    - Glow Threshold: `50%`
    - Glow Radius: `500`
    - Glow Intensity: `0.2`
    - Glow Operation: `Screen`
  - CC Vignette
    - Amount: `50`
  - Levels
    - Output Black: `10`
    - Output White: `235`
