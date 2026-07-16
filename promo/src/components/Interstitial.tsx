import {AbsoluteFill, Easing, interpolate, useCurrentFrame} from 'remotion';

type InterstitialProps = {
  headline: string;
  secondLine?: string;
  headlineSize: number;
  rule?: boolean;
  detailMono?: boolean;
  pushIn?: boolean;
  durationInFrames?: number;
  overlay?: boolean;
};

export const Interstitial = ({
  headline,
  secondLine,
  headlineSize,
  rule = false,
  detailMono = false,
  pushIn = false,
  durationInFrames = 1,
  overlay = false,
}: InterstitialProps) => {
  const frame = useCurrentFrame();
  const reveal = interpolate(frame, [0, 6], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  const zoom = pushIn
    ? interpolate(frame, [0, durationInFrames], [1, 1.03], {
        easing: Easing.bezier(0.33, 0, 0.2, 1),
        extrapolateLeft: 'clamp',
        extrapolateRight: 'clamp',
      })
    : 1;

  return (
    <AbsoluteFill className={overlay ? 'interstitial interstitial--overlay' : 'interstitial'}>
      <div
        className="interstitial__content"
        style={{opacity: reveal, transform: `translateY(${(1 - reveal) * 10}px) scale(${zoom})`}}
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
