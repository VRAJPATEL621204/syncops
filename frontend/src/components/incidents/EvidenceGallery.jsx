import { useState } from 'react';
import { X, ZoomIn, ChevronLeft, ChevronRight, Download, Paperclip } from 'lucide-react';

const EvidenceGallery = ({ attachments = [], compact = false }) => {
  const [lightbox, setLightbox] = useState(null); // index of open image

  if (!attachments || attachments.length === 0) return null;

  const open = (idx) => setLightbox(idx);
  const close = () => setLightbox(null);
  const prev = () => setLightbox((i) => (i - 1 + attachments.length) % attachments.length);
  const next = () => setLightbox((i) => (i + 1) % attachments.length);

  const handleKeyDown = (e) => {
    if (e.key === 'ArrowLeft') prev();
    if (e.key === 'ArrowRight') next();
    if (e.key === 'Escape') close();
  };

  return (
    <>
      {/* Gallery grid */}
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <Paperclip className="w-3.5 h-3.5 text-slate-500" />
          <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-widest">
            Evidence Attachments
          </span>
          <span className="text-[10px] text-slate-600 bg-slate-800 px-1.5 py-0.5 rounded">
            {attachments.length}
          </span>
        </div>

        {compact ? (
          /* Compact mode — small strip for active incident detail */
          <div className="flex flex-wrap gap-2">
            {attachments.map((att, idx) => (
              <div
                key={att.id || idx}
                onClick={() => open(idx)}
                className="relative w-16 h-16 rounded-md overflow-hidden border border-slate-700 bg-slate-800 cursor-pointer group shrink-0"
              >
                <img src={att.fileUrl} alt={att.fileName || `Evidence ${idx + 1}`} className="w-full h-full object-cover" />
                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/50 flex items-center justify-center transition-colors">
                  <ZoomIn className="w-4 h-4 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
                </div>
              </div>
            ))}
          </div>
        ) : (
          /* Full review mode — larger previews */
          <div className="grid grid-cols-2 gap-2">
            {attachments.map((att, idx) => (
              <div
                key={att.id || idx}
                onClick={() => open(idx)}
                className="relative rounded-md overflow-hidden border border-slate-700 bg-slate-800 aspect-video cursor-pointer group"
              >
                <img src={att.fileUrl} alt={att.fileName || `Evidence ${idx + 1}`} className="w-full h-full object-cover" />
                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/50 flex items-center justify-center transition-colors">
                  <ZoomIn className="w-5 h-5 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
                </div>
                <div className="absolute bottom-0 left-0 right-0 px-2 py-1 bg-gradient-to-t from-black/70 to-transparent opacity-0 group-hover:opacity-100 transition-opacity">
                  <p className="text-[10px] text-slate-300 truncate">{att.fileName || `Image ${idx + 1}`}</p>
                  {att.uploadedBy && (
                    <p className="text-[9px] text-slate-500">by {att.uploadedBy.fullName}</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Lightbox */}
      {lightbox !== null && (
        <div
          className="fixed inset-0 z-[100] bg-black/90 flex items-center justify-center"
          onClick={close}
          onKeyDown={handleKeyDown}
          tabIndex={-1}
          style={{ outline: 'none' }}
          ref={(el) => el?.focus()}
        >
          {/* Close */}
          <button
            type="button"
            onClick={close}
            className="absolute top-4 right-4 w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition-colors z-10"
          >
            <X className="w-4 h-4" />
          </button>

          {/* Download */}
          <a
            href={attachments[lightbox].fileUrl}
            target="_blank"
            rel="noopener noreferrer"
            onClick={(e) => e.stopPropagation()}
            className="absolute top-4 right-14 w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition-colors z-10"
          >
            <Download className="w-4 h-4" />
          </a>

          {/* Counter */}
          <div className="absolute top-4 left-1/2 -translate-x-1/2 text-xs text-slate-400 bg-black/50 px-3 py-1 rounded-full">
            {lightbox + 1} / {attachments.length}
          </div>

          {/* Prev */}
          {attachments.length > 1 && (
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); prev(); }}
              className="absolute left-4 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition-colors z-10"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
          )}

          {/* Next */}
          {attachments.length > 1 && (
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); next(); }}
              className="absolute right-4 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition-colors z-10"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          )}

          {/* Image */}
          <div className="max-w-5xl max-h-[85vh] px-16" onClick={(e) => e.stopPropagation()}>
            <img
              src={attachments[lightbox].fileUrl}
              alt={attachments[lightbox].fileName || `Evidence ${lightbox + 1}`}
              className="max-w-full max-h-[80vh] object-contain rounded-md shadow-2xl"
            />
            {(attachments[lightbox].fileName || attachments[lightbox].uploadedBy) && (
              <div className="mt-2 text-center">
                {attachments[lightbox].fileName && (
                  <p className="text-xs text-slate-400">{attachments[lightbox].fileName}</p>
                )}
                {attachments[lightbox].uploadedBy && (
                  <p className="text-[10px] text-slate-600">
                    Uploaded by {attachments[lightbox].uploadedBy.fullName}
                  </p>
                )}
              </div>
            )}
          </div>

          {/* Thumbnails strip */}
          {attachments.length > 1 && (
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2">
              {attachments.map((att, idx) => (
                <div
                  key={idx}
                  onClick={(e) => { e.stopPropagation(); setLightbox(idx); }}
                  className={`w-10 h-10 rounded overflow-hidden border-2 cursor-pointer transition-all ${
                    idx === lightbox ? 'border-cyan-400 opacity-100' : 'border-transparent opacity-50 hover:opacity-80'
                  }`}
                >
                  <img src={att.fileUrl} alt="" className="w-full h-full object-cover" />
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </>
  );
};

export default EvidenceGallery;
