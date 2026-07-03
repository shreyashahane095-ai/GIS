import React, { useEffect, useState } from 'react';
import { Icon } from '@iconify/react';
import { getLayerFeatures } from '../../services/featuresApi';
import './DataActionPanel.css';

const DataActionPanel = ({ isOpen, onOpenOperations, selectedLayerId }) => {
  const isLayerSelected = Boolean(selectedLayerId);

  const [searchTerm, setSearchTerm] = useState('');
  const [basicSelected, setBasicSelected] = useState(null);
  const [actionSelected, setActionSelected] = useState(null);
  const [importSelected, setImportSelected] = useState(null);
  const [layerFeatures, setLayerFeatures] = useState([]);
  const [layerFeaturesLoading, setLayerFeaturesLoading] = useState(false);
  const [layerFeaturesError, setLayerFeaturesError] = useState('');

  const basicTools = [
    {
      id: 'copy',
      icon: 'mdi:content-copy',
      label: 'Duplicate / Copy',
      description: 'Creates a copy of the selected object',
    },
    {
      id: 'union',
      icon: 'mdi:vector-union',
      label: 'Union',
      description: 'Merges multiple selected shapes into a single shape',
    },
    {
      id: 'subtract',
      icon: 'mdi:vector-difference',
      label: 'Subtract',
      description: 'Removes the front shape from the shape behind it',
    },
    {
      id: 'intersect',
      icon: 'mdi:vector-intersection',
      label: 'Intersect',
      description: 'Keeps only the area where the selected shapes overlap',
    },
    {
      id: 'exclude',
      icon: 'mdi:vector-difference-ab',
      label: 'Exclude',
      description: 'Removes the overlapping area, leaving the non-overlapping parts',
    },
    {
      id: 'smart',
      icon: 'mdi:auto-fix',
      label: 'Smart Actions / AI Tools',
      description: 'Opens AI-powered or smart editing options',
    },
    {
      id: 'fullscreen',
      icon: 'mdi:fullscreen',
      label: 'Full Screen / Expand',
      description: 'Expands the canvas or enters full-screen mode',
    },
  ];

  const actionOptions = [
    { id: 'vector', label: 'Vector operations', icon: 'mdi:vector-line' },
    { id: 'raster', label: 'Raster operations', icon: 'mdi:image' },
    { id: 'tools', label: 'Tools & workflows', icon: 'mdi:tools' },
  ];

  const importOptions = [
    { id: 'overture', label: 'Overture Maps', icon: 'mdi:folder' },
    { id: 'terrain', label: 'Terrain tiles', icon: 'mdi:file-document' },
    { id: 'esa', label: 'ESA', icon: 'mdi:cloud' },
    { id: 'nasa', label: 'NASA', icon: 'mdi:star' },
  ];

  const allActions = [
    ...actionOptions.map((action) => ({ ...action, category: 'Actions' })),
    ...importOptions.map((action) => ({ ...action, category: 'Import' })),
  ];

  const filteredActions = searchTerm.trim()
    ? allActions.filter((action) =>
        action.label.toLowerCase().includes(searchTerm.toLowerCase().trim())
      )
    : null;

  const getFeatureLabel = (feature, index) => {
    if (!feature) return `Feature ${index + 1}`;
    return (
      feature.name ||
      feature.title ||
      feature.label ||
      feature.properties?.name ||
      feature.properties?.title ||
      feature.properties?.label ||
      feature.id ||
      `Feature ${index + 1}`
    );
  };

  const getFeatureMeta = (feature) => {
    if (!feature) return '';
    const parts = [];
    if (feature.type) parts.push(feature.type);
    if (feature.geometry?.type && feature.geometry.type !== feature.type) {
      parts.push(feature.geometry.type);
    }
    if (feature.id !== undefined && feature.id !== null) {
      parts.push(`ID: ${feature.id}`);
    }
    return parts.join(' - ');
  };

  const handleBasicToggle = (index) => {
    if (!isLayerSelected) return;
    setBasicSelected(basicSelected === index ? null : index);
  };

  useEffect(() => {
    if (!selectedLayerId) {
      setBasicSelected(null);
      setActionSelected(null);
      setImportSelected(null);
      setLayerFeatures([]);
      setLayerFeaturesError('');
      setLayerFeaturesLoading(false);
      return;
    }

    let isActive = true;

    const loadLayerFeatures = async () => {
      setLayerFeaturesLoading(true);
      setLayerFeaturesError('');

      try {
        const response = await getLayerFeatures(selectedLayerId);
        const nextFeatures = Array.isArray(response)
          ? response
          : response?.features || response?.items || response?.results || response?.data || [];

        if (!isActive) return;
        setLayerFeatures(nextFeatures);
      } catch (error) {
        if (!isActive) return;
        setLayerFeatures([]);
        setLayerFeaturesError(error.message || 'Unable to load features for this layer.');
      } finally {
        if (isActive) {
          setLayerFeaturesLoading(false);
        }
      }
    };

    loadLayerFeatures();

    return () => {
      isActive = false;
    };
  }, [selectedLayerId]);

  const handleActionToggle = (id) => {
    setActionSelected(actionSelected === id ? null : id);
    if (id === 'vector') onOpenOperations();
  };

  const handleImportToggle = (id) => {
    setImportSelected(importSelected === id ? null : id);
  };

  if (!isOpen) return null;

  return (
    <div className="data-action-panel">
      <div className="panel-fixed">
        <div className="sub-section basic-section">
          <h4 className="sub-title">Basic</h4>
          <div className={`basic-grid ${!selectedLayerId ? 'disabled' : ''}`}>
            {basicTools.map((tool, index) => {
              const isDisabled = !selectedLayerId;

              return (
                <button
                  key={tool.id}
                  type="button"
                  className={`basic-icon-item ${basicSelected === index ? 'selected' : ''}`}
                  onClick={() => handleBasicToggle(index)}
                  title={
                    isDisabled
                      ? 'Select a layer to enable basic operations'
                      : tool.label
                  }
                >
                  <Icon icon={tool.icon} width={21} height={21} />
                  <span className="basic-tooltip">
                    <strong>{tool.label}</strong>
                    <span>
                      {isDisabled
                        ? 'Please select a layer first.'
                        : tool.description}
                    </span>
                  </span>
                </button>
              );
            })}
          </div>

          {!selectedLayerId && (
            <div className="layer-required-message">
              <Icon icon="mdi:information-outline" width={16} height={16} />
              <span>Select a layer to enable basic operations.</span>
            </div>
          )}
        </div>
      </div>

      <div className="panel-scroll">
        {searchTerm ? (
          <div className="search-results">
            <h4 className="sub-title">Search Results</h4>
            {filteredActions && filteredActions.length > 0 ? (
              <div className="action-list">
                {filteredActions.map((item) => (
                  <div
                    key={`${item.category}-${item.id}`}
                    className="action-item"
                    onClick={() => {
                      if (item.category === 'Actions') handleActionToggle(item.id);
                      if (item.category === 'Import') handleImportToggle(item.id);
                    }}
                  >
                    <div className="action-icon">
                      <Icon icon={item.icon} width={20} height={20} />
                    </div>
                    <span className="action-label">{item.label}</span>
                    <span className="action-badge">{item.category}</span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="no-results">
                <Icon icon="mdi:alert-circle-outline" width={36} height={36} />
                <p>No actions found for "{searchTerm}"</p>
              </div>
            )}
          </div>
        ) : (
          <>
            <div className="sub-section">
              <h4 className="sub-title">Layer Features</h4>
              {!selectedLayerId ? (
                <div className="layer-required-message">
                  <Icon icon="mdi:information-outline" width={16} height={16} />
                  <span>Select a layer to load its features.</span>
                </div>
              ) : layerFeaturesLoading ? (
                <div className="layer-features-state">
                  <Icon icon="mdi:loading" width={16} height={16} className="spin-icon" />
                  <span>Loading features...</span>
                </div>
              ) : layerFeaturesError ? (
                <div className="layer-features-state layer-features-error">
                  <Icon icon="mdi:alert-circle-outline" width={16} height={16} />
                  <span>{layerFeaturesError}</span>
                </div>
              ) : layerFeatures.length > 0 ? (
                <div className="layer-feature-list">
                  {layerFeatures.map((feature, index) => (
                    <div
                      key={feature.id ?? `${selectedLayerId}-${index}`}
                      className="layer-feature-item"
                    >
                      <div className="layer-feature-icon">
                        <Icon icon="mdi:shape-outline" width={16} height={16} />
                      </div>
                      <div className="layer-feature-info">
                        <span className="layer-feature-name">
                          {getFeatureLabel(feature, index)}
                        </span>
                        <span className="layer-feature-meta">
                          {getFeatureMeta(feature) || 'Feature from selected layer'}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="layer-features-state">
                  <Icon icon="mdi:folder-search-outline" width={16} height={16} />
                  <span>No features found for this layer.</span>
                </div>
              )}
            </div>

            <div className="sub-section">
              <h4 className="sub-title">Actions</h4>
              <div className="action-list">
                {actionOptions.map((action) => (
                  <div
                    key={action.id}
                    className={`action-item ${actionSelected === action.id ? 'selected' : ''}`}
                    onClick={() => handleActionToggle(action.id)}
                  >
                    <div className="action-icon">
                      <Icon icon={action.icon} width={20} height={20} />
                    </div>
                    <span className="action-label">{action.label}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="sub-section">
              <h4 className="sub-title">Import Data</h4>
              <div className="action-list">
                {importOptions.map((source) => (
                  <div
                    key={source.id}
                    className={`action-item ${importSelected === source.id ? 'selected' : ''}`}
                    onClick={() => handleImportToggle(source.id)}
                  >
                    <div className="action-icon">
                      <Icon icon={source.icon} width={20} height={20} />
                    </div>
                    <span className="action-label">{source.label}</span>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default DataActionPanel;
