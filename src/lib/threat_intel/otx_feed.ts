// src/lib/threat_intel/otx_feed.ts

export interface Indicator {
  value: string;
  type: 'ip' | 'domain' | 'hash' | 'url' | 'email'; // Added url and email as common types
  source: 'OTX';
  first_seen?: string; // Optional: When this indicator was first seen by OTX
  last_seen?: string;  // Optional: When this indicator was last seen by OTX
  raw_data?: any;   // To store the original indicator object from OTX
}

const OTX_API_BASE_URL = 'https://otx.alienvault.com/api/v1'; // Common base URL, needs verification
const CACHE_DURATION_MS = 60 * 60 * 1000; // 1 hour

let otxCache: Indicator[] = [];
let lastUpdated: Date | null = null;
let isFetching = false; // Simple flag to prevent concurrent fetches

/**
 * Fetches indicators from AlienVault OTX.
 * This is a placeholder and needs actual API endpoint and data parsing logic.
 * It currently simulates fetching a few indicators.
 */
async function fetchOtxIndicatorsFromApi(apiKey: string): Promise<Indicator[]> {
  console.log('Attempting to fetch new indicators from OTX...');
  // TODO: Replace with actual API call
  // Example: const response = await fetch(`${OTX_API_BASE_URL}/pulses/subscribed?limit=10`, {
  // headers: { 'X-OTX-API-KEY': apiKey }
  // });
  // if (!response.ok) {
  //   throw new Error(`OTX API request failed: ${response.status} ${response.statusText}`);
  // }
  // const data = await response.json();
  // const indicators = parseOtxResponse(data); // Implement this parsing function

  // For now, returning mock data
  await new Promise(resolve => setTimeout(resolve, 1000)); // Simulate network delay

  // MOCK INDICATORS (replace with actual API parsing logic)
  const mockApiData = [
    { indicator: '1.2.3.4', type: 'IPv4', created: new Date().toISOString() },
    { indicator: 'evil.com', type: 'domain', created: new Date().toISOString() },
    { indicator: 'badhash123', type: 'FileHash-MD5', created: new Date().toISOString() },
    { indicator: 'https://phishing.example.com/login', type: 'URL', created: new Date().toISOString() },
  ];

  const indicators: Indicator[] = mockApiData.map(item => {
    let type: Indicator['type'] = 'ip'; // default
    if (item.type.toLowerCase().includes('ipv4') || item.type.toLowerCase().includes('ipv6')) {
      type = 'ip';
    } else if (item.type.toLowerCase().includes('domain') || item.type.toLowerCase().includes('hostname')) {
      type = 'domain';
    } else if (item.type.toLowerCase().includes('filehash') || item.type.toLowerCase().includes('hash')) {
      type = 'hash';
    } else if (item.type.toLowerCase() === 'url') {
      type = 'url';
    }
    // Add more type mappings as needed based on OTX API response
    return {
      value: item.indicator,
      type: type,
      source: 'OTX',
      first_seen: item.created, // Assuming 'created' field exists
      last_seen: item.created,  // Assuming 'created' field exists, or use a different field
      raw_data: item,
    };
  });
  
  console.log(`Fetched ${indicators.length} mock indicators from OTX.`);
  return indicators;
}

/**
 * Parses the OTX API response into an array of Indicator objects.
 * This function needs to be implemented based on the actual OTX API response structure.
 * @param data The raw data from the OTX API.
 * @returns An array of Indicator objects.
 */
