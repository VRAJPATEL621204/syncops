import { useState } from 'react';
import { X, ZoomIn } from 'lucide-react';

const ImageMessage = ({ mediaUrl, content }) => {
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const fullUrl = mediaUrl || '';

  return (
    <>
      <div className="group relative cursor-pointer" onClick={() => setLightboxOpen(true)}>
        <div className="relative overflow-hidden rounded-lg max-w-[260px]">
          <img
            src={fullUrl}
            alt="shared image"
            className="block w-full max-h-52 object-cover rounded-lg border border-slate-700/50"
            loading="lazy"
          />
          <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors rounded-lg flex items-center justify-center">
            <ZoomIn className="w-6 h-6 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
          </div>
        </div>
        {content && (
          <p className="text-sm text-slate-300 mt-1 max-w-[260px] break-words">{content}</p>
        )}
      </div>

      {lightboxOpen && (
        <div
          className="fixed inset-0 z-[9999] bg-black/90 flex items-center justify-center p-4"
          onClick={() => setLightboxOpen(false)}
        >
          <button
            className="absolute top-4 right-4 p-2 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors"
            onClick={() => setLightboxOpen(false)}
          >
            <X className="w-5 h-5" />
          </button>
          <img
            src={fullUrl}
            alt="full size"
            className="max-w-full max-h-full object-contain rounded-lg shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}
    </>
  );
};

export default ImageMessage;
