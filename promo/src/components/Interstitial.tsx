import {AbsoluteFill, interpolate, useCurrentFrame} from 'remotion';

type InterstitialProps = {
  headline: string;
  secondLine?: string;
  headlineSize: number;
  rule?: boolean;
  detailMono?: boolean;
};

export const Interstitial = ({
  headline,
  secondLine,
  headlineSize,
  rule = false,
  detailMono = false,
}: InterstitialProps) => {
  const frame = useCurrentFrame();
  const reveal = interpolate(frame, [0, 6], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  return (
    <AbsoluteFill className="interstitial">
      <div
        className="interstitial__content"
        style={{opacity: reveal, transform: `translateY(${(1 - reveal) * 10}px)`}}
      >
        {rule ? <div className="interstitial__rule" /> : null}
        <div className="interstitial__headline" style={{fontSize: headlineSize}}>
          {headline}
        </div>
        {secondLine ? (
          <div
            className={detailMono ? 'interstitial__detail interstitial__detail--mono' : 'interstitial__detail'}
            style={detailMono ? undefined : {fontSize: headlineSize}}
          >
            {secondLine}
          </div>
        ) : null}
      </div>
    </AbsoluteFill>
  );
};
