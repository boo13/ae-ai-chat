import {AbsoluteFill, interpolate, Sequence, spring, useCurrentFrame, useVideoConfig} from 'remotion';
import {Footage} from './components/Footage';
import {ChatInput, Message, PanelShell, RunningRow} from './components/PanelUI';

const prompt = 'Build this 10-layer film-damage treatment in the active composition…';
const response = 'I’ll build the treatment as a labeled 10-layer stack and run it now.';
const action = `<ai-action run="true">\nvar comp = app.project.activeItem;\napp.beginUndoGroup("Film damage");\nvar grain = comp.layers.addSolid([1,1,1], "GRAIN", comp.width, comp.height, 1);\ngrain.adjustmentLayer = true;\napp.endUndoGroup();\n</ai-action>`;

const SceneFade = ({children}: {children: React.ReactNode}) => {
  const frame = useCurrentFrame();
  const opacity = interpolate(frame, [0, 5], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  return <AbsoluteFill style={{opacity}}>{children}</AbsoluteFill>;
};

const TypingScene = () => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const entered = spring({fps, frame, config: {damping: 24, stiffness: 120}});
  const typedCharacters = Math.floor(
    interpolate(frame, [8, 61], [0, prompt.length], {
      extrapolateLeft: 'clamp',
      extrapolateRight: 'clamp',
    }),
  );

  return (
    <AbsoluteFill className="scene scene--panel">
      <div className="scene-index">01 / PROMPT</div>
      <div style={{transform: `translateY(${interpolate(entered, [0, 1], [26, 0])}px)`, opacity: entered}}>
        <PanelShell
          crop="input"
          footer={<ChatInput text={prompt.slice(0, typedCharacters)} active={frame < 64} />}
        >
          <div className="panel-empty-line" />
        </PanelShell>
      </div>
    </AbsoluteFill>
  );
};

const ResponseScene = () => {
  const frame = useCurrentFrame();
  const responseCount = Math.floor(
    interpolate(frame, [5, 27], [0, response.length], {
      extrapolateLeft: 'clamp',
      extrapolateRight: 'clamp',
    }),
  );
  const actionCount = Math.floor(
    interpolate(frame, [28, 58], [0, action.length], {
      extrapolateLeft: 'clamp',
      extrapolateRight: 'clamp',
    }),
  );
  const showRunning = frame >= 60;

  return (
    <SceneFade>
      <AbsoluteFill className="scene scene--panel">
        <div className="scene-index">02 / ACTION</div>
        <PanelShell
          crop="response"
          footer={showRunning ? <RunningRow /> : <ChatInput text="" running />}
        >
          <Message role="user" time="10:42">
            Build this 10-layer film-damage treatment in the active composition…
          </Message>
          <Message role="assistant" time="10:42">
            <p>{response.slice(0, responseCount)}</p>
            {actionCount > 0 ? <pre>{action.slice(0, actionCount)}</pre> : null}
          </Message>
        </PanelShell>
      </AbsoluteFill>
    </SceneFade>
  );
};

const EndCard = () => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const reveal = spring({fps, frame, config: {damping: 26, stiffness: 130}});

  return (
    <AbsoluteFill className="end-card">
      <div className="end-card__content" style={{opacity: reveal, transform: `translateY(${(1 - reveal) * 16}px)`}}>
        <div className="end-card__rule" />
        <h1>AE AI Chat</h1>
        <p>Prompt-driven After Effects.</p>
      </div>
    </AbsoluteFill>
  );
};

export const Promo = () => {
  return (
    <AbsoluteFill className="promo-root">
      <Sequence from={0} durationInFrames={75} name="Typing close-up">
        <TypingScene />
      </Sequence>
      <Sequence from={75} durationInFrames={75} name="AI response">
        <ResponseScene />
      </Sequence>
      <Sequence from={150} durationInFrames={75} name="Panel running in After Effects">
        <Footage
          filename="ae-panel-run.mp4"
          label="panel running TextureLabs film-damage prompt in AE"
          tag="AE AI CHAT / RUNNING"
        />
      </Sequence>
      <Sequence from={225} durationInFrames={27} name="Output one">
        <Footage
          filename="output-1.mp4"
          label="rendered TextureLabs film-damage result"
          tag="FILM DAMAGE / RESULT"
        />
      </Sequence>
      <Sequence from={252} durationInFrames={27} name="Output two">
        <Footage
          filename="output-2.mp4"
          label="rendered neon flicker or deep-space result"
          tag="SECOND PROMPT / RESULT"
        />
      </Sequence>
      <Sequence from={279} durationInFrames={21} name="End card">
        <EndCard />
      </Sequence>
    </AbsoluteFill>
  );
};
