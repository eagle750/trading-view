/**
 * Stable strategy key from file **bytes** only (not the filename).
 * Same document under different names → same id → same scores.
 */

const MAX_FULL_HASH = 8 * 1024 * 1024; // 8 MiB — hash whole file
const HEAD_LARGE = 512 * 1024;
const TAIL_LARGE = 65536;

async function sha256Hex(data: ArrayBuffer): Promise<string> {
  const hashBuf = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(hashBuf))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

/** Fingerprint file contents for strategy identity (ignores display name). */
async function hashFileContents(file: File): Promise<string> {
  if (file.size === 0) {
    return sha256Hex(new ArrayBuffer(0));
  }
  if (file.size <= MAX_FULL_HASH) {
    const buf = await file.arrayBuffer();
    return sha256Hex(buf);
  }
  const head = await file.slice(0, HEAD_LARGE).arrayBuffer();
  const tailStart = Math.max(0, file.size - TAIL_LARGE);
  const tail = await file.slice(tailStart).arrayBuffer();
  const meta = new TextEncoder().encode(`size:${file.size}`);
  const combined = new Uint8Array(
    head.byteLength + tail.byteLength + meta.length,
  );
  combined.set(new Uint8Array(head), 0);
  combined.set(new Uint8Array(tail), head.byteLength);
  combined.set(meta, head.byteLength + tail.byteLength);
  return sha256Hex(combined.buffer);
}

export async function computeStrategyStableId(
  file: File,
  fileIndex: number,
): Promise<string> {
  const contentHex = await hashFileContents(file);
  return `strat--${file.size}--${contentHex}--${fileIndex}`;
}
