import { useEffect, useRef, useCallback, useState } from "react";
import {
  MapContainer as RLMapContainer,
  TileLayer,
  FeatureGroup,
  useMap,
} from "react-leaflet";
import L from "leaflet";
import "leaflet-draw";
import { useMapContext } from "../../context/MapContext";
import {
  MAP_PROVIDERS,
  DEFAULT_CENTER,
  DEFAULT_ZOOM,
  MIN_ZOOM,
  MAX_ZOOM,
  FALLBACK_BASEMAP,
  TILE_ERROR_THRESHOLD,
  DRAW_STYLES,
} from "../../config/mapConfig";
import { eventBus, MAP_EVENTS } from "../../services/eventBus";
import {
  createLeafletLayerFromBackendLayer,
  bindShapeLabel,
  hydrateBackendLayers,
} from "../../services/layerHydration";
import { fetchSavedRegions, saveLayerGroup } from "../../services/regionApi";
import { getAllFeatures } from "../../services/featuresApi";
import { layerToGeoJSON } from "../../utils/geoJsonUtils";
import ShapeMetadataModal from "./ShapeMetadataModal";
import "./Map.css";



const sampleGeoJSON = {
  type: "FeatureCollection",
  features: [
    {
      type: "Feature",
      properties: { name: "Sample Area" },
      geometry: {
        type: "Polygon",
        coordinates: [
          [
            [-0.15, 51.48],
            [-0.05, 51.48],
            [-0.05, 51.52],
            [-0.15, 51.52],
            [-0.15, 51.48],
          ],
        ],
      },
    },
  ],
};

function getDefaultShapeColor(type) {
  switch (type) {
    case "line":
    case "polyline":
      return "#f97316";
    case "circle":
      return "#16a34a";
    case "rectangle":
    case "polygon":
      return "#2563eb";
    case "point":
    case "marker":
      return "#dc2626";
    default:
      return "#8b5cf6";
  }
}

function formatSegmentDistance(meters) {
  if (!Number.isFinite(meters)) return "";
  if (meters >= 1000) return `${(meters / 1000).toFixed(2)} km`;
  return `${meters.toFixed(1)} m`;
}

function getSegmentMidpoint(a, b) {
  return [(a.lat + b.lat) / 2, (a.lng + b.lng) / 2];
}

function getSegmentAngle(map, a, b) {
  if (!map || !a || !b) return 0;
  const start = map.latLngToLayerPoint(a);
  const end = map.latLngToLayerPoint(b);
  const rawAngle = (Math.atan2(end.y - start.y, end.x - start.x) * 180) / Math.PI;
  if (rawAngle > 90) return rawAngle - 180;
  if (rawAngle < -90) return rawAngle + 180;
  return rawAngle;
}

function createSegmentLabel(position, text, angle) {
  return L.marker(position, {
    interactive: false,
    keyboard: false,
    icon: L.divIcon({
      className: "gis-segment-label",
      html: `<div class="gis-segment-label-inner" style="--segment-angle:${angle}deg">${text}</div>`,
      iconSize: [0, 0],
      iconAnchor: [0, 0],
    }),
  });
}

function MapEvents() {
  const { setMap, setZoom } = useMapContext();
  const map = useMap();

  useEffect(() => {
    setMap(map);
    setZoom(map.getZoom());

    const onZoom = () => setZoom(map.getZoom());
    map.on("zoomend", onZoom);
    return () => {
      map.off("zoomend", onZoom);
    };
  }, [map, setMap, setZoom]);

  useEffect(() => {
    const container = map.getContainer();
    const resizeTarget = container.parentElement || container;
    let frameId = null;
    let settleTimer = null;

    const invalidateMapSize = () => {
      if (frameId) cancelAnimationFrame(frameId);
      frameId = requestAnimationFrame(() => {
        map.invalidateSize({ pan: false, debounceMoveend: true });
      });
      clearTimeout(settleTimer);
      settleTimer = setTimeout(() => {
        map.invalidateSize({ pan: false, debounceMoveend: true });
      }, 260);
    };

    const resizeObserver = new ResizeObserver(invalidateMapSize);
    resizeObserver.observe(resizeTarget);
    window.addEventListener("resize", invalidateMapSize);
    invalidateMapSize();

    return () => {
      resizeObserver.disconnect();
      window.removeEventListener("resize", invalidateMapSize);
      if (frameId) cancelAnimationFrame(frameId);
      clearTimeout(settleTimer);
    };
  }, [map]);

  return null;
}

