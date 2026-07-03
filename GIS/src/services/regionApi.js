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

function resolveIntegerId(...candidates) {
  for (const candidate of candidates) {
    if (candidate === null || candidate === undefined || candidate === '') continue;

    if (typeof candidate === 'number' && Number.isFinite(candidate)) {
      return Math.trunc(candidate);
    }

    if (typeof candidate === 'string') {
      const parsed = Number(candidate);
      if (Number.isFinite(parsed)) {
        return Math.trunc(parsed);
      }

      const suffixMatch = candidate.match(/(?:^|[-_])(\d+)$/);
      if (suffixMatch) {
        return Number(suffixMatch[1]);
      }
    }
  }

  return null;
}

function resolveCreatedBy(createdBy) {
  return resolveIntegerId(
    createdBy,
    import.meta.env.VITE_CREATED_BY_USER_ID,
    import.meta.env.VITE_USER_ID,
    import.meta.env.VITE_DEFAULT_USER_ID,
    1
  );
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
  parentLayerId = null,
  createdBy = null,
}) {
  const resolvedLayerId = resolveIntegerId(
    parentLayerId,
    layerId,
    properties?.parentLayerId,
    properties?.parent_layer_id,
    properties?.layer_id,
    properties?.layerId
  );
  const resolvedParentLayerId = resolveIntegerId(
    parentLayerId,
    properties?.parentLayerId,
    properties?.parent_layer_id
  );
  const resolvedCreatedBy = resolveCreatedBy(createdBy);

  if (resolvedLayerId === null) {
    throw new Error(
      `Unable to resolve a numeric layer_id from "${layerId}". Pass a backend layer id instead of a temporary client id.`
    );
  }

  if (resolvedCreatedBy === null) {
    throw new Error('Unable to resolve a numeric created_by id.');
  }

  return {
    layer_id: resolvedLayerId,
    name,
    layer_name: name,
    geometry,
    properties: {
      ...DEFAULT_FEATURE_PROPERTIES,
      ...properties,
      name,
      layerName: name,
    },
    ...(resolvedParentLayerId !== null ? { parent_layer_id: resolvedParentLayerId } : {}),
    created_by: resolvedCreatedBy,
  };
}

/**
 * Send a selected region geometry to the backend.
 *
 * @param {string} layerId
 * @param {string} layerName
 * @param {Object} geometry GeoJSON geometry
 * @returns {Promise<Object>}
 */
export async function sendRegion(
  layerId,
  layerName,
  geometry,
  properties = {},
  parentLayerId = null,
  createdBy = null
) {
  const payload = buildFeaturePayload({
    layerId,
    name: layerName,
    geometry,
    properties,
    parentLayerId,
    createdBy,
  });

  eventBus.publish(MAP_EVENTS.API_REQUEST_STARTED, {
    type: 'sendRegion',
    payload,
  });

  try {
    if (USE_MOCK_DATA) {
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
      type: 'sendRegion',
      response,
    });
    return response;
  } catch (error) {
    eventBus.publish(MAP_EVENTS.API_REQUEST_FAILED, {
      type: 'sendRegion',
      error: error.message || 'Unknown error',
    });
    console.error('[RegionAPI] sendRegion failed:', error);
    throw error;
  }
}

/**
 * Fetch detailed information about a selected region.
 *
 * @param {Object} geometry GeoJSON geometry
 * @returns {Promise<Object|null>}
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
    eventBus.publish(MAP_EVENTS.API_REQUEST_FAILED, {
      type: 'fetchRegionDetails',
      error: error.message || 'Unknown error',
    });
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
    const rows = Array.isArray(response)
      ? response
      : response?.items || response?.results || [];

    return rows.filter(
      (item) => String(item.layer_id ?? item.polygon_id ?? item.layerId) === String(polygonId)
    );
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
  if (!API_ENDPOINTS.LAYERS) {
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

    const res = await fetch(API_ENDPOINTS.LAYERS, {
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
 * Save a layer group (used by Map.jsx when no saved layers exist).
 *
 * @param {string|number} groupId
 * @param {string} groupName
 * @param {Object} payload
 * @returns {Promise<Object>}
 */
