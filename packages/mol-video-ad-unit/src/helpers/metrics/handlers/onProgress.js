/* eslint-disable promise/prefer-await-to-callbacks, callback-return */
import {linearEvents} from 'mol-video-ad-tracker';
import formatProgress from '../../utils/formatProgress';

const {progress} = linearEvents;
const secondsToMilliseconds = (seconds) => seconds * 1000;

const onProgress = ({videoElement}, callback) => {
  const previousCurrentTime = secondsToMilliseconds(videoElement.currentTime);
  let accumulatedProgress = 0;

  const progressHandler = () => {
    const currentTime = videoElement.currentTime;
    const delta = Math.abs(currentTime - previousCurrentTime);

    accumulatedProgress += secondsToMilliseconds(delta);

    callback(progress, {
      accumulated: accumulatedProgress,
      contentplayhead: formatProgress(accumulatedProgress)
    });
  };

  videoElement.addEventListener('timeupdate', progressHandler);

  return () => {
    videoElement.removeEventListener('timeupdate', progressHandler);
  };
};

export default onProgress;
