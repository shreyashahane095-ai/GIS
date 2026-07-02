import React, { useState, useRef, useEffect, useLayoutEffect } from 'react';
import { Icon } from '@iconify/react';
import './BrowseDataHub.css';

const BrowseDataHub = ({ onDatasetSelect }) => {
  const [isPopupOpen, setIsPopupOpen] = useState(false);
  const [popupPosition, setPopupPosition] = useState({ top: 0, left: 0 });
  const popupRef = useRef(null);
  const buttonRef = useRef(null);

  const dataSources = [
    {
      id: 'Fetch from News',
      icon: 'mdi:newspaper',
      label: 'Fetch from News',
      description: 'News and articles data',
    },
    {
      id: 'Fetch from Model',
      icon: 'mdi:robot',
      label: 'Fetch from Model',
      description: 'ML model predictions',
    },
    {
      id: 'Fetch from Social Media',
      icon: 'mdi:share-social',
      label: 'Fetch from Social Media',
      description: 'Social media data',
    },
  ];

  const handleDataSourceClick = (id) => {
    onDatasetSelect(id);
    setIsPopupOpen(false);
  };

  const calculatePopupPosition = () => {
    if (!buttonRef.current) return;

    const buttonRect = buttonRef.current.getBoundingClientRect();
    const popupRect = popupRef.current?.getBoundingClientRect();
    const gap = 10;
    const viewportMargin = 12;
    const popupWidth = popupRect?.width ?? 260;
    const popupHeight = popupRect?.height ?? 180;
    let leftPosition = buttonRect.right + gap;
    let topPosition = buttonRect.top + buttonRect.height / 2 - popupHeight / 2;

    if (leftPosition + popupWidth + viewportMargin > window.innerWidth) {
      leftPosition = Math.max(viewportMargin, window.innerWidth - popupWidth - viewportMargin);
    }

    topPosition = Math.min(
      Math.max(viewportMargin, topPosition),
      Math.max(viewportMargin, window.innerHeight - popupHeight - viewportMargin)
    );

    setPopupPosition({
      top: topPosition,
      left: leftPosition,
    });
  };

  const handleClickOutside = (e) => {
    if (
      popupRef.current &&
      !popupRef.current.contains(e.target) &&
      buttonRef.current &&
      !buttonRef.current.contains(e.target)
    ) {
      setIsPopupOpen(false);
    }
  };

  useEffect(() => {
    if (isPopupOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      window.addEventListener('resize', calculatePopupPosition);
      window.addEventListener('scroll', calculatePopupPosition, true);
      return () => {
        document.removeEventListener('mousedown', handleClickOutside);
        window.removeEventListener('resize', calculatePopupPosition);
        window.removeEventListener('scroll', calculatePopupPosition, true);
      };
    }
  }, [isPopupOpen]);

  useLayoutEffect(() => {
    if (isPopupOpen) {
      calculatePopupPosition();
    }
  }, [isPopupOpen]);

  return (
    <div className="browse-data-hub-container">
      {/* Backdrop Overlay */}
      {isPopupOpen && (
        <div
          className="browse-data-hub-backdrop"
          onClick={() => setIsPopupOpen(false)}
        />
      )}

      {/* Popup Card */}
      {isPopupOpen && (
        <div
          className="browse-data-hub-popup"
          ref={popupRef}
          style={{
            top: `${popupPosition.top}px`,
            left: `${popupPosition.left}px`,
          }}
        >
          <div className="popup-header">
            <h3 className="popup-title">Data Sources</h3>
            <button
              className="popup-close-btn"
              onClick={() => setIsPopupOpen(false)}
              aria-label="Close"
            >
              <Icon icon="mdi:close" width={18} height={18} />
            </button>
          </div>
          <div className="popup-content">
            {dataSources.map((source) => (
              <div
                key={source.id}
                className="data-source-item"
                onClick={() => handleDataSourceClick(source.id)}
                role="button"
                tabIndex={0}
                onKeyDown={(event) => {
                  if (event.key === 'Enter' || event.key === ' ') {
                    event.preventDefault();
                    handleDataSourceClick(source.id);
                  }
                }}
              >
                <div className="source-icon">
                  <Icon icon={source.icon} width={16} height={16} />
                </div>
                <div className="source-info">
                  <div className="source-label">{source.label}</div>
                  <div className="source-description">
                    {source.description}
                  </div>
                </div>
                <div className="source-arrow">
                  <Icon icon="mdi:chevron-right" width={16} height={16} />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Fixed Button */}
      <button
        ref={buttonRef}
        className={`browse-btn ${isPopupOpen ? 'active' : ''}`}
        onClick={() => setIsPopupOpen(!isPopupOpen)}
        title="Browse data from various sources"
      >
        <Icon icon="mdi:database-search" width={18} height={18} />
        <span>Browse Data Hub</span>
      </button>
    </div>
  );
};

export default BrowseDataHub;
