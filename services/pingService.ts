/**
 * Measures the Round Trip Time (RTT) to a target URL.
 * Note: Browsers cannot perform ICMP pings. We simulate this by measuring
 * the time it takes to fetch a resource. We use mode: 'no-cors' to avoid
 * CORS errors blocking the request execution.
 */
export const measurePing = async (url: string): Promise<number> => {
  const start = performance.now();
  const controller = new AbortController();
  // Increase timeout to 5000ms to allow for mobile network latency
  const timeoutId = setTimeout(() => controller.abort(), 5000);
  
  try {
    // Adding a random query param prevents caching
    const cacheBuster = `t=${Date.now()}`;
    const separator = url.includes('?') ? '&' : '?';
    const target = `${url}${separator}${cacheBuster}`;

    await fetch(target, {
      method: 'HEAD',
      mode: 'no-cors',
      cache: 'no-store',
      referrerPolicy: 'no-referrer',
      signal: controller.signal
    });
    
    clearTimeout(timeoutId);
    const end = performance.now();
    return Math.round(end - start);
  } catch (error: any) {
    clearTimeout(timeoutId);
    
    const msg = error.message || '';
    
    // Normalize timeout errors
    if (error.name === 'AbortError' || msg.includes('timed out')) {
      throw new Error('Timeout');
    }
    
    // Normalize network/fetch errors
    if (
      msg.includes('Failed to fetch') || 
      msg.includes('NetworkError') || 
      error instanceof TypeError
    ) {
      throw new Error('Network Error');
    }
    
    throw error;
  }
};