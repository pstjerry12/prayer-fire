'use client';

import { useEffect, useRef, useState } from 'react';
import {
  Play, Pause, SkipBack, SkipForward, Upload, Trash2, Music, Link2, Loader2, X,
} from 'lucide-react';
import { cn } from '../utils/cn';
import { useApp } from '@/app/context';
import { getSongBlob } from '@/lib/audioStore';
import type { WorshipSong } from '@/app/types';

export default function WorshipPlayer({ compact = false }: { compact?: boolean }) {
  const { songs, addSongFiles, addSongUrl, removeSong } = useApp();
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const fileRef = useRef<HTMLInputElement | null>(null);

  const [currentId, setCurrentId] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const [uploading, setUploading] = useState(false);
  const [showUrl, setShowUrl] = useState(false);
  const [urlName, setUrlName] = useState('');
  const [urlLink, setUrlLink] = useState('');

  const current = songs.find((s) => s.id === currentId) || null;

  useEffect(() => {
    return () => {
      if (audioRef.current) audioRef.current.pause();
    };
  }, []);

  const playSong = async (song: WorshipSong) => {
    const audio = audioRef.current;
    if (!audio) return;
    setLoading(true);

    if (song.source === 'url' && song.url) {
      audio.src = song.url;
    } else {
      const blob = await getSongBlob(song.id);
      if (!blob) {
        setLoading(false);
        return;
      }
      audio.src = URL.createObjectURL(blob);
    }

    setCurrentId(song.id);
    audio.currentTime = 0;
    try {
      await audio.play();
      setIsPlaying(true);
    } catch {
      setIsPlaying(false);
    }
    setLoading(false);
  };

  const togglePlay = async () => {
    const audio = audioRef.current;
    if (!audio || !current) return;
    if (audio.paused) {
      try {
        await audio.play();
        setIsPlaying(true);
      } catch {
        setIsPlaying(false);
      }
    } else {
      audio.pause();
      setIsPlaying(false);
    }
  };

  const playIndex = (dir: 1 | -1) => {
    if (songs.length === 0) return;
    const idx = songs.findIndex((s) => s.id === currentId);
    const nextIdx = idx < 0 ? 0 : (idx + dir + songs.length) % songs.length;
    playSong(songs[nextIdx]);
  };

  const onTime = () => {
    const audio = audioRef.current;
    if (!audio) return;
    setProgress(audio.currentTime || 0);
    setDuration(audio.duration || 0);
  };

  const seek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const audio = audioRef.current;
    if (!audio) return;
    const t = Number(e.target.value);
    audio.currentTime = t;
    setProgress(t);
  };

  const handleFiles = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;
    setUploading(true);
    await addSongFiles(files);
    setUploading(false);
    if (fileRef.current) fileRef.current.value = '';
  };

  const handleUrl = async () => {
    if (!urlName.trim() || !urlLink.trim()) return;
    await addSongUrl(urlName, urlLink);
    setUrlName('');
    setUrlLink('');
    setShowUrl(false);
  };

  const handleRemove = async (song: WorshipSong) => {
    await removeSong(song.id);
    if (currentId === song.id) {
      audioRef.current?.pause();
      setIsPlaying(false);
      setCurrentId(null);
    }
  };

  const fmt = (s: number) => {
    if (!s || Number.isNaN(s)) return '0:00';
    const m = Math.floor(s / 60);
    const sec = Math.floor(s % 60);
    return `${m}:${sec.toString().padStart(2, '0')}`;
  };

  return (
    <div className="bg-card rounded-2xl border border-edge shadow-sm overflow-hidden">
      <div className="px-4 py-3 border-b border-edge flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Music className="w-4 h-4 text-acc" />
          <span className="font-bold text-sm text-ink">Praise & Worship Songs</span>
        </div>
        <div className="flex items-center gap-1.5">
          <button
            onClick={() => setShowUrl(!showUrl)}
            className="p-1.5 text-ink-muted hover:text-ink rounded-lg hover:bg-card-2 transition-colors"
            title="Add song by link"
          >
            <Link2 className="w-4 h-4" />
          </button>
          <button
            onClick={() => fileRef.current?.click()}
            disabled={uploading}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 text-white rounded-lg text-xs font-bold hover:bg-emerald-500 disabled:opacity-60"
          >
            {uploading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Upload className="w-3.5 h-3.5" />}
            Upload
          </button>
          <input ref={fileRef} type="file" accept="audio/*" multiple hidden onChange={handleFiles} />
        </div>
      </div>

      {/* Now playing bar */}
      {current && (
        <div className="px-4 py-3 bg-acc-soft/60 border-b border-edge">
          <p className="text-ink text-sm font-bold truncate">{current.name}</p>
          <div className="flex items-center gap-3 mt-2">
            <button onClick={() => playIndex(-1)} className="p-1.5 text-ink-muted hover:text-ink"><SkipBack className="w-4 h-4" /></button>
            <button
              onClick={togglePlay}
              disabled={loading}
              className="w-10 h-10 rounded-full bg-emerald-600 text-white flex items-center justify-center hover:bg-emerald-500 disabled:opacity-60"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : isPlaying ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5 ml-0.5" />}
            </button>
            <button onClick={() => playIndex(1)} className="p-1.5 text-ink-muted hover:text-ink"><SkipForward className="w-4 h-4" /></button>
            <input
              type="range"
              min={0}
              max={duration || 0}
              step={0.1}
              value={progress}
              onChange={seek}
              className="flex-1 accent-emerald-600"
            />
            <span className="text-[10px] text-ink-muted tabular-nums whitespace-nowrap">{fmt(progress)} / {fmt(duration)}</span>
          </div>
        </div>
      )}

      {/* Add-by-url form */}
      {showUrl && (
        <div className="px-4 py-3 border-b border-edge space-y-2">
          <input
            type="text"
            placeholder="Song title"
            value={urlName}
            onChange={(e) => setUrlName(e.target.value)}
            className="w-full bg-card border border-edge-strong rounded-lg px-3 py-2 text-sm text-ink placeholder-ink-faint focus:outline-none focus:ring-2 focus:ring-emerald-500/40"
          />
          <input
            type="url"
            placeholder="Audio link (mp3/m4a URL)"
            value={urlLink}
            onChange={(e) => setUrlLink(e.target.value)}
            className="w-full bg-card border border-edge-strong rounded-lg px-3 py-2 text-sm text-ink placeholder-ink-faint focus:outline-none focus:ring-2 focus:ring-emerald-500/40"
          />
          <div className="flex gap-2">
            <button onClick={handleUrl} className="flex-1 py-2 bg-emerald-600 text-white rounded-lg text-xs font-bold hover:bg-emerald-500">Add Song</button>
            <button onClick={() => setShowUrl(false)} className="px-3 py-2 bg-card-3 text-ink-muted rounded-lg text-xs font-semibold hover:bg-card-2"><X className="w-4 h-4" /></button>
          </div>
        </div>
      )}

      {/* Playlist */}
      <div className={cn('p-2', compact ? 'max-h-48' : 'max-h-64', 'overflow-y-auto')}>
        {songs.length === 0 ? (
          <div className="text-center py-6 px-4">
            <Music className="w-8 h-8 text-ink-ghost mx-auto mb-2" />
            <p className="text-ink-muted text-sm">No songs yet</p>
            <p className="text-ink-faint text-xs mt-1">Upload worship songs to play during your Praise & Worship session.</p>
          </div>
        ) : (
          songs.map((song) => {
            const active = song.id === currentId;
            return (
              <div
                key={song.id}
                className={cn(
                  'flex items-center gap-2 px-2 py-2 rounded-lg',
                  active ? 'bg-acc-soft' : 'hover:bg-card-2'
                )}
              >
                <button
                  onClick={() => (active ? togglePlay() : playSong(song))}
                  className="w-8 h-8 rounded-full flex-shrink-0 flex items-center justify-center bg-emerald-600 text-white hover:bg-emerald-500"
                >
                  {active && isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 ml-0.5" />}
                </button>
                <div className="flex-1 min-w-0">
                  <p className={cn('text-sm font-semibold truncate', active ? 'text-acc-strong' : 'text-ink')}>{song.name}</p>
                  <p className="text-[10px] text-ink-muted">{song.source === 'file' ? 'Uploaded song' : 'Streamed link'}</p>
                </div>
                <button onClick={() => handleRemove(song)} className="p-1.5 text-ink-faint hover:text-danger transition-colors" title="Remove">
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            );
          })
        )}
      </div>

      {/* Hidden audio element */}
      <audio
        ref={audioRef}
        onTimeUpdate={onTime}
        onLoadedMetadata={onTime}
        onEnded={() => playIndex(1)}
        onPlay={() => setIsPlaying(true)}
        onPause={() => setIsPlaying(false)}
      />
    </div>
  );
}
