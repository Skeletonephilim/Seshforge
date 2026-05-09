/**
 * IP Address Generator - Realistic Public and Private IP Ranges
 * 
 * Generates IP addresses that look like real internet IPs, not just 10.10.10.x
 * Covers various realistic IP ranges including private and public subnets
 */

/**
 * Common realistic IP ranges for pentesting scenarios
 */
const IP_RANGES = {
  // Private ranges (RFC 1918)
  PRIVATE_10: { prefix: '10', octets: [172, 16, 10, 20, 30, 40] }, // 10.172.16.x, 10.172.20.x
  PRIVATE_172: { prefix: '172', octets: [16, 17, 18, 19, 20, 21, 22, 23, 24, 25] }, // 172.16-25.x.x
  PRIVATE_192: { prefix: '192.168', octets: [1, 10, 100, 150, 200] }, // 192.168.x.x
  
  // Common public/lab ranges (realistically styled)
  LAB_RANGE_1: { prefix: '10.129', octets: [1, 10, 20, 50, 100, 200] }, // HTB-style: 10.129.x.x
  LAB_RANGE_2: { prefix: '10.10', octets: [11, 12, 13, 14, 15, 20, 50] }, // THM-style: 10.10.x.x
  PUBLIC_STYLE_1: { prefix: '192.168', octets: [50, 60, 70, 80, 90] }, // 192.168.x.x
  PUBLIC_STYLE_2: { prefix: '172.16', octets: [5, 10, 15, 20, 25] }, // 172.16.x.x
};

/**
 * Generate a realistic IP address
 * @param excludedIPs - List of IPs to avoid (prevent duplicates)
 * @returns A realistic IP address string
 */
export function generateRealisticIP(excludedIPs: string[] = []): string {
  const rangeKeys = Object.keys(IP_RANGES);
  let attempts = 0;
  let ip: string;

  do {
    // Pick random IP range
    const rangeKey = rangeKeys[Math.floor(Math.random() * rangeKeys.length)];
    const range = IP_RANGES[rangeKey as keyof typeof IP_RANGES];

    // Generate octets based on range type
    if (range.prefix.includes('.')) {
      // 3 octets already defined (e.g., 192.168)
      const [oct1, oct2] = range.prefix.split('.').map(Number);
      const oct3 = range.octets[Math.floor(Math.random() * range.octets.length)];
      const oct4 = Math.floor(Math.random() * 240) + 10; // 10-249
      ip = `${oct1}.${oct2}.${oct3}.${oct4}`;
    } else if (rangeKey === 'PRIVATE_10') {
      // 10.172.16.x style
      const oct1 = 10;
      const oct2 = 172;
      const oct3 = range.octets[Math.floor(Math.random() * range.octets.length)];
      const oct4 = Math.floor(Math.random() * 240) + 10;
      ip = `${oct1}.${oct2}.${oct3}.${oct4}`;
    } else if (rangeKey === 'PRIVATE_172') {
      // 172.16.x.x style
      const oct1 = 172;
      const oct2 = range.octets[Math.floor(Math.random() * range.octets.length)];
      const oct3 = Math.floor(Math.random() * 255);
      const oct4 = Math.floor(Math.random() * 240) + 10;
      ip = `${oct1}.${oct2}.${oct3}.${oct4}`;
    } else {
      // Default: prefix + random octets
      const prefixOct = parseInt(range.prefix);
      const oct2 = range.octets[Math.floor(Math.random() * range.octets.length)];
      const oct3 = Math.floor(Math.random() * 255);
      const oct4 = Math.floor(Math.random() * 240) + 10;
      ip = `${prefixOct}.${oct2}.${oct3}.${oct4}`;
    }

    attempts++;
  } while (excludedIPs.includes(ip) && attempts < 50);

  return ip;
}

/**
 * Generate a realistic domain controller IP (for AD scenarios)
 * Typically ends in .10, .1, or .100 to suggest infrastructure server
 */
export function generateDCIP(excludedIPs: string[] = []): string {
  const dcSuffixes = ['.10', '.1', '.100', '.50', '.25'];
  let attempts = 0;
  let ip: string;

  do {
    const suffix = dcSuffixes[Math.floor(Math.random() * dcSuffixes.length)];
    const range = Math.random() < 0.5 ? 'LAB_RANGE_1' : 'PRIVATE_10';
    const rangeData = IP_RANGES[range as keyof typeof IP_RANGES];

    if (range === 'LAB_RANGE_1') {
      // 10.129.x.10 style
      const oct3 = Math.floor(Math.random() * 255);
      ip = `10.129.${oct3}${suffix}`;
    } else {
      // 10.172.16.10 style
      const oct3 = rangeData.octets[Math.floor(Math.random() * rangeData.octets.length)];
      ip = `10.172.${oct3}${suffix}`;
    }

    attempts++;
  } while (excludedIPs.includes(ip) && attempts < 50);

  return ip;
}

/**
 * Generate a web server IP (for web scenarios)
 */
export function generateWebServerIP(excludedIPs: string[] = []): string {
  const webRanges = ['LAB_RANGE_1', 'LAB_RANGE_2', 'PUBLIC_STYLE_1'];
  const rangeKey = webRanges[Math.floor(Math.random() * webRanges.length)];
  
  return generateRealisticIP(excludedIPs);
}

/**
 * Generate multiple IPs for a scenario (ensures no duplicates)
 */
export function generateMultipleIPs(count: number): string[] {
  const ips: string[] = [];
  for (let i = 0; i < count; i++) {
    ips.push(generateRealisticIP(ips));
  }
  return ips;
}

/**
 * Check if an IP looks realistic (for validation)
 */
export function isRealisticIP(ip: string): boolean {
  const octets = ip.split('.').map(Number);
  if (octets.length !== 4) return false;
  
  // Check each octet is valid
  if (octets.some(o => isNaN(o) || o < 0 || o > 255)) return false;
  
  // Avoid obviously fake IPs
  if (octets.every(o => o === 0)) return false; // 0.0.0.0
  if (octets[0] === 127) return false; // localhost
  if (octets.slice(0, 3).every(o => o === 10) && octets[3] < 10) return false; // 10.10.10.[1-9]
  
  return true;
}
