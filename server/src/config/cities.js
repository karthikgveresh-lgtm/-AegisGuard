/**
 * Deterministic internal Geo/IP Mock Table
 * ~16 Major World Cities with accurate lat/lng coordinates and IP range prefix mappings.
 */
const CITIES = [
  { id: 'nyc', name: 'New York', country: 'US', lat: 40.7128, lng: -74.0060, ipPrefix: '198.51.100' },
  { id: 'sfo', name: 'San Francisco', country: 'US', lat: 37.7749, lng: -122.4194, ipPrefix: '198.51.101' },
  { id: 'lon', name: 'London', country: 'GB', lat: 51.5074, lng: -0.1278, ipPrefix: '198.51.102' },
  { id: 'ber', name: 'Berlin', country: 'DE', lat: 52.5200, lng: 13.4050, ipPrefix: '198.51.103' },
  { id: 'par', name: 'Paris', country: 'FR', lat: 48.8566, lng: 2.3522, ipPrefix: '198.51.104' },
  { id: 'tyo', name: 'Tokyo', country: 'JP', lat: 35.6762, lng: 139.6503, ipPrefix: '198.51.105' },
  { id: 'sin', name: 'Singapore', country: 'SG', lat: 1.3521, lng: 103.8198, ipPrefix: '198.51.106' },
  { id: 'syd', name: 'Sydney', country: 'AU', lat: -33.8688, lng: 151.2093, ipPrefix: '198.51.107' },
  { id: 'tor', name: 'Toronto', country: 'CA', lat: 43.6532, lng: -79.3832, ipPrefix: '198.51.108' },
  { id: 'sao', name: 'Sao Paulo', country: 'BR', lat: -23.5505, lng: -46.6333, ipPrefix: '198.51.109' },
  { id: 'mum', name: 'Mumbai', country: 'IN', lat: 19.0760, lng: 72.8777, ipPrefix: '198.51.110' },
  { id: 'dxb', name: 'Dubai', country: 'AE', lat: 25.2048, lng: 55.2708, ipPrefix: '198.51.111' },
  { id: 'ams', name: 'Amsterdam', country: 'NL', lat: 52.3676, lng: 4.9041, ipPrefix: '198.51.112' },
  { id: 'jnb', name: 'Johannesburg', country: 'ZA', lat: -26.2041, lng: 28.0473, ipPrefix: '198.51.113' },
  { id: 'mos', name: 'Moscow', country: 'RU', lat: 55.7558, lng: 37.6173, ipPrefix: '198.51.114' },
  { id: 'mia', name: 'Miami', country: 'US', lat: 25.7617, lng: -80.1918, ipPrefix: '198.51.116' },
];

function resolveIpToLocation(ip) {
  if (!ip) {
    return CITIES[0]; // Default New York
  }

  for (const city of CITIES) {
    if (ip.startsWith(city.ipPrefix)) {
      return city;
    }
  }

  const found = CITIES.find(c => c.id.toLowerCase() === ip.toLowerCase() || c.name.toLowerCase() === ip.toLowerCase());
  if (found) return found;

  let hash = 0;
  for (let i = 0; i < ip.length; i++) {
    hash = (hash << 5) - hash + ip.charCodeAt(i);
    hash |= 0;
  }
  const idx = Math.abs(hash) % CITIES.length;
  return CITIES[idx];
}

module.exports = {
  CITIES,
  resolveIpToLocation
};
