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
  osm: {
    id: 'osm',
    label: 'OpenStreetMap',
    url: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
    attribution:
      '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    subdomains: 'abc',
    maxZoom: 19,
    color: '#93c5fd',
  },
  satellite: {
    id: 'satellite',
    label: 'Satellite',
    url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
    attribution:
      '&copy; <a href="https://www.esri.com/">Esri</a> i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, and the GIS User Community',
    subdomains: '',
    maxZoom: 19,
    color: '#166534',
  },
  dark: {
    id: 'dark',
    label: 'Dark',
    url: 'http://10.172.178.104:8080/api/tiles/{z}/{x}/{y}.png',
    attribution: '&copy; Custom Tile Server',
    subdomains: '',
    maxZoom: 19,
    color: '#1e293b',
  },
  light: {
    id: 'light',
    label: 'Light',
    url: 'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png',
    attribution:
      '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
    subdomains: 'abcd',
    maxZoom: 19,
    color: '#e2e8f0',
  },
  blank: {
    id: 'blank',
    label: 'Blank',
    url: '',
    attribution: '',
    subdomains: '',
    maxZoom: 19,
    color: '#ffffff',
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