function SelectionController() {
  const {
    map,
    activeTool,
    activeSubTool,
    drawLayerGroupRef,
  } = useMapContext();
  const handlerRef = useRef(null);
  const selectionLayerRef = useRef(null);
  const selectedLayersRef = useRef([]);
  const selectionPointsRef = useRef([]);
  const dragStartRef = useRef(null);

  useEffect(() => {
    if (!map || !drawLayerGroupRef.current) return;

    const resetSelectedLayers = () => {
      selectedLayersRef.current.forEach((layer) => {
        if (layer.setStyle) layer.setStyle(DRAW_STYLES.default);
      });
      selectedLayersRef.current = [];
    };

    const removeSelectionLayer = () => {
      if (selectionLayerRef.current) {
        map.removeLayer(selectionLayerRef.current);
        selectionLayerRef.current = null;
      }
    };

    const applySelection = (selectionLayer) => {
      resetSelectedLayers();
      removeSelectionLayer();
      selectionLayerRef.current = selectionLayer;
      map.addLayer(selectionLayer);

      const bounds = selectionLayer.getBounds();
      const selected = [];

      drawLayerGroupRef.current.eachLayer((layer) => {
        if (layer === selectionLayer) return;
        let isSelected = false;
        if (layer.getLatLng) {
          isSelected = bounds.contains(layer.getLatLng());
        } else if (layer.getLatLngs) {
          const latlngs = layer.getLatLngs().flat(Infinity);
          isSelected = latlngs.some((ll) => ll && bounds.contains(ll));
        } else if (layer.getBounds) {
          isSelected = bounds.intersects(layer.getBounds());
        }
        if (isSelected) {
          selected.push(layer);
          if (layer.setStyle) layer.setStyle(DRAW_STYLES.selected);
        }
      });

      selectedLayersRef.current = selected;
      eventBus.publish(MAP_EVENTS.GEOMETRY_SELECTED, {
        count: selected.length,
        selectionGeoJSON: selectionLayer.toGeoJSON ? selectionLayer.toGeoJSON() : null,
        layers: selected.map((layer) => (layer.toGeoJSON ? layer.toGeoJSON() : null)).filter(Boolean),
      });

      if (selected.length > 0) {
        selectionLayer.bindPopup(`Selected ${selected.length} feature(s)`).openPopup();
      } else {
        selectionLayer.bindPopup("No features selected").openPopup();
      }
    };

    if (selectionLayerRef.current) {
      map.removeLayer(selectionLayerRef.current);
      selectionLayerRef.current = null;
    }

    resetSelectedLayers();

    if (handlerRef.current) {
      handlerRef.current.disable();
      handlerRef.current = null;
    }

    if (activeTool !== "pointer" || !activeSubTool) return;
    if (
      activeSubTool !== "rectangle" &&
      activeSubTool !== "polygon" &&
      activeSubTool !== "lasso"
    )
      return;

    const container = map.getContainer();
    container.classList.add("gis-drawing");
    map.doubleClickZoom.disable();

    const onClick = (e) => {
      if (activeSubTool === "rectangle") return;
      selectionPointsRef.current = [...selectionPointsRef.current, e.latlng];
      removeSelectionLayer();
      selectionLayerRef.current = L.polygon(selectionPointsRef.current, {
        ...DRAW_STYLES.selected,
        dashArray: "5,5",
      }).addTo(map);
    };

    const onMouseMove = (e) => {
      if (activeSubTool === "rectangle") {
        if (!dragStartRef.current) return;
        removeSelectionLayer();
        selectionLayerRef.current = L.rectangle(L.latLngBounds(dragStartRef.current, e.latlng), {
          ...DRAW_STYLES.selected,
          dashArray: "5,5",
        }).addTo(map);
        return;
      }

      if (selectionPointsRef.current.length === 0) return;
      removeSelectionLayer();
      selectionLayerRef.current = L.polygon([...selectionPointsRef.current, e.latlng], {
        ...DRAW_STYLES.selected,
        dashArray: "5,5",
      }).addTo(map);
    };

    const onDoubleClick = (e) => {
      L.DomEvent.stop(e);
      if (selectionPointsRef.current.length < 3) return;
      applySelection(L.polygon(selectionPointsRef.current, DRAW_STYLES.selected));
      selectionPointsRef.current = [];
    };

    const onMouseDown = (e) => {
      if (activeSubTool !== "rectangle") return;
      dragStartRef.current = e.latlng;
      map.dragging.disable();
    };

    const onMouseUp = (e) => {
      if (activeSubTool !== "rectangle" || !dragStartRef.current) return;
      const start = dragStartRef.current;
      dragStartRef.current = null;
      map.dragging.enable();
      applySelection(L.rectangle(L.latLngBounds(start, e.latlng), DRAW_STYLES.selected));
    };

    map.on("click", onClick);
    map.on("mousemove", onMouseMove);
    map.on("dblclick", onDoubleClick);
    map.on("mousedown", onMouseDown);
    map.on("mouseup", onMouseUp);

    return () => {
      if (handlerRef.current) {
        handlerRef.current.disable();
        handlerRef.current = null;
      }
      map.off("click", onClick);
      map.off("mousemove", onMouseMove);
      map.off("dblclick", onDoubleClick);
      map.off("mousedown", onMouseDown);
      map.off("mouseup", onMouseUp);
      map.doubleClickZoom.enable();
      map.dragging.enable();
      container.classList.remove("gis-drawing");
      removeSelectionLayer();
      resetSelectedLayers();
      selectionPointsRef.current = [];
      dragStartRef.current = null;
      eventBus.publish(MAP_EVENTS.GEOMETRY_DESELECTED, {});
    };
  }, [map, activeTool, activeSubTool, drawLayerGroupRef]);

  return null;
}

