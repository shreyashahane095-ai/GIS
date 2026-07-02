import L from "leaflet";
import { DRAW_STYLES } from "../config/mapConfig";

const MARKER_TYPES = new Set([
  "point",
  "marker",
  "text",
  "note",
  "image",
  "link",
  "video",
  "bookmark",
  "comment",
]);

function getGeometry(record) {
  const geometry =
    record?.geometry ||
    record?.geojson?.geometry ||
    record?.geojson ||
    record?.data?.geometry ||
    record?.data?.geojson?.geometry ||
    record?.data?.geojson;

  if (!geometry) return null;
  if (geometry.type === "Feature") return geometry.geometry || null;
  if (geometry.type && geometry.coordinates) return geometry;
  return null;
}

function getProperties(record) {
  return {
    ...(record?.properties || {}),
    ...(record?.geojson?.properties || {}),
    ...(record?.data?.properties || {}),
    ...(record?.data?.geojson?.properties || {}),
  };
}

function getLayerType(record, geometry, properties) {
  const candidate =
    record?.type ||
    record?.geometry_type ||
    record?.geometryType ||
    record?.annotationType ||
    properties?.type ||
    properties?.annotationType;

  if (candidate) return String(candidate).toLowerCase();
  if (geometry?.type === "Point") return "point";
  if (geometry?.type === "LineString" || geometry?.type === "MultiLineString") return "line";
  if (geometry?.type === "Polygon" || geometry?.type === "MultiPolygon") return "polygon";
  return "geojson";
}

function createMarkerIcon(type) {
  const color = type === "bookmark" ? "#8b5cf6" : type === "comment" ? "#ec4899" : DRAW_STYLES.default.color;
  return new L.DivIcon({
    className: type === "bookmark" || type === "comment" ? "gis-annotation-marker" : "gis-text-marker",
    html: `<div style="background:${color};width:14px;height:14px;border-radius:50%;border:2px solid #fff;box-shadow:0 2px 6px rgba(0,0,0,0.3);"></div>`,
    iconSize: [14, 14],
    iconAnchor: [7, 7],
  });
}

function getPointCoordinates(geometry) {
  if (geometry?.type !== "Point" || !Array.isArray(geometry.coordinates)) return null;
  return geometry.coordinates;
}

function createGeoJsonFeature(geometry, properties) {
  return {
    type: "Feature",
    properties,
    geometry,
  };
}

export function normalizeBackendLayer(record) {
  const geometry = getGeometry(record);
  if (!geometry) return null;

  const properties = getProperties(record);
  const type = getLayerType(record, geometry, properties);
  const name =
    record?.name ||
    record?.layerName ||
    record?.layer_name ||
    record?.title ||
    properties?.name ||
    properties?.layerName ||
    properties?.layer_name ||
    properties?.title ||
    type.charAt(0).toUpperCase() + type.slice(1);
  const id =
    record?.layer_id ??
    record?.layerId ??
    record?.polygon_id ??
    record?.polygonId ??
    record?.id ??
    record?.regionId ??
    `${type}-${Date.now()}-${Math.random().toString(36).slice(2)}`;

  return {
    id: String(id),
    name,
    type,
    visible: record?.visible !== false,
    opacity: typeof record?.opacity === "number" ? record.opacity : 1,
    parentLayerId: record?.parentLayerId || record?.parent_layer_id || null,
    backendId: record?.id ?? record?.regionId ?? id,
    backendSynced: true,
    backendDetails: record?.details || record,
    radius: record?.radius || properties?.radius || null,
    popupContent: properties?.popupContent || properties?.comment || properties?.text || null,
    data: createGeoJsonFeature(geometry, properties),
  };
}

export function createLeafletLayerFromBackendLayer(backendLayer) {
  const geometry = backendLayer.data.geometry;
  let layer = null;

  if (backendLayer.type === "circle") {
    const coordinates = getPointCoordinates(geometry);
    if (coordinates) {
      layer = L.circle([coordinates[1], coordinates[0]], {
        ...DRAW_STYLES.default,
        radius: backendLayer.radius || 0,
      });
    }
  } else if (backendLayer.type === "highlighter") {
    const coordinates = getPointCoordinates(geometry);
    if (coordinates) {
      layer = L.circleMarker([coordinates[1], coordinates[0]], {
        radius: backendLayer.radius || 20,
        color: DRAW_STYLES.selected.color,
        fillColor: DRAW_STYLES.selected.color,
        fillOpacity: 0.35,
        weight: 2,
      });
    }
  } else if (MARKER_TYPES.has(backendLayer.type)) {
    const coordinates = getPointCoordinates(geometry);
    if (coordinates) {
      layer = L.marker([coordinates[1], coordinates[0]], {
        icon: createMarkerIcon(backendLayer.type),
      });
    }
  }

  if (!layer) {
    layer = L.geoJSON(backendLayer.data, {
      style: {
        ...DRAW_STYLES.default,
        opacity: backendLayer.opacity,
        fillOpacity: backendLayer.opacity * 0.6,
      },
    });
  }

  if (backendLayer.popupContent && layer.bindPopup) {
    layer.bindPopup(String(backendLayer.popupContent));
  }

  if (backendLayer.opacity !== undefined) {
    if (layer.setStyle) layer.setStyle({ opacity: backendLayer.opacity, fillOpacity: backendLayer.opacity * 0.6 });
    if (layer.setOpacity) layer.setOpacity(backendLayer.opacity);
  }

  return layer;
}
