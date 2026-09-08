import fs from 'node:fs';
import path from 'node:path';

/**
 * Parse a timestamp value into seconds (float).
 *
 * Accepts:
 *   - A number (assumed to already be in seconds)
 *   - A numeric string like "15.08" (seconds)
 *   - SRT-style timestamp strings like "00:00:15,079" or "00:00:15.079"
 */
function parseTimestamp(value, index) {
  if (typeof value === 'number') {
    if (!Number.isFinite(value) || value < 0) {
      throw new Error(`Invalid lyric timestamp at entry ${index}.`);
    }
    return value;
  }

  if (typeof value === 'string') {
    const str = value.trim();

    // SRT timestamp: HH:MM:SS,mmm or HH:MM:SS.mmm
    const srtMatch = str.match(/^(\d+):(\d{2}):(\d{2})[,.](\d{3})$/);
    if (srtMatch) {
      const h = parseInt(srtMatch[1], 10);
      const m = parseInt(srtMatch[2], 10);
      const s = parseInt(srtMatch[3], 10);
      const ms = parseInt(srtMatch[4], 10);
      return h * 3600 + m * 60 + s + ms / 1000;
    }

    // Plain numeric string
    const parsed = parseFloat(str);
    if (Number.isFinite(parsed) && parsed >= 0) {
      return parsed;
    }
  }

  throw new Error(`Invalid lyric timestamp at entry ${index}.`);
}

export function loadLyrics(filePath) {
  const absolutePath = path.resolve(filePath);

  if (!fs.existsSync(absolutePath)) {
    throw new Error(`Lyrics file not found: ${filePath}`);
  }

  let rawData;
  try {
    rawData = fs.readFileSync(absolutePath, 'utf8');
  } catch (err) {
    throw new Error(`Failed to read lyrics file: ${err.message}`);
  }

  let lyrics;
  try {
    lyrics = JSON.parse(rawData);
  } catch (err) {
    throw new Error(`Invalid lyrics JSON.`);
  }

  if (!Array.isArray(lyrics)) {
    throw new Error('Lyrics JSON root structure must be an Array.');
  }

  if (lyrics.length === 0) {
    throw new Error('Lyrics JSON array is empty.');
  }

  const normalized = lyrics.map((item, index) => {
    if (typeof item !== 'object' || item === null) {
      throw new Error(`Invalid lyric entry at index ${index}: expected an object.`);
    }

    const start = parseTimestamp(item.start, index);
    const end = parseTimestamp(item.end, index);

    if (end < start) {
      throw new Error(`Invalid lyric timestamp at entry ${index}.`);
    }
    if (typeof item.text !== 'string') {
      throw new Error(`Invalid or missing 'text' field at entry index ${index}`);
    }

    return {
      start: Number(start.toFixed(3)),
      end: Number(end.toFixed(3)),
      text: item.text.trim()
    };
  });

  normalized.sort((a, b) => a.start - b.start);

  return normalized;
}
