/**
 * Web search untuk Teman Baca via Tavily (dipakai saat user mengaktifkan
 * ikon "web" di Tanya materi). Hasilnya disuntik ke prompt AI sebagai
 * konteks tambahan — BUKAN function calling, supaya tetap jalan di semua
 * provider OpenAI-compatible (termasuk yang tool-calling-nya lemah).
 *
 * Hasil pencarian adalah data tidak tepercaya (lihat prompt di ai-policy.ts).
 * Modul ini hanya diimpor dari kode server (ai-service.ts).
 */

export type WebResult = {
  title: string;
  url: string;
  snippet: string;
  published_at?: string;
};

export class WebSearchError extends Error {
  constructor(readonly code: string) {
    super(code);
    this.name = 'WebSearchError';
  }
}

const TAVILY_ENDPOINT = 'https://api.tavily.com/search';
const MAX_SNIPPET = 500;
const MAX_RESPONSE_BYTES = 200_000;

const asPositiveInt = (value: string | undefined, fallback: number, max: number): number => {
  const parsed = Number(value ?? fallback);
  return Number.isInteger(parsed) && parsed >= 1 && parsed <= max ? parsed : fallback;
};

export function searchConfig(env: Record<string, string | undefined> = process.env): {
  enabled: boolean; apiKey: string; maxResults: number; timeoutMs: number;
} {
  return {
    enabled: env.AI_SEARCH_ENABLED === 'true',
    apiKey: env.AI_SEARCH_API_KEY?.trim() ?? '',
    maxResults: asPositiveInt(env.AI_SEARCH_MAX_RESULTS, 5, 10),
    timeoutMs: asPositiveInt(env.AI_SEARCH_TIMEOUT_MS, 8000, 30000),
  };
}

const cleanText = (value: unknown, max: number): string =>
  typeof value === 'string' ? value.replace(/\s+/g, ' ').trim().slice(0, max) : '';

const isHttpsUrl = (value: string): boolean => {
  try {
    const url = new URL(value);
    return url.protocol === 'https:' && !url.username && !url.password;
  } catch {
    return false;
  }
};

/**
 * Cari info terbaru via Tavily. Melempar WebSearchError bila:
 * - 'SEARCH_DISABLED' — AI_SEARCH_ENABLED bukan 'true' / API key kosong
 * - 'SEARCH_UNAVAILABLE' — network error, timeout, respons tidak valid
 *
 * Hasil yang URL-nya tidak valid (non-https) dibuang, bukan digagalkan.
 */
export async function searchWeb(
  query: string,
  fetcher: typeof fetch = fetch,
  env: Record<string, string | undefined> = process.env,
): Promise<WebResult[]> {
  const config = searchConfig(env);
  if (!config.enabled || !config.apiKey) throw new WebSearchError('SEARCH_DISABLED');
  const q = query.trim().slice(0, 600);
  if (!q) throw new WebSearchError('SEARCH_UNAVAILABLE');

  let response: Response;
  try {
    response = await fetcher(TAVILY_ENDPOINT, {
      method: 'POST',
      redirect: 'error',
      signal: AbortSignal.timeout(config.timeoutMs),
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        api_key: config.apiKey,
        query: q,
        search_depth: 'basic',
        max_results: config.maxResults,
        include_answer: false,
        include_raw_content: false,
      }),
    });
  } catch {
    throw new WebSearchError('SEARCH_UNAVAILABLE');
  }
  if (!response.ok || !response.body) throw new WebSearchError('SEARCH_UNAVAILABLE');

  const reader = response.body.getReader();
  const chunks: Uint8Array[] = [];
  let size = 0;
  try {
    for (;;) {
      const chunk = await reader.read();
      if (chunk.done) break;
      size += chunk.value.length;
      if (size > MAX_RESPONSE_BYTES) {
        await reader.cancel();
        throw new WebSearchError('SEARCH_UNAVAILABLE');
      }
      chunks.push(chunk.value);
    }
  } finally {
    reader.releaseLock();
  }

  let data: unknown;
  try {
    data = JSON.parse(Buffer.concat(chunks).toString('utf8'));
  } catch {
    throw new WebSearchError('SEARCH_UNAVAILABLE');
  }
  const results = (data as { results?: unknown }).results;
  if (!Array.isArray(results)) throw new WebSearchError('SEARCH_UNAVAILABLE');

  const cleaned: WebResult[] = [];
  for (const item of results) {
    if (typeof item !== 'object' || item === null) continue;
    const entry = item as Record<string, unknown>;
    const url = typeof entry.url === 'string' ? entry.url.trim() : '';
    const title = cleanText(entry.title, 200);
    const snippet = cleanText(entry.content, MAX_SNIPPET);
    if (!isHttpsUrl(url) || !title || !snippet) continue;
    const published = cleanText(entry.published_date, 32);
    cleaned.push(published ? { title, url, snippet, published_at: published } : { title, url, snippet });
    if (cleaned.length >= config.maxResults) break;
  }
  return cleaned;
}
