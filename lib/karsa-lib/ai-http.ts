/** Batasi JSON AI sebelum parsing; ukuran pertanyaan divalidasi lagi oleh service. */
export async function readAiJson(request: Request): Promise<unknown | null> {
  if (!request.headers.get('content-type')?.toLowerCase().startsWith('application/json') || !request.body) return null;
  const reader = request.body.getReader();
  const chunks: Uint8Array[] = []; let size = 0;
  try {
    while (true) {
      const next = await reader.read();
      if (next.done) break;
      size += next.value.length;
      if (size > 8192) { await reader.cancel(); return null; }
      chunks.push(next.value);
    }
    return JSON.parse(Buffer.concat(chunks).toString('utf8'));
  } catch { return null; }
  finally { reader.releaseLock(); }
}
