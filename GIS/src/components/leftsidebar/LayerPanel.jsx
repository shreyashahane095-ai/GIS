import React, { useState } from 'react';
import { Icon } from '@iconify/react';
import './LayerPanel.css';

const LayerPanel = ({ isOpen, onClose }) => {
  const [viewOptions, setViewOptions] = useState({
    default: false
  });
  const [zoomVisibility, setZoomVisibility] = useState(50);
  const [visualization, setVisualization] = useState('Standard');
  const [fillColor, setFillColor] = useState('#92b78c');
  const [fillOpacity, setFillOpacity] = useState(50);
  const [outlineColor, setOutlineColor] = useState('#92b78c');
  const [outlineOpacity, setOutlineOpacity] = useState(100);
  const [strokeWidth, setStrokeWidth] = useState(2);
  const [strokeType, setStrokeType] = useState('Solid');
  const [autoAdjust, setAutoAdjust] = useState(false);
  const [labelsEnabled, setLabelsEnabled] = useState(false);    

  if (!isOpen) return null;

  return (
    <div className="layer-panel-overlay" onClick={onClose}>
      <div className="layer-panel" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="layer-panel-header">
          <button className="layer-panel-back" onClick={onClose}>
            <Icon icon="mdi:arrow-left" width={24} height={24} />
          </button>
          <h2 className="layer-panel-title">Layer</h2>
        </div>

        <div className="layer-panel-content">
          {/* View Section */}
          <div className="layer-sub-section">
            <h4 className="layer-sub-title">View</h4>
            <div className="layer-options">
              <div 
                className={`layer-option ${viewOptions.default ? 'active' : ''}`}
                onClick={() => setViewOptions({...viewOptions, default: !viewOptions.default})}
              >
                <span className="option-marker">
                  {viewOptions.default ? '●' : '○'}
                </span>
                <span className="option-text">Default</span>
              </div>
              <div className="layer-sub-option">
                <span className="option-label">Visualization</span>
                <select 
                  className="option-select"
                  value={visualization}
                  onChange={(e) => setVisualization(e.target.value)}
                >
                  <option value="Standard">Standard</option>
                  <option value="Choropleth">Choropleth</option>
                  <option value="Heatmap">Heatmap</option>
                  <option value="Clustering">Clustering</option>
                </select>
              </div>
            </div>
          </div>

          {/* Styling Section */}
          <div className="layer-sub-section">
            <h4 className="layer-sub-title">Styling</h4>
            <div className="styling-group">
              <div className="styling-item">
                <span className="styling-label">Fill</span>
                <div className="styling-controls">
                  <input 
                    type="color" 
                    className="color-picker"
                    value={fillColor}
                    onChange={(e) => setFillColor(e.target.value)}
                  />
                  <div className="opacity-control">
                    <input 
                      type="range" 
                      className="opacity-slider"
                      min="0" 
                      max="100" 
                      value={fillOpacity}
                      onChange={(e) => setFillOpacity(parseInt(e.target.value))}
                    />
                    <span className="opacity-value">{fillOpacity}%</span>
                  </div>
                </div>
              </div>

              <div className="styling-item">
                <span className="styling-label">Zoom visibility</span>
                <div className="styling-controls">
                  <div className="opacity-control">
                    <input
                      type="range"
                      className="opacity-slider"
                      min="0"
                      max="100"
                      value={zoomVisibility}
                      onChange={(e) => setZoomVisibility(parseInt(e.target.value, 10))}
                    />
                    <span className="opacity-value">{zoomVisibility}%</span>
                  </div>
                </div>
              </div>

              <div className="styling-item">
                <span className="styling-label">Adjust height of polygons</span>
                <input 
                  type="range" 
                  className="height-slider"
                  min="0" 
                  max="100" 
                  defaultValue="50"
                />
              </div>

              <div className="styling-item">
                <span className="styling-label">Outline</span>
                <div className="styling-controls">
                  <input 
                    type="color" 
                    className="color-picker"
                    value={outlineColor}
                    onChange={(e) => setOutlineColor(e.target.value)}
                  />
                  <div className="opacity-control">
                    <input 
                      type="range" 
                      className="opacity-slider"
                      min="0" 
                      max="100" 
                      value={outlineOpacity}
                      onChange={(e) => setOutlineOpacity(parseInt(e.target.value))}
                    />
                    <span className="opacity-value">{outlineOpacity}%</span>
                  </div>
                </div>
              </div>

              <div className="styling-item">
                <div className="stroke-controls">
                  <input 
                    type="number" 
                    className="stroke-width"
                    value={strokeWidth}
                    onChange={(e) => setStrokeWidth(parseInt(e.target.value))}
                    min="1"
                    max="10"
                  />
                  <select 
                    className="stroke-type"
                    value={strokeType}
                    onChange={(e) => setStrokeType(e.target.value)}
                  >
                    <option value="Solid">Solid</option>
                    <option value="Dashed">Dashed</option>
                    <option value="Dotted">Dotted</option>
                    <option value="Butter">Butter</option>
                  </select>
                </div>
              </div>

              <div className="styling-item checkbox-item">
                <label className="checkbox-label">
                  <input 
                    type="checkbox" 
                    checked={autoAdjust}
                    onChange={(e) => setAutoAdjust(e.target.checked)}
                  />
                  Adjust size automatically
                </label>
              </div>
            </div>
          </div>

          {/* Labels Section */}
          <div className="layer-sub-section">
            <h4 className="layer-sub-title">Labels</h4>
            <div className="layer-options">
              <div 
                className={`layer-option ${labelsEnabled ? 'active' : ''}`}
                onClick={() => setLabelsEnabled(!labelsEnabled)}
              >
                <span className="option-marker">
                  {labelsEnabled ? '●' : '○'}
                </span>
                <span className="option-text">Popup</span>
              </div>
            </div>
          </div>

          {/* Layer Controls */}
          <div className="layer-sub-section">
            <h4 className="layer-sub-title">Layer</h4>
            <div className="layer-controls">
              <button className="layer-control-btn">
                <Icon icon="mdi:zoom-in" width={16} height={16} />
                Zoom
              </button>
              <button className="layer-control-btn">
                <Icon icon="mdi:filter" width={16} height={16} />
                Filter
              </button>
              <button className="layer-control-btn">
                <Icon icon="mdi:dots-horizontal" width={16} height={16} />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LayerPanel;