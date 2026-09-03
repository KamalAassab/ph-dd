/**
 * Origin Private File System (OPFS) streaming disk writer.
 * Streams incoming video chunks directly to the device's local flash storage (disk)
 * instead of hoarding hundreds of megabytes in JavaScript RAM.
 *
 * This prevents iOS Mobile Safari Jetsam OOM crashes on large files (e.g. 670MB / 42min).
 * Fully supported on iOS Safari 15.2+, Chrome 86+, Edge 86+, Firefox 111+.
 */

export interface DiskStreamWriter {
  writeChunk: (offset: number, chunk: Uint8Array) => Promise<void>;
  finalize: () => Promise<string>; // returns blob URL backed by local disk
  abort: () => Promise<void>;
  isDiskBacked: boolean;
}

export async function createDiskStreamWriter(filename: string): Promise<DiskStreamWriter | null> {
  if (typeof window === 'undefined' || !navigator.storage?.getDirectory) {
    return null;
  }

  try {
    const root = await navigator.storage.getDirectory();
    const safeName = filename.replace(/[^a-zA-Z0-9._-]/g, '_');

    // Clean up any stale file from prior aborted attempts
    try {
      await root.removeEntry(safeName);
    } catch {
      // ignore
    }

    const fileHandle = await root.getFileHandle(safeName, { create: true });

    // Verify createWritable support
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    if (typeof (fileHandle as any).createWritable === 'function') {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const writable = await (fileHandle as any).createWritable({ keepExistingData: true });

      return {
        isDiskBacked: true,
        writeChunk: async (offset: number, chunk: Uint8Array) => {
          // Write chunk at exact byte offset
          await writable.seek(offset);
          await writable.write(chunk);
        },
        finalize: async () => {
          await writable.close();
          const file = await fileHandle.getFile();
          return URL.createObjectURL(file);
        },
        abort: async () => {
          try {
            await writable.abort();
            await root.removeEntry(safeName);
          } catch {
            // ignore
          }
        },
      };
    }

    return null;
  } catch (err) {
    console.warn('OPFS disk writer initialization skipped (falling back to memory):', err);
    return null;
  }
}
