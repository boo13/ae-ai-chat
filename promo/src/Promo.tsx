import type {ReactNode} from 'react';
import {AbsoluteFill, interpolate, Sequence, useCurrentFrame} from 'remotion';
import {CameraMove} from './components/CameraMove';
import {Footage, Grade} from './components/Footage';
import {Interstitial} from './components/Interstitial';
import {ChatInput, PanelShell, RunningRow} from './components/PanelUI';
import {PromoAudio} from './components/PromoAudio';

const prompt = 'Make this footage look like old, damaged film.';

type SceneFadeProps = {
  durationInFrames: number;
  fadeInFrames?: number;
  fadeOutFrames?: number;
  children: ReactNode;
};

const SceneFade = ({
  durationInFrames,
  fadeInFrames = 0,
  fadeOutFrames = 0,
  children,
}: SceneFadeProps) => {
  const frame = useCurrentFrame();
  const fadeIn = fadeInFrames
    ? interpolate(frame, [0, fadeInFrames], [0, 1], {
        extrapolateLeft: 'clamp',
        extrapolateRight: 'clamp',
      })
    : 1;
  const fadeOut = fadeOutFrames
    ? interpolate(frame, [durationInFrames - fadeOutFrames, durationInFrames], [1, 0], {
        extrapolateLeft: 'clamp',
        extrapolateRight: 'clamp',
      })
    : 1;

  return <AbsoluteFill style={{opacity: Math.min(fadeIn, fadeOut)}}>{children}</AbsoluteFill>;
};

const CaptionChip = ({children, opacity = 1}: {children: ReactNode; opacity?: number}) => {
  return (
    <div className="caption-chip" style={{opacity}}>
      {children}
    </div>
  );
};

