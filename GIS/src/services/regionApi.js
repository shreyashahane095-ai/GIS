/**
 * Region API Service
 * 
 * Frontend API architecture for region-related operations.
 * Uses mocked data while the backend is not yet implemented.
 * 
 * To connect to a real backend:
 * 1. Set USE_MOCK_DATA to false in apiConfig.js
 * 2. Set API_BASE_URL to the backend URL
 * 3. No other changes required
 */

import { API_ENDPOINTS, API_TIMEOUT, USE_MOCK_DATA } from '../config/apiConfig';
import {
  generateMockCommentsList,
  generateMockRegionDetails,
  generateMockSaveCommentResponse,
  generateMockSendRegionResponse,
} from './mockData';
import { eventBus, MAP_EVENTS } from './eventBus';

const DEFAULT_FEATURE_PROPERTIES = {
  color: '#ff0000',
  strokeWidth: 3,
  fillOpacity: 0.5,
};

function normalizeLayerId(layerId) {
  return Number.isFinite(Number(layerId)) ? Number(layerId) : layerId;
}

async function readErrorMessage(res) {
  const contentType = res.headers.get('content-type') || '';
  if (contentType.includes('application/json')) {
    const body = await res.json().catch(() => null);
    const detail = body?.detail || body?.message || body?.error || body?.errors;
    if (detail) {
      return typeof detail === 'string' ? detail : JSON.stringify(detail);
    }
  }

  const text = await res.text().catch(() => '');
  return text || `${res.status} ${res.statusText}`;
}

function buildFeaturePayload({
  layerId,
  name,
  geometry,
  properties = {},
  createdBy = 'sayyam',
}) {
  return {
    layer_id: normalizeLayerId(layerId),
    name,
    layer_name: name,
    geometry,
    properties: {
      ...DEFAULT_FEATURE_PROPERTIES,
      ...properties,
      name,
      layerName: name,
    },
    created_by: createdBy,
  };
}

/**
 * Send a selected region geometry to the backend.
 * 
 * @param {string} layerId - The layer ID
 * @param {string} layerName - The layer name
 * @param {Object} geometry - GeoJSON geometry object
 * @returns {Promise<Object>} API response
 */
export async function sendRegion(layerId, layerName, geometry) {
  const payload = buildFeaturePayload({
    layerId,
    name: layerName,
    geometry,
  });

  eventBus.publish(MAP_EVENTS.API_REQUEST_STARTED, {
    type: 'sendRegion',
    payload,
  });

  try {
    if (USE_MOCK_DATA) {
      // Simulate network delay
      await delay(600);
      const response = generateMockSendRegionResponse(payload);
      eventBus.publish(MAP_EVENTS.API_REQUEST_COMPLETED, {
        type: 'sendRegion',
        response,
      });
      return response;
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), API_TIMEOUT);

    const res = await fetch(API_ENDPOINTS.SEND_REGION, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!res.ok) {
      throw new Error(`API error: ${res.status} ${await readErrorMessage(res)}`);
    }

    const response = await res.json();
    eventBus.publish(MAP_EVENTS.API_REQUEST_COMPLETED, {
      type: 'sendRegion',
      response,
    });
    return response;
  } catch (error) {
    const errorData = {
      type: 'sendRegion',
      error: error.message || 'Unknown error',
    };
    eventBus.publish(MAP_EVENTS.API_REQUEST_FAILED, errorData);
    console.error('[RegionAPI] sendRegion failed:', error);
    throw error;
  }
}

/**
 * Fetch detailed information about a selected region.
 * 
 * @param {Object} geometry - GeoJSON geometry object
 * @returns {Promise<Object>} Region details
 */
export async function fetchRegionDetails(geometry) {
  if (!API_ENDPOINTS.FETCH_REGION_DETAILS) {
    return null;
  }

  eventBus.publish(MAP_EVENTS.API_REQUEST_STARTED, {
    type: 'fetchRegionDetails',
    geometry,
  });

  try {
    if (USE_MOCK_DATA) {
      // Simulate network delay
      await delay(800);
      const response = generateMockRegionDetails(geometry);
      eventBus.publish(MAP_EVENTS.API_REQUEST_COMPLETED, {
        type: 'fetchRegionDetails',
        response,
      });
      return response;
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), API_TIMEOUT);

    const res = await fetch(API_ENDPOINTS.FETCH_REGION_DETAILS, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ geometry }),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!res.ok) {
      throw new Error(`API error: ${res.status} ${await readErrorMessage(res)}`);
    }

    const response = await res.json();
    eventBus.publish(MAP_EVENTS.API_REQUEST_COMPLETED, {
      type: 'fetchRegionDetails',
      response,
    });
    return response;
  } catch (error) {
    const errorData = {
      type: 'fetchRegionDetails',
      error: error.message || 'Unknown error',
    };
    eventBus.publish(MAP_EVENTS.API_REQUEST_FAILED, errorData);
    console.error('[RegionAPI] fetchRegionDetails failed:', error);
    throw error;
  }
}

