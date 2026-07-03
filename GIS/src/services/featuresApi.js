import { API_ENDPOINTS, API_TIMEOUT, USE_MOCK_DATA } from "../config/apiConfig";

// Lightweight fetch-based API client for feature CRUD.
// Endpoints (backend):
// POST   /features
// GET    /features
// PUT    /features/{id}
// DELETE /features/{id}

const request = async (path, { method, body } = {}) => {
  const url = `${path}`;

  const controller = new AbortController();
  const timeoutId = window.setTimeout(() => controller.abort(), API_TIMEOUT);

  try {
    const res = await fetch(url, {
      method: method || "GET",
      headers: {
        "Content-Type": "application/json",
      },
      body: body !== undefined ? JSON.stringify(body) : undefined,
      signal: controller.signal,
    });

    if (!res.ok) {
      const text = await res.text().catch(() => "");
      throw new Error(`Features API error: ${res.status} ${res.statusText}${text ? ` - ${text}` : ""}`);
    }

    // Some endpoints might not return JSON.
    const contentType = res.headers.get("content-type") || "";
    if (contentType.includes("application/json")) return await res.json();
    return null;
  } finally {
    window.clearTimeout(timeoutId);
  }
};

const unwrapFeatureList = (response) => {
  if (Array.isArray(response)) return response;
  return response?.items || response?.results || response?.data || response?.features || [];
};

// POST /features
export const createFeature = async (feature) => {
  if (USE_MOCK_DATA) {
    return {
      mock: true,
      message: "Mock createFeature called",
      feature,
    };
  }

  return await request(API_ENDPOINTS.FEATURES, {
    method: "POST",
    body: feature,
  });
};

// GET /features
export const getAllFeatures = async () => {
  if (USE_MOCK_DATA) {
    return [];
  }

  const response = await request(API_ENDPOINTS.FEATURES, {
    method: "GET",
  });

  return unwrapFeatureList(response);
};

// GET /layers/{layer_id}/features
export const getLayerFeatures = async (layerId) => {
  if (!layerId) throw new Error("getLayerFeatures requires a layerId");

  if (USE_MOCK_DATA) {
    return {
      mock: true,
      message: "Mock getLayerFeatures called",
      layerId,
      features: [],
    };
  }

  const response = await request(API_ENDPOINTS.LAYER_FEATURES(layerId), {
    method: "GET",
  });

  return unwrapFeatureList(response);
};

// PUT /features/{id}
export const updateFeature = async (id, feature) => {
  if (!id) throw new Error("updateFeature requires an id");

  if (USE_MOCK_DATA) {
    return {
      mock: true,
      message: "Mock updateFeature called",
      id,
      feature,
    };
  }

  return await request(`${API_ENDPOINTS.FEATURES}/${encodeURIComponent(id)}`, {
    method: "PUT",
    body: feature,
  });
};

// DELETE /features/{id}
export const deleteFeature = async (id) => {
  if (!id) throw new Error("deleteFeature requires an id");

  if (USE_MOCK_DATA) {
    return {
      mock: true,
      message: "Mock deleteFeature called",
      id,
    };
  }

  return await request(`${API_ENDPOINTS.FEATURES}/${encodeURIComponent(id)}`, {
    method: "DELETE",
  });
};
