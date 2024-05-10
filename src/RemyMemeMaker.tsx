// @ts-nocheck
import React, { useState, useRef, useEffect } from 'react';
import { AppWindowWithTitleBar } from './Window.tsx';

export function RemyMemeMaker() {
  const [isJSPaintOpen, setIsJSPaintOpen] = useState(false);
  const iframeRef = useRef(null);
    const [imageUrl, setImageUrl] = useState('');

  const handleOpenJSPaint = () => {
    setIsJSPaintOpen(true);
  };

  const handleCloseJSPaint = () => {
    const confirmClose = window.confirm(
      'Are you sure you want to close the Meme Maker? You will lose your current artwork. Save your work first with File > Save As.'
    );
    if (confirmClose) {
      setIsJSPaintOpen(false);
    }
  };

  useEffect(() => {
    if (isJSPaintOpen && iframeRef.current) {
      const jspaint = iframeRef.current.contentWindow;

      const zoomToWindow = () => {
        if (jspaint.loaded) {
          jspaint.zoomToWindow();
        } else {
          setTimeout(zoomToWindow, 100);
        }
      };

      zoomToWindow();
    }
  }, [isJSPaintOpen]);

  const loadUrl = imageUrl ? `#load:${encodeURIComponent(imageUrl)}` : '#load:https://basedremyboys.club/images/white_square.png';

  return (
    <div>
      <p>Remy Meme Maker is the easiest way to create on-chain memes on Base</p>
      <div>
        <label htmlFor="imageUrlInput">Image URL (optional):</label>
        <input
          type="text"
          id="imageUrlInput"
          placeholder="Enter image URL (optional)"
          value={imageUrl || ''}
          onChange={(e) => setImageUrl(e.target.value)}
        />
      </div>
      <button onClick={handleOpenJSPaint}>Launch Remy Meme Maker</button>

      {isJSPaintOpen && (
        <div className="overlay">
          <AppWindowWithTitleBar onClose={handleCloseJSPaint} bodyClassName="nopad" title="Remy Meme Maker">
            <iframe
              src={`/jspaint/index.html${loadUrl}`}
              id="jspaint-iframe"
              width="100%"
              height="100%"
              ref={iframeRef}
            ></iframe>
          </AppWindowWithTitleBar>
        </div>
      )}
    </div>
  );
}
