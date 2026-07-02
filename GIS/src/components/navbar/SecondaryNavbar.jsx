import React, { useRef } from 'react';
import { Icon } from '@iconify/react';
import './secondarynavbar.css';

const SecondaryNavbar = ({ onDataUpload, onImageUpload }) => {
  const dataInputRef = useRef(null);
  const imageInputRef = useRef(null);

  const handleDataUpload = (event) => {
    const files = Array.from(event.target.files);
    if (files.length > 0) {
      onDataUpload(files);
    }
    event.target.value = '';
  };

  const handleImageUpload = (event) => {
    const files = Array.from(event.target.files);
    if (files.length > 0) {
      onImageUpload(files);
    }
    event.target.value = '';
  };

  return (
    <div className="secondary-navbar">
      <div className="secondary-navbar-left">
        <button
          className="secondary-navbar-btn upload-data-btn"
          onClick={() => dataInputRef.current?.click()}
          title="Upload data files (GeoJSON, CSV, Shapefile, etc.)"
        >
          <Icon icon="mdi:file-upload-outline" width={18} height={18} />
          <span>Upload Data</span>
        </button>
        <button
          className="secondary-navbar-btn add-image-btn"
          onClick={() => imageInputRef.current?.click()}
          title="Upload image files (PNG, JPG, JPEG)"
        >
          <Icon icon="mdi:image-plus-outline" width={18} height={18} />
          <span>Add Image</span>
        </button>

        {/* Hidden file input for data files */}
        <input
          ref={dataInputRef}
          type="file"
          multiple
          accept=".geojson,.json,.csv,.shp,.dbf,.shx,.prj,.cpg,.xlsx,.xls"
          onChange={handleDataUpload}
          style={{ display: 'none' }}
          aria-hidden="true"
        />

        {/* Hidden file input for image files */}
        <input
          ref={imageInputRef}
          type="file"
          multiple
          accept="image/png,image/jpeg,image/jpg"
          onChange={handleImageUpload}
          style={{ display: 'none' }}
          aria-hidden="true"
        />
      </div>
    </div>
  );
};

export default SecondaryNavbar;
