/**
 * Stable id for the same strategy file across machines and upload sessions.
 * (Previously we used Date.now() in the id, which changed scores per upload.)
 */
export async function computeStrategyStableId(
  file: File,
  fileIndex: number,
): Promise<string> {
  const n = Math.min(65536, file.size);
  const slice = file.slice(0, n);
  const buf = await slice.arrayBuffer();
  const hashBuf = await crypto.subtle.digest("SHA-256", buf);
  const hex = Array.from(new Uint8Array(hashBuf))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("")
    .slice(0, 16);
  return `${file.name}--${file.size}--${hex}--${fileIndex}`;
}
