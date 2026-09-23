import React from 'react';
import { Composition } from 'remotion';
import { Hero30s } from './compositions/Hero30s';
import { Short9x16 } from './compositions/Short9x16';

export const RemotionRoot: React.FC = () => (
  <>
    <Composition
      id="Hero30s"
      component={Hero30s}
      durationInFrames={900}
      fps={30}
      width={1920}
      height={1080}
      defaultProps={{}}
    />
    <Composition
      id="Short9x16"
      component={Short9x16}
      durationInFrames={450}
      fps={30}
      width={1080}
      height={1920}
      defaultProps={{}}
    />
  </>
);
