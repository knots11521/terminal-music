export class SyncEngine {
  constructor(lyrics) {
    this.lyrics = lyrics;
    this.currentIndex = -1;
  }

  update(currentTime) {
    const activeIndex = this.lyrics.findIndex(
      (lyric) => currentTime >= lyric.start && currentTime < lyric.end
    );

    if (activeIndex !== -1 && activeIndex !== this.currentIndex) {
      this.currentIndex = activeIndex;
      return {
        changed: true,
        lyric: this.lyrics[activeIndex],
        index: activeIndex
      };
    }

    return { changed: false, lyric: null, index: this.currentIndex };
  }

  getCurrentLyric(currentTime) {
    return this.lyrics.find(
      (lyric) => currentTime >= lyric.start && currentTime < lyric.end
    );
  }

  reset() {
    this.currentIndex = -1;
  }
}
