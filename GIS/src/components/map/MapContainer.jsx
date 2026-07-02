import { useEffect } from "react";
import Map from "./Map";
import Controls from "../Controls/Controls";
import BottomToolbar from "../BottomToolbar/BottomToolbar";
import BasemapSwitcher from "../Basemap/BasemapSwitcher";
import LayerManager from "../Layers/LayerManager";
import PopupMenus from "../Popup/PopupMenus";
import SearchPanel from "../Controls/SearchPanel";
import MeasurePanel from "../Controls/MeasurePanel";
import SettingsPanel from "../Controls/SettingsPanel";
import BackendGeometrySync from "./BackendGeometrySync";
import AnnotationController from "./AnnotationController";
import { useMapContext } from "../../context/MapContext";
import "./MapContainer.css";

function MapContainer() {
  const {
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
    setSettingsOpen,
  } = useMapContext();

  useEffect(() => {
    const onKeyDown = (e) => {
      if (e.key === "Escape") {
        setActiveTool("pointer");
        setActiveSubTool(null);
        setMeasureMode(null);
        setShowSearch(false);
        setSettingsOpen(false);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [setActiveTool, setActiveSubTool, setMeasureMode, setShowSearch, setSettingsOpen]);

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
      <LayerManager />
      <PopupMenus />
      <SearchPanel />
      <MeasurePanel />
      <SettingsPanel />
    </div>
  );
}

export default MapContainer;
