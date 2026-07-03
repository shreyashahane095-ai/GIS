import React, { useState } from 'react';
import { Icon } from '@iconify/react';
import './OperationsPanel.css';

const OperationCard = ({ icon, name }) => {
  const [isSelected, setIsSelected] = useState(false);

  const handleClick = () => {
    setIsSelected(!isSelected);
  };

  return (
    <div 
      className={`operation-card ${isSelected ? 'selected' : ''}`}
      onClick={handleClick}
    >
      <div className="card-icon">
        <Icon icon={icon} width={28} height={28} />
      </div>
      <span className="card-name">{name}</span>
    </div>
  );
};

const OperationsPanel = ({ isOpen, onClose }) => {
  const [searchTerm, setSearchTerm] = useState('');

  const geoprocessingOperations = [
    { id: 'boundary', name: 'Boundary', icon: 'mdi:vector-polygon' },
    { id: 'buffer', name: 'Buffer', icon: 'mdi:circle-outline' },
    { id: 'clip', name: 'Clip', icon: 'mdi:scissors-cutting' },
    { id: 'difference', name: 'Difference', icon: 'mdi:vector-difference' },
    { id: 'intersection', name: 'Intersection', icon: 'mdi:vector-intersection' },
    { id: 'subtract', name: 'Subtract', icon: 'mdi:minus-circle-outline' },
    { id: 'union', name: 'Union', icon: 'mdi:vector-union' },
    { id: 'wedge-buffer', name: 'Wedge Buffer', icon: 'mdi:pie-chart-outline' },
  ];

  const geometryOperations = [
    { id: 'centroid', name: 'Centroid', icon: 'mdi:shield-account' },
    { id: 'fill-holes', name: 'Fill holes', icon: 'mdi:checkbox-marked-circle' },
    { id: 'lines-polygon', name: 'Lines to polygon', icon: 'mdi:rectangle-outline' },
    { id: 'explode-multi', name: 'Explode MultiFeatures', icon: 'mdi:star-burst' },
    { id: 'explode-lines', name: 'Explode LineStrings', icon: 'mdi:arrange-send-backward' },
    { id: 'polygon-lines', name: 'Polygon to lines', icon: 'mdi:vector-line' },
    { id: 'remove-duplicates', name: 'Remove duplicates', icon: 'mdi:content-duplicate' },
    { id: 'generate-points', name: 'Generate points along line', icon: 'mdi:dots-grid' },
    { id: 'simplify', name: 'Simplify', icon: 'mdi:gesture-swipe' },
    { id: 'smoothing', name: 'Smoothing', icon: 'mdi:sine-wave' },
    { id: 'split-line', name: 'Split by line', icon: 'mdi:vector-line-format' },
    { id: 'points-geometry', name: 'Points to geometry', icon: 'mdi:vector-point-select' },
  ];

  const allOperations = [...geoprocessingOperations, ...geometryOperations];

  const filteredGeoprocessing = geoprocessingOperations.filter(op =>
    op.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredGeometry = geometryOperations.filter(op =>
    op.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  console.log('OperationsPanel - isOpen:', isOpen); // Debug log

  if (!isOpen) return null;

  return (
    <div className="operations-panel-overlay" onClick={onClose}>
      <div className="operations-panel" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="panel-header">
          <button className="back-btn" onClick={onClose}>
            <Icon icon="mdi:arrow-left" width={24} height={24} />
          </button>
          <h2 className="panel-title">Operations</h2>
        </div>

        {/* Search Bar */}
        <div className="panel-search">
          <div className="search-container">
            <Icon icon="mdi:magnify" width={20} height={20} className="search-icon" />
            <input
              type="text"
              className="search-input"
              placeholder="Search..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
            {searchTerm && (
              <button 
                className="search-clear"
                onClick={() => setSearchTerm('')}
              >
                <Icon icon="mdi:close" width={18} height={18} />
              </button>
            )}
          </div>
        </div>

        {/* Geoprocessing Section */}
        <div className="panel-content">
          <h3 className="section-title">Geoprocessing</h3>
          
          {/* Operation Cards Grid */}
          <div className="operations-grid">
            {filteredGeoprocessing.map((operation) => (
              <OperationCard
                key={operation.id}
                icon={operation.icon}
                name={operation.name}
              />
            ))}
          </div>

          {/* Geometry Section */}
          <h3 className="section-title spaced">Geometry</h3>
          
          {/* Geometry Operation Cards Grid */}
          <div className="operations-grid">
            {filteredGeometry.map((operation) => (
              <OperationCard
                key={operation.id}
                icon={operation.icon}
                name={operation.name}
              />
            ))}
          </div>

          {filteredGeoprocessing.length === 0 && filteredGeometry.length === 0 && (
            <div className="no-results">
              <Icon icon="mdi:alert-circle-outline" width={40} height={40} />
              <p>No operations found for "{searchTerm}"</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default OperationsPanel;
