import { useState, useRef, useCallback } from 'react';
import { Upload, X, ImageIcon, Loader2, AlertCircle, CheckCircle2 } from 'lucide-react';
import { uploadAPI } from '@/services/api';

const MAX_FILES = 5;
const ACCEPTED = ['image/png', 'image/jpeg', 'image/jpg', 'image/webp', 'image/gif'];

const formatBytes = (bytes) => {
  if (!bytes) return '';
  if (bytes < 1024) return `${bytes}B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)}KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)}MB`;
};

const EvidenceUploader = ({ value = [], onChange, disabled = false }) => {
  const [dragging, setDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [error, setError] = useState('');
  const inputRef = useRef(null);

  const processFiles = useCallback(async (rawFiles) => {
    setError('');
    const fileArray = Array.from(rawFiles);

    const invalid = fileArray.filter((f) => !ACCEPTED.includes(f.type));
    if (invalid.length > 0) {
      setError(`Unsupported format: ${invalid.map((f) => f.name).join(', ')}. Use PNG, JPG, WEBP or GIF.`);
      return;
    }

    const total = value.length + fileArray.length;
    if (total > MAX_FILES) {
      setError(`Maximum ${MAX_FILES} images allowed. You already have ${value.length}.`);
      return;
    }

    try {
      setUploading(true);
      setUploadProgress(0);
      const res = await uploadAPI.uploadEvidenceImages(fileArray, (e) => {
        if (e.total) setUploadProgress(Math.round((e.loaded / e.total) * 100));
      });
      const uploaded = res.data.data.attachments;
      onChange([...value, ...uploaded]);
    } catch (err) {
      setError(err.response?.data?.message || 'Upload failed. Please try again.');
    } finally {
      setUploading(false);
      setUploadProgress(0);
      if (inputRef.current) inputRef.current.value = '';
    }
  }, [value, onChange]);

  const handleDrop = useCallback((e) => {
    e.preventDefault();
    setDragging(false);
    if (disabled || uploading) return;
    processFiles(e.dataTransfer.files);
  }, [disabled, uploading, processFiles]);

  const handleDragOver = (e) => { e.preventDefault(); if (!disabled && !uploading) setDragging(true); };
  const handleDragLeave = () => setDragging(false);
  const handleInputChange = (e) => processFiles(e.target.files);
  const removeImage = (idx) => onChange(value.filter((_, i) => i !== idx));

  return (
    <div className="space-y-2">
      {/* Drop zone */}
      {value.length < MAX_FILES && (
        <div
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onClick={() => !disabled && !uploading && inputRef.current?.click()}
          className={`
            relative border border-dashed rounded-md px-4 py-4 flex flex-col items-center justify-center gap-2
            transition-colors cursor-pointer select-none
            ${dragging ? 'border-cyan-500/70 bg-cyan-500/5' : 'border-slate-700 hover:border-slate-600 bg-[#1E293B]'}
            ${disabled || uploading ? 'opacity-50 pointer-events-none' : ''}
          `}
        >
          <input
            ref={inputRef}
            type="file"
            accept={ACCEPTED.join(',')}
            multiple
            className="hidden"
            onChange={handleInputChange}
            disabled={disabled || uploading}
          />
          {uploading ? (
            <div className="flex flex-col items-center gap-1.5">
              <Loader2 className="w-5 h-5 text-cyan-400 animate-spin" />
              <span className="text-xs text-slate-400">Uploading… {uploadProgress}%</span>
              <div className="w-32 h-1 bg-slate-700 rounded-full overflow-hidden">
                <div
                  className="h-full bg-cyan-500 transition-all duration-200"
                  style={{ width: `${uploadProgress}%` }}
                />
              </div>
            </div>
          ) : (
            <>
              <Upload className="w-5 h-5 text-slate-500" />
              <div className="text-center">
                <p className="text-xs text-slate-400">
                  <span className="text-cyan-400 font-medium">Click to upload</span> or drag & drop
                </p>
                <p className="text-[10px] text-slate-600 mt-0.5">PNG, JPG, WEBP, GIF · max 10MB each · up to {MAX_FILES} images</p>
              </div>
            </>
          )}
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="flex items-start gap-2 px-3 py-2 bg-red-500/10 border border-red-500/20 rounded-md">
          <AlertCircle className="w-3.5 h-3.5 text-red-400 shrink-0 mt-0.5" />
          <p className="text-[11px] text-red-400">{error}</p>
        </div>
      )}

      {/* Preview grid */}
      {value.length > 0 && (
        <div className="grid grid-cols-3 gap-2">
          {value.map((attachment, idx) => (
            <div key={idx} className="relative group rounded-md overflow-hidden border border-slate-700 bg-slate-800 h-20">
              <img
                src={attachment.fileUrl}
                alt={attachment.fileName || `Evidence ${idx + 1}`}
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-colors" />
              <button
                type="button"
                onClick={() => removeImage(idx)}
                disabled={disabled}
                className="absolute top-1 right-1 w-5 h-5 rounded-full bg-red-500 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-600"
              >
                <X className="w-3 h-3" />
              </button>
              {attachment.fileSize && (
                <span className="absolute bottom-1 left-1 text-[9px] bg-black/60 text-slate-300 px-1 rounded opacity-0 group-hover:opacity-100 transition-opacity">
                  {formatBytes(attachment.fileSize)}
                </span>
              )}
            </div>
          ))}
        </div>
      )}

      {value.length > 0 && (
        <div className="flex items-center gap-1.5 px-1">
          <CheckCircle2 className="w-3 h-3 text-green-400" />
          <p className="text-[11px] text-slate-500">{value.length} image{value.length > 1 ? 's' : ''} attached as evidence</p>
        </div>
      )}
    </div>
  );
};

export default EvidenceUploader;