function DrawController() {
  const {
    map,
    activeTool,
    activeSubTool,
    drawLayerGroupRef,
    addLayer,
    getNextLayerId,
    setIsDrawing,
    activeLayerId,
    layers,
    setLayers,
    setNotification,
  } = useMapContext();

  const handlerRef = useRef(null);
  const tempLayerRef = useRef(null);
  const drawPointsRef = useRef([]);
  const dragStartRef = useRef(null);
  const activeSubToolRef = useRef(activeSubTool);
  const pendingShapeRef = useRef(null);
  const hasInitGeoJSON = useRef(false);
  const hasRestoredBackendLayers = useRef(false);
  const [backendHydrated, setBackendHydrated] = useState(false);
  const [pendingShape, setPendingShape] = useState(null);
  const [shapeForm, setShapeForm] = useState({
    name: "",
    category: "",
    color: DRAW_STYLES.default.color,
  });
  const [shapeErrors, setShapeErrors] = useState({
    name: "",
    category: "",
  });

  useEffect(() => {
    activeSubToolRef.current = activeSubTool;
  }, [activeSubTool]);

  const ensureDrawLayerGroup = useCallback(() => {
    if (!map) return null;

    if (!drawLayerGroupRef.current) {
      drawLayerGroupRef.current = L.featureGroup();
    }

    if (!map.hasLayer(drawLayerGroupRef.current)) {
      drawLayerGroupRef.current.addTo(map);
    }

    return drawLayerGroupRef.current;
  }, [drawLayerGroupRef, map]);

  const clearTempLayer = useCallback(() => {
    if (tempLayerRef.current && map) {
      map.removeLayer(tempLayerRef.current);
      tempLayerRef.current = null;
    }
  }, [map]);

  const areSameLatLng = useCallback((a, b) => {
    if (!a || !b) return false;
    return a.lat === b.lat && a.lng === b.lng;
  }, []);

  const getCleanDrawPoints = useCallback(
    (points) =>
      points.reduce((cleaned, point) => {
        const previous = cleaned[cleaned.length - 1];
        if (!areSameLatLng(previous, point)) cleaned.push(point);
        return cleaned;
      }, []),
    [areSameLatLng]
  );

  const renderDraftLayer = useCallback(
    (hoverLatLng = null) => {
      if (!map) return;

      clearTempLayer();

      const points = drawPointsRef.current;
      if (points.length === 0) return;

      const previewPoints = hoverLatLng ? [...points, hoverLatLng] : points;
      const draftLayer = L.layerGroup();
      const draftStyle = { ...DRAW_STYLES.default, dashArray: "4,4" };

      if (activeSubToolRef.current === "polygon") {
        if (previewPoints.length >= 3) {
          draftLayer.addLayer(L.polygon(previewPoints, draftStyle));
        } else if (previewPoints.length >= 2) {
          draftLayer.addLayer(L.polyline(previewPoints, draftStyle));
        }
      } else if (
        activeSubToolRef.current === "line" ||
        activeSubToolRef.current === "polyline"
      ) {
        if (previewPoints.length >= 2) {
          draftLayer.addLayer(L.polyline(previewPoints, draftStyle));
        }
      }

      const segmentPairs = [];
      for (let index = 1; index < previewPoints.length; index += 1) {
        segmentPairs.push([previewPoints[index - 1], previewPoints[index]]);
      }
      if (activeSubToolRef.current === "polygon" && previewPoints.length >= 3) {
        segmentPairs.push([previewPoints[previewPoints.length - 1], previewPoints[0]]);
      }

      segmentPairs.forEach(([start, end]) => {
        const distance = formatSegmentDistance(start.distanceTo(end));
        if (!distance) return;
        draftLayer.addLayer(
          createSegmentLabel(
            getSegmentMidpoint(start, end),
            distance,
            getSegmentAngle(map, start, end)
          )
        );
      });

      points.forEach((point, index) => {
        draftLayer.addLayer(
          L.circleMarker(point, {
            radius: index === 0 ? 6 : 5,
            color: index === 0 ? "#f97316" : "#ffffff",
            weight: 2,
            fillColor: index === 0 ? "#f97316" : DRAW_STYLES.default.color,
            fillOpacity: 1,
            interactive: false,
          })
        );
      });

      tempLayerRef.current = draftLayer.addTo(map);
    },
    [clearTempLayer, map]
  );

  const createDrawMarker = useCallback(
    () =>
      new L.DivIcon({
        className: "gis-draw-marker",
        html: `<div style="background:${DRAW_STYLES.default.color};width:14px;height:14px;border-radius:50%;border:2px solid #fff;box-shadow:0 2px 6px rgba(0,0,0,0.3);"></div>`,
        iconSize: [14, 14],
        iconAnchor: [7, 7],
      }),
    []
  );

  const applyShapeMetadata = useCallback((layer, type, color) => {
    if (!layer) return;

    if (type === "point" || type === "marker") {
      if (layer.setIcon) {
        layer.setIcon(
          new L.DivIcon({
            className: "gis-draw-marker",
            html: `<div style="background:${color};width:14px;height:14px;border-radius:50%;border:2px solid #fff;box-shadow:0 2px 6px rgba(0,0,0,0.3);"></div>`,
            iconSize: [14, 14],
            iconAnchor: [7, 7],
          })
        );
      }
      return;
    }

    if (layer.setStyle) {
      layer.setStyle({
        color,
        fillColor: color,
        fillOpacity: type === "line" || type === "polyline" ? 0 : 0.15,
      });
    }
  }, []);

  const openMetadataPrompt = useCallback(
    (layer, type) => {
      const drawLayerGroup = ensureDrawLayerGroup();
      if (!layer || !drawLayerGroup) return;

      const layerId = getNextLayerId();
      const parentLayerId = layers.find((layer) => layer.type === "group")?.id || null;
      drawLayerGroup.addLayer(layer);
      const defaultColor = getDefaultShapeColor(type);
      applyShapeMetadata(layer, type, defaultColor);

      setShapeForm({
        name: "",
        category: "",
        color: defaultColor,
      });
      setShapeErrors({ name: "", category: "" });
      pendingShapeRef.current = { layer, type, layerId, parentLayerId };
      setPendingShape({ layer, type, layerId, parentLayerId });
    },
    [applyShapeMetadata, ensureDrawLayerGroup, getNextLayerId, layers]
  );

  const finalizePendingShape = useCallback(() => {
    const current = pendingShapeRef.current;
    if (!current) return;

    const name = shapeForm.name.trim();
    const category = shapeForm.category.trim();
    const defaultColor = getDefaultShapeColor(current.type);
    const color = /^#[0-9a-fA-F]{6}$/.test(shapeForm.color)
      ? shapeForm.color
      : defaultColor;
    const nextErrors = {
      name: name ? "" : "This information is required.",
      category: category ? "" : "This information is required.",
    };
    if (nextErrors.name || nextErrors.category) {
      setShapeErrors(nextErrors);
      return;
    }

    setShapeErrors({ name: "", category: "" });

    applyShapeMetadata(current.layer, current.type, color);

    const properties = { name, category, color };
    if (current.layer.feature) {
      current.layer.feature.properties = {
        ...(current.layer.feature.properties || {}),
        ...properties,
      };
    } else {
      current.layer.feature = {
        type: "Feature",
        properties,
        geometry: null,
      };
    }

    if (current.layer.bindPopup) {
      current.layer.bindPopup(
        `<div style="min-width:160px"><strong>${name}</strong><div style="font-size:12px;opacity:0.8">${category}</div></div>`
      );
    }

    bindShapeLabel(current.layer, name, current.type);

    const newLayer = {
      id: current.layerId,
      name,
      type: current.type,
      visible: true,
      opacity: 1,
      layer: current.layer,
      properties,
      data: layerToGeoJSON(current.layer, properties),
      parentLayerId: current.parentLayerId || null,
    };

    addLayer(newLayer);
    eventBus.publish(MAP_EVENTS.DRAWING_COMPLETED, {
      layerId: newLayer.id,
      layerName: newLayer.name,
      parentLayerId: current.parentLayerId || null,
      type: current.type,
      geojson: newLayer.data,
      properties,
    });

    pendingShapeRef.current = null;
    setPendingShape(null);
  }, [addLayer, applyShapeMetadata, shapeForm]);

  const cancelPendingShape = useCallback(() => {
    const current = pendingShapeRef.current;
    if (current?.layer) {
      const drawLayerGroup = ensureDrawLayerGroup();
      if (drawLayerGroup?.hasLayer(current.layer)) {
        drawLayerGroup.removeLayer(current.layer);
      } else if (map && map.hasLayer(current.layer)) {
        map.removeLayer(current.layer);
      }
    }
    pendingShapeRef.current = null;
    setPendingShape(null);
    setShapeErrors({ name: "", category: "" });
  }, [ensureDrawLayerGroup, map]);

  useEffect(() => {
    if (!map) return;
    ensureDrawLayerGroup();

    if (handlerRef.current) {
      handlerRef.current.disable();
      handlerRef.current = null;
    }
    clearTempLayer();
    drawPointsRef.current = [];
    dragStartRef.current = null;

    const validDrawTools = ["point", "marker", "line", "polyline", "polygon", "rectangle", "circle"];
    if (activeTool !== "draw" || !validDrawTools.includes(activeSubTool)) return;

    const container = map.getContainer();
    container.classList.add("gis-drawing");
    map.doubleClickZoom.disable();
    setIsDrawing(true);
    eventBus.publish(MAP_EVENTS.DRAWING_STARTED, {
      tool: activeSubTool,
      activeLayerId: activeLayerId || null,
    });

const finishLineOrPolygon = (e) => {
      if (e) L.DomEvent.stop(e);

      const points = getCleanDrawPoints(drawPointsRef.current);
if (activeSubTool === "polygon" && points.length >= 3) {
        clearTempLayer();
        const closedPoints = [...points, points[0]];
        openMetadataPrompt(L.polygon(closedPoints, DRAW_STYLES.default), "polygon");
        drawPointsRef.current = [];
        return true;
      }
      if ((activeSubTool === "line" || activeSubTool === "polyline") && points.length >= 2) {
        clearTempLayer();
        openMetadataPrompt(L.polyline(points, DRAW_STYLES.default), "line");
        drawPointsRef.current = [];
        return true;
      }
      return false;
    };

const onClick = (e) => {
      if (activeSubTool === "point" || activeSubTool === "marker") {
        openMetadataPrompt(L.marker(e.latlng, { icon: createDrawMarker() }), "point");
        return;
      }

      if (activeSubTool === "line" || activeSubTool === "polyline" || activeSubTool === "polygon") {
        drawPointsRef.current = [...drawPointsRef.current, e.latlng];
        renderDraftLayer();
      }
    };

    const onMouseMove = (e) => {
      const points = drawPointsRef.current;
      if (points.length === 0) return;
      if (activeSubTool !== "line" && activeSubTool !== "polyline" && activeSubTool !== "polygon") return;
      renderDraftLayer(e.latlng);
    };

    const onDoubleClick = (e) => {
      finishLineOrPolygon(e);
    };

    const onContextMenu = (e) => {
      if (activeSubTool !== "line" && activeSubTool !== "polyline" && activeSubTool !== "polygon") return;
      finishLineOrPolygon(e);
    };

    const onKeyDown = (e) => {
      if (activeSubTool !== "line" && activeSubTool !== "polyline" && activeSubTool !== "polygon") return;

      if (e.key === "Enter") {
        e.preventDefault();
        finishLineOrPolygon();
      }

      if (e.key === "Backspace" || e.key === "Delete") {
        if (drawPointsRef.current.length === 0) return;
        e.preventDefault();
        drawPointsRef.current = drawPointsRef.current.slice(0, -1);
        renderDraftLayer();
      }
    };

    const onMouseDown = (e) => {
      if (activeSubTool !== "rectangle" && activeSubTool !== "circle") return;
      dragStartRef.current = e.latlng;
      map.dragging.disable();
    };

    const onDragMove = (e) => {
      if (!dragStartRef.current) return;
      clearTempLayer();
      if (activeSubTool === "rectangle") {
        tempLayerRef.current = L.rectangle(L.latLngBounds(dragStartRef.current, e.latlng), {
          ...DRAW_STYLES.default,
          dashArray: "4,4",
        }).addTo(map);
      }
      if (activeSubTool === "circle") {
        tempLayerRef.current = L.circle(dragStartRef.current, {
          ...DRAW_STYLES.default,
          radius: dragStartRef.current.distanceTo(e.latlng),
          dashArray: "4,4",
        }).addTo(map);
      }
    };

    const onMouseUp = (e) => {
      if (!dragStartRef.current) return;
      const start = dragStartRef.current;
      dragStartRef.current = null;
      clearTempLayer();
      map.dragging.enable();

      if (activeSubTool === "rectangle") {
        openMetadataPrompt(L.rectangle(L.latLngBounds(start, e.latlng), DRAW_STYLES.default), "rectangle");
      }
      if (activeSubTool === "circle") {
        openMetadataPrompt(L.circle(start, { ...DRAW_STYLES.default, radius: start.distanceTo(e.latlng) }), "circle");
      }
    };

    map.on("click", onClick);
    map.on("mousemove", onMouseMove);
    map.on("dblclick", onDoubleClick);
    map.on("contextmenu", onContextMenu);
    map.on("mousedown", onMouseDown);
    map.on("mousemove", onDragMove);
    map.on("mouseup", onMouseUp);
    window.addEventListener("keydown", onKeyDown);

    return () => {
      map.off("click", onClick);
      map.off("mousemove", onMouseMove);
      map.off("dblclick", onDoubleClick);
      map.off("contextmenu", onContextMenu);
      map.off("mousedown", onMouseDown);
      map.off("mousemove", onDragMove);
      map.off("mouseup", onMouseUp);
      window.removeEventListener("keydown", onKeyDown);
      map.doubleClickZoom.enable();
      map.dragging.enable();
      container.classList.remove("gis-drawing");
      clearTempLayer();
      drawPointsRef.current = [];
      dragStartRef.current = null;
      setIsDrawing(false);
    };
  }, [map, activeTool, activeSubTool, activeLayerId, clearTempLayer, createDrawMarker, ensureDrawLayerGroup, getCleanDrawPoints, openMetadataPrompt, renderDraftLayer, setIsDrawing]);

  useEffect(() => {
    const drawLayerGroup = ensureDrawLayerGroup();
    if (!drawLayerGroup || !map) return;

    layers.forEach((layer) => {
      if (!layer?.layer) return;
      const hasLayer = drawLayerGroup.hasLayer(layer.layer);
      if (layer.visible !== false && !hasLayer) {
        drawLayerGroup.addLayer(layer.layer);
      }
    });
  }, [ensureDrawLayerGroup, layers, map]);

  useEffect(() => {
    const drawLayerGroup = ensureDrawLayerGroup();
    if (!drawLayerGroup || !map || hasRestoredBackendLayers.current) return;
    hasRestoredBackendLayers.current = true;
    let cancelled = false;

    const restoreBackendLayers = async () => {
      const [layerRecords, featureRecords] = await Promise.all([
        fetchSavedRegions(),
        getAllFeatures().catch((error) => {
          console.error("[Map] Failed to fetch saved features:", error);
          return [];
        }),
      ]);
      if (cancelled) return;

      let backendLayers = hydrateBackendLayers(layerRecords, featureRecords)
        .map((backendLayer) => {
          const layer = createLeafletLayerFromBackendLayer(backendLayer);
          if (layer && backendLayer.visible !== false) {
            drawLayerGroup.addLayer(layer);
          }
          return { ...backendLayer, layer };
        });

      const hasRootGroup = backendLayers.some((layer) => layer.type === "group");
      if (!hasRootGroup) {
        const defaultGroupId = "untitled-layer";
        const groupRecord = {
          id: defaultGroupId,
          name: "Untitled Layer",
          type: "group",
          visible: true,
          opacity: 1,
          parentLayerId: null,
          backendId: defaultGroupId,
          backendSynced: true,
          backendDetails: null,
          backendComments: [],
          color: "#2563eb",
          category: null,
          radius: null,
          popupContent: null,
          data: null,
          layer: null,
        };

        try {
          await saveLayerGroup(defaultGroupId, "Untitled Layer", {});
        } catch (error) {
          console.error("[Map] Failed to create default layer group:", error);
        }

        backendLayers = [groupRecord, ...backendLayers.map((layer) =>
          layer.parentLayerId ? layer : { ...layer, parentLayerId: defaultGroupId }
        )];
      }

      if (backendLayers.length > 0) {
        setLayers(backendLayers);
        hasInitGeoJSON.current = true;
      }

      setBackendHydrated(true);
    };

    restoreBackendLayers().catch((error) => {
      console.error("[Map] Failed to restore backend layers:", error);
      setNotification(`Could not load saved layers: ${error.message || "Unknown error"}`);
      setBackendHydrated(true);
    });

    return () => {
      cancelled = true;
    };
  }, [ensureDrawLayerGroup, map, setLayers, setNotification]);

  useEffect(() => {
    const drawLayerGroup = ensureDrawLayerGroup();
    if (
      drawLayerGroup &&
      map &&
      backendHydrated &&
      !hasInitGeoJSON.current &&
      drawLayerGroup.getLayers().length === 0 &&
      layers.length === 0
    ) {
      const geoLayer = L.geoJSON(sampleGeoJSON, {
        style: DRAW_STYLES.default,
        onEachFeature: (feature, layer) => {
          layer.bindPopup(feature.properties.name);
        },
      });
      drawLayerGroup.addLayer(geoLayer);
      const sampleLayerId = getNextLayerId();
      addLayer({
        id: sampleLayerId,
        name: "Sample GeoJSON",
        type: "geojson",
        visible: true,
        opacity: 1,
        layer: geoLayer,
        data: sampleGeoJSON,
      });
      hasInitGeoJSON.current = true;
    }
  }, [addLayer, backendHydrated, ensureDrawLayerGroup, getNextLayerId, layers.length, map, setNotification]);

  useEffect(() => {
    if (!pendingShape) return;
    pendingShapeRef.current = pendingShape;
  }, [pendingShape]);

  return (
    <>
      <ShapeMetadataModal
        open={Boolean(pendingShape)}
        title={`Save ${pendingShape?.type || "shape"}`}
        values={shapeForm}
        errors={shapeErrors}
        onChange={(next) => {
          setShapeForm((prev) => ({ ...prev, ...next }));
          setShapeErrors((prev) => ({
            ...prev,
            ...(next.name !== undefined ? { name: "" } : {}),
            ...(next.category !== undefined ? { category: "" } : {}),
          }));
        }}
        onSubmit={finalizePendingShape}
        onCancel={cancelPendingShape}
      />
    </>
  );
}

