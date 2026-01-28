const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export const fetchWithRetry = async (
  url: string,
  retries = 5,
  delay = 1000
): Promise<Blob> => {
  try {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }
    return await response.blob();
  } catch (error) {
    if (retries > 1) {
      await sleep(delay);
      return fetchWithRetry(url, retries - 1, delay);
    }
    throw error;
  }
};
