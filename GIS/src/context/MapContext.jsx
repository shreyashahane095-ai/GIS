import { createContext, useContext, useState, useRef, useCallback } from "react";
import { eventBus, MAP_EVENTS } from "../services/eventBus";
import { layerToGeoJSON } from "../utils/geoJsonUtils";
import { DEFAULT_BASEMAP } from "../config/mapConfig";

const MapContext = createContext(null);

export function MapProvider({ children }) {
  const [map, setMap] = useState(null);
  const [activeTool, setActiveTool] = useState("pointer");
  const [activeSubTool, setActiveSubTool] = useState(null);
  const [basemap, setBasemapState] = useState(DEFAULT_BASEMAP);
  const [mapMode, setMapModeState] = useState("2d");
  const [projection, setProjection] = useState("mercator");
  const [cameraPitch, setCameraPitch] = useState(0);
  const [terrain, setTerrain] = useState(0);
  const [layers, setLayers] = useState([]);
  const [activeLayerId, setActiveLayerId] = useState(null);
  const [zoom, setZoom] = useState(3);
  const [searchResults, setSearchResults] = useState([]);
  const [showSearch, setShowSearch] = useState(false);
  const [showLayerManager, setShowLayerManager] = useState(true);
  const [measureMode, setMeasureMode] = useState(null);
  const [measureResult, setMeasureResult] = useState(null);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [historyState, setHistoryState] = useState({ index: -1, length: 0 });
  const [isDrawing, setIsDrawing] = useState(false);
  const [notification, setNotification] = useState(null);

  const drawLayerGroupRef = useRef(null);
  const historyRef = useRef([]);
  const historyIndexRef = useRef(-1);

  const publishLayerEvent = useCallback((eventName, layer) => {
    eventBus.publish(eventName, {
      id: layer.id,
      name: layer.name,
      type: layer.type,
      visible: layer.visible,
      opacity: layer.opacity,
      data: layer.data,
      parentLayerId: layer.parentLayerId || null,
    });
  }, []);

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
        const normalizedLayer = {
          visible: true,
          opacity: 1,
          parentLayerId: activeLayerId,
          ...layerObj,
          data: layerObj.layer ? layerToGeoJSON(layerObj.layer, layerObj.data?.properties || {}) : layerObj.data || null,
        };
        const next = [normalizedLayer, ...prev];
        recordHistory(next);
        publishLayerEvent(MAP_EVENTS.LAYER_ADDED, normalizedLayer);
        if (normalizedLayer.data) {
          eventBus.publish(MAP_EVENTS.GEOMETRY_CREATED, {
            layerId: normalizedLayer.id,
            layerName: normalizedLayer.name,
            parentLayerId: normalizedLayer.parentLayerId || null,
            type: normalizedLayer.type,
            geojson: normalizedLayer.data,
          });
        }
        return next;
      });
    },
    [activeLayerId, publishLayerEvent, recordHistory]
  );

  const removeLayer = useCallback(
    (id) => {
      const featureGroup = drawLayerGroupRef.current;
      setLayers((prev) => {
        const target = prev.find((l) => l.id === id);
        if (target && target.layer) {
          if (featureGroup && featureGroup.hasLayer(target.layer)) {
            featureGroup.removeLayer(target.layer);
          }
        }
        const next = prev.filter((l) => l.id !== id);
        recordHistory(next);
        if (target) {
          publishLayerEvent(MAP_EVENTS.LAYER_REMOVED, target);
          if (target.data) {
            eventBus.publish(MAP_EVENTS.GEOMETRY_DELETED, {
              layerId: target.id,
              parentLayerId: target.parentLayerId || null,
              geojson: target.data,
            });
          }
        }
        if (activeLayerId === id) {
          setActiveLayerId(null);
          eventBus.publish(MAP_EVENTS.LAYER_DESELECTED, { id });
        }
        return next;
      });
    },
    [activeLayerId, drawLayerGroupRef, publishLayerEvent, recordHistory]
  );

  const updateLayer = useCallback(
    (id, updates) => {
      setLayers((prev) => {
        const next = prev.map((l) => (l.id === id ? { ...l, ...updates } : l));
        recordHistory(next);
        const updated = next.find((l) => l.id === id);
        if (updated) publishLayerEvent(MAP_EVENTS.LAYER_RENAMED, updated);
        return next;
      });
    },
    [publishLayerEvent, recordHistory]
  );

  const setLayerVisibility = useCallback(
    (id, visible) => {
      const featureGroup = drawLayerGroupRef.current;
      setLayers((prev) => {
        const next = prev.map((l) => {
          if (l.id !== id) return l;
          if (l.layer && featureGroup) {
            if (visible) {
              if (!featureGroup.hasLayer(l.layer)) featureGroup.addLayer(l.layer);
            } else {
              if (featureGroup.hasLayer(l.layer)) featureGroup.removeLayer(l.layer);
            }
          }
          const updatedLayer = { ...l, visible };
          publishLayerEvent(MAP_EVENTS.LAYER_VISIBILITY_CHANGED, updatedLayer);
          return updatedLayer;
        });
        recordHistory(next);
        return next;
      });
    },
    [drawLayerGroupRef, publishLayerEvent, recordHistory]
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

  const setMapMode = useCallback((mode) => {
    const normalizedMode = mode === "3d" ? "3d" : "2d";
    setMapModeState(normalizedMode);
    if (normalizedMode === "2d") {
      setSettingsOpen(false);
      setCameraPitch(0);
      setTerrain(0);
    }
    eventBus.publish(MAP_EVENTS.MAP_MODE_CHANGED, { mode: normalizedMode });
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
      if (!target || !target.layer) return;
      if (target.layer.getBounds) {
        map.flyToBounds(target.layer.getBounds(), { padding: [40, 40] });
      } else if (target.layer.getLatLng) {
        map.flyTo(target.layer.getLatLng(), 14);
      }
    },
    [layers, map]
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

  const canUndo = historyIndexRef.current > 0;
  const canRedo = historyIndexRef.current < historyRef.current.length - 1;

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
    mapMode,
    setMapMode,
    projection,
    setProjection,
    cameraPitch,
    setCameraPitch,
    terrain,
    setTerrain,
    layers,
    setLayers,
    activeLayerId,
    setActiveLayerId,
    addLayer,
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
    settingsOpen,
    setSettingsOpen,
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
