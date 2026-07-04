import { useEffect, useRef } from "react";
import L from "leaflet";
import { eventBus, MAP_EVENTS } from "../../services/eventBus";
import { API_ENDPOINTS, USE_MOCK_DATA } from "../../config/apiConfig";
import { deleteRegion, fetchRegionComments, fetchRegionDetails, patchLayer, patchRegion, sendRegion, updateRegion } from "../../services/regionApi";
import {
  addShapeComment,
  findShapeAtLatLng,
  geometryContainsLatLng,
  registerShape,
  unregisterShape,
} from "../../services/shapeRegistry";
import { useMapContext } from "../../context/MapContext";

const DRAWN_SHAPE_TYPES = new Set([
  "point",
  "marker",
  "line",
  "polyline",
  "polygon",
  "rectangle",
  "circle",
]);

function getGeometry(geojson) {
  if (!geojson) return null;
  if (geojson.type === "Feature") return geojson.geometry || null;
  if (geojson.type === "FeatureCollection") {
    return geojson.features?.[0]?.geometry || null;
  }
  if (geojson.type && geojson.coordinates) return geojson;
  return null;
}

function getBackendShapeId(response, fallbackLayerId) {
  const candidates = [
    response?.id,
    response?.layer_id,
    response?.polygon_id,
    response?.polygonId,
    response?.feature_id,
    response?.featureId,
    response?.data?.id,
    response?.data?.layer_id,
    response?.data?.polygon_id,
    response?.data?.feature_id,
    response?.layerId,
    response?.regionId,
    fallbackLayerId,
  ];

  return candidates.find((value) => value !== undefined && value !== null && value !== "") || fallbackLayerId;
}

function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function normalizeCommentText(comment) {
  if (!comment) return "";
  return comment.text || comment.comment || comment.properties?.comment || "";
}

function formatRegionInfo(info, comments = []) {
  if (!info) return "<strong>Region selected</strong>";

  const summary = info.summary || {};
  const summaryRows = [
    ["Area", summary.totalArea],
    ["Population", summary.population],
    ["Elevation", summary.elevation],
    ["Hospitals", info.hospitals?.length],
    ["Schools", info.schools?.length],
    ["Alerts", (info.weatherAlerts?.length || 0) + (info.trafficAlerts?.length || 0)],
  ].filter(([, value]) => value !== undefined && value !== null && value !== "");

  const genericRows = Object.entries(info)
    .filter(([, value]) => {
      if (value === undefined || value === null || value === "") return false;
      if (Array.isArray(value)) return false;
      return typeof value !== "object";
    })
    .slice(0, 6);

  const rows = summaryRows.length > 0 ? summaryRows : genericRows;

  return `
    <div class="region-hover-popup">
      <strong>${escapeHtml(info.regionId || info.id || info.message || "Selected region")}</strong>
      ${rows
      .map(
        ([label, value]) =>
          `<div><span>${escapeHtml(label)}:</span> ${escapeHtml(value)}</div>`
      )
      .join("")}
      <div class="region-comments">
        <span>Comments:</span>
        <ul>
          ${comments.length > 0
      ? comments
        .map((comment) => `<li>${escapeHtml(normalizeCommentText(comment))}</li>`)
        .join("")
      : "<li>No comments yet</li>"
    }
        </ul>
      </div>
    </div>
  `;
}