const PanelTypingScene = () => {
  const frame = useCurrentFrame();
  const typedCharacters = Math.floor(
    interpolate(frame, [4, 50], [0, prompt.length], {
      extrapolateLeft: 'clamp',
      extrapolateRight: 'clamp',
    }),
  );
  const isRunning = frame >= 56;
  const captionOpacity = interpolate(frame, [56, 62], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  return (
    <AbsoluteFill className="panel-typing-scene">
      <CameraMove durationInFrames={72} zoomFrom={1} zoomTo={1.06} panYFrom={0} panYTo={-12}>
        <div className="panel-stage">
          <PanelShell
            crop="input"
            footer={
              isRunning ? (
                <RunningRow />
              ) : (
                <ChatInput text={prompt.slice(0, typedCharacters)} active />
              )
            }
          >
            <div className="panel-empty-line" />
          </PanelShell>
        </div>
      </CameraMove>
      {isRunning ? <CaptionChip opacity={captionOpacity}>It writes and runs ExtendScript.</CaptionChip> : null}
    </AbsoluteFill>
  );
};

type FootageSceneProps = {
  filename: string;
  durationInFrames: number;
  startFrom: number;
  caption?: string;
  isCapture?: boolean;
  zoomFrom?: number;
  zoomTo?: number;
  panXFrom?: number;
  panXTo?: number;
  panYFrom?: number;
  panYTo?: number;
  objectPosition?: string;
};

const FootageScene = ({
  filename,
  durationInFrames,
  startFrom,
  caption,
  isCapture = false,
  zoomFrom,
  zoomTo,
  panXFrom,
  panXTo,
  panYFrom,
  panYTo,
  objectPosition,
}: FootageSceneProps) => {
  return (
    <AbsoluteFill className="footage-scene">
      <Grade isCapture={isCapture}>
        <Footage
          filename={filename}
          label={filename}
          durationInFrames={durationInFrames}
          startFrom={startFrom}
          zoomFrom={zoomFrom}
          zoomTo={zoomTo}
          panXFrom={panXFrom}
          panXTo={panXTo}
          panYFrom={panYFrom}
          panYTo={panYTo}
          objectPosition={objectPosition}
        />
      </Grade>
      {caption ? <CaptionChip>{caption}</CaptionChip> : null}
    </AbsoluteFill>
  );
};

const TrustScene = () => {
  return (
    <AbsoluteFill className="trust-scene">
      <FootageScene
        filename="panel-autofix.mp4"
        durationInFrames={60}
        startFrom={30}
        isCapture
        zoomFrom={1.02}
        zoomTo={1.07}
        panYFrom={0}
        panYTo={-10}
        objectPosition="50% 38%"
      />
      <div className="trust-scene__scrim" />
      <Interstitial
        overlay
        rule
        headline="It checks its own work."
        secondLine="Validated against 338 verified AE effects."
        headlineSize={72}
        detailMono
      />
    </AbsoluteFill>
  );
};

const EndCard = () => {
  const frame = useCurrentFrame();
  const reveal = interpolate(frame, [0, 8], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  const zoom = interpolate(frame, [0, 63], [1, 1.03], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  return (
    <AbsoluteFill className="end-card">
      <AbsoluteFill
        className="end-card__reveal"
        style={{opacity: reveal, transform: `translateY(${(1 - reveal) * 10}px) scale(${zoom})`}}
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

export const Promo = () => {
  return (
    <AbsoluteFill className="promo-root">
      <Sequence from={0} durationInFrames={54} name="B1 — Premise">
        <Interstitial
          rule
          headline="An AI chat panel"
          secondLine="inside After Effects."
          headlineSize={84}
          pushIn
          durationInFrames={54}
        />
      </Sequence>

      <Sequence from={54} durationInFrames={72} name="B2 — Type and run">
        <SceneFade durationInFrames={72} fadeOutFrames={8}>
          <PanelTypingScene />
        </SceneFade>
      </Sequence>

      <Sequence from={118} durationInFrames={74} name="B3 — Runs live">
        <SceneFade durationInFrames={74} fadeInFrames={8}>
          <FootageScene
            filename="ae-panel-run.mp4"
            durationInFrames={74}
            startFrom={36}
            isCapture
            zoomFrom={1.5}
            zoomTo={1.6}
            panXFrom={203}
            panXTo={216}
            panYFrom={245}
            panYTo={261}
          />
        </SceneFade>
      </Sequence>

      <Sequence from={192} durationInFrames={54} name="B4.1 — Film damage">
        <FootageScene
          filename="texturelabs-filmdamage.mp4"
          durationInFrames={54}
          startFrom={30}
          caption="film damage"
          zoomFrom={1}
          zoomTo={1.08}
          panXFrom={0}
          panXTo={-24}
        />
      </Sequence>
      <Sequence from={246} durationInFrames={37} name="B4.2 — Broadcast lower third">
        <FootageScene
          filename="broadcast-lower-third.mp4"
          durationInFrames={37}
          startFrom={0}
          caption="broadcast lower third"
          zoomFrom={1.06}
          zoomTo={1}
          panXFrom={-30}
          panXTo={18}
        />
      </Sequence>
      <Sequence from={283} durationInFrames={37} name="B4.3 — Sci-fi radar HUD">
        <FootageScene
          filename="scifi-radar-hud.mp4"
          durationInFrames={37}
          startFrom={30}
          caption="sci-fi radar HUD"
          zoomFrom={1}
          zoomTo={1.07}
          panXFrom={22}
          panXTo={-18}
        />
      </Sequence>
      <Sequence from={320} durationInFrames={37} name="B4.4 — Kinetic type">
        <FootageScene
          filename="kinetic-typography-slam.mp4"
          durationInFrames={37}
          startFrom={0}
          caption="kinetic type"
          zoomFrom={1.06}
          zoomTo={1}
          panYFrom={-16}
          panYTo={14}
        />
      </Sequence>

      <Sequence from={357} durationInFrames={60} name="B5 — Trust">
        <TrustScene />
      </Sequence>

      <Sequence from={417} durationInFrames={63} name="B6 — End card">
        <EndCard />
      </Sequence>

      <PromoAudio />
    </AbsoluteFill>
  );
};
