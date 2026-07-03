import zlib from "node:zlib";

// Minimal ZIP reader (STORE + DEFLATE) for importing Notion/Obsidian exports.
// Reads the central directory (authoritative sizes) so it also handles archives
// written with data descriptors.

export type UnzippedFile = { name: string; content: Buffer };

const EOCD_SIG = 0x06054b50;
const CEN_SIG = 0x02014b50;

export function unzip(buffer: Buffer): UnzippedFile[] {
  // Locate the End Of Central Directory record by scanning backwards.
  let eocd = -1;
  for (let i = buffer.length - 22; i >= 0; i--) {
    if (buffer.readUInt32LE(i) === EOCD_SIG) {
      eocd = i;
      break;
    }
  }
  if (eocd < 0) throw new Error("Not a valid ZIP file");

  const entryCount = buffer.readUInt16LE(eocd + 10);
  let ptr = buffer.readUInt32LE(eocd + 16); // central directory offset

  const files: UnzippedFile[] = [];
  for (let e = 0; e < entryCount; e++) {
    if (buffer.readUInt32LE(ptr) !== CEN_SIG) break;
    const method = buffer.readUInt16LE(ptr + 10);
    const compSize = buffer.readUInt32LE(ptr + 20);
    const nameLen = buffer.readUInt16LE(ptr + 28);
    const extraLen = buffer.readUInt16LE(ptr + 30);
    const commentLen = buffer.readUInt16LE(ptr + 32);
    const localOffset = buffer.readUInt32LE(ptr + 42);
    const name = buffer.toString("utf8", ptr + 46, ptr + 46 + nameLen);

    // Jump to local header to find where the data actually starts.
    const localNameLen = buffer.readUInt16LE(localOffset + 26);
    const localExtraLen = buffer.readUInt16LE(localOffset + 28);
    const dataStart = localOffset + 30 + localNameLen + localExtraLen;
    const raw = buffer.subarray(dataStart, dataStart + compSize);

    if (!name.endsWith("/")) {
      try {
        const content =
          method === 0 ? Buffer.from(raw) : zlib.inflateRawSync(raw);
        files.push({ name, content });
      } catch {
        // Skip entries we can't inflate (e.g., unsupported methods).
      }
    }

    ptr += 46 + nameLen + extraLen + commentLen;
  }

  return files;
}
