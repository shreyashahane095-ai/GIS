/**
 * Map Provider Configuration
 * 
 * Centralised configuration for all tile providers.
 * To switch from OpenStreetMap to a private tile server,
 * only this file needs to be modified.
 */

const MAP_PROVIDERS = {
  custom: {
    id: 'custom',
    label: 'Custom Tiles',
    url: 'http://10.172.178.104:8080/api/tiles/{z}/{x}/{y}.png',
    attribution: '&copy; Self-Hosted OSM',
    subdomains: '',
    maxZoom: 19,
    color: '#2563eb',
  },
esriSatellite: {
    id: 'esriSatellite',
    label: 'ESRI Satellite',
    url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
    attribution: '&copy; Esri, Maxar, USGS, NASA',
    subdomains: '',
    maxZoom: 19,
    color: '#166534',
  },
   cartoLight: {
    id: 'cartoLight',
    label: 'Carto Light',
    url: 'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png',
    attribution: '&copy; CartoDB',
    subdomains: 'abcd',
    maxZoom: 19,
    color: '#e2e8f0',
  },
  dark: {
    id: 'dark',
    label: 'Carto Dark',
    url: 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png',
    attribution: '&copy; CartoDB',
    subdomains: 'abcd',
    maxZoom: 19,
    color: '#1e293b',
  },
   esriStreet: {
    id: 'esriStreet',
    label: 'ESRI Street',
    url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Street_Map/MapServer/tile/{z}/{y}/{x}',
    attribution: '&copy; Esri',
    subdomains: '',
    maxZoom: 19,
    color: '#2563eb',
  },
  windy: {
  id: 'windy',
  label: 'Weather (Windy)',
  url: 'https://embed.windy.com/embed2.html',
  attribution: '',
  subdomains: '',
  maxZoom: 19,
  color: '#38bdf8',
},
};

/** Default basemap to use on first load */
const DEFAULT_BASEMAP = 'custom';

/** Fallback basemap when the primary fails to load */
const FALLBACK_BASEMAP = 'custom';

/** Number of tile errors before triggering fallback */
const TILE_ERROR_THRESHOLD = 999;

/** Default map center and zoom */
const DEFAULT_CENTER = [20, 0];
const DEFAULT_ZOOM = 3;
const MIN_ZOOM = 2;
const MAX_ZOOM = 19;

/** Drawing style defaults */
const DRAW_STYLES = {
  default: {
    color: '#2563eb',
    weight: 3,
    fillOpacity: 0.15,
  },
  selected: {
    color: '#f59e0b',
    weight: 4,
    fillOpacity: 0.2,
  },
  hover: {
    color: '#10b981',
    weight: 3,
    fillOpacity: 0.25,
  },
};

export {
  MAP_PROVIDERS,
  DEFAULT_BASEMAP,
  FALLBACK_BASEMAP,
  TILE_ERROR_THRESHOLD,
  DEFAULT_CENTER,
  DEFAULT_ZOOM,
  MIN_ZOOM,
  MAX_ZOOM,
  DRAW_STYLES,
};
