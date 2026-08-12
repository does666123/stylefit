const LOCAL_STORAGE_KEYS = [
  'stylefit_profile',
  'stylefit_favorites',
  'stylefit_ai_recommendation',
  'stylefit_weather',
  'stylefit_lang',
] as const;

const SESSION_STORAGE_KEYS = [
  'stylefit_survey_draft',
  'stylefit_ai_recommendation',
] as const;

export const STYLEFIT_DATA_CLEARED_EVENT = 'stylefit:local-data-cleared';

function removeKeys(storage: Storage, keys: readonly string[]) {
  keys.forEach((key) => {
    try {
      storage.removeItem(key);
    } catch {}
  });
}

export function clearStyleFitLocalData() {
  try {
    removeKeys(localStorage, LOCAL_STORAGE_KEYS);
  } catch {}

  try {
    removeKeys(sessionStorage, SESSION_STORAGE_KEYS);
  } catch {}

  window.dispatchEvent(new Event(STYLEFIT_DATA_CLEARED_EVENT));
}
