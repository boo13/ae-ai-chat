import type {ReactNode} from 'react';
import {AbsoluteFill, OffthreadVideo, staticFile, useCurrentFrame} from 'remotion';
import {footageManifest} from '../footage-manifest.generated';

type FootageProps = {
  filename: string;
  label: string;
  startFrom?: number;
};

export const Footage = ({filename, label, startFrom = 0}: FootageProps) => {
  const manifest: Readonly<Record<string, boolean>> = footageManifest;

  if (!manifest[filename]) {
    return (
      <AbsoluteFill className="footage-slate">
        <div className="footage-slate__label">{label}</div>
      </AbsoluteFill>
    );
  }

  return (
    <AbsoluteFill className="footage-frame">
      <OffthreadVideo
        muted
        startFrom={startFrom}
        src={staticFile(`footage/${filename}`)}
        className="footage-frame__video"
      />
    </AbsoluteFill>
  );
};

export const Grade = ({children}: {children: ReactNode}) => {
  const frame = useCurrentFrame();
  const filterId = `living-grain-${frame}`;

  return (
    <div className="grade">
      <div className="grade__content">{children}</div>
      <svg className="grade__grain" aria-hidden="true">
        <filter id={filterId} x="-20%" y="-20%" width="140%" height="140%">
          <feTurbulence type="fractalNoise" baseFrequency="0.8" numOctaves="3" seed={frame} stitchTiles="stitch" />
          <feColorMatrix type="saturate" values="0" />
        </filter>
        <rect width="100%" height="100%" filter={`url(#${filterId})`} />
      </svg>
      <div className="grade__vignette" />
    </div>
  );
};

export const CaptionChip = ({children}: {children: ReactNode}) => {
  return <div className="caption-chip">{children}</div>;
};
