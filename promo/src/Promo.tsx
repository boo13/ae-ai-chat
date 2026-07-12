import type {ReactNode} from 'react';
import {AbsoluteFill, interpolate, Sequence, useCurrentFrame} from 'remotion';
import {CaptionChip, Footage, Grade} from './components/Footage';

type TypingSceneProps = {
  line: string;
  typeFrom: number;
  typeTo: number;
};

const TypingScene = ({line, typeFrom, typeTo}: TypingSceneProps) => {
  const frame = useCurrentFrame();
  const prompt = line.startsWith('>') ? line.slice(1) : line;
  const typedCharacters = Math.floor(
    interpolate(frame, [typeFrom, typeTo], [0, prompt.length], {
      extrapolateLeft: 'clamp',
      extrapolateRight: 'clamp',
    }),
  );
  const cursorVisible = Math.floor(frame / 15) % 2 === 0;

  return (
    <AbsoluteFill className="typing-scene">
      <div className="typing-scene__line">
        <span className="typing-scene__prefix">&gt;</span>
        <span>{prompt.slice(0, typedCharacters)}</span>
        <span className="typing-scene__cursor" style={{opacity: cursorVisible ? 1 : 0}} />
      </div>
    </AbsoluteFill>
  );
};

type FootageSceneProps = {
  filename: string;
  startFrom: number;
  chip: string;
  children?: ReactNode;
};

const FootageScene = ({filename, startFrom, chip, children}: FootageSceneProps) => {
  return (
    <AbsoluteFill className="footage-scene">
      <Grade>
        <Footage filename={filename} label={filename} startFrom={startFrom} />
      </Grade>
      {children}
      <CaptionChip>{chip}</CaptionChip>
    </AbsoluteFill>
  );
};

const RevealScene = () => {
  const frame = useCurrentFrame();
  const headlineOpacity = interpolate(frame, [25, 33, 132, 140], [0, 1, 1, 0], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  return (
    <FootageScene
      filename="rain-on-glass.mp4"
      startFrom={60}
      chip="RAIN ON GLASS — BUILT FROM ONE PROMPT"
    >
      <div className="reveal-headline" style={{opacity: headlineOpacity}}>
        <div>You type.</div>
        <div className="text-dim">After Effects builds it.</div>
      </div>
    </FootageScene>
  );
};

const ProductScene = () => {
  return (
    <FootageScene
      filename="ae-panel-run.mp4"
      startFrom={0}
      chip="LIVE CAPTURE — FILM DAMAGE PROMPT RUNNING"
    >
      <div className="product-headline">
        <div>An AI chat panel inside After Effects.</div>
        <div className="product-headline__detail">It reads your comp. It writes the code.</div>
      </div>
    </FootageScene>
  );
};

const promptResultPairs = [
  {
    from: 390,
    line: '> build a lower third i can restyle',
    filename: 'broadcast-lower-third.mp4',
    startFrom: 0,
    chip: 'BROADCAST LOWER THIRD — RIGGED CONTROLS',
  },
  {
    from: 525,
    line: '> sci-fi radar, tracking sector 07',
    filename: 'scifi-radar-hud.mp4',
    startFrom: 30,
    chip: 'SCI-FI RADAR HUD',
  },
  {
    from: 660,
    line: '> slam these words on screen',
    filename: 'kinetic-typography-slam.mp4',
    startFrom: 0,
    chip: 'KINETIC TYPOGRAPHY',
  },
  {
    from: 795,
    line: '> a neon sign that flickers',
    filename: 'neon-sign-flicker.mp4',
    startFrom: 90,
    chip: 'NEON SIGN FLICKER',
  },
  {
    from: 930,
    line: '> make it look like damaged film',
    filename: 'texturelabs-filmdamage.mp4',
    startFrom: 30,
    chip: 'FILM DAMAGE — APPLIED TO FOOTAGE',
  },
] as const;

const TrustScene = () => {
  return (
    <AbsoluteFill className="trust-scene">
      <div className="trust-scene__copy">
        <div className="trust-scene__headline">Grounded in 338 verified effects.</div>
        <div className="trust-scene__detail">
          <div>It validates every script before it runs —</div>
          <div>and when AE throws, it fixes the error and reruns.</div>
        </div>
      </div>
      <div className="trust-scene__card">
        <Grade>
          <Footage filename="panel-autofix.mp4" label="panel-autofix.mp4" startFrom={0} />
        </Grade>
      </div>
    </AbsoluteFill>
  );
};

const EndCard = () => {
  const frame = useCurrentFrame();
  const reveal = interpolate(frame, [0, 8], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  return (
    <AbsoluteFill className="end-card">
      <AbsoluteFill
        className="end-card__reveal"
        style={{opacity: reveal, transform: `translateY(${(1 - reveal) * 10}px)`}}
      >
        <div className="end-card__content">
          <div className="end-card__rule" />
          <div className="end-card__title">AE AI Chat</div>
          <div className="end-card__tagline">Prompt-driven After Effects.</div>
          <div className="end-card__link">
            <span>Free &amp; open source</span>
            {'  github.com/boo13/ae-ai-chat'}
          </div>
        </div>
        <div className="end-card__credit">Footage: Big Buck Bunny — (c) Blender Foundation</div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

const DipThroughBlack = () => {
  const frame = useCurrentFrame();
  const opacity = interpolate(frame, [0, 3, 6], [0, 1, 0], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  return <AbsoluteFill className="dip-through-black" style={{opacity}} />;
};

export const Promo = () => {
  return (
    <AbsoluteFill className="promo-root">
      <Sequence from={0} durationInFrames={105} name="S1 — Cold open">
        <TypingScene line="> make it rain on the window" typeFrom={8} typeTo={64} />
      </Sequence>

      <Sequence from={105} durationInFrames={150} name="S2 — Reveal">
        <RevealScene />
      </Sequence>

      <Sequence from={255} durationInFrames={135} name="S3 — The product">
        <ProductScene />
      </Sequence>

      {promptResultPairs.map((pair, index) => (
        <Sequence key={pair.line} from={pair.from} durationInFrames={135} name={`S4.${index + 1} — Prompt to result`}>
          <Sequence from={0} durationInFrames={45} name="Prompt">
            <TypingScene line={pair.line} typeFrom={4} typeTo={30} />
          </Sequence>
          <Sequence from={45} durationInFrames={90} name="Result">
            <FootageScene filename={pair.filename} startFrom={pair.startFrom} chip={pair.chip} />
          </Sequence>
        </Sequence>
      ))}

      <Sequence from={1065} durationInFrames={120} name="S5 — Trust beat">
        <TrustScene />
      </Sequence>

      <Sequence from={1185} durationInFrames={105} name="S6 — End card">
        <EndCard />
      </Sequence>

      {[105, 390, 1185].map((boundary) => (
        <Sequence key={boundary} from={boundary - 3} durationInFrames={6} name="Dip through black">
          <DipThroughBlack />
        </Sequence>
      ))}
    </AbsoluteFill>
  );
};
