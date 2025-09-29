const N8N_BASE = "https://sleepyseamonster.app.n8n.cloud/webhook";

export async function n8nPost<T = any>(path: string, body: unknown) {
  const res = await fetch(`${N8N_BASE}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json() as Promise<T>;
}

export async function n8nGet<T = any>(path: string, params?: Record<string,string>) {
  const url = new URL(`${N8N_BASE}${path}`);
  if (params) Object.entries(params).forEach(([k,v]) => url.searchParams.set(k,v));
  const res = await fetch(url.toString());
  if (!res.ok) throw new Error(await res.text());
  return res.json() as Promise<T>;
}