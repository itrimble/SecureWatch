// src/lib/brave_search.ts

/**
 * Brave Search API Interaction Module
 * 
 * To use this module, you need a Brave Search API key. 
 * 1. Obtain a key from Brave (e.g., https://brave.com/search/api/).
 * 2. Set it as an environment variable: BRAVE_API_KEY="your_api_key_here"
 */

export interface BraveSearchResultItem {
  title: string;
  url: string;
  description: string;
  page_age?: string; // Example of an optional field from Brave API
  meta_url?: {
    scheme: string;
    netloc: string;
    path: string;
    favicon: string;
  }; // Example of a nested object
  // Add other fields as needed based on the actual API response
}

export interface BraveWebSearchResponse {
  results: BraveSearchResultItem[];
}

export interface BraveSearchResponse {
  web: BraveWebSearchResponse;
  // Other result types like 'news', 'videos' can be added here if needed
}

const BRAVE_API_BASE_URL = 'https://api.search.brave.com/res/v1/web/search';

// --- Mocked Fetch Implementation ---
let MOCK_API_ERROR_MODE = false; // Set to true to simulate API errors for testing

/**
 * Toggles the mock API error mode for testing.
 * @param enabled If true, the mock API will simulate errors.
 */
export function __setMockApiErrorMode(enabled: boolean): void {
  MOCK_API_ERROR_MODE = enabled;
}

async function mockFetch(url: string, options: RequestInit): Promise<Response> {
  console.log(`[Mock Fetch] URL: ${url}`);
  console.log(`[Mock Fetch] Options:`, options);

  const apiKey = options.headers ? (options.headers as Record<string, string>)['X-Subscription-Token'] : undefined;

  return new Promise((resolve, reject) => {
    setTimeout(() => {
      if (MOCK_API_ERROR_MODE) {
        if (!apiKey || apiKey === 'invalid_key') {
          resolve({
            ok: false,
            status: 401,
            statusText: 'Unauthorized',
            json: async () => ({ message: 'Invalid API Key' }),
            text: async () => JSON.stringify({ message: 'Invalid API Key' }),
          } as Response);
        } else {
          resolve({
            ok: false,
            status: 500,
            statusText: 'Internal Server Error',
            json: async () => ({ message: 'Mocked Server Error' }),
            text: async () => JSON.stringify({ message: 'Mocked Server Error' }),
          } as Response);
        }
        return;
      }
      
      if (!apiKey) {
         resolve({
            ok: false,
            status: 401,
            statusText: 'Unauthorized',
            json: async () => ({ message: 'API Key Missing' }),
            text: async () => JSON.stringify({ message: 'API Key Missing' }),
          } as Response);
          return;
      }


      // Simulate a successful response
      const mockResponseData: BraveSearchResponse = {
        web: {
          results: [
            {
              title: 'Brave Search API Documentation',
              url: 'https://brave.com/search/api/',
              description: 'Documentation for the Brave Search API, allowing developers to integrate Brave Search into their applications.',
              page_age: "2023-01-15T00:00:00Z",
              meta_url: {
                scheme: "https",
                netloc: "brave.com",
                path: "/search/api/",
                favicon: "https://brave.com/static-assets/images/brave-logo-sans-text.svg"
              }
            },
            {
              title: 'What is Brave Search?',
              url: 'https://brave.com/search/',
              description: 'Brave Search is a private, independent search engine by Brave Software.',
            },
            {
              title: 'Rust Programming Language',
              url: 'https://www.rust-lang.org/',
              description: 'A language empowering everyone to build reliable and efficient software.',
              meta_url: {
                scheme: "https",
                netloc: "www.rust-lang.org",
                path: "/",
                favicon: "https://www.rust-lang.org/static/images/favicon-32x32.png"
              }
            },
          ],
        },
      };
      resolve({
        ok: true,
        status: 200,
        statusText: 'OK',
        json: async () => mockResponseData,
        text: async () => JSON.stringify(mockResponseData),
      } as Response);
    }, 500); // Simulate network delay
  });
}
// --- End of Mocked Fetch Implementation ---

export async function searchBrave(query: string): Promise<BraveSearchResultItem[]> {
  const apiKey = process.env.BRAVE_API_KEY;

  if (!apiKey) {
    console.warn(
      'BRAVE_API_KEY is not set in environment variables. ' +
      'Brave Search will be unavailable.'
    );
    // Option 1: Return empty array
    return [];
    // Option 2: Throw an error
    // throw new Error('Brave API key is missing.');
  }

  const searchUrl = `${BRAVE_API_BASE_URL}?q=${encodeURIComponent(query)}`;

  try {
    // Replace 'mockFetch' with 'fetch' for actual API calls when sandbox allows
    const response = await mockFetch(searchUrl, { 
      method: 'GET',
      headers: {
        'Accept': 'application/json',
        'X-Subscription-Token': apiKey,
      },
    });

    if (!response.ok) {
      let errorBody = 'Unknown error';
      try {
        const errJson = await response.json();
        errorBody = errJson.message || JSON.stringify(errJson);
      } catch (e) {
        // If parsing error body fails, use text content or statusText
        try {
            errorBody = await response.text();
        } catch (e2) {
             errorBody = response.statusText;
        }
      }
      console.error(`Brave Search API Error: ${response.status} ${response.statusText} - ${errorBody}`);
      // Depending on desired strictness, could return empty array or throw
      // For example, a 401 (Unauthorized) might indicate an invalid key
      if (response.status === 401) {
        console.error("Brave API Key might be invalid or expired.");
      }
      return []; // Return empty on error for now
    }

    const data: BraveSearchResponse = await response.json();

    if (data && data.web && data.web.results) {
      return data.web.results;
    } else {
      console.warn('Brave Search API response format unexpected:', data);
      return [];
    }
  } catch (error: any) {
    console.error('Error during Brave Search operation:', error.message);
    // Consider more specific error handling or re-throwing if necessary
    return [];
  }
}

// Example usage (can be removed or kept for testing)
// async function testSearch() {
//   console.log('Testing Brave Search...');
//   // Simulate API key being set
//   // process.env.BRAVE_API_KEY = 'your_test_key'; 
//   // process.env.BRAVE_API_KEY = 'invalid_key'; // Test invalid key
//   process.env.BRAVE_API_KEY = 'valid_mock_key';


//   let results = await searchBrave('what is rust programming language');
//   console.log('Search Results:', JSON.stringify(results, null, 2));

//   console.log("\n--- Testing with API key missing (simulated) ---");
//   const originalApiKey = process.env.BRAVE_API_KEY;
//   delete process.env.BRAVE_API_KEY;
//   results = await searchBrave('test query without key');
//   console.log('Search Results (no key):', results);
//   process.env.BRAVE_API_KEY = originalApiKey; // Restore key

//   console.log("\n--- Testing with Mock API Error Mode ---");
//   __setMockApiErrorMode(true);
//   // process.env.BRAVE_API_KEY = 'invalid_key'; // Test invalid key in error mode
//   // results = await searchBrave('test query with invalid key error mode');
//   // console.log('Search Results (invalid key error mode):', results);
  
//   process.env.BRAVE_API_KEY = 'valid_mock_key'; // Use a valid key for other errors
//   results = await searchBrave('test query with general error mode');
//   console.log('Search Results (general error mode):', results);
//   __setMockApiErrorMode(false); // Reset error mode
// }

// testSearch(); // Uncomment to run test when developing module
