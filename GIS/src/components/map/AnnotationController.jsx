import { useEffect, useRef, useState } from "react";
import L from "leaflet";
import { useMapContext } from "../../context/MapContext";
import { eventBus, MAP_EVENTS } from "../../services/eventBus";
import { saveRegionComment } from "../../services/regionApi";
import { findShapeAtLatLng, geometryContainsLatLng } from "../../services/shapeRegistry";

const ANNOTATION_CONFIG = {
  bookmark: {
    label: "Bookmark",
    color: "#8b5cf6",
    placeholder: "Enter bookmark text",
  },
  comment: {
    label: "Comment",
    color: "#ec4899",
    placeholder: "Enter comment text",
  },
};

function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function createAnnotationIcon(color) {
  return new L.DivIcon({
    className: "gis-annotation-marker",
    html: `<div style="background:${color};width:16px;height:16px;border-radius:50%;border:2px solid #fff;box-shadow:0 2px 8px rgba(0,0,0,0.32);"></div>`,
    iconSize: [16, 16],
    iconAnchor: [8, 8],
  });
}

function getGeometry(geojson) {
  if (!geojson) return null;
  if (geojson.type === "Feature") return geojson.geometry || null;
  if (geojson.type === "FeatureCollection") {
    return geojson.features?.[0]?.geometry || null;
  }
  if (geojson.type && geojson.coordinates) return geojson;
  return null;
}

function isAnnotatableLayer(layer) {
  if (!layer) return false;
  if (layer.backendSynced || layer.backendId) return true;
  return ["point", "marker", "line", "polyline", "polygon", "rectangle", "circle", "geojson"].includes(layer.type);
}

function leafletLayerContainsLatLng(map, latlng, leafletLayer) {
  if (!map || !latlng || !leafletLayer) return false;

  if (leafletLayer.getRadius && leafletLayer.getLatLng) {
    return leafletLayer.getLatLng().distanceTo(latlng) <= leafletLayer.getRadius();
  }

  if (leafletLayer.getBounds) {
    return leafletLayer.getBounds().contains(latlng);
  }

  if (leafletLayer.getLatLng) {
    const point = map.latLngToLayerPoint(latlng);
    const target = map.latLngToLayerPoint(leafletLayer.getLatLng());
    return point.distanceTo(target) <= 12;
  }

  return false;
}

function findSavedLayerAtLatLng(map, latlng, layers) {
  return (
    layers.find((layer) => {
      if (!isAnnotatableLayer(layer)) return false;
      const geojson = layer.data || (layer.layer?.toGeoJSON ? layer.layer.toGeoJSON() : null);
      const geometry = getGeometry(geojson);
      return (
        geometryContainsLatLng(map, latlng, geometry) ||
        leafletLayerContainsLatLng(map, latlng, layer.layer)
      );
    }) || null
  );
}

function normalizeShapeFromLayer(layer) {
  if (!layer) return null;
  const geojson = layer.data || (layer.layer?.toGeoJSON ? layer.layer.toGeoJSON() : null);
  const geometry = getGeometry(geojson);
  if (!geometry) return null;

  return {
    layerId: layer.id,
    backendId: layer.backendId || layer.id,
    layerName: layer.name,
    geometry,
    comments: [],
  };
}

