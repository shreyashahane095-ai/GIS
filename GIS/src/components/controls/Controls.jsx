import {
  Search,
  Ruler,
  Camera,
  LocateFixed,
  Plus,
  Minus,
  Settings2,
  Box,
} from "lucide-react";
import { useMapContext } from "../../context/MapContext";
import Tooltip from "../Common/Tooltip";
import "./Controls.css";

function Controls() {
  const {
    map,
    zoom,
    setShowSearch,
    showSearch,
    setMeasureMode,
    measureMode,
    setSettingsOpen,
    settingsOpen,
    mapMode,
    setMapMode,
  } = useMapContext();

  const handleZoomIn = () => {
    if (map) map.zoomIn();
  };

  const handleZoomOut = () => {
    if (map) map.zoomOut();
  };

  const handleLocate = () => {
    if (!map || !navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude, longitude } = pos.coords;
        map.flyTo([latitude, longitude], 14);
      },
      () => alert("Unable to retrieve your location.")
    );
  };

  const handleExport = async () => {
    const html2canvas = (await import("html2canvas")).default;
    const mapEl = document.querySelector(".gis-map");
    if (!mapEl) return;
    const canvas = await html2canvas(mapEl, { useCORS: true, scale: 2 });
    const link = document.createElement("a");
    link.download = `map-export-${Date.now()}.png`;
    link.href = canvas.toDataURL("image/png");
    link.click();
  };

  const toggleSearch = () => {
    setShowSearch((s) => !s);
    setMeasureMode(null);
    setSettingsOpen(false);
  };

  const toggleMeasure = () => {
    setMeasureMode(measureMode ? null : "distance");
    setShowSearch(false);
    setSettingsOpen(false);
  };

  const toggleSettings = () => {
    if (mapMode !== "3d") return;
    setSettingsOpen((s) => !s);
    setShowSearch(false);
    setMeasureMode(null);
  };

  const toggleMapMode = () => {
    const nextMode = mapMode === "3d" ? "2d" : "3d";
    setMapMode(nextMode);
    setShowSearch(false);
    setMeasureMode(null);
    setSettingsOpen(nextMode === "3d");
  };

  return (
    <>
      <div className="left-controls">
        <Tooltip text="Search location">
          <button
            className={`gis-btn ${showSearch ? "active" : ""}`}
            onClick={toggleSearch}
            aria-label="Search"
          >
            <Search size={16} />
          </button>
        </Tooltip>
        <Tooltip text="Measure distance or area">
          <button
            className={`gis-btn ${measureMode ? "active" : ""}`}
            onClick={toggleMeasure}
            aria-label="Measure"
          >
            <Ruler size={16} />
          </button>
        </Tooltip>
        <Tooltip text="Export screenshot">
          <button className="gis-btn" onClick={handleExport} aria-label="Export Screenshot">
            <Camera size={16} />
          </button>
        </Tooltip>
        <Tooltip text="Settings">
          <button
            className={`gis-btn ${settingsOpen ? "active" : ""}`}
            onClick={toggleSettings}
            disabled={mapMode !== "3d"}
            aria-label="Settings"
          >
            <Settings2 size={16} />
          </button>
        </Tooltip>
      </div>

      <div className="right-controls">
        <Tooltip text={mapMode === "3d" ? "Switch to 2D" : "Switch to 3D"}>
          <button
            className={`gis-btn ${mapMode === "3d" ? "active" : ""}`}
            onClick={toggleMapMode}
            aria-label={mapMode === "3d" ? "Switch to 2D" : "Switch to 3D"}
          >
            <Box size={16} />
          </button>
        </Tooltip>
        <Tooltip text="Locate me">
          <button className="gis-btn" onClick={handleLocate} aria-label="Locate Me">
            <LocateFixed size={16} />
          </button>
        </Tooltip>
        <Tooltip text="Zoom in">
          <button className="gis-btn" onClick={handleZoomIn} aria-label="Zoom In">
            <Plus size={16} />
          </button>
        </Tooltip>
        <div className="zoom-level">{zoom}</div>
        <Tooltip text="Zoom out">
          <button className="gis-btn" onClick={handleZoomOut} aria-label="Zoom Out">
            <Minus size={16} />
          </button>
        </Tooltip>
      </div>
    </>
  );
}

export default Controls;
