import type {ReactNode} from 'react';
import {AbsoluteFill, Easing, interpolate, useCurrentFrame} from 'remotion';

export type CameraMoveProps = {
  durationInFrames: number;
  zoomFrom?: number;
  zoomTo?: number;
  panXFrom?: number;
  panXTo?: number;
  panYFrom?: number;
  panYTo?: number;
  children: ReactNode;
};

export const CameraMove = ({
  durationInFrames,
  zoomFrom = 1,
  zoomTo = 1,
  panXFrom = 0,
  panXTo = 0,
  panYFrom = 0,
  panYTo = 0,
  children,
}: CameraMoveProps) => {
  const frame = useCurrentFrame();
  const interpolationOptions = {
    easing: Easing.bezier(0.33, 0, 0.2, 1),
    extrapolateLeft: 'clamp' as const,
    extrapolateRight: 'clamp' as const,
  };
  const zoom = interpolate(frame, [0, durationInFrames], [zoomFrom, zoomTo], interpolationOptions);
  const panX = interpolate(frame, [0, durationInFrames], [panXFrom, panXTo], interpolationOptions);
  const panY = interpolate(frame, [0, durationInFrames], [panYFrom, panYTo], interpolationOptions);

  return (
    <AbsoluteFill style={{overflow: 'hidden'}}>
      <div
        style={{
          position: 'absolute',
          inset: 0,
          transform: `translate3d(${panX}px, ${panY}px, 0) scale(${zoom})`,
          transformOrigin: 'center',
        }}
      >
        {children}
      </div>
    </AbsoluteFill>
  );
};
