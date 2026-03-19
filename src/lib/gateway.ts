interface HandleStatus {
  resolved: boolean;
}

export type HandleStatusMap = Record<string, boolean>;

const BATCH_SIZE = 500;
const MAX_CONCURRENT = 3;
const PROXY_URL = '/api/handles-status';

export async function fetchHandleStatuses(
  handleIds: string[]
): Promise<HandleStatusMap> {
  const batches: string[][] = [];
  for (let i = 0; i < handleIds.length; i += BATCH_SIZE) {
    batches.push(handleIds.slice(i, i + BATCH_SIZE));
  }

  const results: HandleStatusMap[] = [];

  for (let i = 0; i < batches.length; i += MAX_CONCURRENT) {
    const chunk = batches.slice(i, i + MAX_CONCURRENT);
    const chunkResults = await Promise.all(
      chunk.map(async (batch) => {
        const partial: HandleStatusMap = {};
        try {
          const res = await fetch(PROXY_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ handles: batch }),
          });

          if (!res.ok) {
            console.error(`Gateway status error: ${res.status}`);
            for (const id of batch) partial[id] = false;
            return partial;
          }

          const data: Record<string, HandleStatus> = await res.json();
          for (const [id, status] of Object.entries(data)) {
            partial[id] = status.resolved;
          }
        } catch (err) {
          console.error('Gateway status fetch failed:', err);
          for (const id of batch) partial[id] = false;
        }
        return partial;
      })
    );
    results.push(...chunkResults);
  }

  return Object.assign({}, ...results);
}

export async function fetchSingleHandleStatus(
  handleId: string
): Promise<boolean> {
  try {
    const res = await fetch(PROXY_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ handles: [handleId] }),
    });

    if (!res.ok) return false;

    const data: Record<string, HandleStatus> = await res.json();
    return data[handleId]?.resolved ?? false;
  } catch {
    return false;
  }
}
