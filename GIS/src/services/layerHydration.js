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
    record?.layer_type ||
    record?.layerType ||
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

function getBackendRecordKey(record, sourceType) {
  if (!record) return null;

  if (sourceType === "layer") {
    return (
      record?.id ??
      record?.layer_id ??
      record?.layerId ??
      record?.case_id ??
      record?.caseId ??
      null
    );
  }

  return (
    record?.id ??
    record?.feature_id ??
    record?.featureId ??
    record?.polygon_id ??
    record?.polygonId ??
    record?.regionId ??
    null
  );
}

function getParentBackendKey(record) {
  return (
    record?.layer_id ??
    record?.layerId ??
    record?.parent_layer_id ??
    record?.parentLayerId ??
    null
  );
}

function createMarkerIcon(type, colorOverride = null) {
  const color =
    colorOverride ||
    (type === "bookmark" ? "#8b5cf6" : type === "comment" ? "#ec4899" : DRAW_STYLES.default.color);
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

function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function formatDisplayValue(value) {
  if (value === null || value === undefined || value === "") return "N/A";
  if (typeof value === "boolean" || typeof value === "number") return String(value);
  if (typeof value === "string") return value;
  try {
    return JSON.stringify(value, null, 2);
  } catch {
    return String(value);
  }
}

function buildMetadataSections(record) {
  const fields = [
    ["Name", record?.name],
    ["Type", record?.type],
    ["Layer ID", record?.id],
    ["Backend ID", record?.backendId],
    ["Parent Layer", record?.parentLayerId],
    ["Category", record?.category],
    ["Visible", record?.visible],
    ["Opacity", record?.opacity],
    ["Color", record?.color],
    ["Radius", record?.radius],
  ];

  const sections = [];
  const summary = fields
    .filter(([, value]) => value !== undefined && value !== null && value !== "")
    .map(
      ([label, value]) =>
        `<div class="gis-hover-row"><span>${escapeHtml(label)}</span><strong>${escapeHtml(
          formatDisplayValue(value)
        )}</strong></div>`
    )
    .join("");

  if (summary) {
    sections.push(`<section><h4>Summary</h4>${summary}</section>`);
  }

  const addJsonSection = (title, value) => {
    if (!value || (Array.isArray(value) && value.length === 0)) return;
    const formatted = escapeHtml(formatDisplayValue(value));
    sections.push(
      `<section><h4>${escapeHtml(title)}</h4><pre>${formatted}</pre></section>`
    );
  };

  addJsonSection("Properties", record?.properties);
  addJsonSection("Backend Details", record?.backendDetails);
  addJsonSection("Geometry", record?.data?.geometry || record?.data || record?.geometry);
  addJsonSection("Comments", record?.backendComments || record?.comments);

  return sections.join("");
}

function buildShapeHoverPopupHtml(record) {
  const title = escapeHtml(record?.name || "Shape details");
  const sections = buildMetadataSections(record);

  return `
    <div class="gis-hover-popup">
      <strong>${title}</strong>
      ${sections || '<div class="gis-hover-empty">No metadata available.</div>'}
    </div>
  `;
}

function bindHoverPopupToLayer(layer, html) {
  if (!layer || !html) return;

  const popupOptions = {
    closeButton: false,
    className: "gis-hover-layer-popup",
    offset: [0, -10],
  };

  const bindSingle = (target) => {
    if (!target) return;

    if (target.__gisHoverPopupHandlers) {
      const previous = target.__gisHoverPopupHandlers;
      target.off("mouseover", previous.open);
      target.off("mouseout", previous.close);
    }

    const open = (event) => {
      const map = target._map || target._mapToAdd || event?.target?._map;
      if (!map || typeof L.popup !== "function") return;

      const latlng =
        event?.latlng ||
        target.getLatLng?.() ||
        target.getBounds?.()?.getCenter?.() ||
        map.getCenter();

      const popup = L.popup(popupOptions)
        .setLatLng(latlng)
        .setContent(html)
        .openOn(map);

      target.__gisHoverPopup = popup;
    };
    const close = () => {
      const map = target._map || target._mapToAdd;
      const popup = target.__gisHoverPopup;
      if (map && popup && map.hasLayer && map.hasLayer(popup)) {
        map.closePopup(popup);
      }
      target.__gisHoverPopup = null;
    };

    target.on?.("mouseover", open);
    target.on?.("mouseout", close);
    target.__gisHoverPopupHandlers = { open, close };
  };

  if (layer.eachLayer) {
    layer.eachLayer((childLayer) => bindSingle(childLayer));
  } else {
    bindSingle(layer);
  }
}

export function bindShapeHoverPopup(layer, record) {
  const html = buildShapeHoverPopupHtml(record);
  bindHoverPopupToLayer(layer, html);
}

export function bindShapeLabel(layer, label, type) {
  if (!layer || !label) return;

  const tooltipOptions = {
    permanent: true,
    direction: type === "point" || type === "marker" ? "top" : "center",
    className: "gis-shape-label",
    opacity: 1,
    sticky: false,
    offset: type === "point" || type === "marker" ? [0, -10] : [0, 0],
  };

  if (layer.eachLayer) {
    layer.eachLayer((childLayer) => {
      if (childLayer?.bindTooltip) {
        childLayer.bindTooltip(String(label), tooltipOptions);
      }
    });
    return;
  }

  if (layer.bindTooltip) {
    layer.bindTooltip(String(label), tooltipOptions);
  }
}

export function normalizeBackendLayer(
  record,
  {
    sourceType = "feature",
    frontendId = null,
    parentLayerId = null,
    backendId = null,
  } = {}
) {
  const properties = getProperties(record);
  const geometry = getGeometry(record);
  const type = getLayerType(record, geometry, properties);
  const isLayerRecord = sourceType === "layer";
  const isGroupLayer =
    type === "group" ||
    isLayerRecord ||
    !!record?.layer_type ||
    !!record?.layerType ||
    properties?.layerKind === "group" ||
    record?.layerKind === "group";

  if (!geometry && !isGroupLayer) return null;

  const color = properties?.color || record?.color || DRAW_STYLES.default.color;
  const category = properties?.category || record?.category || record?.layerCategory || null;
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
  const resolvedFrontendId =
    frontendId ?? getBackendRecordKey(record, sourceType) ?? `${type}-${Date.now()}-${Math.random().toString(36).slice(2)}`;
  const resolvedBackendId =
    backendId ??
    getBackendRecordKey(record, sourceType) ??
    record?.regionId ??
    resolvedFrontendId;

  return {
    id: resolvedFrontendId,
    name,
    type,
    visible: record?.visible !== false,
    opacity: typeof record?.opacity === "number" ? record.opacity : 1,
    parentLayerId:
      parentLayerId ??
      record?.parentLayerId ??
      record?.parent_layer_id ??
      properties?.parentLayerId ??
      properties?.parent_layer_id ??
      null,
    backendId: resolvedBackendId,
    backendSynced: true,
    backendDetails: record?.details || record,
    backendComments: record?.comments || record?.backendComments || [],
    color,
    category,
    radius: record?.radius || properties?.radius || null,
    popupContent: properties?.popupContent || properties?.comment || properties?.text || null,
    data: geometry ? createGeoJsonFeature(geometry, properties) : null,
  };
}

export function hydrateBackendLayers(layerRecords = [], featureRecords = []) {
  const hydrated = [];
  const backendToFrontendId = new Map();
  let nextFrontendId = 1;

  const normalizeAndStore = (record, sourceType) => {
    if (!record) return;

    const backendKey = getBackendRecordKey(record, sourceType);
    const parentBackendKey = getParentBackendKey(record);
    const parentFrontendId = parentBackendKey !== null && parentBackendKey !== undefined
      ? backendToFrontendId.get(String(parentBackendKey)) || null
      : null;
    const frontendId = nextFrontendId;
    nextFrontendId += 1;

    if (backendKey !== null && backendKey !== undefined && backendKey !== "") {
      backendToFrontendId.set(String(backendKey), frontendId);
    }

    const normalized = normalizeBackendLayer(record, {
      sourceType,
      frontendId,
      parentLayerId: parentFrontendId,
      backendId: backendKey,
    });

    if (normalized) {
      hydrated.push(normalized);
    }
  };

  layerRecords.forEach((record) => normalizeAndStore(record, "layer"));
  featureRecords.forEach((record) => normalizeAndStore(record, "feature"));

  return hydrated;
}

export function createLeafletLayerFromBackendLayer(backendLayer) {
  if (backendLayer.type === "group" || !backendLayer.data?.geometry) {
    return null;
  }

  const geometry = backendLayer.data.geometry;
  let layer = null;

  if (backendLayer.type === "circle") {
    const coordinates = getPointCoordinates(geometry);
    if (coordinates) {
      layer = L.circle([coordinates[1], coordinates[0]], {
        color: backendLayer.color || DRAW_STYLES.default.color,
        fillColor: backendLayer.color || DRAW_STYLES.default.color,
        fillOpacity: 0.15,
        weight: DRAW_STYLES.default.weight,
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
        icon: createMarkerIcon(backendLayer.type, backendLayer.color),
      });
    }
  }

  if (!layer) {
    layer = L.geoJSON(backendLayer.data, {
      style: {
        color: backendLayer.color || DRAW_STYLES.default.color,
        fillColor: backendLayer.color || DRAW_STYLES.default.color,
        opacity: backendLayer.opacity,
        fillOpacity: backendLayer.opacity * 0.6,
      },
    });
  }

  if (backendLayer.popupContent && layer.bindPopup) {
    layer.bindPopup(String(backendLayer.popupContent));
  }

  bindShapeLabel(layer, backendLayer.name, backendLayer.type);

  if (backendLayer.opacity !== undefined) {
    if (layer.setStyle) layer.setStyle({ opacity: backendLayer.opacity, fillOpacity: backendLayer.opacity * 0.6 });
    if (layer.setOpacity) layer.setOpacity(backendLayer.opacity);
  }

  bindShapeHoverPopup(layer, backendLayer);

  return layer;
}