export async function saveLayerGroup(groupId, groupName, payload = {}) {
  // If backend endpoints are not configured yet, return a mock success.
  if (!API_ENDPOINTS.LAYERS) {
    return {
      case_id: resolveIntegerId(payload.case_id, groupId, 1) ?? 1,
      name: groupName,
      layer_type: payload.layer_type || 'Operational',
      visible: payload.visible ?? true,
      ...payload,
      backendSynced: true,
      mock: true,
    };
  }

  eventBus.publish(MAP_EVENTS.API_REQUEST_STARTED, {
    type: 'saveLayerGroup',
    groupId,
    groupName,
  });

  try {
    if (USE_MOCK_DATA) {
      await delay(250);
      return {
        case_id: resolveIntegerId(payload.case_id, groupId, 1) ?? 1,
        name: groupName,
        layer_type: payload.layer_type || 'Operational',
        visible: payload.visible ?? true,
        ...payload,
        backendSynced: true,
        mock: true,
      };
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), API_TIMEOUT);

    const resolvedCaseId = resolveIntegerId(payload.case_id, groupId, payload.id, payload.layer_id, payload.layerId) ?? 1;
    const requestBody = {
      case_id: resolvedCaseId,
      name: groupName,
      layer_type: payload.layer_type || 'Operational',
      visible: payload.visible ?? true,
      ...payload,
    };

    const res = await fetch(API_ENDPOINTS.LAYERS, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(requestBody),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!res.ok) {
      throw new Error(`API error: ${res.status} ${await readErrorMessage(res)}`);
    }

    const response = await res.json();
    eventBus.publish(MAP_EVENTS.API_REQUEST_COMPLETED, {
      type: 'saveLayerGroup',
      response,
    });
    return response;
  } catch (error) {
    eventBus.publish(MAP_EVENTS.API_REQUEST_FAILED, {
      type: 'saveLayerGroup',
      error: error.message || 'Unknown error',
    });
    console.error('[RegionAPI] saveLayerGroup failed:', error);
    throw error;
  }
}

/**
 * Update an existing region feature in the backend.
 *
 * Backend is not fully implemented yet; when endpoint is missing we return mock success.
 */
export async function updateRegion(
  featureId,
  layerId,
  name,
  geometry,
  properties = {},
  parentLayerId = null
) {
  // If backend endpoints are not configured yet, return a mock success.
  if (!API_ENDPOINTS.FEATURES) {
    return {
      id: featureId,
      layer_id: layerId,
      polygon_id: featureId,
      name,
      geometry,
      properties,
      parentLayerId,
      message: 'Mock update succeeded',
      mock: true,
    };
  }

  eventBus.publish(MAP_EVENTS.API_REQUEST_STARTED, {
    type: 'updateRegion',
    featureId,
    layerId,
  });

  try {
    if (USE_MOCK_DATA) {
      await delay(300);
      return {
        id: featureId,
        layer_id: layerId,
        polygon_id: featureId,
        name,
        geometry,
        properties,
        parentLayerId,
        message: 'Mock update succeeded',
        mock: true,
      };
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), API_TIMEOUT);

    const endpoint = `${API_ENDPOINTS.FEATURES}/${encodeURIComponent(featureId)}`;
    const payload = buildFeaturePayload({
      layerId,
      name,
      geometry,
      properties: {
        ...properties,
        parentLayerId,
      },
    });

    const res = await fetch(endpoint, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...payload, id: featureId }),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!res.ok) {
      throw new Error(`API error: ${res.status} ${await readErrorMessage(res)}`);
    }

    const response = await res.json();
    eventBus.publish(MAP_EVENTS.API_REQUEST_COMPLETED, {
      type: 'updateRegion',
      response,
    });
    return response;
  } catch (error) {
    eventBus.publish(MAP_EVENTS.API_REQUEST_FAILED, {
      type: 'updateRegion',
      error: error.message || 'Unknown error',
    });
    console.error('[RegionAPI] updateRegion failed:', error);
    throw error;
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
export async function saveRegionComment({
  polygonId,
  name,
  geometry,
  comment,
  annotationType = 'comment',
}) {
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

/** Delete an existing region feature in the backend. */
export async function deleteRegion(featureId) {
  // If backend endpoints are not configured yet, return mock success.
  if (!API_ENDPOINTS.FEATURES) {
    return {
      id: featureId,
      message: 'Mock delete succeeded',
      mock: true,
    };
  }

  eventBus.publish(MAP_EVENTS.API_REQUEST_STARTED, {
    type: 'deleteRegion',
    featureId,
  });

  try {
    if (USE_MOCK_DATA) {
      await delay(250);
      return {
        id: featureId,
        message: 'Mock delete succeeded',
        mock: true,
      };
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), API_TIMEOUT);

    const endpoint = `${API_ENDPOINTS.FEATURES}/${encodeURIComponent(featureId)}`;
    const res = await fetch(endpoint, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: featureId }),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!res.ok) {
      throw new Error(`API error: ${res.status} ${await readErrorMessage(res)}`);
    }

    const response = await res.json();
    eventBus.publish(MAP_EVENTS.API_REQUEST_COMPLETED, {
      type: 'deleteRegion',
      response,
    });
    return response;
  } catch (error) {
    eventBus.publish(MAP_EVENTS.API_REQUEST_FAILED, {
      type: 'deleteRegion',
      error: error.message || 'Unknown error',
    });
    console.error('[RegionAPI] deleteRegion failed:', error);
    throw error;
  }
}

/** Helper to simulate network delay */
function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}


