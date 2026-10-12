// Downloads the public files of one Drop. Only these two addresses are ever read.
export const goldenUrl = (drop) => `https://data.gumballmachine.fun/v1/golden/${drop}.json`;
export const dropUrl = (drop) => `https://data.gumballmachine.fun/v1/drops/${drop}.json`;

// Returns the JSON file, or null when it is not published (yet).
export async function download(url, fetchFn = fetch) {
  let res;
  try {
    res = await fetchFn(url, { headers: { accept: "application/json" } });
  } catch (err) {
    throw new Error(`could not download ${url} (${err.message})`);
  }
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`${url} answered HTTP ${res.status}`);
  return res.json();
}

export async function downloadDrop(drop, fetchFn = fetch) {
  const [golden, report] = await Promise.all([download(goldenUrl(drop), fetchFn), download(dropUrl(drop), fetchFn)]);
  return { golden, report };
}
