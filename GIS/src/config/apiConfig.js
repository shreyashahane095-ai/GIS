/**
 * API Configuration
 * 
 * Centralised API endpoint configuration.
 * All endpoints are configurable — no hardcoded URLs.
 */

/** Base URL for the backend API. Override with VITE_API_BASE_URL when needed. */
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api';

/** API Endpoints */
const API_ENDPOINTS = {
  /** Send selected/drawn polygon geometry to the backend */
  SEND_REGION: `${API_BASE_URL}/polygon`,

  /** List saved drawn geometries from the backend */
  FETCH_REGIONS: import.meta.env.VITE_FETCH_REGIONS_ENDPOINT || `${API_BASE_URL}/polygons`,

  /** Store or list feature records such as comments */
  FEATURES: `${API_BASE_URL}/features`,

  /** Optional endpoint for detailed selected-region information. */
  FETCH_REGION_DETAILS: import.meta.env.VITE_REGION_DETAILS_ENDPOINT || '',
};

/** Request timeout in milliseconds */
const API_TIMEOUT = 30000;

/** Whether to use mocked responses. Set VITE_USE_MOCK_DATA=true for local mock mode. */
const USE_MOCK_DATA = import.meta.env.VITE_USE_MOCK_DATA === 'true';

export {
  API_BASE_URL,
  API_ENDPOINTS,
  API_TIMEOUT,
  USE_MOCK_DATA,
};
