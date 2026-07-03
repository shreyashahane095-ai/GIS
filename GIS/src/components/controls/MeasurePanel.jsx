import { useEffect, useRef, useState, useCallback } from "react";
import { Ruler, Triangle, Minus } from "lucide-react";
import L from "leaflet";
import { useMapContext } from "../../context/MapContext";
import "./MeasurePanel.css";

function formatDistance(meters) {
  if (meters >= 1000) return `${(meters / 1000).toFixed(2)} km`;
  return `${meters.toFixed(1)} m`;
}

function formatArea(sqMeters) {
  if (sqMeters >= 1000000) return `${(sqMeters / 1000000).toFixed(2)} km²`;
  return `${sqMeters.toFixed(1)} m²`;
}

function polygonArea(latlngs) {
  const R = 6371000;
  let area = 0;
  const n = latlngs.length;
  for (let i = 0; i < n; i++) {
    const p1 = latlngs[i];
    const p2 = latlngs[(i + 1) % n];
    const lambda1 = (p1.lng * Math.PI) / 180;
    const lambda2 = (p2.lng * Math.PI) / 180;
    const phi1 = (p1.lat * Math.PI) / 180;
    const phi2 = (p2.lat * Math.PI) / 180;
    area += (lambda2 - lambda1) * (2 + Math.sin(phi1) + Math.sin(phi2));
  }
  return Math.abs((area * R * R) / 2);
}

function MeasurePanel() {
  const { map, measureMode, setMeasureMode } = useMapContext();
  const [result, setResult] = useState(null);
  const polylineRef = useRef(null);
  const polygonRef = useRef(null);
  const markersRef = useRef([]);
  const pointsRef = useRef([]);

  const clear = useCallback(() => {
    pointsRef.current = [];
    setResult(null);
    if (!map) return;
    if (polylineRef.current) {
      map.removeLayer(polylineRef.current);
      polylineRef.current = null;
    }
    if (polygonRef.current) {
      map.removeLayer(polygonRef.current);
      polygonRef.current = null;
    }
    markersRef.current.forEach((m) => map.removeLayer(m));
    markersRef.current = [];
  }, [map]);

  useEffect(() => {
    if (!map || !measureMode) return;
    queueMicrotask(() => {
      clear();
    });

    const onClick = (e) => {
      pointsRef.current.push(e.latlng);
      const marker = L.circleMarker(e.latlng, {
        radius: 5,
        color: "#2563eb",
        fillColor: "#2563eb",
        fillOpacity: 1,
      }).addTo(map);
      markersRef.current.push(marker);
      updateShape();
    };

    const updateShape = () => {
      const pts = pointsRef.current;
      if (pts.length < 2) return;

      if (measureMode === "distance") {
        if (polylineRef.current) map.removeLayer(polylineRef.current);
        polylineRef.current = L.polyline(pts, { color: "#2563eb", weight: 3 }).addTo(map);
        let dist = 0;
        for (let i = 1; i < pts.length; i++) {
          dist += pts[i - 1].distanceTo(pts[i]);
        }
        setResult(formatDistance(dist));
      } else if (measureMode === "area" && pts.length >= 3) {
        if (polygonRef.current) map.removeLayer(polygonRef.current);
        polygonRef.current = L.polygon(pts, {
          color: "#2563eb",
          weight: 2,
          fillOpacity: 0.15,
        }).addTo(map);
        const area = polygonArea(pts);
        setResult(formatArea(area));
      }
    };

    map.on("click", onClick);

    return () => {
      map.off("click", onClick);
      clear();
    };
  }, [map, measureMode, clear]);

  if (!measureMode) return null;

  return (
    <div className="measure-panel glass-panel gis-fade-in">
      <div className="measure-header">
        <div className="d-flex align-items-center gap-2">
          <Ruler size={18} />
          <h6 className="m-0 fw-bold">Measure</h6>
        </div>
        <button className="btn-close" onClick={() => setMeasureMode(null)} aria-label="Close" />
      </div>

      <div className="measure-modes">
        <button
          className={`btn btn-sm ${measureMode === "distance" ? "btn-primary" : "btn-outline-secondary"}`}
          onClick={() => {
            clear();
            setMeasureMode("distance");
          }}
        >
          <Minus size={14} className="me-1" /> Distance
        </button>
        <button
          className={`btn btn-sm ${measureMode === "area" ? "btn-primary" : "btn-outline-secondary"}`}
          onClick={() => {
            clear();
            setMeasureMode("area");
          }}
        >
          <Triangle size={14} className="me-1" /> Area
        </button>
      </div>

      <div className="measure-instructions">
        Click on the map to add points. The {measureMode === "distance" ? "distance" : "area"} will
        be calculated automatically.
      </div>

      {result && (
        <div className="measure-result">
          <span className="text-muted small">Result</span>
          <div className="measure-value">{result}</div>
        </div>
      )}

      <button className="btn btn-outline-secondary btn-sm w-100 mt-2" onClick={clear}>
        Clear
      </button>
    </div>
  );
}

export default MeasurePanel;