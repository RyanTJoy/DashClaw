const LAYOUT_STORAGE_KEY = 'dashclaw_dashboard_layouts';
const LAYOUT_VERSION = 2;

export function loadLayouts(storage = globalThis?.localStorage) {
  try {
    if (!storage) return null;
    const raw = storage.getItem(LAYOUT_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (parsed?.version !== LAYOUT_VERSION) return null;
    return parsed.layouts;
  } catch {
    return null;
  }
}

export function saveLayouts(layouts, storage = globalThis?.localStorage) {
  try {
    if (storage) {
      storage.setItem(LAYOUT_STORAGE_KEY, JSON.stringify({ version: LAYOUT_VERSION, layouts }));
    }
  } catch {
    // ignore storage errors
  }
}

export function clearLayouts(storage = globalThis?.localStorage) {
  try {
    if (storage) {
      storage.removeItem(LAYOUT_STORAGE_KEY);
    }
  } catch {
    // ignore storage errors
  }
}
