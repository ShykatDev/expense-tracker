/**
 * Goal photos live in IndexedDB, not localStorage.
 *
 * localStorage only holds strings (a photo would have to be base64, a third
 * bigger) and browsers cap it at about 5 MB for the whole app, so a handful
 * of photos would crowd out the transactions. IndexedDB stores the Blob as
 * is and has a far larger quota. The goal itself only keeps the photo's id.
 */

const DB_NAME = "expense-tracker-media";
const STORE = "goal-images";
const DB_VERSION = 1;

/** Longest edge of a stored photo. Plenty for a card, small on disk. */
const MAX_EDGE = 900;
const JPEG_QUALITY = 0.82;

let dbPromise: Promise<IDBDatabase> | null = null;

function openDb() {
  if (dbPromise) return dbPromise;
  dbPromise = new Promise<IDBDatabase>((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      if (!request.result.objectStoreNames.contains(STORE)) {
        request.result.createObjectStore(STORE);
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => {
      dbPromise = null;
      reject(request.error);
    };
  });
  return dbPromise;
}

function run<T>(
  mode: IDBTransactionMode,
  action: (store: IDBObjectStore) => IDBRequest<T>,
) {
  return openDb().then(
    (db) =>
      new Promise<T>((resolve, reject) => {
        const tx = db.transaction(STORE, mode);
        const request = action(tx.objectStore(STORE));
        tx.oncomplete = () => resolve(request.result);
        tx.onerror = () => reject(tx.error);
        tx.onabort = () => reject(tx.error);
      }),
  );
}

export function saveGoalImage(id: string, blob: Blob) {
  // Ask the browser not to evict our data under storage pressure. It's a
  // hint; installed PWAs usually get it granted.
  navigator.storage?.persist?.().catch(() => {});
  return run("readwrite", (store) => store.put(blob, id)).then(() => undefined);
}

export function loadGoalImage(id: string) {
  return run<Blob | undefined>("readonly", (store) => store.get(id));
}

export function deleteGoalImage(id: string) {
  return run("readwrite", (store) => store.delete(id)).then(() => undefined);
}

/** Drops every stored photo. Used by the "reset all data" setting. */
export function clearGoalImages() {
  return run("readwrite", (store) => store.clear()).then(() => undefined);
}

/**
 * Shrinks a picked photo to at most MAX_EDGE px and re-encodes it as JPEG.
 * Phone photos are often 3–5 MB; this brings them to ~100 KB.
 */
export async function prepareGoalImage(file: File): Promise<Blob> {
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, MAX_EDGE / Math.max(bitmap.width, bitmap.height));
  const width = Math.round(bitmap.width * scale);
  const height = Math.round(bitmap.height * scale);

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext("2d");
  if (!context) throw new Error("Canvas not available");
  context.drawImage(bitmap, 0, 0, width, height);
  bitmap.close();

  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error("Could not encode image"))),
      "image/jpeg",
      JPEG_QUALITY,
    );
  });
}

/** How many goal photos are stored and how many bytes they take. */
export function getGoalImageStats() {
  return openDb().then(
    (db) =>
      new Promise<{ count: number; bytes: number }>((resolve, reject) => {
        const stats = { count: 0, bytes: 0 };
        const tx = db.transaction(STORE, "readonly");
        const request = tx.objectStore(STORE).openCursor();
        request.onsuccess = () => {
          const cursor = request.result;
          if (!cursor) return;
          stats.count += 1;
          if (cursor.value instanceof Blob) stats.bytes += cursor.value.size;
          cursor.continue();
        };
        tx.oncomplete = () => resolve(stats);
        tx.onerror = () => reject(tx.error);
      }),
  );
}

/**
 * The browser's storage budget for this app (IndexedDB, caches, …), or null
 * where the Storage API isn't available. Browsers round these figures, so
 * treat them as estimates.
 */
export async function getStorageEstimate() {
  if (!navigator.storage?.estimate) return null;
  const { usage = 0, quota = 0 } = await navigator.storage.estimate();
  if (!quota) return null;
  return { usage, quota, free: Math.max(quota - usage, 0) };
}

/** 1536 → "1.5 KB", 3_400_000 → "3.2 MB". */
export function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  const units = ["KB", "MB", "GB", "TB"];
  let value = bytes / 1024;
  let unit = 0;
  while (value >= 1024 && unit < units.length - 1) {
    value /= 1024;
    unit += 1;
  }
  return `${value.toFixed(value < 10 ? 1 : 0)} ${units[unit]}`;
}
