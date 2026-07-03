/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext, useState, useRef, useEffect, useCallback } from "react";
import L from "leaflet";
import { eventBus, MAP_EVENTS } from "../services/eventBus";
import { layerToGeoJSON } from "../utils/geoJsonUtils";
import { DEFAULT_BASEMAP } from "../config/mapConfig";
import { bindShapeHoverPopup, bindShapeLabel } from "../services/layerHydration";

function extendBoundsFromLayer(leafletLayer, bounds) {
  if (!leafletLayer || !bounds) return bounds;

  if (leafletLayer.getBounds) {
    const layerBounds = leafletLayer.getBounds();
    if (layerBounds?.isValid?.()) {
      bounds.extend(layerBounds);
      return bounds;
    }
  }

  if (leafletLayer.eachLayer) {
    leafletLayer.eachLayer((childLayer) => {
      extendBoundsFromLayer(childLayer, bounds);
    });
    return bounds;
  }

  if (leafletLayer.getLatLng) {
    bounds.extend(leafletLayer.getLatLng());
    return bounds;
  }

  if (leafletLayer.getLatLngs) {
    const latLngs = leafletLayer.getLatLngs();
    const stack = Array.isArray(latLngs) ? [...latLngs] : [];
    while (stack.length > 0) {
      const item = stack.pop();
      if (Array.isArray(item)) {
        stack.push(...item);
      } else if (item && typeof item.lat === "number" && typeof item.lng === "number") {
        bounds.extend(item);
      }
    }
  }

  return bounds;
}

const MapContext = createContext(null);

function getMaxNumericLayerId(sourceLayers = []) {
  const numericIds = sourceLayers
    .map((layer) => Number(layer?.id))
    .filter((id) => Number.isFinite(id));

  return numericIds.length > 0 ? Math.max(...numericIds) : 0;
}

