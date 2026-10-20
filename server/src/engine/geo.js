const { WEIGHTS, PREFILTERS } = require('../config/weights');

/**
 * Calculates Haversine distance between two sets of coordinates in kilometers.
 */
function calculateHaversineDistance(lat1, lon1, lat2, lon2) {
  if (lat1 === lat2 && lon1 === lon2) return 0;

  const R = 6371; // Earth's mean radius in km
  const dLat = (lat2 - lat1) * (Math.PI / 180);
  const dLon = (lon2 - lon1) * (Math.PI / 180);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * (Math.PI / 180)) *
      Math.cos(lat2 * (Math.PI / 180)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c);
}

/**
 * Evaluates geographical consistency and impossible travel.
 */
function evaluateGeoConsistency(current, previous) {
  if (!previous || previous.lat === undefined || previous.lng === undefined) {
    return { signals: [], isSevereJump: false };
  }

  const distanceKm = calculateHaversineDistance(
    previous.lat,
    previous.lng,
    current.lat,
    current.lng
  );

  const prevTime = new Date(previous.timestamp || previous.created_at).getTime();
  const currTime = new Date(current.timestamp || current.created_at || Date.now()).getTime();
  const timeDeltaHours = Math.max(0.001, (currTime - prevTime) / (1000 * 60 * 60));
  const timeDeltaMinutes = Math.max(1, Math.round(timeDeltaHours * 60));

  const impliedSpeedKmh = Math.round(distanceKm / timeDeltaHours);

  const signals = [];
  let isSevereJump = false;

  // Format strings with en-US grouping, proper pluralization, and capped speed
  const distanceFormatted = `${distanceKm.toLocaleString('en-US')} km`;
  const timeFormatted = timeDeltaMinutes === 1 
    ? '1 minute' 
    : `${timeDeltaMinutes.toLocaleString('en-US')} minutes`;
  const speedFormatted = impliedSpeedKmh > 10000 
    ? '>10,000 km/h' 
    : `${impliedSpeedKmh.toLocaleString('en-US')} km/h`;

  // Severe geo jump rule (>7500 km in < 1h)
  if (distanceKm >= 7500 && timeDeltaHours <= PREFILTERS.SEVERE_GEO_JUMP_HOURS) {
    isSevereJump = true;
    signals.push({
      factor: 'severe_impossible_travel',
      weight: 50,
      detail: `Severe displacement: ${distanceFormatted} in ${timeFormatted} (${speedFormatted})`,
      raw: { distanceKm, timeDeltaMinutes, impliedSpeedKmh }
    });
    return { signals, isSevereJump };
  }

  // Impossible travel (>900 km/h)
  if (distanceKm > 100 && impliedSpeedKmh > WEIGHTS.IMPOSSIBLE_TRAVEL_SPEED_KMH) {
    signals.push({
      factor: 'impossible_travel',
      weight: WEIGHTS.IMPOSSIBLE_TRAVEL_WEIGHT, // 40
      detail: `Transaction initiated ${distanceFormatted} away within ${timeFormatted} (implied ${speedFormatted})`,
      raw: { distanceKm, timeDeltaMinutes, impliedSpeedKmh }
    });
  } else if (distanceKm > 300 && impliedSpeedKmh > 500) {
    signals.push({
      factor: 'rapid_displacement',
      weight: WEIGHTS.HIGH_SPEED_TRAVEL_WEIGHT, // 25
      detail: `Unusually rapid displacement: ${distanceFormatted} within ${timeFormatted} (${speedFormatted})`,
      raw: { distanceKm, timeDeltaMinutes, impliedSpeedKmh }
    });
  }

  return { signals, isSevereJump };
}

module.exports = {
  calculateHaversineDistance,
  evaluateGeoConsistency
};
