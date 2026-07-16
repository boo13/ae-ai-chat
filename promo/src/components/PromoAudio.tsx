import {Audio, Sequence, staticFile} from 'remotion';
import {audioManifest} from '../audio-manifest.generated';

type SoundEffectProps = {
  filename: keyof typeof audioManifest;
  from: number;
  durationInFrames: number;
};

const SoundEffect = ({filename, from, durationInFrames}: SoundEffectProps) => {
  if (!audioManifest[filename]) {
    return null;
  }

  return (
    <Sequence from={from} durationInFrames={durationInFrames}>
      <Audio src={staticFile(`audio/${filename}`)} />
    </Sequence>
  );
};

export const PromoAudio = () => {
  return (
    <>
      {audioManifest['track.mp3'] ? <Audio src={staticFile('audio/track.mp3')} /> : null}
      <SoundEffect filename="sfx-type.mp3" from={54} durationInFrames={56} />
      <SoundEffect filename="sfx-send.mp3" from={110} durationInFrames={24} />
      {[192, 246, 283, 320].map((from) => (
        <SoundEffect key={from} filename="sfx-swish.mp3" from={from} durationInFrames={18} />
      ))}
      <SoundEffect filename="sfx-sting.mp3" from={417} durationInFrames={63} />
    </>
  );
};
