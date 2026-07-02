/**
 * GeoJSON Utilities
 * 
 * Converts Leaflet layers to RFC 7946 compliant GeoJSON.
 * Handles all geometry types: Point, LineString, Polygon,
 * MultiPoint, MultiLineString, MultiPolygon.
 * Rectangles are stored as Polygon.
 */

/**
 * Convert a Leaflet layer to a GeoJSON Feature.
 * @param {L.Layer} layer - Leaflet layer
 * @param {Object} [properties={}] - Additional feature properties
 * @returns {Object|null} GeoJSON Feature or null if conversion fails
 */
export function layerToGeoJSON(layer, properties = {}) {
  try {
    if (!layer) return null;

    // Use Leaflet's built-in toGeoJSON if available
    if (typeof layer.toGeoJSON === 'function') {
      const geojson = layer.toGeoJSON();
      // Merge additional properties
      if (geojson.properties) {
        geojson.properties = { ...geojson.properties, ...properties };
      }
      return geojson;
    }

    return null;
  } catch (error) {
    console.error('[GeoJSON] Failed to convert layer:', error);
    return null;
  }
}

/**
 * Convert an array of Leaflet layers to a GeoJSON FeatureCollection.
 * @param {L.Layer[]} layers - Array of Leaflet layers
 * @returns {Object} GeoJSON FeatureCollection
 */
export function layersToFeatureCollection(layers) {
  const features = layers
    .map((layer) => layerToGeoJSON(layer))
    .filter(Boolean);

  return {
    type: 'FeatureCollection',
    features,
  };
}

/**
 * Extract the geometry from a GeoJSON Feature.
 * @param {Object} feature - GeoJSON Feature or geometry
 * @returns {Object|null} GeoJSON geometry
 */
export function extractGeometry(feature) {
  if (!feature) return null;

  // If it's already a geometry (has type but no properties key)
  if (feature.type && feature.coordinates) {
    return feature;
  }

  // If it's a Feature, extract the geometry
  if (feature.type === 'Feature' && feature.geometry) {
    return feature.geometry;
  }

  return null;
}

/**
 * Validate a GeoJSON geometry object.
 * @param {Object} geometry - GeoJSON geometry
 * @returns {{ valid: boolean, errors: string[] }}
 */
export function validateGeometry(geometry) {
  const errors = [];

  if (!geometry) {
    return { valid: false, errors: ['Geometry is null or undefined'] };
  }

  if (!geometry.type) {
    errors.push('Missing geometry type');
  }

  const validTypes = [
    'Point', 'MultiPoint',
    'LineString', 'MultiLineString',
    'Polygon', 'MultiPolygon',
    'GeometryCollection',
  ];

  if (geometry.type && !validTypes.includes(geometry.type)) {
    errors.push(`Invalid geometry type: ${geometry.type}`);
  }

  if (geometry.type !== 'GeometryCollection' && !geometry.coordinates) {
    errors.push('Missing coordinates');
  }

  if (geometry.coordinates) {
    if (!validateCoordinates(geometry.type, geometry.coordinates)) {
      errors.push('Invalid coordinate structure');
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Validate coordinate structure for a given geometry type.
 * @param {string} type - Geometry type
 * @param {Array} coordinates - Coordinates array
 * @returns {boolean}
 */
function validateCoordinates(type, coordinates) {
  if (!Array.isArray(coordinates)) return false;

  switch (type) {
    case 'Point':
      return isPosition(coordinates);
    case 'MultiPoint':
    case 'LineString':
      return coordinates.every(isPosition);
    case 'MultiLineString':
    case 'Polygon':
      return coordinates.every((ring) =>
        Array.isArray(ring) && ring.every(isPosition)
      );
    case 'MultiPolygon':
      return coordinates.every((polygon) =>
        Array.isArray(polygon) &&
        polygon.every((ring) =>
          Array.isArray(ring) && ring.every(isPosition)
        )
      );
    default:
      return true;
  }
}

/**
 * Check if a value is a valid GeoJSON position [lng, lat] or [lng, lat, alt].
 * @param {Array} pos - Position array
 * @returns {boolean}
 */
function isPosition(pos) {
  if (!Array.isArray(pos) || pos.length < 2 || pos.length > 3) return false;
  return pos.every((v) => typeof v === 'number' && isFinite(v));
}

/**
 * Calculate the bounding box of a GeoJSON geometry.
 * @param {Object} geometry - GeoJSON geometry
 * @returns {number[]|null} [minLng, minLat, maxLng, maxLat] or null
 */
export function calculateBBox(geometry) {
  if (!geometry || !geometry.coordinates) return null;

  const coords = flattenCoordinates(geometry.coordinates);
  if (coords.length === 0) return null;

  let minLng = Infinity, minLat = Infinity;
  let maxLng = -Infinity, maxLat = -Infinity;

  for (const [lng, lat] of coords) {
    if (lng < minLng) minLng = lng;
    if (lat < minLat) minLat = lat;
    if (lng > maxLng) maxLng = lng;
    if (lat > maxLat) maxLat = lat;
  }

  return [minLng, minLat, maxLng, maxLat];
}

/**
 * Recursively flatten nested coordinate arrays into a flat list of positions.
 * @param {Array} coords - Nested coordinates
 * @returns {Array} Flat array of [lng, lat] positions
 */
function flattenCoordinates(coords) {
  if (!Array.isArray(coords)) return [];
  if (coords.length > 0 && typeof coords[0] === 'number') {
    return [coords];
  }
  return coords.flatMap(flattenCoordinates);
}