export function MapProvider({ children }) {
  const [map, setMap] = useState(null);
  const [activeTool, setActiveTool] = useState("pointer");
  const [activeSubTool, setActiveSubTool] = useState(null);
  const [basemap, setBasemapState] = useState(DEFAULT_BASEMAP);
  const [layers, setLayers] = useState([]);
  const [activeLayerId, setActiveLayerId] = useState(null);
  const [zoom, setZoom] = useState(3);
  const [searchResults, setSearchResults] = useState([]);
  const [showSearch, setShowSearch] = useState(false);
  const [showLayerManager, setShowLayerManager] = useState(true);
  const [measureMode, setMeasureMode] = useState(null);
  const [measureResult, setMeasureResult] = useState(null);
  const [historyState, setHistoryState] = useState({ index: -1, length: 0 });
  const [isDrawing, setIsDrawing] = useState(false);
  const [notification, setNotification] = useState(null);

  const drawLayerGroupRef = useRef(null);
  const historyRef = useRef([]);
  const historyIndexRef = useRef(-1);
  const nextLayerIdRef = useRef(1);

  useEffect(() => {
    nextLayerIdRef.current = getMaxNumericLayerId(layers) + 1;
  }, [layers]);

  const getNextLayerId = useCallback((sourceLayers = null) => {
    if (Array.isArray(sourceLayers)) {
      const nextId = getMaxNumericLayerId(sourceLayers) + 1;
      nextLayerIdRef.current = Math.max(nextLayerIdRef.current, nextId + 1);
      return nextId;
    }

    const nextId = nextLayerIdRef.current;
    nextLayerIdRef.current += 1;
    return nextId;
  }, []);

  const normalizeLayerId = useCallback((id) => {
    const numericId = Number(id);
    return Number.isFinite(numericId) ? Math.trunc(numericId) : id;
  }, []);

  const publishLayerEvent = useCallback((eventName, layer) => {
    eventBus.publish(eventName, {
      id: layer.id,
      name: layer.name,
      type: layer.type,
      visible: layer.visible,
      opacity: layer.opacity,
      color: layer.color,
      category: layer.category || layer.properties?.category || null,
      backendId: layer.backendId || null,
      backendSynced: Boolean(layer.backendSynced),
      skipBackendSync: Boolean(layer.skipBackendSync),
      data: layer.data,
      properties: layer.properties || layer.data?.properties || {},
      parentLayerId: layer.parentLayerId || null,
    });
  }, []);

  const createMarkerIcon = useCallback((color) => new L.DivIcon({
    className: "gis-draw-marker",
    html: `<div style="background:${color};width:14px;height:14px;border-radius:50%;border:2px solid #fff;box-shadow:0 2px 6px rgba(0,0,0,0.3);"></div>`,
    iconSize: [14, 14],
    iconAnchor: [7, 7],
  }), []);

  const applyLayerAppearance = useCallback((layerRecord, updates) => {
    if (!layerRecord?.layer) return;

    const nextName = updates.name ?? layerRecord.name;
    const nextType = updates.type ?? layerRecord.type;
    const nextColor = updates.color ?? layerRecord.color ?? layerRecord.properties?.color;
    const nextOpacity = typeof updates.opacity === "number" ? updates.opacity : layerRecord.opacity;

    if (updates.color !== undefined && layerRecord.layer.setIcon) {
      layerRecord.layer.setIcon(createMarkerIcon(nextColor || "#2563eb"));
    }

    if (layerRecord.layer.setStyle) {
      const style = {};
      if (updates.color !== undefined) {
        style.color = nextColor;
        style.fillColor = nextColor;
      }
      if (updates.opacity !== undefined) {
        style.opacity = nextOpacity;
        style.fillOpacity = nextType === "line" || nextType === "polyline" ? 0 : nextOpacity * 0.6;
      }
      if (Object.keys(style).length > 0) {
        layerRecord.layer.setStyle(style);
      }
    }

    if (updates.opacity !== undefined && layerRecord.layer.setOpacity) {
      layerRecord.layer.setOpacity(nextOpacity);
    }

    if (nextName) {
      bindShapeLabel(layerRecord.layer, nextName, nextType);
    }

    if (layerRecord.layer.bindPopup) {
      const nextCategory = updates.category ?? layerRecord.category ?? layerRecord.properties?.category;
      layerRecord.layer.bindPopup(
        `<div style="min-width:160px"><strong>${nextName || "Layer"}</strong>${
          nextCategory ? `<div style="font-size:12px;opacity:0.8">${nextCategory}</div>` : ""
        }</div>`
      );
    }

    bindShapeHoverPopup(layerRecord.layer, layerRecord);
  }, [createMarkerIcon]);

  const getDescendantLayerIds = useCallback((id, sourceLayers = layers) => {
    const descendants = [];
    const queue = sourceLayers.filter((layer) => layer.parentLayerId === id);

    while (queue.length > 0) {
      const current = queue.shift();
      if (!current) continue;
      descendants.push(current.id);
      queue.push(...sourceLayers.filter((layer) => layer.parentLayerId === current.id));
    }

    return descendants;
  }, [layers]);

  const recordHistory = useCallback((newLayers) => {
    const next = historyRef.current.slice(0, historyIndexRef.current + 1);
    next.push(newLayers.map((l) => ({ ...l, layer: l.layer })));
    historyRef.current = next;
    historyIndexRef.current = next.length - 1;
    setHistoryState({ index: historyIndexRef.current, length: next.length });
  }, []);

  const addLayer = useCallback(
    (layerObj) => {
      setLayers((prev) => {
        const properties = layerObj.properties || layerObj.data?.properties || {};
        const id =
          layerObj.id === undefined || layerObj.id === null || layerObj.id === ""
            ? getNextLayerId(prev)
            : normalizeLayerId(layerObj.id);
        const normalizedLayer = {
          id,
          visible: true,
          opacity: 1,
          parentLayerId: activeLayerId,
          properties,
          ...layerObj,
          data: layerObj.layer ? layerToGeoJSON(layerObj.layer, properties) : layerObj.data || null,
        };
        const next = [normalizedLayer, ...prev];
        applyLayerAppearance(normalizedLayer, normalizedLayer);
        recordHistory(next);
        publishLayerEvent(MAP_EVENTS.LAYER_ADDED, normalizedLayer);
        if (normalizedLayer.data) {
          eventBus.publish(MAP_EVENTS.GEOMETRY_CREATED, {
            layerId: normalizedLayer.id,
            layerName: normalizedLayer.name,
            parentLayerId: normalizedLayer.parentLayerId || null,
            type: normalizedLayer.type,
            geojson: normalizedLayer.data,
            properties: normalizedLayer.properties || normalizedLayer.data?.properties || {},
          });
        }
        return next;
      });
    },
    [activeLayerId, applyLayerAppearance, getNextLayerId, normalizeLayerId, publishLayerEvent, recordHistory]
  );

  const removeLayer = useCallback(
    (id) => {
      const featureGroup = drawLayerGroupRef.current;
      setLayers((prev) => {
        const target = prev.find((l) => l.id === id);
        const descendantIds = getDescendantLayerIds(id, prev);
        if (target && target.layer) {
          if (featureGroup && featureGroup.hasLayer(target.layer)) {
            featureGroup.removeLayer(target.layer);
          }
        }
        descendantIds.forEach((childId) => {
          const child = prev.find((layer) => layer.id === childId);
          if (child?.layer && featureGroup?.hasLayer(child.layer)) {
            featureGroup.removeLayer(child.layer);
          }
        });
        const next = prev.filter((l) => l.id !== id);
        recordHistory(next);
        if (target) {
          publishLayerEvent(MAP_EVENTS.LAYER_REMOVED, target);
          if (target.data) {
            eventBus.publish(MAP_EVENTS.GEOMETRY_DELETED, {
              layerId: target.id,
              backendId: target.backendId || null,
              parentLayerId: target.parentLayerId || null,
              geojson: target.data,
            });
          }
        }
        if (activeLayerId === id || descendantIds.includes(activeLayerId)) {
          setActiveLayerId(null);
          eventBus.publish(MAP_EVENTS.LAYER_DESELECTED, { id: activeLayerId === id ? id : activeLayerId });
        }
        return next.filter((layer) => layer.id !== id && !descendantIds.includes(layer.id));
      });
    },
    [activeLayerId, drawLayerGroupRef, getDescendantLayerIds, publishLayerEvent, recordHistory]
  );

  const updateLayer = useCallback(
    (id, updates) => {
      setLayers((prev) => {
        const { skipBackendSync, ...persistedUpdates } = updates || {};
        const next = prev.map((l) => {
          if (l.id !== id) return l;
          const nextProperties = {
            ...(l.properties || {}),
            ...(persistedUpdates.properties || {}),
          };
          if (persistedUpdates.name !== undefined) nextProperties.name = persistedUpdates.name;
          if (persistedUpdates.type !== undefined) nextProperties.type = persistedUpdates.type;
          if (persistedUpdates.color !== undefined) nextProperties.color = persistedUpdates.color;
          if (persistedUpdates.opacity !== undefined) nextProperties.opacity = persistedUpdates.opacity;
          if (persistedUpdates.category !== undefined) nextProperties.category = persistedUpdates.category;

          const updatedLayer = {
            ...l,
            ...persistedUpdates,
            properties: nextProperties,
            backendDetails: l.backendDetails
              ? {
                  ...l.backendDetails,
                  ...persistedUpdates,
                  properties: {
                    ...(l.backendDetails.properties || {}),
                    ...nextProperties,
                  },
                }
              : l.backendDetails,
            data: l.layer ? layerToGeoJSON(l.layer, nextProperties) : l.data,
          };
          applyLayerAppearance(updatedLayer, updates);
          return updatedLayer;
        });
        recordHistory(next);
        const updated = next.find((l) => l.id === id);
        if (updated) publishLayerEvent(MAP_EVENTS.LAYER_RENAMED, { ...updated, skipBackendSync });
        return next;
      });
    },
    [applyLayerAppearance, publishLayerEvent, recordHistory]
  );

  const setLayerVisibility = useCallback(
    (id, visible) => {
      const featureGroup = drawLayerGroupRef.current;
      setLayers((prev) => {
        const descendantIds = getDescendantLayerIds(id, prev);
        const next = prev.map((l) => {
          if (l.id !== id && !descendantIds.includes(l.id)) return l;
          const nextVisible = l.id === id ? visible : visible;
          if (l.layer && featureGroup) {
            if (nextVisible) {
              if (!featureGroup.hasLayer(l.layer)) featureGroup.addLayer(l.layer);
            } else {
              if (featureGroup.hasLayer(l.layer)) featureGroup.removeLayer(l.layer);
            }
          }
          const updatedLayer = { ...l, visible: nextVisible };
          publishLayerEvent(MAP_EVENTS.LAYER_VISIBILITY_CHANGED, updatedLayer);
          return updatedLayer;
        });
        recordHistory(next);
        return next;
      });
    },
    [drawLayerGroupRef, getDescendantLayerIds, publishLayerEvent, recordHistory]
  );

  const showLayer = useCallback(
    (id) => setLayerVisibility(id, true),
    [setLayerVisibility]
  );

  const hideLayer = useCallback(
    (id) => setLayerVisibility(id, false),
    [setLayerVisibility]
  );

  const toggleLayerVisibility = useCallback(
    (id) => {
      const target = layers.find((l) => l.id === id);
      if (target) setLayerVisibility(id, !target.visible);
    },
    [layers, setLayerVisibility]
  );

  const setLayerOpacity = useCallback(
    (id, opacity) => {
      setLayers((prev) => {
        const next = prev.map((l) => {
          if (l.id !== id) return l;
          if (l.layer && l.layer.setStyle) {
            l.layer.setStyle({ opacity, fillOpacity: opacity * 0.6 });
          }
          if (l.layer && l.layer.setOpacity) {
            l.layer.setOpacity(opacity);
          }
          const updatedLayer = { ...l, opacity };
          publishLayerEvent(MAP_EVENTS.LAYER_OPACITY_CHANGED, updatedLayer);
          return updatedLayer;
        });
        recordHistory(next);
        return next;
      });
    },
    [publishLayerEvent, recordHistory]
  );

  const selectLayer = useCallback((id) => {
    setActiveLayerId(id);
    eventBus.publish(MAP_EVENTS.LAYER_SELECTED, { id });
  }, []);

  const setBasemap = useCallback((nextBasemap) => {
    setBasemapState(nextBasemap);
    eventBus.publish(MAP_EVENTS.BASEMAP_CHANGED, { basemap: nextBasemap });
  }, []);

  const deselectLayer = useCallback(() => {
    const previousId = activeLayerId;
    setActiveLayerId(null);
    eventBus.publish(MAP_EVENTS.LAYER_DESELECTED, { id: previousId });
  }, [activeLayerId]);

  const zoomToLayer = useCallback(
    (id) => {
      if (!map) return;
      const target = layers.find((l) => l.id === id);
      if (!target) return;
      const descendantLayers = getDescendantLayerIds(id, layers)
        .map((childId) => layers.find((layer) => layer.id === childId))
        .filter(Boolean);
      const bounds = L.latLngBounds([]);
      extendBoundsFromLayer(target.layer, bounds);
      descendantLayers.forEach((childLayer) => {
        extendBoundsFromLayer(childLayer.layer, bounds);
      });

      if (bounds.isValid()) {
        const southWest = bounds.getSouthWest();
        const northEast = bounds.getNorthEast();
        if (southWest.equals(northEast)) {
          map.flyTo(bounds.getCenter(), Math.min(Math.max(map.getZoom(), 14), map.getMaxZoom?.() || 18));
        } else {
          map.fitBounds(bounds, { padding: [40, 40], maxZoom: 17 });
        }
      } else if (target.layer?.getLatLng) {
        map.flyTo(target.layer.getLatLng(), 14);
      }
    },
    [getDescendantLayerIds, layers, map]
  );

  const renameLayer = useCallback(
    (id, name) => updateLayer(id, { name }),
    [updateLayer]
  );

  const refreshLayer = useCallback(
    (id) => {
      const target = layers.find((l) => l.id === id);
      if (target) publishLayerEvent(MAP_EVENTS.LAYER_ADDED, target);
    },
    [layers, publishLayerEvent]
  );

  const reorderLayers = useCallback(
    (orderedIds) => {
      setLayers((prev) => {
        const order = new Map(orderedIds.map((id, index) => [id, index]));
        const next = [...prev].sort((a, b) => {
          const aOrder = order.has(a.id) ? order.get(a.id) : Number.MAX_SAFE_INTEGER;
          const bOrder = order.has(b.id) ? order.get(b.id) : Number.MAX_SAFE_INTEGER;
          return aOrder - bOrder;
        });
        next.forEach((l) => {
          if (l.layer && l.layer.bringToFront) l.layer.bringToFront();
        });
        recordHistory(next);
        eventBus.publish(MAP_EVENTS.LAYER_REORDERED, {
          orderedIds: next.map((l) => l.id),
        });
        return next;
      });
    },
    [recordHistory]
  );

  const updateLayerGeometry = useCallback(
    (leafletLayer) => {
      setLayers((prev) => {
        let changed = false;
        const next = prev.map((l) => {
          if (l.layer !== leafletLayer) return l;
          const data = layerToGeoJSON(leafletLayer, l.data?.properties || {});
          changed = true;
          const updatedLayer = { ...l, data };
          eventBus.publish(MAP_EVENTS.GEOMETRY_UPDATED, {
            layerId: l.id,
            backendId: l.backendId || null,
            layerName: l.name,
            parentLayerId: l.parentLayerId || null,
            geojson: data,
          });
          return updatedLayer;
        });
        if (changed) recordHistory(next);
        return next;
      });
    },
    [recordHistory]
  );

  const canUndo = historyState.index > 0;
  const canRedo = historyState.index < historyState.length - 1;

  const syncFeatureGroup = useCallback((snapshot) => {
    const featureGroup = drawLayerGroupRef.current;
    if (!featureGroup) return;
    snapshot.forEach((l) => {
      if (!l.layer) return;
      const inGroup = featureGroup.hasLayer(l.layer);
      if (l.visible && !inGroup) featureGroup.addLayer(l.layer);
      if (!l.visible && inGroup) featureGroup.removeLayer(l.layer);
    });
  }, [drawLayerGroupRef]);

  const undo = useCallback(() => {
    if (historyIndexRef.current > 0) {
      historyIndexRef.current -= 1;
      const snapshot = historyRef.current[historyIndexRef.current];
      syncFeatureGroup(snapshot);
      setLayers(snapshot);
      setHistoryState({ index: historyIndexRef.current, length: historyRef.current.length });
    }
  }, [syncFeatureGroup]);

  const redo = useCallback(() => {
    if (historyIndexRef.current < historyRef.current.length - 1) {
      historyIndexRef.current += 1;
      const snapshot = historyRef.current[historyIndexRef.current];
      syncFeatureGroup(snapshot);
      setLayers(snapshot);
      setHistoryState({ index: historyIndexRef.current, length: historyRef.current.length });
    }
  }, [syncFeatureGroup]);

  const value = {
    map,
    setMap,
    activeTool,
    setActiveTool,
    activeSubTool,
    setActiveSubTool,
    basemap,
    setBasemap,
    layers,
    setLayers,
    activeLayerId,
    setActiveLayerId,
    addLayer,
    getNextLayerId,
    removeLayer,
    updateLayer,
    showLayer,
    hideLayer,
    toggleLayerVisibility,
    setLayerOpacity,
    selectLayer,
    deselectLayer,
    zoomToLayer,
    renameLayer,
    refreshLayer,
    reorderLayers,
    updateLayerGeometry,
    zoom,
    setZoom,
    searchResults,
    setSearchResults,
    showSearch,
    setShowSearch,
    showLayerManager,
    setShowLayerManager,
    measureMode,
    setMeasureMode,
    measureResult,
    setMeasureResult,
    isDrawing,
    setIsDrawing,
    notification,
    setNotification,
    drawLayerGroupRef,
    undo,
    redo,
    canUndo,
    canRedo,
  };

  return <MapContext.Provider value={value}>{children}</MapContext.Provider>;
}

export function useMapContext() {
  const ctx = useContext(MapContext);
  if (!ctx) throw new Error("useMapContext must be used within MapProvider");
  return ctx;
}
