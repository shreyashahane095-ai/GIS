import { useState } from "react";
import {
  MapPin,
  Minus,
  Hexagon,
  Circle,
  RectangleHorizontal,
  Edit3,
  Trash2,
  Check,
  X,
} from "lucide-react";
import { useMapContext } from "../../context/MapContext";
import "./DrawTools.css";

const drawTools = [
  { id: "point", label: "Point", icon: MapPin },
  { id: "line", label: "Line", icon: Minus },
  { id: "polygon", label: "Polygon", icon: Hexagon },
  { id: "circle", label: "Circle", icon: Circle },
  { id: "rectangle", label: "Rectangle", icon: RectangleHorizontal },
];

function DrawTools() {
  const {
    activeTool,
    activeSubTool,
    setActiveSubTool,
    setActiveTool,
    drawLayerGroupRef,
    map,
    setLayers,
    updateLayerGeometry,
  } = useMapContext();
  const [editMode, setEditMode] = useState(false);

  if (activeTool !== "draw") return null;

  const getDrawHint = () => {
    if (activeSubTool === "polygon") {
      return "Click map points, then press Enter or right-click to finish the polygon.";
    }
    if (activeSubTool === "line") {
      return "Click map points, then press Enter or right-click to finish the line.";
    }
    if (activeSubTool === "rectangle" || activeSubTool === "circle") {
      return `Drag on the map to draw a ${activeSubTool}.`;
    }
    if (activeSubTool) {
      return `Click on the map to draw a ${activeSubTool}.`;
    }
    return "Select a tool above to start drawing.";
  };

  const handleSelect = (id) => {
    setActiveSubTool(id);
    setEditMode(false);
    disableEdit();
  };

  const handleDelete = () => {
    if (!drawLayerGroupRef.current || !map) return;
    drawLayerGroupRef.current.clearLayers();
    setLayers((prev) => prev.filter((l) => l.type !== "marker" && l.type !== "line" && l.type !== "polygon" && l.type !== "circle" && l.type !== "rectangle" && l.type !== "point"));
  };

  const enableEdit = () => {
    if (!drawLayerGroupRef.current || !map) return;
    drawLayerGroupRef.current.eachLayer((layer) => {
      if (layer.editing && layer.editing.enable) layer.editing.enable();
      if (layer.dragging && layer.dragging.enable) layer.dragging.enable();
    });
    setEditMode(true);
  };

  const disableEdit = () => {
    if (!drawLayerGroupRef.current || !map) return;
    drawLayerGroupRef.current.eachLayer((layer) => {
      if (layer.editing && layer.editing.disable) layer.editing.disable();
      if (layer.dragging && layer.dragging.disable) layer.dragging.disable();
      updateLayerGeometry(layer);
    });
    setEditMode(false);
  };

  const toggleEdit = () => {
    if (editMode) disableEdit();
    else enableEdit();
  };

  const handleClose = () => {
    setActiveTool("pointer");
    setActiveSubTool(null);
    setEditMode(false);
    disableEdit();
  };

  return (
    <div className="draw-tools-panel glass-panel gis-fade-in">
      <div className="draw-tools-header">
        <h6 className="m-0 fw-bold">Drawing Tools</h6>
        <button className="draw-close" onClick={handleClose} aria-label="Close">
          <X size={16} />
        </button>
      </div>
      <div className="draw-tools-grid">
        {drawTools.map((tool) => {
          const Icon = tool.icon;
          return (
            <button
              key={tool.id}
              className={`draw-tool-btn ${activeSubTool === tool.id ? "active" : ""}`}
              onClick={() => handleSelect(tool.id)}
            >
              <Icon size={18} />
              <span>{tool.label}</span>
              {activeSubTool === tool.id && <Check size={12} className="draw-check" />}
            </button>
          );
        })}
      </div>
      <div className="draw-tools-actions">
        <button
          className={`btn btn-sm w-100 ${editMode ? "btn-primary" : "btn-outline-secondary"}`}
          onClick={toggleEdit}
        >
          <Edit3 size={14} className="me-1" /> {editMode ? "Finish editing" : "Edit shapes"}
        </button>
        <button className="btn btn-outline-danger btn-sm w-100 mt-2" onClick={handleDelete}>
          <Trash2 size={14} className="me-1" /> Delete all
        </button>
      </div>
      <div className="draw-hint">{getDrawHint()}</div>
    </div>
  );
}

export default DrawTools;
