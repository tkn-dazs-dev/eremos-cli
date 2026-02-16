import { describe, it, expect } from 'vitest';
import { mimeFromExtension } from '../utils/mime.js';

describe('mimeFromExtension', () => {
  it('maps image extensions', () => {
    expect(mimeFromExtension('photo.jpg')).toBe('image/jpeg');
    expect(mimeFromExtension('photo.jpeg')).toBe('image/jpeg');
    expect(mimeFromExtension('image.png')).toBe('image/png');
    expect(mimeFromExtension('image.webp')).toBe('image/webp');
    expect(mimeFromExtension('anim.gif')).toBe('image/gif');
  });

  it('maps video extensions', () => {
    expect(mimeFromExtension('clip.mp4')).toBe('video/mp4');
    expect(mimeFromExtension('clip.webm')).toBe('video/webm');
  });

  it('maps audio extensions', () => {
    expect(mimeFromExtension('track.mp3')).toBe('audio/mpeg');
    expect(mimeFromExtension('track.wav')).toBe('audio/wav');
    expect(mimeFromExtension('track.flac')).toBe('audio/flac');
  });

  it('maps skill file extensions', () => {
    expect(mimeFromExtension('skill.md')).toBe('text/markdown');
    expect(mimeFromExtension('data.json')).toBe('application/json');
    expect(mimeFromExtension('config.yaml')).toBe('application/x-yaml');
    expect(mimeFromExtension('config.yml')).toBe('application/x-yaml');
    expect(mimeFromExtension('notes.txt')).toBe('text/plain');
    expect(mimeFromExtension('data.csv')).toBe('text/csv');
    expect(mimeFromExtension('config.toml')).toBe('application/toml');
  });

  it('is case insensitive', () => {
    expect(mimeFromExtension('Photo.JPG')).toBe('image/jpeg');
    expect(mimeFromExtension('IMAGE.PNG')).toBe('image/png');
  });

  it('returns undefined for unknown extensions', () => {
    expect(mimeFromExtension('file.xyz')).toBeUndefined();
    expect(mimeFromExtension('noext')).toBeUndefined();
  });

  it('handles filenames with multiple dots', () => {
    expect(mimeFromExtension('my.photo.file.jpg')).toBe('image/jpeg');
  });
});
