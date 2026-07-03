import {
  Search,
  Ruler,
  Camera,
  LocateFixed,
  Plus,
  Minus,
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
  };

  const toggleMeasure = () => {
    setMeasureMode(measureMode ? null : "distance");
    setShowSearch(false);
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
            <Search size={22} />
          </button>
        </Tooltip>
        <Tooltip text="Measure distance or area">
          <button
            className={`gis-btn ${measureMode ? "active" : ""}`}
            onClick={toggleMeasure}
            aria-label="Measure"
          >
            <Ruler size={22} />
          </button>
        </Tooltip>
        <Tooltip text="Export screenshot">
          <button className="gis-btn" onClick={handleExport} aria-label="Export Screenshot">
            <Camera size={22} />
          </button>
        </Tooltip>
      </div>

      <div className="right-controls">
        <Tooltip text="Locate me">
          <button className="gis-btn" onClick={handleLocate} aria-label="Locate Me">
            <LocateFixed size={22} />
          </button>
        </Tooltip>
        <Tooltip text="Zoom in">
          <button className="gis-btn" onClick={handleZoomIn} aria-label="Zoom In">
            <Plus size={22} />
          </button>
        </Tooltip>
        <div className="zoom-level">{zoom}</div>
        <Tooltip text="Zoom out">
          <button className="gis-btn" onClick={handleZoomOut} aria-label="Zoom Out">
            <Minus size={22} />
          </button>
        </Tooltip>
      </div>
    </>
  );
}

export default Controls;