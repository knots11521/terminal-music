import path from 'node:path';
import process from 'node:process';
import net from 'node:net';
import chalk from 'chalk';
import 'dotenv/config';
import { loadLyrics } from './lyrics.js';
import { AudioPlayer } from './audio.js';
import { SyncEngine } from './sync.js';
import { Typewriter } from './typewriter.js';

const MUSIC_FILE = process.env.MUSIC_FILE || path.join('music', 'song.mp3');
const LYRICS_FILE = process.env.LYRICS_FILE || path.join('lyrics', 'song.json');
const TICK_INTERVAL_MS = 50;
const JUKEBOX_PORT = parseInt(process.env.JUKEBOX_PORT, 10) || 3030;

async function main() {
  console.clear();
  console.log(chalk.bold.white('♪ Terminal Lyrics Sync Engine\n'));

  let lyrics;
  let audio;

  try {
    lyrics = loadLyrics(LYRICS_FILE);
    console.log(chalk.green(`✔ Loaded ${lyrics.length} lyric lines.`));
  } catch (err) {
    console.error(chalk.red(`[Lyrics Error] ${err.message}`));
    process.exit(1);
  }

  try {
    audio = new AudioPlayer(MUSIC_FILE);
    console.log(chalk.green(`✔ Audio track ready: ${MUSIC_FILE}`));
  } catch (err) {
    console.error(chalk.red(`[Audio Error] ${err.message}`));
    process.exit(1);
  }

  const sync = new SyncEngine(lyrics);
  const writer = new Typewriter({ speed: 45 });
  const maxEnd = lyrics.reduce((max, l) => Math.max(max, l.end), 0);
  const songDuration = () => {
    const vlcDuration = audio.getDuration();
    return vlcDuration > 0 ? vlcDuration : maxEnd;
  };

  // Jukebox: local TCP server broadcasting playback position to a second terminal.
  const jukeboxClients = new Set();
  const jukeboxServer = net.createServer((socket) => {
    jukeboxClients.add(socket);
    socket.on('error', () => jukeboxClients.delete(socket));
    socket.on('close', () => jukeboxClients.delete(socket));
  });
  jukeboxServer.on('error', (err) => {
    if (err.code === 'EADDRINUSE') {
      console.warn(chalk.yellow(`[Jukebox] Port ${JUKEBOX_PORT} in use; jukebox disabled.`));
    } else {
      console.error(chalk.red(`[Jukebox] Server error: ${err.message}`));
    }
  });
  jukeboxServer.listen(JUKEBOX_PORT, '127.0.0.1');

  const broadcastProgress = (currentTime) => {
    if (jukeboxClients.size === 0) return;
    const payload = JSON.stringify({ t: currentTime, d: songDuration() }) + '\n';
    for (const client of jukeboxClients) {
      if (!client.writableEnded) {
        try {
          client.write(payload);
        } catch {
          // ignore writes to a disconnected client
        }
      }
    }
  };

  console.log(chalk.gray('\nStarting playback...\n'));

  try {
    await audio.play();
  } catch (err) {
    console.error(chalk.red(`[Playback Error] ${err.message}`));
    process.exit(1);
  }

  let lastTime = 0;

  const loop = setInterval(() => {
    if (audio.pollEnded()) {
      cleanup();
      return;
    }

    if (audio.ended) {
      cleanup();
      return;
    }

    const currentTime = audio.getCurrentTime();

    // Push live progress to the jukebox terminal on every tick.
    broadcastProgress(currentTime);

    if (Math.abs(currentTime - lastTime) < 0.01) {
      return;
    }
    lastTime = currentTime;

    const result = sync.update(currentTime);

    if (result.changed && result.lyric) {
      process.stdout.write('\n');
      writer.render(result.lyric.text);
    }
  }, TICK_INTERVAL_MS);

  const cleanup = () => {
    clearInterval(loop);
    writer.stop();
    broadcastProgress(songDuration());
    for (const client of jukeboxClients) {
      try {
        client.end();
      } catch {
        // ignore
      }
    }
    jukeboxServer.close();
    audio.destroy();
    console.log(chalk.yellow('\n\nPlayback ended. Shutdown complete.'));
    process.exit(0);
  };

  process.on('SIGINT', cleanup);
  process.on('SIGTERM', cleanup);
}

main();
