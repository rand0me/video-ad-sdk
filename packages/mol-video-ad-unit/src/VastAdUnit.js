/* eslint-disable promise/prefer-await-to-callbacks */
import {linearEvents} from 'mol-video-ad-tracker';
import Emitter from 'mol-tiny-emitter';
import {
  getClickThrough,
  getMediaFiles,
  getSkipoffset
} from 'mol-vast-selectors';
import canPlay from './helpers/utils/canPlay';
import sortMediaByBestFit from './helpers/utils/sortMediaByBestFit';
import initMetricHandlers from './helpers/metrics/initMetricHandlers';
import {
  addIcons,
  retrieveIcons
} from './helpers/icons';

const {
  complete,
  iconClick,
  iconView,
  progress,
  error
} = linearEvents;
const findBestMedia = (videoElement, mediaFiles, container) => {
  const screenRect = container.getBoundingClientRect();
  const suportedMediaFiles = mediaFiles.filter((mediaFile) => canPlay(videoElement, mediaFile));
  const sortedMediaFiles = sortMediaByBestFit(suportedMediaFiles, screenRect);

  return sortedMediaFiles[0];
};

const onErrorCallbacks = Symbol('onErrorCallbacks');
const onCompleteCallbacks = Symbol('onCompleteCallbacks');
const removeMetrichandlers = Symbol('removeMetrichandlers');
const removeIcons = Symbol('removeIcons');

class VastAdUnit extends Emitter {
  constructor (vastAdChain, videoAdContainer, {hooks = {}, logger = console} = {}) {
    super(logger);

    this.hooks = hooks;
    this.vastAdChain = vastAdChain;
    this.videoAdContainer = videoAdContainer;
    this.error = null;
    this.errorCode = null;
    this.assetUri = null;
    this.contentplayhead = null;
    this[onErrorCallbacks] = [];
    this[onCompleteCallbacks] = [];
  }

  run () {
    const videoAdContainer = this.videoAdContainer;
    const {videoElement, element} = videoAdContainer;
    const inlineAd = this.vastAdChain[0].ad;
    const mediaFiles = getMediaFiles(inlineAd);
    const media = mediaFiles && findBestMedia(videoElement, mediaFiles, element);
    const skipoffset = getSkipoffset(inlineAd);
    const clickThroughUrl = getClickThrough(inlineAd);
    const handleMetric = (event, data) => {
      this.emit(event, event, this, data);

      switch (event) {
      case progress: {
        const {contentplayhead} = data;

        this.contentplayhead = contentplayhead;
        this[onErrorCallbacks].forEach((callback) => callback(data));
        break;
      }
      case complete: {
        this[onCompleteCallbacks].forEach((callback) => callback());
        break;
      }
      case error: {
        this[onErrorCallbacks].forEach((callback) => callback());
        break;
      }
      }
    };

    if (!Boolean(media)) {
      throw new Error('Can\'t find a suitable media to play');
    }

    videoElement.src = media.src;
    this.assetUri = media.src;

    // eslint-disable-next-line object-property-newline
    this[removeMetrichandlers] = initMetricHandlers(videoAdContainer, handleMetric, {
      clickThroughUrl,
      skipoffset,
      ...this.hooks
    });

    const icons = retrieveIcons(this.vastAdChain);

    if (icons) {
      this[removeIcons] = addIcons(icons, {
        logger: this.logger,
        onIconClick: (icon) => this.emit(iconClick, iconClick, this, icon),
        onIconView: (icon) => this.emit(iconView, iconView, this, icon),
        videoAdContainer: this.videoAdContainer
      });
    }

    videoElement.play();
  }

  cancel () {
    const videoElement = this.videoAdContainer.videoElement;

    videoElement.pause();
  }

  onComplete (callback) {
    if (typeof callback !== 'function') {
      throw new TypeError('Expected a callback function');
    }

    this[onCompleteCallbacks].push(callback);
  }

  onError (callback) {
    if (typeof callback !== 'function') {
      throw new TypeError('Expected a callback function');
    }

    this[onErrorCallbacks].push(callback);
  }

  destroy () {
    this.videoAdContainer.videoElement.src = '';
    this[removeMetrichandlers]();

    this.vastAdChain = null;
    this.videoAdContainer = null;
    this.error = null;
    this.errorCode = null;
    this.assetUri = null;
    this.contentplayhead = null;
    this[onErrorCallbacks] = null;
    this[onCompleteCallbacks] = null;
    this[removeMetrichandlers] = null;

    if (this[removeIcons]) {
      this[removeIcons]();
    }
  }
}

export default VastAdUnit;
