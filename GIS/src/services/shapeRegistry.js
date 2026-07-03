const registeredShapes = [];

function getGeometry(geojson) {
  if (!geojson) return null;
  if (geojson.type === "Feature") return geojson.geometry || null;
  if (geojson.type === "FeatureCollection") {
    return geojson.features?.[0]?.geometry || null;
  }
  if (geojson.type && geojson.coordinates) return geojson;
  return null;
}

function pointInRing(point, ring) {
  const [lng, lat] = point;
  let inside = false;

  for (let i = 0, j = ring.length - 1; i < ring.length; j = i += 1) {
    const [lngI, latI] = ring[i];
    const [lngJ, latJ] = ring[j];
    const intersects =
      latI > lat !== latJ > lat &&
      lng < ((lngJ - lngI) * (lat - latI)) / (latJ - latI) + lngI;

    if (intersects) inside = !inside;
  }

  return inside;
}

function pointInPolygon(point, polygonCoordinates) {
  if (!polygonCoordinates?.length) return false;
  const [outerRing, ...holes] = polygonCoordinates;
  if (!pointInRing(point, outerRing)) return false;
  return !holes.some((hole) => pointInRing(point, hole));
}

function distanceToSegment(point, segmentStart, segmentEnd) {
  const x = point.x;
  const y = point.y;
  const x1 = segmentStart.x;
  const y1 = segmentStart.y;
  const x2 = segmentEnd.x;
  const y2 = segmentEnd.y;
  const dx = x2 - x1;
  const dy = y2 - y1;

  if (dx === 0 && dy === 0) return point.distanceTo(segmentStart);

  const t = Math.max(0, Math.min(1, ((x - x1) * dx + (y - y1) * dy) / (dx * dx + dy * dy)));
  return point.distanceTo({ x: x1 + t * dx, y: y1 + t * dy });
}

function lineContainsLatLng(map, latlng, coordinates, tolerance = 8) {
  if (!map || !coordinates?.length) return false;
  const point = map.latLngToLayerPoint(latlng);
  const points = coordinates.map(([lng, lat]) => map.latLngToLayerPoint([lat, lng]));

  for (let index = 1; index < points.length; index += 1) {
    if (distanceToSegment(point, points[index - 1], points[index]) <= tolerance) {
      return true;
    }
  }

  return false;
}

function pointContainsLatLng(map, latlng, coordinates, tolerance = 10) {
  if (!map || !coordinates) return false;
  const point = map.latLngToLayerPoint(latlng);
  const target = map.latLngToLayerPoint([coordinates[1], coordinates[0]]);
  return point.distanceTo(target) <= tolerance;
}

export function geometryContainsLatLng(map, latlng, geometry) {
  if (!latlng || !geometry) return false;
  const point = [latlng.lng, latlng.lat];

  if (geometry.type === "Polygon") {
    return pointInPolygon(point, geometry.coordinates);
  }

  if (geometry.type === "MultiPolygon") {
    return geometry.coordinates.some((polygon) => pointInPolygon(point, polygon));
  }

  if (geometry.type === "LineString") {
    return lineContainsLatLng(map, latlng, geometry.coordinates);
  }

  if (geometry.type === "MultiLineString") {
    return geometry.coordinates.some((line) => lineContainsLatLng(map, latlng, line));
  }

  if (geometry.type === "Point") {
    return pointContainsLatLng(map, latlng, geometry.coordinates);
  }

  if (geometry.type === "MultiPoint") {
    return geometry.coordinates.some((coordinates) => pointContainsLatLng(map, latlng, coordinates));
  }

  return false;
}

export function registerShape(shape) {
  const geometry = getGeometry(shape.geometry || shape.geojson);
  if (!geometry || !shape.layerId || !shape.backendId) return null;

  const normalizedShape = {
    ...shape,
    geometry,
    comments: Array.isArray(shape.comments) ? shape.comments : [],
  };

  const index = registeredShapes.findIndex((item) => item.layerId === normalizedShape.layerId);
  if (index >= 0) {
    registeredShapes[index] = { ...registeredShapes[index], ...normalizedShape };
  } else {
    registeredShapes.unshift(normalizedShape);
  }

  return normalizedShape;
}

export function unregisterShape(layerId) {
  const index = registeredShapes.findIndex((shape) => shape.layerId === layerId);
  if (index >= 0) registeredShapes.splice(index, 1);
}

export function findShapeAtLatLng(map, latlng) {
  return registeredShapes.find((shape) => geometryContainsLatLng(map, latlng, shape.geometry)) || null;
}

export function addShapeComment(layerId, comment) {
  const shape = registeredShapes.find((item) => item.layerId === layerId);
  if (!shape) return null;
  shape.comments = [comment, ...(shape.comments || [])];
  return shape;
}

export function getShapeComments(layerId) {
  const shape = registeredShapes.find((item) => item.layerId === layerId);
  return shape?.comments || [];
}

export function clearShapes() {
  registeredShapes.length = 0;
}