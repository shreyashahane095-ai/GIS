/**
 * Event Bus — Lightweight Pub/Sub System
 * 
 * Provides decoupled communication between the Map Module and
 * other parts of the application (sidebars, navbar, etc.).
 * 
 * The sidebar developer can subscribe to events without importing
 * Leaflet or knowing about map internals.
 * 
 * Usage:
 *   import { eventBus } from '@/services/eventBus';
 *   
 *   // Subscribe
 *   const unsub = eventBus.subscribe('onGeometryCreated', (data) => { ... });
 *   
 *   // Publish
 *   eventBus.publish('onGeometryCreated', { id, type, geojson });
 *   
 *   // Unsubscribe
 *   unsub();
 */

class EventBus {
  constructor() {
    this._listeners = {};
  }

  /**
   * Subscribe to an event.
   * @param {string} event - Event name
   * @param {Function} callback - Handler function
   * @returns {Function} Unsubscribe function
   */
  subscribe(event, callback) {
    if (!this._listeners[event]) {
      this._listeners[event] = [];
    }
    this._listeners[event].push(callback);

    // Return an unsubscribe function for convenience
    return () => {
      this.unsubscribe(event, callback);
    };
  }

  /**
   * Unsubscribe a specific callback from an event.
   * @param {string} event - Event name
   * @param {Function} callback - Handler to remove
   */
  unsubscribe(event, callback) {
    if (!this._listeners[event]) return;
    this._listeners[event] = this._listeners[event].filter(
      (cb) => cb !== callback
    );
  }

  /**
   * Publish an event with optional data.
   * @param {string} event - Event name
   * @param {*} data - Event payload
   */
  publish(event, data) {
    if (!this._listeners[event]) return;
    this._listeners[event].forEach((callback) => {
      try {
        callback(data);
      } catch (err) {
        console.error(`[EventBus] Error in handler for "${event}":`, err);
      }
    });
  }

  /**
   * Remove all listeners for a specific event, or all events.
   * @param {string} [event] - Event name (optional, clears all if omitted)
   */
  clear(event) {
    if (event) {
      delete this._listeners[event];
    } else {
      this._listeners = {};
    }
  }
}

/** Singleton event bus instance */
const eventBus = new EventBus();

/**
 * Event name constants for type-safe usage.
 */
const MAP_EVENTS = {
  // Layer events
  LAYER_ADDED: 'onLayerAdded',
  LAYER_REMOVED: 'onLayerRemoved',
  LAYER_SELECTED: 'onLayerSelected',
  LAYER_DESELECTED: 'onLayerDeselected',
  LAYER_VISIBILITY_CHANGED: 'onLayerVisibilityChanged',
  LAYER_OPACITY_CHANGED: 'onLayerOpacityChanged',
  LAYER_RENAMED: 'onLayerRenamed',
  LAYER_REORDERED: 'onLayerReordered',

  // Drawing events
  DRAWING_STARTED: 'onDrawingStarted',
  DRAWING_COMPLETED: 'onDrawingCompleted',

  // Geometry events
  GEOMETRY_CREATED: 'onGeometryCreated',
  GEOMETRY_UPDATED: 'onGeometryUpdated',
  GEOMETRY_DELETED: 'onGeometryDeleted',
  GEOMETRY_SELECTED: 'onGeometrySelected',
  GEOMETRY_DESELECTED: 'onGeometryDeselected',

  // Region events
  REGION_SELECTED: 'onRegionSelected',
  REGION_HOVERED: 'onRegionHovered',

  // Comment events
  COMMENT_ADDED: 'onCommentAdded',

  // Popup events
  POPUP_OPENED: 'onPopupOpened',
  POPUP_CLOSED: 'onPopupClosed',

  // API events
  API_REQUEST_STARTED: 'onApiRequestStarted',
  API_REQUEST_COMPLETED: 'onApiRequestCompleted',
  API_REQUEST_FAILED: 'onApiRequestFailed',

  // Map mode events
  MAP_MODE_CHANGED: 'onMapModeChanged',
  BASEMAP_CHANGED: 'onBasemapChanged',
};

export { eventBus, MAP_EVENTS };
