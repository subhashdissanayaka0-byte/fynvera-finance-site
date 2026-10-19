// Centralized local-storage helpers keep preview preferences across refreshes without pretending to be a production database.
const prefix = 'fynvera:';

export function loadLocal(key, fallback) {
  try {
    const raw = window.localStorage.getItem(prefix + key);
    return raw === null ? fallback : JSON.parse(raw);
  } catch (error) {
    console.warn(`Could not read local preference "${key}".`, error);
    return fallback;
  }
}

export function saveLocal(key, value) {
  try {
    window.localStorage.setItem(prefix + key, JSON.stringify(value));
    return true;
  } catch (error) {
    console.warn(`Could not save local preference "${key}".`, error);
    return false;
  }
}
