import {AbsoluteFill, interpolate, Sequence, useCurrentFrame} from 'remotion';
import {Footage, Grade} from './components/Footage';
import {Interstitial} from './components/Interstitial';
import {ChatInput, PanelShell, RunningRow} from './components/PanelUI';

const prompt = 'Make this footage look like old, damaged film.';

const PanelTypingScene = () => {
  const frame = useCurrentFrame();
  const typedCharacters = Math.floor(
    interpolate(frame, [6, 96], [0, prompt.length], {
      extrapolateLeft: 'clamp',
      extrapolateRight: 'clamp',
    }),
  );
  const isRunning = frame >= 108;

  return (
    <AbsoluteFill className="panel-typing-scene">
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
    </AbsoluteFill>
  );
};

type FootageSceneProps = {
  filename: string;
  startFrom: number;
};

const FootageScene = ({filename, startFrom}: FootageSceneProps) => {
  return (
    <AbsoluteFill className="footage-scene">
      <Grade>
        <Footage filename={filename} label={filename} startFrom={startFrom} />
      </Grade>
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

export const Promo = () => {
  return (
    <AbsoluteFill className="promo-root">
      <Sequence from={0} durationInFrames={72} name="S1 — Product premise">
        <Interstitial
          rule
          headline="An AI chat panel"
          secondLine="inside After Effects."
          headlineSize={84}
        />
      </Sequence>

      <Sequence from={72} durationInFrames={144} name="S2 — Panel typing">
        <PanelTypingScene />
      </Sequence>

      <Sequence from={216} durationInFrames={150} name="S3 — Film damage hero">
        <FootageScene filename="texturelabs-filmdamage.mp4" startFrom={30} />
      </Sequence>

      <Sequence from={366} durationInFrames={66} name="S4 — One prompt">
        <Interstitial headline="One prompt." secondLine="Any look." headlineSize={96} />
      </Sequence>

      <Sequence from={432} durationInFrames={70} name="S5.1 — Broadcast lower third">
        <FootageScene filename="broadcast-lower-third.mp4" startFrom={0} />
      </Sequence>
      <Sequence from={502} durationInFrames={70} name="S5.2 — Sci-fi radar HUD">
        <FootageScene filename="scifi-radar-hud.mp4" startFrom={30} />
      </Sequence>
      <Sequence from={572} durationInFrames={70} name="S5.3 — Kinetic typography">
        <FootageScene filename="kinetic-typography-slam.mp4" startFrom={0} />
      </Sequence>

      <Sequence from={642} durationInFrames={69} name="S6 — Validation">
        <Interstitial
          headline="It checks its own work."
          secondLine="Validated against 338 verified AE effects."
          headlineSize={72}
          detailMono
        />
      </Sequence>

      <Sequence from={711} durationInFrames={63} name="S7 — End card">
        <EndCard />
      </Sequence>
    </AbsoluteFill>
  );
};