function BackendGeometrySync() {
  const { map, activeTool, activeSubTool, setNotification, updateLayer, addLayer, setActiveLayerId, layers } = useMapContext();
  const regionsRef = useRef([]);
  const popupRef = useRef(null);

  useEffect(() => {
    const sendGeometry = async ({ layerId, layerName, type, geojson, properties, parentLayerId = null }) => {
      const geometry = getGeometry(geojson);
      if (!geometry) return;

      const normalizedLayerName = layerName?.trim();
      if (DRAWN_SHAPE_TYPES.has(type) && !normalizedLayerName) {
        setNotification("Shape name is required. It was not saved to the backend.");
        return;
      }

      try {
        const createResponse = await sendRegion(
          layerId,
          normalizedLayerName || type || "Geometry",
          geometry,
          properties || {},
          parentLayerId
        );
        const successMessage =
          createResponse?.message ||
          `${normalizedLayerName || type || "Geometry"} saved successfully.`;

        const backendId = getBackendShapeId(createResponse, layerId);
        const details = (await fetchRegionDetails(geometry)) || createResponse;
        const comments = await fetchRegionComments(backendId);

        const returnedLayerId = createResponse?.layer_id ?? createResponse?.layerId ?? parentLayerId;
        const returnedCaseId = createResponse?.case_id ?? createResponse?.caseId ?? null;

        let finalParentLayerId = parentLayerId;

        if (parentLayerId === null && returnedLayerId !== null) {
          const existingLocalGroup = layers.find((l) => l.backendId === returnedLayerId || l.id === returnedLayerId);
          if (!existingLocalGroup) {
            const operationalGroupName = "Operational Layer";
            const groupRecord = {
              id: returnedLayerId,
              name: operationalGroupName,
              type: "group",
              visible: true,
              opacity: 1,
              parentLayerId: null,
              layer: null,
              backendId: returnedLayerId,
              case_id: returnedCaseId,
              backendSynced: true,
              skipBackendSync: true,
              color: "#2563eb",
              category: null,
              radius: null,
              popupContent: null,
              data: null,
              properties: { name: operationalGroupName, type: "group", color: "#2563eb" },
            };
            addLayer(groupRecord);
          }
          finalParentLayerId = returnedLayerId;
          setActiveLayerId(returnedLayerId);
        }

        updateLayer(layerId, {
          backendId,
          backendSynced: true,
          backendDetails: details,
          backendComments: comments,
          parentLayerId: finalParentLayerId || null,
          skipBackendSync: true,
        });
        const savedShape = registerShape({
          layerId,
          backendId,
          layerName: normalizedLayerName || type || "Geometry",
          geometry,
          details,
          comments,
        });

        if (savedShape) {
          regionsRef.current = [
            savedShape,
            ...regionsRef.current.filter((region) => region.layerId !== layerId),
          ];
        }

        setNotification(successMessage);
      } catch (error) {
        setNotification(`Backend send failed: ${error.message || "Unknown error"}`);
      }
    };

    const updateGeometry = async ({ layerId, backendId, layerName, geojson, properties, parentLayerId = null, type = null }) => {
      const geometry = getGeometry(geojson);
      if (!geometry && type !== "group") return;

      const featureId = backendId || layerId;
      const normalizedLayerName = layerName?.trim() || "Updated Geometry";

      const parentGroup = parentLayerId != null
        ? layers?.find((l) => l.id === parentLayerId)
        : null;
      const parentBackendId = parentGroup?.backendId ?? parentGroup?.id ?? parentLayerId;
      const caseId = parentGroup?.case_id || parentGroup?.properties?.case_id || null;

      try {
        const updateResponse = await updateRegion(
          featureId,
          layerId,
          normalizedLayerName,
          geometry,
          properties || {},
          parentBackendId,
          caseId
        );
        const details = (await fetchRegionDetails(geometry)) || updateResponse;
        const comments = await fetchRegionComments(featureId);
        updateLayer(layerId, {
          backendId: featureId,
          backendSynced: true,
          backendDetails: details,
          backendComments: comments,
          skipBackendSync: true,
        });
        if (geometry) {
          const savedShape = registerShape({
            layerId,
            backendId: featureId,
            layerName: normalizedLayerName,
            geometry,
            details,
            comments,
          });

          if (savedShape) {
            regionsRef.current = [
              savedShape,
              ...regionsRef.current.filter((region) => region.layerId !== layerId),
            ];
          }
        }

        setNotification(updateResponse?.message || `${normalizedLayerName} updated successfully.`);
      } catch (error) {
        setNotification(`Backend update failed: ${error.message || "Unknown error"}`);
      }
    };

    const unsubscribeCreated = eventBus.subscribe(MAP_EVENTS.GEOMETRY_CREATED, (payload) => {
      if (payload?.skipBackendSync) return;
      if (!DRAWN_SHAPE_TYPES.has(payload?.type)) return;
      sendGeometry({
        layerId: payload.layerId,
        layerName: payload.layerName || payload.type,
        type: payload.type,
        geojson: payload.geojson,
        properties: payload.properties,
        parentLayerId: payload.parentLayerId || null,
      });
    });

    const unsubscribeUpdated = eventBus.subscribe(MAP_EVENTS.GEOMETRY_UPDATED, (payload) => {
      updateGeometry({
        layerId: payload.layerId,
        backendId: payload.backendId,
        layerName: payload.layerName || "Updated Geometry",
        geojson: payload.geojson,
        properties: payload.properties || payload.geojson?.properties || {},
        parentLayerId: payload.parentLayerId || null,
        type: payload.type || null,
      });
    });

    const unsubscribeLayerRenamed = eventBus.subscribe(MAP_EVENTS.LAYER_RENAMED, async (payload) => {
      if (!payload?.backendId || payload?.skipBackendSync || !payload?.backendSynced) return;

      const isGroup = payload.isGroup === true || payload.type === "group" || payload.syntheticGroup === true;
      const backendId = payload.backendId;

      try {
        if (isGroup) {
          await patchLayer(backendId, { name: payload.name });
          setNotification(`${payload.name || "Layer"} updated successfully.`);
        } else {
          const patchData = {};
          if (payload.name) {
            patchData.name = payload.name;
            patchData.properties = { name: payload.name };
          }
          if (payload.properties) {
            patchData.properties = patchData.properties || {};
            if (payload.properties.color !== undefined) patchData.properties.color = payload.properties.color;
            if (payload.properties.category !== undefined) patchData.properties.category = payload.properties.category;
            if (payload.properties.strokeWidth !== undefined) patchData.properties.strokeWidth = payload.properties.strokeWidth;
            if (payload.properties.fillOpacity !== undefined) patchData.properties.fillOpacity = payload.properties.fillOpacity;
          }

          // Resolve parent layer group's backend ID to send as layer_id
          const parentGroup = payload.parentLayerId != null
            ? layers?.find((l) => l.id === payload.parentLayerId)
            : null;
          const parentBackendId = parentGroup?.backendId ?? parentGroup?.id ?? null;
          if (parentBackendId !== null) {
            patchData.layer_id = parentBackendId;
          }

          await patchRegion(backendId, patchData);
          setNotification(`${payload.name || "Feature"} updated successfully.`);
        }
      } catch (error) {
        console.error("[BackendSync] Layer rename/patch failed:", error);
        setNotification(`Update sync failed: ${error.message || "Unknown error"}`);
      }
    });

    const unsubscribeSelected = eventBus.subscribe(MAP_EVENTS.GEOMETRY_SELECTED, (payload) => {
      const geojson = payload?.selectionGeoJSON;
      if (!geojson) return;

      sendGeometry({
        layerId: `selection-${Date.now()}`,
        layerName: "Selected Area",
        type: "selection",
        geojson,
      });
    });

    const unsubscribeDeleted = eventBus.subscribe(MAP_EVENTS.GEOMETRY_DELETED, async (payload) => {
      if (!payload?.layerId) return;
      unregisterShape(payload.layerId);
      regionsRef.current = regionsRef.current.filter((region) => region.layerId !== payload.layerId);

      const featureId = payload.backendId || payload.layerId;
      try {
        await deleteRegion(featureId);
        setNotification("Feature deleted successfully.");
      } catch (error) {
        setNotification(`Backend delete failed: ${error.message || "Unknown error"}`);
      }
    });

    const unsubscribeCommentAdded = eventBus.subscribe(MAP_EVENTS.COMMENT_ADDED, (payload) => {
      if (!payload?.layerId || !payload?.comment) return;
      const updatedShape = addShapeComment(payload.layerId, payload.comment);
      if (!updatedShape) return;
      regionsRef.current = regionsRef.current.map((region) =>
        region.layerId === payload.layerId ? updatedShape : region
      );
    });

    return () => {
      unsubscribeCreated();
      unsubscribeUpdated();
      unsubscribeLayerRenamed();
      unsubscribeSelected();
      unsubscribeDeleted();
      unsubscribeCommentAdded();
    };
  }, [setNotification, updateLayer, addLayer, setActiveLayerId, layers]);

  useEffect(() => {
    if (!map) return;

    const closeRegionPopup = () => {
      if (popupRef.current) {
        map.closePopup(popupRef.current);
        popupRef.current = null;
      }
    };

    const onMouseMove = (e) => {
      if (activeTool !== "pointer" || activeSubTool) {
        closeRegionPopup();
        return;
      }

      const matchedRegion =
        findShapeAtLatLng(map, e.latlng) ||
        regionsRef.current.find((region) =>
          geometryContainsLatLng(map, e.latlng, region.geometry)
        );

      if (!matchedRegion) {
        closeRegionPopup();
        return;
      }

      if (!popupRef.current) {
        popupRef.current = L.popup({
          closeButton: false,
          autoPan: false,
          className: "region-hover-leaflet-popup",
          offset: L.point(12, 12),
        });
      }

      popupRef.current
        .setLatLng(e.latlng)
        .setContent(formatRegionInfo(matchedRegion.details, matchedRegion.comments));

      if (!map.hasLayer(popupRef.current)) {
        popupRef.current.openOn(map);
      }
    };

    map.on("mousemove", onMouseMove);
    map.on("mouseout", closeRegionPopup);

    return () => {
      map.off("mousemove", onMouseMove);
      map.off("mouseout", closeRegionPopup);
      closeRegionPopup();
    };
  }, [activeSubTool, activeTool, map]);

  return null;
}

export default BackendGeometrySync;