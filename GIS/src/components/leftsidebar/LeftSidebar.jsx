import React from 'react';
import { Icon } from '@iconify/react';
import DataActionPanel from './DataActionPanel';
import BrowseDataHub from './BrowseDataHub';
import './leftsidebar.css';

const LeftSidebar = ({
  isOpen,
  isPanelOpen,
  setIsPanelOpen,
  onOpenOperations,
  onDatasetSelect,
  selectedLayerId,
}) => {
  if (!isOpen) return null;

  return (
    <div className="left-sidebar">
      <div className="sidebar-content">
        {/* Toggle Button */}
        <div className="toggle-buttons">
          <button
            type="button"
            className={`sidebar-action-btn ${isPanelOpen ? 'active' : ''}`}
            onClick={() => setIsPanelOpen((prev) => !prev)}
          >
            <Icon icon="mdi:layers-outline" width={18} height={18} />
            <span>Data Actions</span>
          </button>
        </div>

        {/* DataActionPanel */}
        {isPanelOpen && (
          <DataActionPanel
            isOpen={isPanelOpen}
            onOpenOperations={onOpenOperations}
            selectedLayerId={selectedLayerId}
          />
        )}
      </div>

      {/* Fixed Footer with Browse Data Hub */}
      <div className="sidebar-footer">
        <BrowseDataHub onDatasetSelect={onDatasetSelect} />
      </div>
    </div>
  );
};

export default LeftSidebar;
