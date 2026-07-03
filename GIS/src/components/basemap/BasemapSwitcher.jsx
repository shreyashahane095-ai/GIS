import { useState } from "react";
import { Layers, X } from "lucide-react";
import { useMapContext } from "../../context/MapContext";
import { MAP_PROVIDERS } from "../../config/mapConfig";
import "./BasemapSwitcher.css";

const basemaps = Object.values(MAP_PROVIDERS);

function BasemapSwitcher() {
  const { basemap, setBasemap } = useMapContext();
  const [open, setOpen] = useState(false);

  return (
    <div className="basemap-switcher">
      <button
        className={`gis-btn basemap-toggle ${open ? "active" : ""}`}
        onClick={() => setOpen((s) => !s)}
        aria-label="Basemaps"
      >
        {open ? <X size={22} /> : <Layers size={22} />}
      </button>
      {open && (
        <div className="basemap-menu glass-panel gis-fade-in">
          <div className="basemap-menu-header">
            <h6 className="fw-bold mb-3">Basemap</h6>
            <button
              type="button"
              className="basemap-close-btn"
              onClick={() => setOpen(false)}
              aria-label="Close basemaps"
            >
              <X size={18} />
            </button>
          </div>
          <div className="basemap-grid">
            {basemaps.map((b) => (

              <button

                key={b.id}
                className={`basemap-item ${basemap === b.id ? "active" : ""}`}
                onClick={() => {
                  setBasemap(b.id);
                  setOpen(false);
                }}
              >
                <div
                  className="basemap-thumb"
                  style={{ backgroundColor: b.color }}
                />
                <span>{b.label}</span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default BasemapSwitcher;