function AnnotationController() {
  const {
    map,
    activeTool,
    activeSubTool,
    setActiveTool,
    setActiveSubTool,
    drawLayerGroupRef,
    addLayer,
    getNextLayerId,
    setNotification,
    layers,
  } = useMapContext();
  const [pendingAnnotation, setPendingAnnotation] = useState(null);
  const [text, setText] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const pendingRef = useRef(null);

  useEffect(() => {
    pendingRef.current = pendingAnnotation;
  }, [pendingAnnotation]);

  useEffect(() => {
    if (!map) return;
    const config = ANNOTATION_CONFIG[activeTool];

    if (!config || activeSubTool !== "point") {
      if (pendingRef.current?.marker && !pendingRef.current.saved) {
        map.removeLayer(pendingRef.current.marker);
      }
      queueMicrotask(() => {
        setPendingAnnotation(null);
        setText("");
      });
      return;
    }

    const container = map.getContainer();
    container.classList.add("gis-drawing");

    const onClick = (e) => {
      if (pendingRef.current) return;

      const shape =
        findShapeAtLatLng(map, e.latlng) ||
        normalizeShapeFromLayer(findSavedLayerAtLatLng(map, e.latlng, layers));
      if (!shape) {
        setNotification(`Click inside a polygon/rectangle/circle, on a line, or near a point to add a ${config.label.toLowerCase()}.`);
        return;
      }

      const marker = L.marker(e.latlng, {
        icon: createAnnotationIcon(config.color),
      }).addTo(map);

      if (drawLayerGroupRef.current) {
        drawLayerGroupRef.current.addLayer(marker);
      }

      setPendingAnnotation({
        type: activeTool,
        config,
        marker,
        shape,
        latlng: e.latlng,
        saved: false,
      });
      setText("");
    };

    map.on("click", onClick);

    return () => {
      map.off("click", onClick);
      container.classList.remove("gis-drawing");
    };
  }, [activeSubTool, activeTool, drawLayerGroupRef, layers, map, setNotification]);

  if (!pendingAnnotation) return null;

  const cancelAnnotation = () => {
    if (pendingAnnotation.marker && map) {
      if (drawLayerGroupRef.current?.hasLayer(pendingAnnotation.marker)) {
        drawLayerGroupRef.current.removeLayer(pendingAnnotation.marker);
      } else {
        map.removeLayer(pendingAnnotation.marker);
      }
    }
    setPendingAnnotation(null);
    setText("");
    setActiveTool("pointer");
    setActiveSubTool(null);
  };

  const saveAnnotation = async (e) => {
    e.preventDefault();
    if (!text.trim()) return;

    if (!Number.isFinite(Number(pendingAnnotation.shape.backendId))) {
      setNotification("Shape is saved visually, but backend did not return a numeric ID for bookmark/comment storage.");
      return;
    }

    const pointGeometry = {
      type: "Point",
      coordinates: [pendingAnnotation.latlng.lng, pendingAnnotation.latlng.lat],
    };

    setIsSaving(true);
    try {
      const savedAnnotation = await saveRegionComment({
        polygonId: pendingAnnotation.shape.backendId,
        name: pendingAnnotation.config.label,
        geometry: pointGeometry,
        comment: text.trim(),
        annotationType: pendingAnnotation.type,
      });

      // Show only the comment text on hover/click (no id / no label)
      const popupContent = `
        <div style="white-space:pre-wrap">${escapeHtml(text.trim())}</div>
      `;

      pendingAnnotation.marker.bindPopup(popupContent).openPopup();
      const layerId = getNextLayerId();
      addLayer({
        id: layerId,
        name: pendingAnnotation.config.label,
        type: pendingAnnotation.type,
        visible: true,
        opacity: 1,
        layer: pendingAnnotation.marker,
        data: pendingAnnotation.marker.toGeoJSON ? pendingAnnotation.marker.toGeoJSON() : null,
        parentLayerId: pendingAnnotation.shape.layerId,
      });

      eventBus.publish(MAP_EVENTS.COMMENT_ADDED, {
        layerId: pendingAnnotation.shape.layerId,
        backendId: pendingAnnotation.shape.backendId,
        comment: {
          ...savedAnnotation,
          text: savedAnnotation?.text || text.trim(),
          annotationType: pendingAnnotation.type,
          geometry: pointGeometry,
        },
      });

      setNotification(savedAnnotation?.message || `${pendingAnnotation.config.label} saved successfully.`);
      pendingRef.current = { ...pendingAnnotation, saved: true };
      setText("");
      setActiveTool("pointer");
      setActiveSubTool(null);
      setPendingAnnotation(null);
    } catch (error) {
      setNotification(`${pendingAnnotation.config.label} save failed: ${error.message || "Unknown error"}`);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <form className="annotation-form glass-panel gis-fade-in" onSubmit={saveAnnotation}>
      <div className="annotation-form-header">
        <strong>{pendingAnnotation.config.label}</strong>
        <span>
          {pendingAnnotation.latlng.lat.toFixed(5)}, {pendingAnnotation.latlng.lng.toFixed(5)}
        </span>
      </div>
      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        autoFocus
        rows={3}
        placeholder={pendingAnnotation.config.placeholder}
      />
      <div className="annotation-actions">
        <button type="button" onClick={cancelAnnotation}>
          Cancel
        </button>
        <button type="submit" disabled={!text.trim() || isSaving}>
          {isSaving ? "Saving..." : "Save"}
        </button>
      </div>
    </form>
  );
}

export default AnnotationController;
