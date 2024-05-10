// @ts-nocheck
import React, { useState, useRef, useEffect } from 'react';
import { AppWindowWithTitleBar } from './Window.tsx';

export function RemyMemeMaker() {
  const [isJSPaintOpen, setIsJSPaintOpen] = useState(false);
  const iframeRef = useRef(null);
  const [imageUrl, setImageUrl] = useState('');
  const [selectedOption, setSelectedOption] = useState('empty');

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

  const loadUrl =
    selectedOption === 'url' && imageUrl
      ? `#load:${encodeURIComponent(imageUrl)}`
      : '#load:https://basedremyboys.club/images/white_square.png';

  return (
    <div>
      <p>Remy Meme Maker is the easiest way to create on-chain memes on Base</p>
      <div className="field-row" style={{ marginBottom: '10px' }}>
        <input
          id="emptyCanvas"
          type="radio"
          name="canvasOption"
          value="empty"
          checked={selectedOption === 'empty'}
          onChange={(e) => setSelectedOption(e.target.value)}
        />
        <label htmlFor="emptyCanvas">Empty Canvas</label>
      </div>
      <div className="field-row" style={{ marginBottom: '10px' }}>
        <input
          id="urlImage"
          type="radio"
          name="canvasOption"
          value="url"
          checked={selectedOption === 'url'}
          onChange={(e) => setSelectedOption(e.target.value)}
        />
        <label htmlFor="urlImage">Load Image from URL</label>
      </div>
      {selectedOption === 'url' && (
        <div style={{ marginBottom: '10px' }}>
          <label htmlFor="imageUrlInput">Image URL:</label>
          <input
            type="text"
            id="imageUrlInput"
            placeholder="Enter image URL"
            value={imageUrl}
            onChange={(e) => setImageUrl(e.target.value)}
            style={{ marginLeft: '5px' }}
          />
        </div>
      )}
      <button onClick={handleOpenJSPaint} style={{ marginTop: '10px' }}>
        Launch Remy Meme Maker
      </button>
      {isJSPaintOpen && (
        <div className="overlay">
          <AppWindowWithTitleBar onClose={handleCloseJSPaint} bodyClassName="nopad" title="Remy Meme Maker">
            <iframe src={`/jspaint/index.html${loadUrl}`} id="jspaint-iframe" width="100%" height="100%" ref={iframeRef}></iframe>
          </AppWindowWithTitleBar>
        </div>
      )}
    </div>
  );
}
