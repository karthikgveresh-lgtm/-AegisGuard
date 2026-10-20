/**
 * Blacklisted IPs, CIDR ranges, and known malicious indicators.
 * Used by Stage 1 Pre-filters and scoring engine.
 */
const BLACKLISTED_IPS = new Set([
  '198.51.100.99',   // Known bulletproof proxy
  '203.0.113.66',    // Tor Exit Node simulator
  '192.0.2.13',      // Compromised residential proxy
  '185.220.101.5',   // Simulated darknet exit
  '45.154.255.89',   // Known credential-stuffing botnet IP
  '198.51.103.99'    // Malicious cluster
]);

const BLACKLISTED_CIDR_PREFIXES = [
  '45.154.255.',     // Botnet cluster CIDR
  '185.220.101.',    // Anonymizer network
  '203.0.113.'       // Test attack range
];

function isIpBlacklisted(ip) {
  if (!ip) return false;
  if (BLACKLISTED_IPS.has(ip)) return true;
  for (const prefix of BLACKLISTED_CIDR_PREFIXES) {
    if (ip.startsWith(prefix)) return true;
  }
  return false;
}

module.exports = {
  BLACKLISTED_IPS,
  BLACKLISTED_CIDR_PREFIXES,
  isIpBlacklisted
};
