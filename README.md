# Terminal Lyrics Sync

A terminal-based lyrics player that synchronizes timestamped lyrics with music playback and renders them using a typewriter effect.

## Installation

Git clone this repo:

```bash
git clone https://github.com/your-username/terminal-lyrics-sync.git
cd terminal-lyrics-sync
```

Then install dependencies:

```bash
npm install
```

## Requirements

- Node.js >= 18
- npm

## Installation

```bash
npm install
```

## Usage

1. Place an MP3 file in `music/song.mp3`
2. Create `lyrics/song.json` with matching timestamps
3. Run:

```bash
npm start
```

Or directly:

```bash
node src/index.js
```

## Jukebox Mode (two terminals)

You can display a synchronized jukebox in a second terminal while the lyrics play in the first.

1. Start the player (**Terminal 1**):

```bash
npm start
```

2. In a **separate terminal**, start the jukebox (**Terminal 2**):

```bash
npm run jukebox
```

The player opens a local TCP server (default port `3030`; set `JUKEBOX_PORT`) and pushes the live playback position to the jukebox terminal, which renders a terminal radio display with a VU meter, percentage, playback time, and transport controls. No jukebox connection is required for the lyrics terminal to keep working.

## Lyrics JSON Format

The lyrics file is a JSON array of line objects. Each entry uses `start` / `end`
timestamps and `text`.

```json
[
  {
    "start": 0.00,
    "end": 3.50,
    "text": "Hello, how are you?"
  },
  {
    "start": 3.50,
    "end": 7.20,
    "text": "I've been waiting for you"
  }
]
```

### Fields

| Field  | Type           | Description                                                |
|--------|----------------|------------------------------------------------------------|
| `start`| number\|string | Time in seconds (or SRT-style `HH:MM:SS,mmm`) when lyric starts |
| `end`  | number\|string | Time in seconds (or SRT-style `HH:MM:SS,mmm`) when lyric ends   |
| `text` | string         | Text to display                                            |

### Timestamp Formats

The loader (`src/lyrics.js`) normalizes and validates every entry. Accepted
`start`/`end` values are:

- A **number** in seconds, e.g. `3.50`
- A **numeric string** in seconds, e.g. `"3.50"`
- An **SRT-style timestamp** string, e.g. `"00:00:03,500"` or `"00:00:03.500"`

Entries whose `end` is earlier than its `start`, or whose text is missing, are
rejected. Lines are sorted by `start` before playback.

## Architecture

- **Audio Player** (`src/audio.js`): Wraps `audic` for MP3 playback with `getCurrentTime()` and `getDuration()` using high-resolution process timers
- **Lyrics Loader** (`src/lyrics.js`): Reads and validates the lyrics JSON
- **Sync Engine** (`src/sync.js`): Finds the active lyric based on audio playback position
- **Typewriter** (`src/typewriter.js`): Renders text character-by-character with configurable speed
- **Jukebox Broadcaster** (`src/index.js`): Hosts a local TCP server that pushes live playback position (seconds) to connected jukebox clients
- **Jukebox Display** (`src/jukebox.js`): Connects to the TCP server and renders a terminal radio display (VU meter, playback time, percentage, and transport controls) in a second terminal
- **Entry Point** (`src/index.js`): Orchestrates playback, synchronization loop, and the jukebox broadcaster

## Configuration

The following environment variables are supported (see `.env.example`):

| Variable       | Default            | Description                                        |
|----------------|--------------------|----------------------------------------------------|
| `MUSIC_FILE`   | `music/song.mp3`   | Path to the MP3 audio file to play                  |
| `LYRICS_FILE`  | `lyrics/song.json` | Path to the lyrics JSON file                        |
| `JUKEBOX_PORT` | `3030`             | TCP port the jukebox terminal connects to           |

## Transcribing Lyrics from Audio

You can transcribe lyrics timestamps from your audio using [Hazur Taplrc](https://hazur.io/taplrc) — this is where transcript my audio and layrics.

## License

MIT
