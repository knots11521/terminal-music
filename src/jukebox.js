import net from 'node:net';
import process from 'node:process';
import chalk from 'chalk';

const PORT = parseInt(process.env.JUKEBOX_PORT, 10) || 3030;
const HOST = '127.0.0.1';
const SONG = 'song.mp3';
const W = 44; // inner content width (visible columns)
const BAR_W = 30;

const TL = '╔'; const TR = '╗'; const BL = '╚'; const BR = '╝';
const HL = '═'; const VL = '║';
const SEP_L = '╠'; const SEP_R = '╣';

const TOP = `${TL}${HL.repeat(W)}${TR}`;
const SEP = `${SEP_L}${HL.repeat(W)}${SEP_R}`;
const BOT = `${BL}${HL.repeat(W)}${BR}`;

function stripAnsi(str) {
  return String(str).replace(/\u001b\[[0-9;]*m/g, '');
}

function vw(str) {
  return stripAnsi(str).length;
}

function padTo(content, width) {
  const v = vw(content);
  return v >= width ? String(content) : String(content) + ' '.repeat(width - v);
}

function center(content) {
  const v = vw(content);
  if (v >= W) return String(content);
  const total = W - v;
  const left = Math.floor(total / 2);
  const right = total - left;
  return ' '.repeat(left) + String(content) + ' '.repeat(right);
}

function row(content = '') {
  return `${VL}${padTo(content, W)}${VL}`;
}

function fmtTime(seconds) {
  const total = Math.max(0, Math.floor(seconds));
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
}

function printAntenna() {
  console.log(' '.repeat(22) + chalk.gray('⚡'));
  console.log(' '.repeat(21) + chalk.gray('/|\\'));
}

function render(current, duration) {
  const pct = duration > 0 ? Math.min(1, current / duration) : 0;
  const pctStr = duration > 0 ? `${(pct * 100).toFixed(1)}%` : '--%';
  const filled = Math.round(pct * BAR_W);
  const bar = chalk.cyan('█'.repeat(filled)) + chalk.gray('░'.repeat(BAR_W - filled));
  const vuLine = `VU ${chalk.gray('│')}${bar}${chalk.gray('│')} ${chalk.gray(pctStr)}`;

  const leftT = fmtTime(current);
  const rightT = fmtTime(duration);
  const spacer = Math.max(4, W - leftT.length - rightT.length - 4);
  const timeLine = chalk.gray(`${leftT} ${'─'.repeat(spacer)} ${rightT}`);

  const songLine = `${chalk.yellow('♪')} Now Playing: ${chalk.white(SONG)}`;

  const buttons =
    `[${chalk.red('●')}] ○ ○   ${chalk.gray('[TUNE]')}` +
    `   ${chalk.red('⏹')}   ${chalk.green('[■]')}`;

  const speakerTop = chalk.gray('░░░  ░░░  ░░░  ░░░  ░░░');
  const speakerBot = chalk.gray('███  ███  ███  ███  ███');

  console.clear();
  printAntenna();
  console.log(TOP);
  console.log(row());
  console.log(row(center(chalk.bold.white('TERMINAL RADIO'))));
  console.log(SEP);
  console.log(row());
  console.log(row(songLine));
  console.log(row());
  console.log(row(vuLine));
  console.log(row(center(timeLine)));
  console.log(row());
  console.log(row(center(buttons)));
  console.log(row());
  console.log(row(center(speakerTop)));
  console.log(row(center(speakerBot)));
  console.log(BOT);
}

function renderWaiting() {
  console.clear();
  printAntenna();
  console.log(TOP);
  console.log(row());
  console.log(row(center(chalk.bold.white('TERMINAL RADIO'))));
  console.log(SEP);
  console.log(row());
  console.log(row(center(chalk.gray('Connecting to player...'))));
  console.log(row(center(chalk.gray(`(port ${PORT})`))));
  console.log(row());
  console.log(BOT);
}

function renderDisconnected() {
  console.clear();
  console.log(TOP);
  console.log(row());
  console.log(row(center(chalk.bold.yellow('TERMINAL RADIO'))));
  console.log(SEP);
  console.log(row());
  console.log(row(center(chalk.red('⚠  NO SIGNAL  DISCONNECTED'))));
  console.log(row());
  console.log(row(center(chalk.gray('Run "npm start" in another terminal.'))));
  console.log(row());
  console.log(BOT);
}

function hideCursor() {
  if (process.stdout.isTTY) {
    process.stdout.write('\x1b[?25l');
  }
}

function showCursor() {
  if (process.stdout.isTTY) {
    process.stdout.write('\x1b[?25h');
  }
}

hideCursor();
renderWaiting();

const socket = net.connect(PORT, HOST);

let buf = '';
socket.on('data', (chunk) => {
  buf += chunk.toString();
  let idx;
  while ((idx = buf.indexOf('\n')) !== -1) {
    const raw = buf.slice(0, idx);
    buf = buf.slice(idx + 1);
    const msg = raw.trim();
    if (!msg) continue;
    try {
      const state = JSON.parse(msg);
      if (state && state.t !== undefined && state.d !== undefined) {
        render(state.t, state.d);
      }
    } catch {
      // ignore malformed message
    }
  }
});

socket.on('error', (err) => {
  showCursor();
  console.clear();
  console.log(chalk.red(`[Jukebox] Cannot connect to port ${PORT}: ${err.message}`));
  console.log(chalk.gray('Make sure the main player is running (npm start) first.'));
  process.exit(1);
});

socket.on('close', () => {
  showCursor();
  renderDisconnected();
});

process.on('SIGINT', () => {
  showCursor();
  process.exit(0);
});
