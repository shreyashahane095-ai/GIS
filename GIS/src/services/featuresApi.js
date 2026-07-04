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

export const createFeature = async (feature) => {
  if (USE_MOCK_DATA) {
    const generatedLayerId = feature.layer_id ?? (100 + Math.floor(Math.random() * 900));
    const generatedCaseId = feature.case_id ?? (100 + Math.floor(Math.random() * 900));
    return {
      mock: true,
      message: "Mock createFeature called",
      id: 100 + Math.floor(Math.random() * 900),
      ...feature,
      layer_id: generatedLayerId,
      case_id: generatedCaseId,
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

// PATCH /features/{id}
export const patchFeature = async (id, patchData) => {
  if (!id) throw new Error("patchFeature requires an id");

  if (USE_MOCK_DATA) {
    return {
      mock: true,
      message: "Mock patchFeature called",
      id,
      patchData,
    };
  }

  return await request(`${API_ENDPOINTS.FEATURES}/${encodeURIComponent(id)}`, {
    method: "PATCH",
    body: patchData,
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

// === CASES API ===
export const createCase = async (caseData) => {
  if (USE_MOCK_DATA) {
    return { mock: true, id: 100 + Math.floor(Math.random() * 900), ...caseData };
  }
  return await request(API_ENDPOINTS.CASES, { method: "POST", body: caseData });
};

export const updateCase = async (id, caseData) => {
  if (!id) throw new Error("updateCase requires an id");
  if (USE_MOCK_DATA) {
    return { mock: true, id, ...caseData };
  }
  return await request(API_ENDPOINTS.CASE_DETAIL(id), { method: "PUT", body: caseData });
};

export const patchCase = async (id, patchData) => {
  if (!id) throw new Error("patchCase requires an id");
  if (USE_MOCK_DATA) {
    return { mock: true, id, ...patchData };
  }
  return await request(API_ENDPOINTS.CASE_DETAIL(id), { method: "PATCH", body: patchData });
};

export const getAllCases = async () => {
  if (USE_MOCK_DATA) {
    return [];
  }
  return await request(API_ENDPOINTS.CASES, { method: "GET" });
};

export const getCase = async (id) => {
  if (!id) throw new Error("getCase requires an id");
  if (USE_MOCK_DATA) {
    return { mock: true, id, title: "Mock Case" };
  }
  return await request(API_ENDPOINTS.CASE_DETAIL(id), { method: "GET" });
};

export const deleteCase = async (id) => {
  if (!id) throw new Error("deleteCase requires an id");
  if (USE_MOCK_DATA) {
    return { mock: true, id, message: "Mock deleteCase called" };
  }
  return await request(API_ENDPOINTS.CASE_DETAIL(id), { method: "DELETE" });
};

export const getCaseLayers = async (caseId) => {
  if (!caseId) throw new Error("getCaseLayers requires a caseId");
  if (USE_MOCK_DATA) {
    return [];
  }
  return await request(API_ENDPOINTS.CASE_LAYERS(caseId), { method: "GET" });
};

// === LAYERS API ===
export const createLayer = async (layerData) => {
  if (USE_MOCK_DATA) {
    return { mock: true, id: 100 + Math.floor(Math.random() * 900), ...layerData };
  }
  return await request(API_ENDPOINTS.LAYERS, { method: "POST", body: layerData });
};

export const updateLayer = async (id, layerData) => {
  if (!id) throw new Error("updateLayer requires an id");
  if (USE_MOCK_DATA) {
    return { mock: true, id, ...layerData };
  }
  return await request(API_ENDPOINTS.LAYER_DETAIL(id), { method: "PUT", body: layerData });
};

export const patchLayer = async (id, patchData) => {
  if (!id) throw new Error("patchLayer requires an id");
  if (USE_MOCK_DATA) {
    return { mock: true, id, ...patchData };
  }
  return await request(API_ENDPOINTS.LAYER_DETAIL(id), { method: "PATCH", body: patchData });
};

export const getAllLayers = async () => {
  if (USE_MOCK_DATA) {
    return [];
  }
  return await request(API_ENDPOINTS.LAYERS, { method: "GET" });
};

export const getLayer = async (id) => {
  if (!id) throw new Error("getLayer requires an id");
  if (USE_MOCK_DATA) {
    return { mock: true, id, name: "Mock Layer" };
  }
  return await request(API_ENDPOINTS.LAYER_DETAIL(id), { method: "GET" });
};

export const deleteLayer = async (id) => {
  if (!id) throw new Error("deleteLayer requires an id");
  if (USE_MOCK_DATA) {
    return { mock: true, id, message: "Mock deleteLayer called" };
  }
  return await request(API_ENDPOINTS.LAYER_DETAIL(id), { method: "DELETE" });
};

// === COMMENTS API ===
export const createComment = async (commentData) => {
  if (USE_MOCK_DATA) {
    return { mock: true, id: 100 + Math.floor(Math.random() * 900), ...commentData };
  }
  return await request(API_ENDPOINTS.COMMENTS, { method: "POST", body: commentData });
};
