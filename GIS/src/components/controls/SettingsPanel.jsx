import { X, Globe, Box, Video, RotateCcw } from "lucide-react";
import { useMapContext } from "../../context/MapContext";
import "./SeettingsPanel.css";

function SettingsPanel() {
  const {
    settingsOpen,
    setSettingsOpen,
    mapMode,
    projection,
    setProjection,
    cameraPitch,
    setCameraPitch,
    terrain,
    setTerrain,
  } = useMapContext();

  if (!settingsOpen || mapMode !== "3d") return null;

  return (
    <div className="settings-panel glass-panel gis-fade-in">
      <div className="settings-header">
        <div className="d-flex align-items-center gap-2">
          <Box size={18} />
          <h6 className="m-0 fw-bold">3D & Projection</h6>
        </div>
        <button className="btn-close" onClick={() => setSettingsOpen(false)} aria-label="Close" />
      </div>

      <div className="settings-section">
        <label className="settings-label">
          <Globe size={14} /> Projection
        </label>
        <div className="btn-group w-100">
          <button
            className={`btn btn-sm ${projection === "mercator" ? "btn-primary" : "btn-outline-secondary"}`}
            onClick={() => setProjection("mercator")}
          >
            Mercator
          </button>
          <button
            className={`btn btn-sm ${projection === "globe" ? "btn-primary" : "btn-outline-secondary"}`}
            onClick={() => setProjection("globe")}
          >
            Globe
          </button>
        </div>
      </div>

      <div className="settings-section">
        <label className="settings-label">
          <Video size={14} /> Camera Pitch
        </label>
        <input
          type="range"
          className="form-range gis-slider"
          min="0"
          max="60"
          value={cameraPitch}
          onChange={(e) => setCameraPitch(Number(e.target.value))}
        />
        <div className="settings-value">{cameraPitch}°</div>
      </div>

      <div className="settings-section">
        <label className="settings-label">Terrain Exaggeration</label>
        <input
          type="range"
          className="form-range gis-slider"
          min="0"
          max="3"
          step="0.1"
          value={terrain}
          onChange={(e) => setTerrain(Number(e.target.value))}
        />
        <div className="settings-value">{terrain}x</div>
      </div>

      <button
        className="btn btn-outline-secondary btn-sm w-100"
        onClick={() => {
          setCameraPitch(0);
          setTerrain(0);
          setProjection("mercator");
        }}
      >
        <RotateCcw size={14} className="me-1" /> Reset
      </button>
    </div>
  );
}

export default SettingsPanel;
