import React, { useState, useRef } from 'react';
import ReactDOM from 'react-dom';
import { fileUrl, fileThumbUrl } from '../../lib/fileUrl';

// 1×1 transparent GIF — used when a thumbnail is missing on disk. Replacing
// the broken src with a 26-byte data URI prevents the browser from falling
// back to the full-resolution image (which can be 10-20 MB each and locks
// the main thread for ~30s while decoding).
const PLACEHOLDER_DATA_URI = 'data:image/gif;base64,R0lGODlhAQABAIAAAO/v7wAAACH5BAEAAAAALAAAAAABAAEAAAICRAEAOw==';

export default function EnquiryThumbnail({ imagePath }) {
  const [hovered, setHovered] = useState(false);
  const [pos, setPos] = useState({ top: 0, left: 0 });
  const [thumbBroken, setThumbBroken] = useState(false);
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
        src={thumbBroken ? PLACEHOLDER_DATA_URI : thumbSrc}
        alt="Fabric"
        loading="lazy"
        decoding="async"
        width={32}
        height={32}
        className="w-8 h-8 object-cover rounded-sm border border-zinc-200 cursor-pointer bg-zinc-100"
        data-testid="enquiry-thumb"
        onError={() => setThumbBroken(true)}
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