function TextController() {
  const {
    map,
    activeTool,
    activeSubTool,
    drawLayerGroupRef,
    addLayer,
    getNextLayerId,
  } = useMapContext();

  useEffect(() => {
    if (!map || !drawLayerGroupRef.current || activeTool !== "text" || !activeSubTool) return;

    const textTools = ["marker", "highlighter", "text", "note", "image", "link", "video"];
    if (!textTools.includes(activeSubTool)) return;

    const mapContainer = map.getContainer();
    mapContainer.classList.add("gis-drawing");

    const createMarker = (latlng, contentHtml, title, iconColor = DRAW_STYLES.default.color) => {
      const marker = L.marker(latlng, {
        icon: new L.DivIcon({
          className: "gis-text-marker",
          html: `<div style="background:${iconColor};width:14px;height:14px;border-radius:50%;border:2px solid #fff;box-shadow:0 2px 6px rgba(0,0,0,0.3);"></div>`,
          iconSize: [14, 14],
          iconAnchor: [7, 7],
        }),
      }).addTo(map);

      marker.bindPopup(contentHtml);
      drawLayerGroupRef.current.addLayer(marker);
      const layerId = getNextLayerId();
      addLayer({
        id: layerId,
        name: title,
        type: activeSubTool,
        visible: true,
        opacity: 1,
        layer: marker,
        data: marker.toGeoJSON ? marker.toGeoJSON() : null,
      });
    };

    const onMapClick = (e) => {
      const latlng = e.latlng;

      if (activeSubTool === "marker") {
        createMarker(latlng, "Marker added", "Marker");
        return;
      }

      if (activeSubTool === "highlighter") {
        const circle = L.circleMarker(latlng, {
          radius: 20,
          color: DRAW_STYLES.selected.color,
          fillColor: DRAW_STYLES.selected.color,
          fillOpacity: 0.35,
          weight: 2,
        }).addTo(map);
        drawLayerGroupRef.current.addLayer(circle);
        const layerId = getNextLayerId();
        addLayer({
          id: layerId,
          name: "Highlighter",
          type: "highlighter",
          visible: true,
          opacity: 1,
          layer: circle,
          data: circle.toGeoJSON ? circle.toGeoJSON() : null,
        });
        return;
      }

      const value = window.prompt(`Enter ${activeSubTool} content`);
      if (!value) return;

      const popupContent = {
        text: `<div style="font-weight:600">${value}</div>`,
        note: `<div style="max-width:200px;white-space:pre-wrap">${value}</div>`,
        image: `<img src="${value}" style="max-width:200px;border-radius:8px" alt="Annotation" onerror="this.parentElement.innerHTML='Image failed to load'" />`,
        link: `<a href="${value}" target="_blank" rel="noreferrer">${value}</a>`,
        video: `<video src="${value}" controls style="max-width:240px;border-radius:8px"></video>`,
      };

      const title = activeSubTool.charAt(0).toUpperCase() + activeSubTool.slice(1);
      createMarker(latlng, popupContent[activeSubTool], title);
    };

    map.on("click", onMapClick);

    return () => {
      map.off("click", onMapClick);
      mapContainer.classList.remove("gis-drawing");
    };
  }, [map, activeTool, activeSubTool, drawLayerGroupRef, addLayer, getNextLayerId]);

  return null;
}



