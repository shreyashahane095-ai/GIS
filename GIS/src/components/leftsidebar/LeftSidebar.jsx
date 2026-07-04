import React from 'react';
import { Icon } from '@iconify/react';
import { useRef, useState } from 'react';
import DataActionPanel from './DataActionPanel';
import BrowseDataHub from './BrowseDataHub';
import './leftsidebar.css';
import LayerManager from '../layers/LayerManager';
import { useMapContext } from '../../context/MapContext';

const LeftSidebar = ({
  isOpen,
  isPanelOpen,
  setIsPanelOpen,
  onOpenOperations,
  onDatasetSelect,
  selectedLayerId,
  onDataUpload,
  onImageUpload,
}) => {
  const {
    layers,
    activeLayerId,
    selectLayer,
    toggleLayerVisibility,
    removeLayer,
    updateLayer,
    zoomToLayer,
    addLayer,
    map,
    drawLayerGroupRef,
    setNotification,
  } = useMapContext();

  const [isDragging, setIsDragging] = useState(false);
  const dataInputRef = useRef(null);
  const imageInputRef = useRef(null);

  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleFileUpload = () => {};

  const handleDatasetSelect = (id) => {
    if (onDatasetSelect) {
      onDatasetSelect(id);
    }
  };

  const handleUploadFiles = (files, handler) => {
    if (handler && files.length > 0) {
      handler(files);
    }
  };

  const handleDataInputChange = (event) => {
    handleUploadFiles(Array.from(event.target.files || []), onDataUpload);
    event.target.value = '';
  };

  const handleImageInputChange = (event) => {
    handleUploadFiles(Array.from(event.target.files || []), onImageUpload);
    event.target.value = '';
  };

  const triggerDataUpload = () => dataInputRef.current?.click();
  const triggerImageUpload = () => imageInputRef.current?.click();

  if (!isOpen) return null;

  return (
    <div className="left-sidebar">
      {/* Sidebar content */}
      <div className="sidebar-content">
        <div className="upload-section">
          <div className="upload-row">
            <button
              type="button"
              className="sidebar-upload-btn"
              onClick={triggerDataUpload}
            >
              <Icon icon="mdi:file-upload-outline" width={18} height={18} />
              <span>Upload Data</span>
            </button>
            <button
              type="button"
              className="sidebar-upload-btn"
              onClick={triggerImageUpload}
            >
              <Icon icon="mdi:image-plus-outline" width={18} height={18} />
              <span>Add Image</span>
            </button>
          </div>

          <input
            ref={dataInputRef}
            type="file"
            multiple
            accept=".geojson,.json,.csv,.shp,.dbf,.shx,.prj,.cpg,.xlsx,.xls"
            onChange={handleDataInputChange}
            className="file-input"
            aria-hidden="true"
          />

          <input
            ref={imageInputRef}
            type="file"
            multiple
            accept="image/png,image/jpeg,image/jpg"
            onChange={handleImageInputChange}
            className="file-input"
            aria-hidden="true"
          />
        </div>

        {/* ================= Layers Section ================= */}
        <LayerManager
          layers={layers}
          activeLayerId={activeLayerId}
          onSelectLayer={selectLayer}
          onToggleLayerVisibility={toggleLayerVisibility}
          onEditLayer={updateLayer}
          onZoomToLayer={zoomToLayer}
          onRemoveLayer={removeLayer}
        />

        {/* ================= Data Actions Button ================= */}
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

        {/* ================= Data Action Panel ================= */}
        {isPanelOpen && (
          <DataActionPanel
            isOpen={isPanelOpen}
            onOpenOperations={onOpenOperations}
            selectedLayerId={activeLayerId}
          />
        )}
      </div>

      {/* ================= Browse Data Hub ================= */}
      <div className="sidebar-footer">
        <BrowseDataHub onDatasetSelect={handleDatasetSelect} />
      </div>
      
    </div>
  );
};

export default LeftSidebar;
