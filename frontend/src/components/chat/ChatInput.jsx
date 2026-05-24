import { useState, useRef, useEffect, useCallback } from 'react';
import { Send, Mic, MicOff, X, Image as ImageIcon, Loader2, ChevronDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { uploadAPI } from '@/services/api';
import { toast } from '@/hooks/use-toast';

const ALLOWED_IMAGES = ['image/png', 'image/jpeg', 'image/jpg', 'image/webp', 'image/gif'];

const ChatInput = ({ roomId, connected, onSendMessage }) => {
  const [text, setText] = useState('');
  const [imagePreview, setImagePreview] = useState(null); // { file, previewUrl }
  const [uploading, setUploading] = useState(false);

  // Voice recording state
  const [recording, setRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [audioBlob, setAudioBlob] = useState(null);
  const [audioPreviewUrl, setAudioPreviewUrl] = useState(null);
  const [micDevices, setMicDevices] = useState([]);
  const [selectedMicId, setSelectedMicId] = useState('');
  const [showMicPicker, setShowMicPicker] = useState(false);

  const fileInputRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const chunksRef = useRef([]);
  const timerRef = useRef(null);

  // Clean up preview URLs on unmount
  useEffect(() => {
    return () => {
      if (imagePreview?.previewUrl) URL.revokeObjectURL(imagePreview.previewUrl);
      if (audioPreviewUrl) URL.revokeObjectURL(audioPreviewUrl);
    };
  }, []);

  // Enumerate microphone devices, auto-select best one (skip Stereo Mix / loopback)
  useEffect(() => {
    const loadMics = async () => {
      try {
        // Need a brief permission request to get device labels
        const tempStream = await navigator.mediaDevices.getUserMedia({ audio: true });
        tempStream.getTracks().forEach(t => t.stop());
        const devices = await navigator.mediaDevices.enumerateDevices();
        const mics = devices.filter(d => d.kind === 'audioinput');
        setMicDevices(mics);
        // Auto-pick: prefer devices that don't look like loopback/stereo mix
        const loopbackPattern = /stereo mix|what u hear|wave out|loopback|output|speaker/i;
        const preferred = mics.find(d => !loopbackPattern.test(d.label)) || mics[0];
        if (preferred) setSelectedMicId(preferred.deviceId);
      } catch { /* permission not granted yet — will load on first record */ }
    };
    loadMics();
  }, []);

  // ── Image handling ──────────────────────────────────────────────────────────
  const handleImageSelect = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!ALLOWED_IMAGES.includes(file.type)) {
      toast({ title: 'Unsupported format', description: 'Use PNG, JPG, WEBP or GIF', variant: 'destructive' });
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      toast({ title: 'File too large', description: 'Max image size is 10MB', variant: 'destructive' });
      return;
    }
    const previewUrl = URL.createObjectURL(file);
    setImagePreview({ file, previewUrl });
    e.target.value = '';
  };

  const clearImage = () => {
    if (imagePreview?.previewUrl) URL.revokeObjectURL(imagePreview.previewUrl);
    setImagePreview(null);
  };

  // ── Voice recording ─────────────────────────────────────────────────────────

  // Pick the first MIME type the browser actually supports
  const getSupportedMimeType = () => {
    const types = [
      'audio/webm;codecs=opus',
      'audio/webm',
      'audio/ogg;codecs=opus',
      'audio/ogg',
      'audio/mp4',
    ];
    return types.find(t => MediaRecorder.isTypeSupported(t)) || '';
  };

  const getBestMicId = async () => {
    const loopbackPattern = /stereo mix|what u hear|wave out|loopback|output|speaker/i;
    // Get fresh device list (labels need permission which we already have)
    const devices = await navigator.mediaDevices.enumerateDevices();
    const mics = devices.filter(d => d.kind === 'audioinput');
    if (mics.length > 0) setMicDevices(mics);

    // If currently selected mic is a loopback, auto-switch to real one
    const currentDevice = mics.find(d => d.deviceId === selectedMicId);
    if (!currentDevice || loopbackPattern.test(currentDevice.label)) {
      const realMic = mics.find(d => !loopbackPattern.test(d.label));
      if (realMic) {
        setSelectedMicId(realMic.deviceId);
        return realMic.deviceId;
      }
    }
    return selectedMicId || mics[0]?.deviceId || '';
  };

  const startRecording = async () => {
    try {
      // Always resolve best non-loopback mic before recording
      const micId = await getBestMicId();

      const audioConstraints = {
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true,
        sampleRate: 48000,
        channelCount: 1,
        ...(micId ? { deviceId: { exact: micId } } : {}),
      };
      const stream = await navigator.mediaDevices.getUserMedia({ audio: audioConstraints });
      const tracks = stream.getAudioTracks();
      console.log('[REC] Audio tracks:', tracks.length, tracks[0]?.label, tracks[0]?.readyState);

      chunksRef.current = [];

      const mimeType = getSupportedMimeType();
      console.log('[REC] Chosen mimeType:', mimeType || '(browser default)');

      let mr;
      try {
        mr = mimeType ? new MediaRecorder(stream, { mimeType }) : new MediaRecorder(stream);
      } catch (e) {
        console.warn('[REC] mimeType rejected, falling back:', e.message);
        mr = new MediaRecorder(stream);
      }

      const actualMime = mr.mimeType || mimeType || 'audio/webm';
      console.log('[REC] MediaRecorder actual mimeType:', actualMime, '| state:', mr.state);

      mr.ondataavailable = (e) => {
        console.log('[REC] chunk size:', e.data.size, 'type:', e.data.type);
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };
      mr.onstop = () => {
        stream.getTracks().forEach(t => t.stop());
        console.log('[REC] stopped. total chunks:', chunksRef.current.length);
        const totalSize = chunksRef.current.reduce((s, c) => s + c.size, 0);
        console.log('[REC] total blob size:', totalSize, 'mimeType:', actualMime);
        if (totalSize === 0) {
          toast({ title: 'Recording empty', description: 'No audio data was captured. Check microphone permissions.', variant: 'destructive' });
          return;
        }
        const blob = new Blob(chunksRef.current, { type: actualMime });
        const url = URL.createObjectURL(blob);
        setAudioBlob(blob);
        setAudioPreviewUrl(url);
      };
      mr.onerror = (e) => {
        console.error('[REC] MediaRecorder error:', e.error);
        toast({ title: 'Recording error', description: e.error?.message || 'Unknown error', variant: 'destructive' });
      };
      mr.start(100); // 100ms timeslice — smooth consistent chunks, prevents peaks/drops
      console.log('[REC] started');
      mediaRecorderRef.current = mr;
      setRecording(true);
      setRecordingTime(0);
      timerRef.current = setInterval(() => setRecordingTime(t => t + 1), 1000);
    } catch (err) {
      console.error('[REC] getUserMedia error:', err.name, err.message);
      if (err.name === 'NotAllowedError') {
        toast({ title: 'Microphone access denied', description: 'Please allow microphone access and try again.', variant: 'destructive' });
      } else {
        toast({ title: 'Recording failed', description: err.message || 'Could not start recording', variant: 'destructive' });
      }
    }
  };

  const stopRecording = () => {
    mediaRecorderRef.current?.stop();
    clearInterval(timerRef.current);
    setRecording(false);
  };

  const cancelRecording = () => {
    mediaRecorderRef.current?.stop();
    clearInterval(timerRef.current);
    setRecording(false);
    setRecordingTime(0);
    setAudioBlob(null);
    if (audioPreviewUrl) { URL.revokeObjectURL(audioPreviewUrl); setAudioPreviewUrl(null); }
  };

  const formatTime = (s) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;

  // ── Send ────────────────────────────────────────────────────────────────────
  const handleSend = useCallback(async (e) => {
    e?.preventDefault();
    if (uploading) return;

    // Send image
    if (imagePreview) {
      setUploading(true);
      try {
        const res = await uploadAPI.uploadFile(imagePreview.file);
        const { mediaUrl, mimeType } = res.data.data;
        onSendMessage(text.trim(), { type: 'image', mediaUrl, mimeType });
        clearImage();
        setText('');
      } catch {
        toast({ title: 'Upload failed', description: 'Could not upload image', variant: 'destructive' });
      } finally {
        setUploading(false);
      }
      return;
    }

    // Send voice
    if (audioBlob) {
      setUploading(true);
      try {
        const mime = audioBlob.type || 'audio/webm';
        const ext = mime.includes('ogg') ? 'ogg' : mime.includes('mp4') ? 'mp4' : 'webm';
        const file = new File([audioBlob], `voice-${Date.now()}.${ext}`, { type: mime });
        console.log('[SEND] Uploading voice:', file.name, file.size, 'bytes', file.type);
        const res = await uploadAPI.uploadFile(file);
        console.log('[SEND] Upload response:', res.data);
        const { mediaUrl, mimeType } = res.data.data;
        console.log('[SEND] mediaUrl:', mediaUrl, 'mimeType:', mimeType);
        onSendMessage('', { type: 'audio', mediaUrl, mimeType, duration: recordingTime });
        cancelRecording();
      } catch (err) {
        console.error('[SEND] Voice upload error:', err?.response?.status, err?.response?.data, err?.message);
        toast({ title: 'Upload failed', description: err?.response?.data?.message || err.message || 'Could not upload voice message', variant: 'destructive' });
      } finally {
        setUploading(false);
      }
      return;
    }

    // Send text
    if (text.trim()) {
      onSendMessage(text.trim());
      setText('');
    }
  }, [connected, uploading, imagePreview, audioBlob, text, recordingTime, onSendMessage]);

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); }
  };

  // Media can be uploaded even if socket briefly disconnects; text needs connection
  const canSend = !uploading && (imagePreview || audioBlob || (connected && text.trim()));

  // ── Render ──────────────────────────────────────────────────────────────────
  return (
    <div className="px-4 py-3 border-t border-slate-800/50 bg-[#111827] shrink-0">

      {/* Image preview */}
      {imagePreview && (
        <div className="mb-2 relative inline-block">
          <img
            src={imagePreview.previewUrl}
            alt="preview"
            className="h-24 w-auto max-w-[200px] rounded-lg object-cover border border-slate-700"
          />
          <button
            onClick={clearImage}
            className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-slate-900 border border-slate-700 rounded-full flex items-center justify-center hover:bg-red-500/20 hover:border-red-500/50 transition-colors"
          >
            <X className="w-3 h-3 text-slate-400 hover:text-red-400" />
          </button>
          <p className="text-[10px] text-slate-500 mt-0.5">{imagePreview.file.name}</p>
        </div>
      )}

      {/* Audio preview */}
      {audioPreviewUrl && !recording && (
        <div className="mb-2 flex items-center gap-2 px-3 py-2 bg-slate-800/60 rounded-lg border border-slate-700/50 max-w-[260px]">
          <Mic className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
          <audio src={audioPreviewUrl} controls className="h-7 flex-1 min-w-0" style={{ filter: 'invert(0)' }} />
          <button onClick={cancelRecording} className="text-slate-500 hover:text-red-400 transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Recording indicator */}
      {recording && (
        <div className="mb-2 flex items-center gap-3 px-3 py-2 bg-red-500/10 border border-red-500/30 rounded-lg">
          <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
          <span className="text-sm text-red-400 font-mono">{formatTime(recordingTime)}</span>
          <span className="text-xs text-slate-500 flex-1">Recording...</span>
          <button onClick={stopRecording} className="text-xs text-slate-400 hover:text-white px-2 py-0.5 bg-slate-700 rounded transition-colors">
            Stop
          </button>
          <button onClick={cancelRecording} className="text-slate-500 hover:text-red-400 transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Input row */}
      <form onSubmit={handleSend} className="flex items-center gap-2">
        {/* Image upload button */}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/png,image/jpeg,image/jpg,image/webp,image/gif"
          className="hidden"
          onChange={handleImageSelect}
        />
        <Button
          type="button"
          variant="ghost"
          size="icon"
          onClick={() => fileInputRef.current?.click()}
          disabled={!connected || recording || !!audioBlob}
          title="Share image"
          className="h-9 w-9 shrink-0 text-slate-500 hover:text-cyan-400 hover:bg-cyan-500/10 disabled:opacity-40"
        >
          <ImageIcon className="w-4 h-4" />
        </Button>

        {/* Mic button + device picker */}
        <div className="relative flex items-center shrink-0">
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={recording ? stopRecording : startRecording}
            disabled={!connected || !!imagePreview || !!audioBlob || uploading}
            title={recording ? 'Stop recording' : 'Record voice message'}
            className={`h-9 w-9 disabled:opacity-40 transition-colors ${micDevices.length > 1 ? 'rounded-r-none' : ''} ${
              recording
                ? 'text-red-400 bg-red-500/10 hover:bg-red-500/20'
                : 'text-slate-500 hover:text-cyan-400 hover:bg-cyan-500/10'
            }`}
          >
            {recording ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
          </Button>

          {/* Chevron to open mic picker — only shown when multiple mics exist */}
          {micDevices.length > 1 && !recording && (
            <button
              type="button"
              onClick={() => setShowMicPicker(p => !p)}
              className="h-9 px-0.5 text-slate-600 hover:text-cyan-400 hover:bg-cyan-500/10 rounded-r transition-colors border-l border-slate-700/50"
              title="Choose microphone"
            >
              <ChevronDown className="w-3 h-3" />
            </button>
          )}

          {/* Mic picker dropdown */}
          {showMicPicker && (
            <div className="absolute bottom-full left-0 mb-1 w-64 bg-[#1E293B] border border-slate-700 rounded-lg shadow-xl z-50 overflow-hidden">
              <p className="text-[10px] text-slate-500 px-3 pt-2 pb-1 font-medium uppercase tracking-wide">Select Microphone</p>
              {micDevices.map(d => {
                const isLoopback = /stereo mix|what u hear|wave out|loopback|output|speaker/i.test(d.label);
                return (
                  <button
                    key={d.deviceId}
                    type="button"
                    onClick={() => { setSelectedMicId(d.deviceId); setShowMicPicker(false); }}
                    className={`w-full text-left px-3 py-2 text-xs flex items-center gap-2 transition-colors hover:bg-slate-700/50 ${
                      selectedMicId === d.deviceId ? 'text-cyan-400 bg-cyan-500/10' : 'text-slate-300'
                    }`}
                  >
                    <Mic className="w-3 h-3 shrink-0" />
                    <span className="truncate">{d.label || `Microphone ${d.deviceId.slice(0,6)}`}</span>
                    {isLoopback && <span className="text-[9px] text-amber-500 shrink-0">loopback</span>}
                    {selectedMicId === d.deviceId && <span className="ml-auto text-[9px] text-cyan-400 shrink-0">active</span>}
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Text input */}
        <Input
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={
            recording ? 'Recording...' :
            imagePreview ? 'Add a caption (optional)...' :
            connected ? 'Type a message...' : 'Reconnecting...'
          }
          disabled={!connected || recording || uploading}
          className="flex-1 h-9 bg-[#1E293B] border-slate-700/50 text-slate-300 placeholder:text-slate-600 focus:border-cyan-500/50 focus:ring-0 rounded-lg text-sm"
        />

        {/* Send button */}
        <Button
          type="submit"
          disabled={!canSend}
          className="h-9 w-9 p-0 shrink-0 bg-cyan-600 hover:bg-cyan-700 text-white disabled:opacity-40 rounded-lg"
        >
          {uploading
            ? <Loader2 className="w-4 h-4 animate-spin" />
            : <Send className="w-4 h-4" />
          }
        </Button>
      </form>

      {!connected && (
        <p className="text-xs text-red-400/80 mt-2 text-center">Disconnected. Reconnecting...</p>
      )}
    </div>
  );
};

export default ChatInput;
