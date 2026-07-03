import { useState, useRef, useEffect } from "react";
import {
  MousePointer2,
  Pencil,
  Type,
  Bookmark,
  MessageSquare,
  Undo2,
  Redo2,
  Lasso,
  Square,
  Hexagon,
  Minus,
  MapPin,
  Highlighter,
  Type as TypeIcon,
  StickyNote,
  Image as ImageIcon,
  Link,
  Video,
  Circle,
  RectangleHorizontal,
} from "lucide-react";
import { useMapContext } from "../../context/MapContext";
import Tooltip from "../Common/Tooltip";
import "./BottomToolbar.css";

const pointerTools = [
  { id: "lasso", label: "Lasso Select", icon: Lasso },
  { id: "rectangle", label: "Rectangle Select", icon: Square },
  { id: "polygon", label: "Polygon Select", icon: Hexagon },
];

const drawTools = [
  { id: "polygon", label: "Polygon", icon: Hexagon },
  { id: "line", label: "Line", icon: Minus },
  { id: "point", label: "Point", icon: MapPin },
  { id: "circle", label: "Circle", icon: Circle },
  { id: "rectangle", label: "Rectangle", icon: RectangleHorizontal },
];

const textTools = [
  { id: "marker", label: "Marker", icon: MapPin },
  { id: "highlighter", label: "Highlighter", icon: Highlighter },
  { id: "text", label: "Text", icon: TypeIcon },
  { id: "note", label: "Note", icon: StickyNote },
  { id: "image", label: "Image", icon: ImageIcon },
  { id: "link", label: "Link", icon: Link },
  { id: "video", label: "Video", icon: Video },
];

function Dropdown({ items, activeItem, onSelect, isOpen, onClose }) {
  const ref = useRef(null);

  useEffect(() => {
    const handleClick = (e) => {
      if (ref.current && !ref.current.contains(e.target)) onClose();
    };
    if (isOpen) document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div ref={ref} className="toolbar-dropdown">
      {items.map((item) => {
        const Icon = item.icon;
        return (
          <div
            key={item.id}
            className={`gis-dropdown-item ${activeItem === item.id ? "active" : ""}`}
            onClick={() => onSelect(item.id)}
          >
            <Icon size={16} />
            <span>{item.label}</span>
          </div>
        );
      })}
    </div>
  );
}

function BottomToolbar() {
  const {
    activeTool,
    setActiveTool,
    activeSubTool,
    setActiveSubTool,
    undo,
    redo,
    canUndo,
    canRedo,
  } = useMapContext();
  const [openDropdown, setOpenDropdown] = useState(null);

  const handleToolClick = (tool, items) => {
    if (activeTool === tool && openDropdown === tool) {
      setOpenDropdown(null);
      return;
    }
    setActiveTool(tool);
    setOpenDropdown(tool);
    if (items.length > 0 && !items.some((item) => item.id === activeSubTool)) {
      setActiveSubTool(items[0].id);
    }
  };

  const handleSubSelect = (tool, id) => {
    setActiveTool(tool);
    setActiveSubTool(id);
    setOpenDropdown(null);
  };

  const handleUndo = () => undo();
  const handleRedo = () => redo();

  const handleBookmark = () => {
    setActiveTool("bookmark");
    setActiveSubTool("point");
    setOpenDropdown(null);
  };

  const handleComment = () => {
    setActiveTool("comment");
    setActiveSubTool("point");
    setOpenDropdown(null);
  };

  return (
    <div className="bottom-toolbar">
      <Tooltip text="Pointer" position="top">
        <div className="toolbar-btn-wrapper">
          <button
            className={`gis-btn ${activeTool === "pointer" ? "active" : ""}`}
            onClick={() => handleToolClick("pointer", pointerTools)}
            aria-label="Pointer"
          >
            <MousePointer2 size={22} />
          </button>
          <Dropdown
            items={pointerTools}
            activeItem={activeSubTool}
            isOpen={openDropdown === "pointer" && activeTool === "pointer"}
            onSelect={(id) => handleSubSelect("pointer", id)}
            onClose={() => setOpenDropdown(null)}
          />
        </div>
      </Tooltip>

      <Tooltip text="Draw" position="top">
        <div className="toolbar-btn-wrapper">
          <button
            className={`gis-btn ${activeTool === "draw" ? "active" : ""}`}
            onClick={() => handleToolClick("draw", drawTools)}
            aria-label="Draw"
          >
            <Pencil size={22} />
          </button>
          <Dropdown
            items={drawTools}
            activeItem={activeSubTool}
            isOpen={openDropdown === "draw" && activeTool === "draw"}
            onSelect={(id) => handleSubSelect("draw", id)}
            onClose={() => setOpenDropdown(null)}
          />
        </div>
      </Tooltip>

      <Tooltip text="Text & media" position="top">
        <div className="toolbar-btn-wrapper">
          <button
            className={`gis-btn ${activeTool === "text" ? "active" : ""}`}
            onClick={() => handleToolClick("text", textTools)}
            aria-label="Text"
          >
            <Type size={22} />
          </button>
          <Dropdown
            items={textTools}
            activeItem={activeSubTool}
            isOpen={openDropdown === "text" && activeTool === "text"}
            onSelect={(id) => handleSubSelect("text", id)}
            onClose={() => setOpenDropdown(null)}
          />
        </div>
      </Tooltip>

      <div className="toolbar-divider" />

      <Tooltip text="Bookmark" position="top">
        <button
          className={`gis-btn ${activeTool === "bookmark" ? "active" : ""}`}
          onClick={handleBookmark}
          aria-label="Bookmark"
        >
          <Bookmark size={22} />
        </button>
      </Tooltip>

      <Tooltip text="Comment" position="top">
        <button
          className={`gis-btn ${activeTool === "comment" ? "active" : ""}`}
          onClick={handleComment}
          aria-label="Comment"
        >
          <MessageSquare size={22} />
        </button>
      </Tooltip>

      <div className="toolbar-divider" />

      <Tooltip text="Undo" position="top">
        <button className="gis-btn" onClick={handleUndo} disabled={!canUndo} aria-label="Undo">
          <Undo2 size={22} />
        </button>
      </Tooltip>

      <Tooltip text="Redo" position="top">
        <button className="gis-btn" onClick={handleRedo} disabled={!canRedo} aria-label="Redo">
          <Redo2 size={22} />
        </button>
      </Tooltip>
    </div>
  );
}

export default BottomToolbar;