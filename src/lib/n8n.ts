const N8N_BASE = "https://sleepyseamonster.app.n8n.cloud/webhook";

export async function n8nPost<T = any>(path: string, body: unknown) {
  try {
    const res = await fetch(`${N8N_BASE}${path}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const errorText = await res.text();
      throw new Error(`HTTP ${res.status}: ${errorText}`);
    }

    return res.json() as Promise<T>;
  } catch (error: any) {
    if (error.message?.includes('CORS')) {
      console.error('CORS error detected. The n8n webhook needs to be configured with proper CORS headers.');
      throw new Error('Connection failed. Please ensure the webhook is configured to allow requests from this domain.');
    }
    throw error;
  }
}

export async function n8nGet<T = any>(path: string, params?: Record<string,string>) {
  const url = new URL(`${N8N_BASE}${path}`);
  if (params) Object.entries(params).forEach(([k,v]) => url.searchParams.set(k,v));
  const res = await fetch(url.toString());
  if (!res.ok) throw new Error(await res.text());
  return res.json() as Promise<T>;
}