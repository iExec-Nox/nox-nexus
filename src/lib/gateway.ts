interface HandleStatus {
  resolved: boolean;
}

export type HandleStatusMap = Record<string, boolean>;

const BATCH_SIZE = 200;
const PROXY_URL = "/api/handles-status";

export async function fetchHandleStatuses(
  handleIds: string[]
): Promise<HandleStatusMap> {
  const result: HandleStatusMap = {};

  for (let i = 0; i < handleIds.length; i += BATCH_SIZE) {
    const batch = handleIds.slice(i, i + BATCH_SIZE);
    try {
      const res = await fetch(PROXY_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ handles: batch }),
      });

      if (!res.ok) {
        console.error(`Gateway status error: ${res.status}`);
        for (const id of batch) result[id] = false;
        continue;
      }

      const data: Record<string, HandleStatus> = await res.json();
      for (const [id, status] of Object.entries(data)) {
        result[id] = status.resolved;
      }
    } catch (err) {
      console.error("Gateway status fetch failed:", err);
      for (const id of batch) result[id] = false;
    }
  }

  return result;
}

export async function fetchSingleHandleStatus(
  handleId: string
): Promise<boolean> {
  try {
    const res = await fetch(PROXY_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ handles: [handleId] }),
    });

    if (!res.ok) return false;

    const data: Record<string, HandleStatus> = await res.json();
    return data[handleId]?.resolved ?? false;
  } catch {
    return false;
  }
}
