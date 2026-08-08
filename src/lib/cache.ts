const CACHE_PREFIX = "medilink_cache_";

export function getCachedData<T>(key: string): T | null {
  try {
    const data = sessionStorage.getItem(`${CACHE_PREFIX}${key}`);
    return data ? JSON.parse(data) : null;
  } catch (err) {
    console.error(`Error reading cache for ${key}:`, err);
    return null;
  }
}

export function setCachedData<T>(key: string, data: T): void {
  try {
    sessionStorage.setItem(`${CACHE_PREFIX}${key}`, JSON.stringify(data));
  } catch (err) {
    console.error(`Error writing cache for ${key}:`, err);
  }
}

export function invalidateCache(key: string): void {
  try {
    sessionStorage.removeItem(`${CACHE_PREFIX}${key}`);
  } catch (err) {
    console.error(`Error invalidating cache for ${key}:`, err);
  }
}

export function clearAppCache(): void {
  try {
    // Clear all items starting with our prefix
    const keysToRemove: string[] = [];
    for (let i = 0; i < sessionStorage.length; i++) {
      const key = sessionStorage.key(i);
      if (key && key.startsWith(CACHE_PREFIX)) {
        keysToRemove.push(key);
      }
    }
    keysToRemove.forEach((key) => sessionStorage.removeItem(key));
    
    // Also clean up any localStorage temporary states if needed
    localStorage.removeItem("medi-link-share-profiles");
    localStorage.removeItem("medi-link-qr-codes");
  } catch (err) {
    console.error("Error clearing app cache:", err);
  }
}