function Map() {
  const {
    basemap,
    setBasemap,
    drawLayerGroupRef,
    setNotification,
    map,
  } = useMapContext();
  const featureGroupRef = useRef(null);
  const tileErrorCountRef = useRef(0);
  const hasSwitchedRef = useRef(false);

  const boundaryLayerRef = useRef(null);

  const MAX_RETRIES = 5;
  const RETRY_DELAY = 1500;

  useEffect(() => {
    if (!map) return;

    let retries = 0;
    let cancelled = false;

    const fetchBoundary = () => {
      fetch("http://10.172.178.104:8080/api/boundaries/india")
        .then((response) => response.json())
        .then((data) => {
          if (cancelled) return;

          if (boundaryLayerRef.current) {
            map.removeLayer(boundaryLayerRef.current);
            boundaryLayerRef.current = null;
          }

          boundaryLayerRef.current = L.geoJSON(data, {
            style: {
              color: "#000000",
              weight: 2,
              fillOpacity: 0,
              dashArray: "5,5",
            },
          }).addTo(map);
        })
        .catch((err) => {
          console.error(`Boundary fetch failed (attempt ${retries + 1}):`, err);
          if (retries < MAX_RETRIES - 1) {
            retries += 1;
            setTimeout(fetchBoundary, RETRY_DELAY);
          } else {
            console.error("Boundary fetch failed after 5 retries — check server");
          }
        });
    };

    fetchBoundary();

    return () => {
      cancelled = true;
      if (boundaryLayerRef.current) {
        map.removeLayer(boundaryLayerRef.current);
        boundaryLayerRef.current = null;
      }
    };
  }, [map]);

  useEffect(() => {
    if (featureGroupRef.current && !drawLayerGroupRef.current) {
      drawLayerGroupRef.current = featureGroupRef.current;
    }
  }, [drawLayerGroupRef]);


  useEffect(() => {
    tileErrorCountRef.current = 0;
    hasSwitchedRef.current = false;
  }, [basemap]);

  const handleTileError = () => {
    tileErrorCountRef.current += 1;
    if (
      basemap === "custom" &&
      tileErrorCountRef.current >= TILE_ERROR_THRESHOLD &&
      !hasSwitchedRef.current
    ) {
      hasSwitchedRef.current = true;
      setNotification("Primary tile server unreachable. Switched to fallback basemap.");
      setBasemap(FALLBACK_BASEMAP);
    }
  };

  const currentBasemap = MAP_PROVIDERS[basemap] || MAP_PROVIDERS[FALLBACK_BASEMAP];
  const isWindy = currentBasemap.id === 'windy';
  return (
  <div style={{ position: 'relative', width: '100%', height: '100%' }}>
    {isWindy && (
      <iframe
        src="https://embed.windy.com/embed2.html?lat=20&lon=78&zoom=5&level=surface&overlay=wind&menu=&message=&marker=&calendar=now&pressure=&type=map&location=coordinates&detail=&detailLat=20&detailLon=78&metricWind=default&metricTemp=default&radarRange=-1"
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          border: 'none',
          zIndex: 1000,
        }}
      />
    )}
    <RLMapContainer
      center={DEFAULT_CENTER}
      zoom={DEFAULT_ZOOM}
      minZoom={MIN_ZOOM}
      maxZoom={MAX_ZOOM}
      scrollWheelZoom={true}
      className="gis-map"
      zoomControl={false}
      attributionControl={true}
    >
      <MapEvents />
      <DrawController />
      <SelectionController />
      <TextController />
      {!isWindy && currentBasemap.url && (
        <TileLayer
          url={currentBasemap.url}
          attribution={currentBasemap.attribution}
          {...(currentBasemap.subdomains ? { subdomains: currentBasemap.subdomains } : {})}
          crossOrigin
          eventHandlers={{ tileerror: handleTileError }}
        />
      )}
      <FeatureGroup ref={featureGroupRef} />
    </RLMapContainer>
  </div>
);
}

export default Map;
