export async function fetchWithCache(
  key: string,
  cacheControl: string,
  fetcher: (key: string) => Promise<Response> = fetch,
): Promise<Response> {
  // For both browser environment and cloudflare workers
  const cache = await caches.open("wrapdb-cache");
  const cachedResponse = await cache.match(key);
  if (cachedResponse) {
    console.log(`Cache hit for ${key}`);
    return cachedResponse;
  } else {
    console.log(`Cache miss for ${key}`);
    const response = await fetcher(key);
    if (response.ok) {
      const responseForCache = new Response(response.clone().body);
      responseForCache.headers.set("Cache-Control", cacheControl);
      await cache.put(key, responseForCache);
    }
    return response;
  }
}

export async function deleteCache(key: string): Promise<void> {
  const cache = await caches.open("wrapdb-cache");
  await cache.delete(key);
}
