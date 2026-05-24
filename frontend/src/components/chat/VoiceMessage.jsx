import { useState, useRef, useEffect, useCallback } from 'react';
import { Play, Pause, Mic } from 'lucide-react';

const VoiceMessage = ({ mediaUrl, duration, isOwn }) => {
  const [playing, setPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [audioDuration, setAudioDuration] = useState(duration || 0);
  const [error, setError] = useState(false);
  const audioRef = useRef(null);

  // Use mediaUrl directly — Cloudinary video/upload serves webm with correct Content-Type
  // raw/upload URLs (old broken uploads) will 404 and trigger the error state
  const resolvedUrl = mediaUrl || '';

  // Attach all event listeners after mount and re-attach if mediaUrl changes
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio || !resolvedUrl) return;

    // Reset state when URL changes (new message renders same component slot)
    setPlaying(false);
    setProgress(0);
    setCurrentTime(0);
    setError(false);

    // Set src directly — more reliable than <source> children for dynamic URLs
    audio.src = resolvedUrl;
    audio.load();

    const onTimeUpdate = () => {
      const dur = isFinite(audio.duration) ? audio.duration : (duration || 0);
      if (!dur) return;
      setCurrentTime(audio.currentTime);
      setProgress((audio.currentTime / dur) * 100);
    };
    const onEnded = () => {
      setPlaying(false);
      setProgress(0);
      setCurrentTime(0);
      audio.currentTime = 0;
    };
    const onLoadedMetadata = () => {
      // Only use audio.duration if it is a real finite number
      if (audio.duration && isFinite(audio.duration) && !isNaN(audio.duration)) {
        setAudioDuration(Math.round(audio.duration));
      }
    };
    const onError = (e) => {
      const err = audio.error;
      console.warn('[VoiceMessage] Audio error for URL:', resolvedUrl,
        'code:', err?.code, 'message:', err?.message, e);
      setPlaying(false);
      setError(true);
    };
    const onCanPlay = () => console.log('[VoiceMessage] canplay fired for:', resolvedUrl);
    const onPause = () => setPlaying(false);
    const onPlay = () => setPlaying(true);

    audio.addEventListener('timeupdate', onTimeUpdate);
    audio.addEventListener('ended', onEnded);
    audio.addEventListener('loadedmetadata', onLoadedMetadata);
    audio.addEventListener('error', onError);
    audio.addEventListener('canplay', onCanPlay);
    audio.addEventListener('pause', onPause);
    audio.addEventListener('play', onPlay);

    return () => {
      audio.pause();
      audio.removeEventListener('timeupdate', onTimeUpdate);
      audio.removeEventListener('ended', onEnded);
      audio.removeEventListener('loadedmetadata', onLoadedMetadata);
      audio.removeEventListener('error', onError);
      audio.removeEventListener('canplay', onCanPlay);
      audio.removeEventListener('pause', onPause);
      audio.removeEventListener('play', onPlay);
    };
  }, [resolvedUrl]);

  const togglePlay = useCallback(async () => {
    const audio = audioRef.current;
    if (!audio || error) return;

    if (!playing) {
      // Pause all other audio elements on the page before playing this one
      document.querySelectorAll('audio').forEach((el) => {
        if (el !== audio) el.pause();
      });
      try {
        await audio.play();
      } catch (e) {
        // Autoplay blocked or decode error — reload and retry once
        audio.load();
        try { await audio.play(); } catch { setError(true); }
      }
    } else {
      audio.pause();
    }
  }, [playing, error]);

  const handleSeek = (e) => {
    const audio = audioRef.current;
    const dur = audio && isFinite(audio.duration) ? audio.duration : (duration || 0);
    if (!audio || !dur) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const ratio = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    audio.currentTime = ratio * dur;
    setProgress(ratio * 100);
  };

  const formatTime = (secs) => {
    const s = Math.floor(secs || 0);
    return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
  };

  if (error) {
    return (
      <div className={`flex items-center gap-2 px-3 py-2 rounded-xl text-xs opacity-50 ${
        isOwn ? 'bg-cyan-700 text-white' : 'bg-[#1E293B] text-slate-400'
      }`}>
        <Mic className="w-3 h-3 shrink-0" />
        <span>Voice message unavailable</span>
      </div>
    );
  }

  return (
    <div className={`flex items-center gap-2.5 px-3 py-2.5 rounded-xl min-w-[200px] max-w-[260px] ${
      isOwn ? 'bg-cyan-600' : 'bg-[#1E293B]'
    }`}>
      {/* Hidden audio element — src set imperatively in useEffect */}
      <audio ref={audioRef} preload="metadata" />

      <button
        onClick={togglePlay}
        className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 transition-colors ${
          isOwn ? 'bg-white/20 hover:bg-white/30' : 'bg-cyan-500/20 hover:bg-cyan-500/30'
        }`}
      >
        {playing
          ? <Pause className={`w-3.5 h-3.5 ${isOwn ? 'text-white' : 'text-cyan-400'}`} />
          : <Play className={`w-3.5 h-3.5 ml-0.5 ${isOwn ? 'text-white' : 'text-cyan-400'}`} />
        }
      </button>

      <div className="flex-1 flex flex-col gap-1 min-w-0">
        <div
          className={`h-1.5 rounded-full cursor-pointer ${isOwn ? 'bg-white/20' : 'bg-slate-600'}`}
          onClick={handleSeek}
        >
          <div
            className={`h-full rounded-full ${isOwn ? 'bg-white' : 'bg-cyan-400'}`}
            style={{ width: `${progress}%`, transition: playing ? 'width 0.1s linear' : 'none' }}
          />
        </div>

        <div className="flex items-center justify-between">
          <span className={`text-[10px] font-mono ${isOwn ? 'text-white/70' : 'text-slate-500'}`}>
            {playing ? formatTime(currentTime) : formatTime(audioDuration || 0)}
          </span>
          <Mic className={`w-2.5 h-2.5 ${isOwn ? 'text-white/50' : 'text-slate-600'}`} />
        </div>
      </div>
    </div>
  );
};

export default VoiceMessage;
