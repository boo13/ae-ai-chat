import type {ReactNode} from 'react';
import {AbsoluteFill, OffthreadVideo, staticFile, useCurrentFrame} from 'remotion';
import {footageManifest} from '../footage-manifest.generated';
import {CameraMove} from './CameraMove';

type FootageProps = {
  filename: string;
  label: string;
  durationInFrames: number;
  startFrom?: number;
  zoomFrom?: number;
  zoomTo?: number;
  panXFrom?: number;
  panXTo?: number;
  panYFrom?: number;
  panYTo?: number;
  objectPosition?: string;
};

export const Footage = ({
  filename,
  label,
  durationInFrames,
  startFrom = 0,
  zoomFrom = 1,
  zoomTo = 1,
  panXFrom = 0,
  panXTo = 0,
  panYFrom = 0,
  panYTo = 0,
  objectPosition = '50% 50%',
}: FootageProps) => {
  const manifest: Readonly<Record<string, boolean>> = footageManifest;

  return (
    <CameraMove
      durationInFrames={durationInFrames}
      zoomFrom={zoomFrom}
      zoomTo={zoomTo}
      panXFrom={panXFrom}
      panXTo={panXTo}
      panYFrom={panYFrom}
      panYTo={panYTo}
    >
      {manifest[filename] ? (
        <AbsoluteFill className="footage-frame">
          <OffthreadVideo
            muted
            startFrom={startFrom}
            src={staticFile(`footage/${filename}`)}
            className="footage-frame__video"
            style={{objectPosition}}
          />
        </AbsoluteFill>
      ) : (
        <AbsoluteFill className="footage-slate">
          <div className="footage-slate__label">{label}</div>
        </AbsoluteFill>
      )}
    </CameraMove>
  );
};

export const Grade = ({children, isCapture = false}: {children: ReactNode; isCapture?: boolean}) => {
  const frame = useCurrentFrame();
  const filterId = `living-grain-${frame}`;

  return (
    <div className="grade">
      <div className="grade__content">{children}</div>
      {isCapture ? null : (
        <svg className="grade__grain" aria-hidden="true">
          <filter id={filterId} x="-20%" y="-20%" width="140%" height="140%">
            <feTurbulence type="fractalNoise" baseFrequency="0.8" numOctaves="3" seed={frame} stitchTiles="stitch" />
            <feColorMatrix type="saturate" values="0" />
          </filter>
          <rect width="100%" height="100%" filter={`url(#${filterId})`} />
        </svg>
      )}
      <div className={isCapture ? 'grade__vignette grade__vignette--capture' : 'grade__vignette'} />
    </div>
  );
};
