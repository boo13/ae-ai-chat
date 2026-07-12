import {AbsoluteFill, OffthreadVideo, staticFile} from 'remotion';
import {footageManifest} from '../footage-manifest.generated';

type FootageFilename = keyof typeof footageManifest;

type FootageProps = {
  filename: FootageFilename;
  label: string;
  tag?: string;
};

export const Footage = ({filename, label, tag}: FootageProps) => {
  if (!footageManifest[filename]) {
    return (
      <AbsoluteFill className="footage-slate">
        <div className="footage-slate__rule" />
        <div className="footage-slate__eyebrow">FOOTAGE</div>
        <div className="footage-slate__label">{label}</div>
        <div className="footage-slate__filename">promo/public/footage/{filename}</div>
      </AbsoluteFill>
    );
  }

  return (
    <AbsoluteFill className="footage-frame">
      <OffthreadVideo
        muted
        src={staticFile(`footage/${filename}`)}
        style={{width: '100%', height: '100%', objectFit: 'cover'}}
      />
      {tag ? <div className="footage-frame__tag">{tag}</div> : null}
    </AbsoluteFill>
  );
};