/**
 * Fetch comments for a polygon/region.
 *
 * @param {number|string} polygonId
 * @returns {Promise<Array<Object>>}
 */
export async function fetchRegionComments(polygonId) {
  if (!API_ENDPOINTS.FEATURES) {
    return [];
  }

  try {
    if (USE_MOCK_DATA) {
      await delay(250);
      return generateMockCommentsList(polygonId);
    }

    const res = await fetch(API_ENDPOINTS.FEATURES, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
    });

    if (!res.ok) {
      throw new Error(`API error: ${res.status} ${await readErrorMessage(res)}`);
    }

    const response = await res.json();
    const rows = Array.isArray(response) ? response : response?.items || response?.results || [];
    return rows.filter((item) => String(item.layer_id ?? item.polygon_id ?? item.layerId) === String(polygonId));
  } catch (error) {
    console.error('[RegionAPI] fetchRegionComments failed:', error);
    return [];
  }
}

/**
 * Fetch saved drawn regions/geometries from the backend.
 *
 * @returns {Promise<Array<Object>>}
 */
export async function fetchSavedRegions() {
  if (!API_ENDPOINTS.FETCH_REGIONS) {
    return [];
  }

  eventBus.publish(MAP_EVENTS.API_REQUEST_STARTED, {
    type: 'fetchSavedRegions',
  });

  try {
    if (USE_MOCK_DATA) {
      await delay(250);
      return [];
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), API_TIMEOUT);

    const res = await fetch(API_ENDPOINTS.FETCH_REGIONS, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!res.ok) {
      throw new Error(`API error: ${res.status} ${await readErrorMessage(res)}`);
    }

    const response = await res.json();
    const rows = Array.isArray(response)
      ? response
      : response?.items || response?.results || response?.data || response?.features || [];

    eventBus.publish(MAP_EVENTS.API_REQUEST_COMPLETED, {
      type: 'fetchSavedRegions',
      response,
    });

    return Array.isArray(rows) ? rows : [];
  } catch (error) {
    eventBus.publish(MAP_EVENTS.API_REQUEST_FAILED, {
      type: 'fetchSavedRegions',
      error: error.message || 'Unknown error',
    });
    console.error('[RegionAPI] fetchSavedRegions failed:', error);
    return [];
  }
}

/**
 * Save a comment for a polygon/region.
 *
 * @param {Object} params
 * @param {number|string} params.polygonId
 * @param {string} params.name
 * @param {Object} params.geometry
 * @param {string} params.comment
 * @param {string} [params.annotationType]
 * @returns {Promise<Object>}
 */
export async function saveRegionComment({ polygonId, name, geometry, comment, annotationType = 'comment' }) {
  if (!API_ENDPOINTS.FEATURES) {
    throw new Error('Comments endpoint is not configured');
  }

  const payload = buildFeaturePayload({
    layerId: polygonId,
    name: name || 'Comment',
    geometry,
    properties: {
      comment,
      text: comment,
      annotationType,
    },
  });

  eventBus.publish(MAP_EVENTS.API_REQUEST_STARTED, {
    type: 'saveRegionComment',
    payload,
  });

  try {
    if (USE_MOCK_DATA) {
      await delay(350);
      const response = generateMockSaveCommentResponse(payload);
      eventBus.publish(MAP_EVENTS.API_REQUEST_COMPLETED, {
        type: 'saveRegionComment',
        response,
      });
      return response;
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), API_TIMEOUT);

    const res = await fetch(API_ENDPOINTS.FEATURES, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!res.ok) {
      throw new Error(`API error: ${res.status} ${await readErrorMessage(res)}`);
    }

    const response = await res.json();
    eventBus.publish(MAP_EVENTS.API_REQUEST_COMPLETED, {
      type: 'saveRegionComment',
      response,
    });
    return response;
  } catch (error) {
    eventBus.publish(MAP_EVENTS.API_REQUEST_FAILED, {
      type: 'saveRegionComment',
      error: error.message || 'Unknown error',
    });
    console.error('[RegionAPI] saveRegionComment failed:', error);
    throw error;
  }
}

/** Helper to simulate network delay */
function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
