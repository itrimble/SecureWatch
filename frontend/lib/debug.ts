// lib/debug.ts
export const debugLog = (component: string, action: string, data?: any) => {
  // Simplified to always log in the browser for v0 preview,
  // as process.env.NODE_ENV might not be 'development'
  // and NEXT_PUBLIC_DEBUG_MODE might not be easily set by user in all contexts.
  if (typeof window !== "undefined") {
    console.log(`[DEBUG] [${component}] ${action}:`, data !== undefined ? data : "")
  }
}
