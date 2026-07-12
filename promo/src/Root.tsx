import {Composition} from 'remotion';
import {Promo} from './Promo';
import './styles.css';

export const RemotionRoot = () => {
  return (
    <Composition
      id="AEAIChatPromo"
      component={Promo}
      durationInFrames={300}
      fps={30}
      width={1920}
      height={1080}
    />
  );
};