// function parseOtxResponse(data: any): Indicator[] {
//   const indicators: Indicator[] = [];
//   // Example: if data is an array of pulse objects, iterate through them
//   // For each pulse, iterate through its indicators
//   // data.results?.forEach(pulse => {
//   //   pulse.indicators?.forEach(otxIndicator => {
//   //     let type: Indicator['type'] | null = null;
//   //     // Map OTX indicator types to our internal types
//   //     if (otxIndicator.type === 'IPv4' || otxIndicator.type === 'IPv6') type = 'ip';
//   //     else if (otxIndicator.type === 'domain' || otxIndicator.type === 'hostname') type = 'domain';
//   //     else if (otxIndicator.type.startsWith('FileHash')) type = 'hash';
//   //     else if (otxIndicator.type === 'URL') type = 'url';
//   //
//   //     if (type) {
//   //       indicators.push({
//   //         value: otxIndicator.indicator,
//   //         type: type,
//   //         source: 'OTX',
//   //         first_seen: otxIndicator.created, // Adjust field names as necessary
//   //         last_seen: otxIndicator.modified, // Adjust field names as necessary
//   //         raw_data: otxIndicator,
//   //       });
//   //     }
//   //   });
//   // });
//   return indicators;
// }


export async function getOtxIndicators(): Promise<Indicator[]> {
  const now = new Date();
  const apiKey = process.env.OTX_API_KEY;

  if (!apiKey) {
    console.warn(
      'OTX_API_KEY is not set in environment variables. ' +
      'OTX threat intelligence feed will be unavailable. ' +
      'Using cached/mock data if available.'
    );
    // If no API key, and cache is empty or stale, we can't fetch.
    // Return empty or stale cache to avoid blocking indefinitely if we don't have mock data.
    if (!lastUpdated || (now.getTime() - lastUpdated.getTime() > CACHE_DURATION_MS)) {
       // If we want to be strict and not return stale data without API key:
       // return []; 
       // Or, to allow using potentially stale data if API key is missing:
       console.log("OTX_API_KEY missing, returning potentially stale or empty cache.");
    }
    return [...otxCache]; // Return a copy
  }
  
  if (isFetching) {
    console.log('OTX fetch already in progress. Returning current cache (might be stale).');
    // Optional: could implement a queue or wait mechanism here
    return [...otxCache];
  }

  if (lastUpdated && (now.getTime() - lastUpdated.getTime() < CACHE_DURATION_MS)) {
    console.log('Returning fresh OTX indicators from cache.');
    return [...otxCache]; // Return a copy
  }

  isFetching = true;
  try {
    console.log('OTX Cache is stale or empty, fetching new indicators...');
    const newIndicators = await fetchOtxIndicatorsFromApi(apiKey);
    otxCache = newIndicators;
    lastUpdated = now;
    console.log(`OTX cache updated with ${otxCache.length} indicators.`);
    return [...otxCache]; // Return a copy
  } catch (error: any) {
    console.error('Error fetching OTX indicators:', error.message);
    // Decide on error handling: return stale cache or throw
    // For now, return stale cache if available, otherwise empty
    if (otxCache.length > 0) {
      console.warn('Failed to update OTX indicators, returning stale data from cache.');
      return [...otxCache];
    }
    return []; // Or rethrow error depending on desired behavior
  } finally {
    isFetching = false;
  }
}

// Optional: Function to manually trigger a refresh if needed by an admin interface
export async function refreshOtxCache(): Promise<void> {
    const apiKey = process.env.OTX_API_KEY;
    if (!apiKey) {
        console.warn("Cannot refresh OTX cache: OTX_API_KEY is not set.");
        return;
    }
    if (isFetching) {
        console.log("Refresh already in progress.");
        return;
    }
    
    isFetching = true;
    try {
        console.log('Manual OTX Cache refresh initiated...');
        const newIndicators = await fetchOtxIndicatorsFromApi(apiKey);
        otxCache = newIndicators;
        lastUpdated = new Date();
        console.log(`OTX cache manually refreshed with ${otxCache.length} indicators.`);
    } catch (error: any) {
        console.error('Error during manual OTX cache refresh:', error.message);
    } finally {
        isFetching = false;
    }
}

// Example of how another module might use this:
// import { getOtxIndicators } from '@/lib/threat_intel/otx_feed';
// async function checkIpAgainstOtx(ip: string) {
//   const indicators = await getOtxIndicators();
//   const match = indicators.find(ind => ind.type === 'ip' && ind.value === ip);
//   if (match) {
//     console.log(`IP ${ip} found in OTX feed:`, match);
//     return true;
//   }
//   return false;
// }
