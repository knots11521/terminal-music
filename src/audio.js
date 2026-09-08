import Audic from 'audic';
import fs from 'node:fs';
import path from 'node:path';

export class AudioPlayer {
  constructor(filePath) {
    const absolutePath = path.resolve(filePath);
    if (!fs.existsSync(absolutePath)) {
      throw new Error(`Music file not found: ${filePath}`);
    }

    this.filePath = absolutePath;
    this.player = null;
    this.startTime = null;
    this.pauseOffset = 0;
    this.isPlaying = false;
    this._ended = false;
    this._playStarted = false;
    this._onEndedCallback = null;
  }

  async play() {
    this.player = new Audic(this.filePath);

    try {
      await this.player.play();
    } catch (err) {
      throw new Error(`Unable to play audio: ${err.message}`);
    }

    this.startTime = process.hrtime.bigint();
    this.isPlaying = true;
    this._playStarted = true;
  }

  getDuration() {
    if (!this.player) {
      return 0;
    }
    const d = this.player.duration;
    return typeof d === 'number' ? d : 0;
  }

  getCurrentTime() {
    if (!this.isPlaying) {
      return this.pauseOffset;
    }

    // High-resolution clock as primary source for smooth tick-based sync
    if (this.startTime) {
      const elapsedNs = process.hrtime.bigint() - this.startTime;
      const elapsedSeconds = Number(elapsedNs) / 1e9;
      return this.pauseOffset + elapsedSeconds;
    }

    return this.pauseOffset;
  }

  /**
   * Polls VLC's internal time update (refreshed every ~1s by audic)
   * to detect end-of-track. Call this from the sync loop.
   */
  pollEnded() {
    if (this._ended || !this.isPlaying || !this.player || !this._playStarted) {
      return false;
    }

    const vlcDuration = typeof this.player.duration === 'number' ? this.player.duration : 0;
    const vlcCurrentTime = typeof this.player.currentTime === 'number' ? this.player.currentTime : 0;

    // End condition 1: VLC reports playback time >= duration (both in ms)
    if (vlcDuration > 0 && vlcCurrentTime >= vlcDuration) {
      this._ended = true;
      this.isPlaying = false;
      if (this._onEndedCallback) {
        this._onEndedCallback();
      }
      return true;
    }

    // End condition 2: VLC went idle (both 0, playing flag is false)
    if (vlcDuration === 0 && vlcCurrentTime === 0 && this.player.playing === false) {
      this._ended = true;
      this.isPlaying = false;
      if (this._onEndedCallback) {
        this._onEndedCallback();
      }
      return true;
    }

    return false;
  }

  async pause() {
    this.pauseOffset = this.getCurrentTime();
    if (this.player && typeof this.player.pause === 'function') {
      try {
        await this.player.pause();
      } catch {
        // ignore pause errors
      }
    }
    this.isPlaying = false;
    this.startTime = null;
  }

  stop() {
    this.isPlaying = false;
    this._ended = true;
    this.startTime = null;
    if (this.player && typeof this.player.destroy === 'function') {
      this.player.destroy();
    }
  }

  onEnded(callback) {
    this._onEndedCallback = callback;
  }

  destroy() {
    this.isPlaying = false;
    this._ended = true;
    this.startTime = null;
    if (this.player && typeof this.player.destroy === 'function') {
      this.player.destroy();
    }
  }

  get ended() {
    return this._ended;
  }
}
