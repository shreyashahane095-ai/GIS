/**
 * Mock Data for Region API Responses
 * 
 * Used while the backend is not yet implemented.
 * Remove or replace when the real backend is ready.
 */

/**
 * Generate mocked region details for a given geometry.
 * @param {Object} geometry - GeoJSON geometry object
 * @returns {Object} Mocked region details
 */
export function generateMockRegionDetails(geometry) {
  return {
    regionId: `region-${Date.now()}`,
    geometry,
    summary: {
      totalArea: '12.5 km²',
      population: '45,230',
      elevation: '320m avg',
    },
    hospitals: [
      { name: 'City General Hospital', type: 'Government', beds: 450, distance: '1.2 km' },
      { name: 'St. Mary Medical Center', type: 'Private', beds: 200, distance: '2.8 km' },
      { name: 'Regional Health Clinic', type: 'Government', beds: 80, distance: '3.5 km' },
    ],
    schools: [
      { name: 'Central Public School', type: 'Public', students: 1200 },
      { name: 'International Academy', type: 'Private', students: 800 },
      { name: 'Government High School', type: 'Government', students: 1500 },
    ],
    colleges: [
      { name: 'State Engineering College', type: 'Engineering', students: 3000 },
      { name: 'Arts & Science College', type: 'Arts', students: 2200 },
    ],
    universities: [
      { name: 'National University', type: 'Public', students: 15000 },
    ],
    governmentBuildings: [
      { name: 'District Collector Office', type: 'Administrative' },
      { name: 'Municipal Corporation', type: 'Civic' },
      { name: 'Revenue Department', type: 'Revenue' },
    ],
    emergencyServices: [
      { name: 'Central Police Station', type: 'Police', contact: '100' },
      { name: 'Fire Station #3', type: 'Fire', contact: '101' },
      { name: 'Ambulance Service', type: 'Medical', contact: '108' },
    ],
    publicParks: [
      { name: 'Riverside Garden', area: '2.5 hectares' },
      { name: 'Central Park', area: '5.0 hectares' },
    ],
    transport: {
      railwayStations: [
        { name: 'Central Railway Station', lines: 4 },
      ],
      metroStations: [
        { name: 'Metro Station A', line: 'Blue Line' },
        { name: 'Metro Station B', line: 'Red Line' },
      ],
      busStops: [
        { name: 'Bus Stop 1', routes: 8 },
        { name: 'Bus Stop 2', routes: 5 },
        { name: 'Bus Stop 3', routes: 12 },
      ],
    },
    roads: {
      highways: 2,
      mainRoads: 8,
      streets: 45,
    },
    weatherAlerts: [
      { type: 'Heat Advisory', severity: 'Moderate', validUntil: '2025-08-15T18:00:00Z' },
    ],
    trafficAlerts: [
      { type: 'Congestion', location: 'Main Road Junction', severity: 'High' },
      { type: 'Road Work', location: 'Highway 4 Exit', severity: 'Low' },
    ],
    publicNews: [
      { title: 'New park renovation project approved', date: '2025-07-20' },
      { title: 'Road widening project starting next month', date: '2025-07-18' },
    ],
    disasterAlerts: [],
    demographics: {
      populationDensity: '3,618 per km²',
      avgAge: 32,
      literacy: '89%',
    },
  };
}

/**
 * Generate mocked response for sending a region.
 * @param {Object} payload - The region payload
 * @returns {Object} Mocked success response
 */
export function generateMockSendRegionResponse(payload) {
  return {
    success: true,
    regionId: `region-${Date.now()}`,
    message: 'Region saved successfully',
    timestamp: new Date().toISOString(),
    layer_id: payload.layer_id,
    layerId: payload.layer_id,
    layerName: payload.name,
  };
}

/**
 * Generate mocked comment save response.
 * @param {Object} payload - The comment payload
 * @returns {Object} Mocked success response
 */
export function generateMockSaveCommentResponse(payload) {
  return {
    success: true,
    id: Date.now(),
    message: 'Comment saved successfully',
    timestamp: new Date().toISOString(),
    polygon_id: payload.layer_id,
    text: payload.properties?.comment || '',
  };
}

/**
 * Generate mocked comments list for a polygon.
 * @param {number|string} polygonId
 * @returns {Array<Object>}
 */
export function generateMockCommentsList(polygonId) {
  return [
    {
      id: `${polygonId}-1`,
      polygon_id: polygonId,
      text: 'Mock comment for selected region',
      created_at: new Date().toISOString(),
    },
  ];
}
