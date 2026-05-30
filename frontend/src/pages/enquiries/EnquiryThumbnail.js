import React, { useState, useRef } from 'react';
import ReactDOM from 'react-dom';
import { fileUrl, fileThumbUrl } from '../../lib/fileUrl';

/**
 * Small fabric thumbnail with hover-preview that pops out as a 256×256 overlay
 * positioned to the bottom-right of the trigger. Uses native browser HTTP
 * caching (Cache-Control: immutable on /api/files/<path>) so navigation
 * between pages feels instant after the first load.
 */
export default function EnquiryThumbnail({ imagePath }) {
  const [hovered, setHovered] = useState(false);
  const [pos, setPos] = useState({ top: 0, left: 0 });
  const ref = useRef(null);

  const handleMouseEnter = () => {
    if (ref.current) {
      const rect = ref.current.getBoundingClientRect();
      setPos({ top: rect.bottom + 8, left: rect.left });
    }
    setHovered(true);
  };

  if (!imagePath) return <span className="text-zinc-300">—</span>;
  const thumbSrc = fileThumbUrl(imagePath);
  const fullSrc = fileUrl(imagePath);

  return (
    <div
      ref={ref}
      className="relative"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={() => setHovered(false)}
      onClick={e => e.stopPropagation()}
    >
      <img
        src={thumbSrc}
        alt="Fabric"
        loading="lazy"
        decoding="async"
        width={32}
        height={32}
        className="w-8 h-8 object-cover rounded-sm border border-zinc-200 cursor-pointer"
        data-testid="enquiry-thumb"
        onError={e => { if (e.currentTarget.src !== fullSrc) e.currentTarget.src = fullSrc; }}
      />
      {hovered && ReactDOM.createPortal(
        <div className="pointer-events-none" style={{ position: 'fixed', zIndex: 9999, top: pos.top, left: pos.left }} data-testid="enquiry-thumb-preview-wrap">
          <img
            src={fullSrc}
            alt="Fabric preview"
            decoding="async"
            className="w-64 h-64 object-contain rounded-md border border-zinc-300 shadow-xl bg-white"
            data-testid="enquiry-thumb-preview"
          />
        </div>,
        document.body
      )}
    </div>
  );
}
