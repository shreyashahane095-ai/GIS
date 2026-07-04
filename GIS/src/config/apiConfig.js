/**
 * API Configuration
 *
 * Centralised API endpoint configuration for the live backend.
 * This app only uses layers and features here.
 */

/** Base URL for the backend API. Override with VITE_API_BASE_URL when needed. */
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://10.172.178.101:8001';

/** API Endpoints */

const API_ENDPOINTS = {
  // === CASES ===
  CASES: `${API_BASE_URL}/cases`,
  CASE_DETAIL: (caseId) => `${API_BASE_URL}/cases/${encodeURIComponent(caseId)}`,
  CASE_LAYERS: (caseId) => `${API_BASE_URL}/cases/${encodeURIComponent(caseId)}/layers`,

  // === LAYERS ===
  LAYERS: `${API_BASE_URL}/layers`,
  LAYER_DETAIL: (layerId) => `${API_BASE_URL}/layers/${encodeURIComponent(layerId)}`,

  // === FEATURES ===
  FEATURES: `${API_BASE_URL}/features`,
  FEATURE_DETAIL: (featureId) => `${API_BASE_URL}/features/${encodeURIComponent(featureId)}`,
  LAYER_FEATURES: (layerId) => `${API_BASE_URL}/layers/${encodeURIComponent(layerId)}/features`,

  // === NESTED CASE/LAYER/FEATURE REST PATHS ===
  CASE_LAYER_DETAIL: (caseId, layerId) => `${API_BASE_URL}/cases/${encodeURIComponent(caseId)}/layers/${encodeURIComponent(layerId)}`,
  CASE_LAYER_FEATURES: (caseId, layerId) => `${API_BASE_URL}/cases/${encodeURIComponent(caseId)}/layers/${encodeURIComponent(layerId)}/features`,
  CASE_LAYER_FEATURE_DETAIL: (caseId, layerId, featureId) => `${API_BASE_URL}/cases/${encodeURIComponent(caseId)}/layers/${encodeURIComponent(layerId)}/features/${encodeURIComponent(featureId)}`,

  // === UPDATE/PATCH PATHS ===
  UPDATE_FEATURE: (featureId) => `${API_BASE_URL}/features/${encodeURIComponent(featureId)}`,
  PATCH_LAYER: (layerId) => `${API_BASE_URL}/layers/${encodeURIComponent(layerId)}`,
  PATCH_FEATURE: (featureId) => `${API_BASE_URL}/features/${encodeURIComponent(featureId)}`,

  // === COMMENTS ===
  COMMENTS: `${API_BASE_URL}/comments`,

  /** Legacy aliases kept so the existing layer/feature flow keeps working. */
  SEND_REGION: `${API_BASE_URL}/features`,
  FETCH_REGIONS: `${API_BASE_URL}/layers`,
  SAVE_LAYER_GROUP: `${API_BASE_URL}/layers`,
  UPDATE_REGION: `${API_BASE_URL}/features`,
  DELETE_REGION: `${API_BASE_URL}/features`,

  /** Not used for the new layer/feature backend. */
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
