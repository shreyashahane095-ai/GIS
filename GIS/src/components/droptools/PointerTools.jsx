import { Lasso, Square, Hexagon, X, MousePointer2 } from "lucide-react";
import { useMapContext } from "../../context/MapContext";
import "./PointerTools.css";

const pointerTools = [
  { id: "lasso", label: "Lasso Select", icon: Lasso },
  { id: "rectangle", label: "Rectangle Select", icon: Square },
  { id: "polygon", label: "Polygon Select", icon: Hexagon },
];

function PointerTools() {
  const { activeTool, activeSubTool, setActiveSubTool, setActiveTool } = useMapContext();

  if (activeTool !== "pointer") return null;

  const handleSelect = (id) => {
    setActiveSubTool(id);
  };

  const handleClose = () => {
    setActiveTool("pointer");
    setActiveSubTool(null);
  };

  return (
    <div className="pointer-tools-panel glass-panel gis-fade-in">
      <div className="pointer-tools-header">
        <div className="d-flex align-items-center gap-2">
          <MousePointer2 size={18} />
          <h6 className="m-0 fw-bold">Selection</h6>
        </div>
        <button className="pointer-close" onClick={handleClose} aria-label="Close">
          <X size={16} />
        </button>
      </div>
      <div className="pointer-tools-list">
        {pointerTools.map((tool) => {
          const Icon = tool.icon;
          return (
            <button
              key={tool.id}
              className={`pointer-tool-btn ${activeSubTool === tool.id ? "active" : ""}`}
              onClick={() => handleSelect(tool.id)}
            >
              <Icon size={18} />
              <span>{tool.label}</span>
            </button>
          );
        })}
      </div>
      <div className="pointer-hint">
        {activeSubTool
          ? `${pointerTools.find((t) => t.id === activeSubTool)?.label} is active. Draw on the map to select features inside the shape.`
          : "Select a tool to start selecting map features."}
      </div>
    </div>
  );
}

export default PointerTools;
