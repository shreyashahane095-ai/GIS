import { useState, useEffect, useRef, useCallback } from "react";
import {
  MapPin,
  Highlighter,
  Type,
  StickyNote,
  Image as ImageIcon,
  Link,
  Video,
  X,
} from "lucide-react";
import L from "leaflet";
import { useMapContext } from "../../context/MapContext";
import "./TextTools.css";

const textTools = [
  { id: "marker", label: "Marker", icon: MapPin },
  { id: "highlighter", label: "Highlighter", icon: Highlighter },
  { id: "text", label: "Text", icon: Type },
  { id: "note", label: "Note", icon: StickyNote },
  { id: "image", label: "Image", icon: ImageIcon },
  { id: "link", label: "Link", icon: Link },
  { id: "video", label: "Video", icon: Video },
];

function TextTools() {
  const {
    activeTool,
    activeSubTool,
    setActiveSubTool,
    setActiveTool,
    map,
    drawLayerGroupRef,
    addLayer,
  } = useMapContext();
  const [pendingText, setPendingText] = useState("");
  const pendingTextRef = useRef("");
  const [showInput, setShowInput] = useState(false);
  const listenerRef = useRef(null);

  useEffect(() => {
    pendingTextRef.current = pendingText;
  }, [pendingText]);

  const clearListener = useCallback(() => {
    if (listenerRef.current && map) {
      map.off("click", listenerRef.current);
      listenerRef.current = null;
    }
  }, [map]);

  useEffect(() => {
    return () => clearListener();
  }, [clearListener]);

  if (activeTool !== "text") {
    if (listenerRef.current) clearListener();
    return null;
  }

  const handleSelect = (id) => {
    setActiveSubTool(id);
    setShowInput(false);
    setPendingText("");
    clearListener();
  };

  const getInputLabel = () => {
    switch (activeSubTool) {
      case "text":
        return "Enter text";
      case "note":
        return "Enter note";
      case "image":
        return "Enter image URL";
      case "link":
        return "Enter link URL";
      case "video":
        return "Enter video URL";
      default:
        return "";
    }
  };

  const needsInput = ["text", "note", "image", "link", "video"].includes(activeSubTool);

  const createMarker = (latlng, contentHtml, title) => {
    const marker = L.marker(latlng, {
      icon: new L.DivIcon({
        className: "gis-text-marker",
        html: `<div style="background:#2563eb;width:14px;height:14px;border-radius:50%;border:2px solid #fff;box-shadow:0 2px 6px rgba(0,0,0,0.3);"></div>`,
        iconSize: [14, 14],
        iconAnchor: [7, 7],
      }),
    }).addTo(map);
    marker.bindPopup(contentHtml);
    if (drawLayerGroupRef.current) {
      drawLayerGroupRef.current.addLayer(marker);
    }
    addLayer({
      id: `${activeSubTool}-${Date.now()}`,
      name: title,
      type: activeSubTool,
      visible: true,
      opacity: 1,
      layer: marker,
      data: null,
    });
  };

  const addContentMarker = (latlng) => {
    const text = pendingTextRef.current;
    let content = "";
    let title = "";
    switch (activeSubTool) {
      case "text":
        content = `<div style="font-weight:600">${text}</div>`;
        title = "Text";
        break;
      case "note":
        content = `<div style="max-width:200px;white-space:pre-wrap">${text}</div>`;
        title = "Note";
        break;
      case "image":
        content = `<img src="${text}" style="max-width:200px;border-radius:8px" alt="Annotation" onerror="this.parentElement.innerHTML='Image failed to load'" />`;
        title = "Image";
        break;
      case "link":
        content = `<a href="${text}" target="_blank" rel="noreferrer">${text}</a>`;
        title = "Link";
        break;
      case "video":
        content = `<video src="${text}" controls style="max-width:240px;border-radius:8px"></video>`;
        title = "Video";
        break;
      default:
        return;
    }
    createMarker(latlng, content, title);
    setPendingText("");
    pendingTextRef.current = "";
    setShowInput(false);
  };

  const handlePlaceClick = () => {
    if (!map || !activeSubTool) return;
    clearListener();

    const onMapClick = (e) => {
      const latlng = e.latlng;

      switch (activeSubTool) {
        case "marker":
          createMarker(latlng, "Marker added", "Marker");
          break;
        case "highlighter": {
          const circle = L.circleMarker(latlng, {
            radius: 20,
            color: "#f59e0b",
            fillColor: "#fbbf24",
            fillOpacity: 0.4,
            weight: 2,
          }).addTo(map);
          if (drawLayerGroupRef.current) drawLayerGroupRef.current.addLayer(circle);
          addLayer({
            id: `highlighter-${Date.now()}`,
            name: "Highlighter",
            type: "highlighter",
            visible: true,
            opacity: 1,
            layer: circle,
            data: null,
          });
          break;
        }
        case "text":
        case "note":
        case "image":
        case "link":
        case "video":
          if (!pendingTextRef.current.trim()) {
            setShowInput(true);
            return;
          }
          addContentMarker(latlng);
          break;
        default:
          break;
      }
      clearListener();
    };

    listenerRef.current = onMapClick;
    map.on("click", onMapClick);
  };

  const handleClose = () => {
    setActiveTool("pointer");
    setActiveSubTool(null);
    setShowInput(false);
    setPendingText("");
    clearListener();
  };

  return (
    <div className="text-tools-panel glass-panel gis-fade-in">
      <div className="text-tools-header">
        <h6 className="m-0 fw-bold">Text & Media</h6>
        <button className="text-close" onClick={handleClose} aria-label="Close">
          <X size={16} />
        </button>
      </div>
      <div className="text-tools-grid">
        {textTools.map((tool) => {
          const Icon = tool.icon;
          return (
            <button
              key={tool.id}
              className={`text-tool-btn ${activeSubTool === tool.id ? "active" : ""}`}
              onClick={() => handleSelect(tool.id)}
            >
              <Icon size={18} />
              <span>{tool.label}</span>
            </button>
          );
        })}
      </div>

      {needsInput && showInput && (
        <div className="text-input-section">
          <label className="small text-muted">{getInputLabel()}</label>
          <input
            type="text"
            className="form-control form-control-sm"
            value={pendingText}
            onChange={(e) => setPendingText(e.target.value)}
            placeholder={getInputLabel()}
          />
        </div>
      )}

      <button
        className="btn btn-primary btn-sm w-100 mt-2"
        onClick={handlePlaceClick}
        disabled={needsInput && !pendingText.trim()}
      >
        Click on map to place {activeSubTool || "item"}
      </button>
    </div>
  );
}

export default TextTools;
