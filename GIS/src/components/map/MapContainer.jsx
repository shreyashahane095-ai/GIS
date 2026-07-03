import { useEffect } from "react";
import Map from "./Map";
import Controls from "../controls/Controls";
import BottomToolbar from "../bottomtoolbar/BottomToolbar";
import BasemapSwitcher from "../basemap/BasemapSwitcher";
import PopupMenus from "../popup/PopupMenus";
import SearchPanel from "../controls/SearchPanel";
import MeasurePanel from "../controls/MeasurePanel";
import BackendGeometrySync from "./BackendGeometrySync";
import AnnotationController from "./AnnotationController";
import { useMapContext } from "../../context/MapContext";
import "./MapContainer.css";

function MapContainer() {
  const {
    map,
    activeTool,
    activeSubTool,
    measureMode,
    isDrawing,
    notification,
    setNotification,
    setActiveTool,
    setActiveSubTool,
    setMeasureMode,
    setShowSearch,
  } = useMapContext();

  useEffect(() => {
    const onKeyDown = (e) => {
      if (e.key === "Escape") {
        setActiveTool("pointer");
        setActiveSubTool(null);
        setMeasureMode(null);
        setShowSearch(false);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [setActiveTool, setActiveSubTool, setMeasureMode, setShowSearch]);

  const getActiveStatus = () => {
    if (measureMode) return `Measuring ${measureMode}`;
    if (activeTool === "draw" && activeSubTool) {
      if (activeSubTool === "polygon") {
        return "Drawing polygon: click points, Enter or right-click to finish";
      }
      if (activeSubTool === "line") {
        return "Drawing line: click points, Enter or right-click to finish";
      }
      return isDrawing ? `Drawing ${activeSubTool}...` : `Draw: ${activeSubTool}`;
    }
    if (activeTool === "text" && activeSubTool) return `Placing: ${activeSubTool}`;
    if (activeTool === "bookmark") return "Click a saved shape to place bookmark point";
    if (activeTool === "comment") return "Click a saved shape to place comment point";
    if (activeTool === "pointer" && activeSubTool) return `Selecting: ${activeSubTool}`;
    return null;
  };

  const activeStatus = getActiveStatus();

  return (
    <div className="map-container">
      {(!map || !activeTool) && (
        <div className="map-loading-overlay" aria-live="polite">
          <div className="map-loading-box">
            <div className="map-loading-spinner" />
            <div style={{ fontWeight: 700, fontSize: 13, opacity: 0.95 }}>
              Loading map...
            </div>
            <div style={{ fontSize: 12, opacity: 0.8 }}>
              Initializing Leaflet & layers
            </div>
          </div>
        </div>
      )}
      <BackendGeometrySync />
      <Map />
      <AnnotationController />
      {activeStatus && (
        <div className="active-status glass-panel gis-fade-in">
          <span className="status-dot" />
          {activeStatus}
        </div>
      )}
      {notification && (
        <div className="notification-banner glass-panel gis-fade-in">
          <span>{notification}</span>
          <button
            className="btn-close"
            onClick={() => setNotification(null)}
            aria-label="Close notification"
          />
        </div>
      )}
      <Controls />
      <BottomToolbar />
      <BasemapSwitcher />
      <PopupMenus />
      <SearchPanel />
      <MeasurePanel />
    </div>
  );
}

export default MapContainer;