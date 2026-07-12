import type {ReactNode} from 'react';

type PanelShellProps = {
  children: ReactNode;
  footer?: ReactNode;
  crop?: 'input' | 'response';
};

export const PanelShell = ({children, footer, crop = 'input'}: PanelShellProps) => {
  return (
    <div className={`panel-camera panel-camera--${crop}`}>
      <div className="panel-shell">
        <div className="panel-header">
          <div className="panel-header__provider">
            <span className="panel-header__status" />
            <span className="panel-header__title">Claude API</span>
            <span className="panel-header__chevron">⌄</span>
          </div>
          <span className="panel-header__version">v0.2.4</span>
          <div className="panel-header__spacer" />
          <span className="panel-header__model-accent" />
          <span className="panel-header__model">Claude Sonnet 4</span>
          <span className="panel-header__chevron">⌄</span>
        </div>
        <div className="panel-chat">{children}</div>
        {footer}
      </div>
    </div>
  );
};

type ChatInputProps = {
  text: string;
  active?: boolean;
  running?: boolean;
};

export const ChatInput = ({text, active = false, running = false}: ChatInputProps) => {
  return (
    <div className="chat-input">
      <div className={`chat-input__wrap${active ? ' chat-input__wrap--active' : ''}`}>
        <div className="chat-input__text">
          {text}
          {active ? <span className="typing-caret" /> : null}
        </div>
        <div className="chat-input__toolbar">
          <div className="context-button"><span className="context-button__plus">+</span>Context</div>
          <span className="chat-input__hint"><span>shift+↵</span> for newline</span>
          <div className="chat-input__spacer" />
          <div className={running ? 'stop-button' : 'send-button'}>
            {running ? 'Stop' : 'Send'}
            <span className="send-button__arrow">{running ? '■' : '→'}</span>
          </div>
        </div>
      </div>
    </div>
  );
};

type MessageProps = {
  role: 'user' | 'assistant';
  children: ReactNode;
  time: string;
};

export const Message = ({role, children, time}: MessageProps) => {
  return (
    <div className={`message message--${role}`}>
      <span className="message__time">{time}</span>
      <div className="message__bubble">
        <div className="message__content">{children}</div>
      </div>
    </div>
  );
};

export const RunningRow = () => {
  return (
    <div className="running-row">
      <span className="running-row__dot" />
      <span className="running-row__provider">CLAUDE API</span>
      <span className="running-row__text">Running AI Action…</span>
      <span className="running-row__time">00:02</span>
    </div>
  );
};
