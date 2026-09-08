import chalk from 'chalk';

export class Typewriter {
  constructor(options = {}) {
    this.speed = options.speed || 40;
    this.cursor = options.cursor ?? '█';
    this.color = options.color || chalk.white;
    this.timer = null;
    this.active = false;
  }

  stop() {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
    this.active = false;
  }

  render(text) {
    this.stop();
    this.active = true;

    const isTTY = process.stdout.isTTY;

    if (isTTY) {
      process.stdout.clearLine(0);
      process.stdout.cursorTo(0);
    }

    const chars = [...text];
    let charIndex = 0;

    if (chars.length === 0) {
      process.stdout.write(this.color(this.cursor));
      this.active = false;
      return;
    }

    if (!isTTY) {
      // Non-TTY fallback: print full text at once
      process.stdout.write(this.color(text) + '\n');
      this.active = false;
      return;
    }

    this.timer = setInterval(() => {
      if (!this.active) {
        return;
      }

      if (charIndex < chars.length) {
        process.stdout.write(this.color(chars[charIndex]));
        charIndex++;
      } else {
        process.stdout.write(chalk.gray(this.cursor));
        this.stop();
      }
    }, this.speed);
  }
}
