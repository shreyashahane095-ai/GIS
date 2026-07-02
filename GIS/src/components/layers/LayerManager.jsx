import { useState } from "react";
import { Layers, X, Eye, EyeOff, Trash2, Edit2, Check, GripVertical, Maximize2, Focus } from "lucide-react";
import { useMapContext } from "../../context/MapContext";
import "./LayerManager.css";

function LayerManager() {
  const {
    layers,
    showLayerManager,
    setShowLayerManager,
    toggleLayerVisibility,
    removeLayer,
    renameLayer,
    setLayerOpacity,
    zoomToLayer,
    selectLayer,
    activeLayerId,
  } = useMapContext();
  const [editingId, setEditingId] = useState(null);
  const [editName, setEditName] = useState("");

  const startEdit = (layer) => {
    setEditingId(layer.id);
    setEditName(layer.name);
  };

  const saveEdit = (id) => {
    renameLayer(id, editName);
    setEditingId(null);
  };

  const soloLayer = (soloId) => {
    layers.forEach((l) => {
      if (l.id === soloId && !l.visible) toggleLayerVisibility(l.id);
      if (l.id !== soloId && l.visible) toggleLayerVisibility(l.id);
    });
  };

  if (!showLayerManager) {
    return (
      <button
        className="gis-btn layer-toggle"
        onClick={() => setShowLayerManager(true)}
        aria-label="Layers"
      >
        <Layers size={22} />
      </button>
    );
  }

  return (
    <div className="layer-manager glass-panel gis-fade-in">
      <div className="layer-manager-header">
        <div className="d-flex align-items-center gap-2">
          <Layers size={18} />
          <h6 className="m-0 fw-bold">Layers</h6>
        </div>
        <button
          className="btn-close"
          onClick={() => setShowLayerManager(false)}
          aria-label="Close"
        />
      </div>

      <div className="layer-list gis-scrollbar">
        {layers.length === 0 && (
          <div className="text-muted small p-3 text-center">
            No layers yet. Use the draw tools to create features.
          </div>
        )}
        {layers.map((layer) => (
          <div
            key={layer.id}
            className={`layer-item ${activeLayerId === layer.id ? "active" : ""}`}
            onClick={() => selectLayer(layer.id)}
          >
            <div className="layer-row">
              <GripVertical size={14} className="text-muted" />
              <button
                className="layer-visibility"
                onClick={(e) => {
                  e.stopPropagation();
                  toggleLayerVisibility(layer.id);
                }}
                aria-label={layer.visible ? "Hide layer" : "Show layer"}
              >
                {layer.visible ? <Eye size={16} /> : <EyeOff size={16} />}
              </button>

              {editingId === layer.id ? (
                <input
                  className="form-control form-control-sm layer-name-input"
                  value={editName}
                  onClick={(e) => e.stopPropagation()}
                  onChange={(e) => setEditName(e.target.value)}
                  onBlur={() => saveEdit(layer.id)}
                  onKeyDown={(e) => e.key === "Enter" && saveEdit(layer.id)}
                  autoFocus
                />
              ) : (
                <span className="layer-name">{layer.name}</span>
              )}

              <button
                className="layer-action"
                onClick={(e) => {
                  e.stopPropagation();
                  zoomToLayer(layer.id);
                }}
                aria-label="Zoom to layer"
                title="Zoom to layer"
              >
                <Maximize2 size={14} />
              </button>
              <button
                className="layer-action"
                onClick={(e) => {
                  e.stopPropagation();
                  soloLayer(layer.id);
                }}
                aria-label="Show only this layer"
                title="Show only this layer"
              >
                <Focus size={14} />
              </button>
              <button
                className="layer-action"
                onClick={(e) => {
                  e.stopPropagation();
                  startEdit(layer);
                }}
                aria-label="Rename"
                title="Rename"
              >
                <Edit2 size={14} />
              </button>
              <button
                className="layer-action text-danger"
                onClick={(e) => {
                  e.stopPropagation();
                  removeLayer(layer.id);
                }}
                aria-label="Delete"
                title="Delete"
              >
                <Trash2 size={14} />
              </button>
            </div>
            <div className="layer-opacity">
              <span className="text-muted small">Opacity</span>
              <input
                type="range"
                className="form-range form-range-sm gis-slider"
                min="0"
                max="1"
                step="0.05"
                value={layer.opacity}
                onClick={(e) => e.stopPropagation()}
                onChange={(e) => setLayerOpacity(layer.id, Number(e.target.value))}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default LayerManager;
