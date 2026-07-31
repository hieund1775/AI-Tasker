const CLIENT_PROFILE_STORAGE_PREFIX = "aitasker_client_profile";

export function getClientProfileKey(userId) {
  return `${CLIENT_PROFILE_STORAGE_PREFIX}_${userId}`;
}

export function getLocalClientProfile(userId) {
  if (!userId) return {};

  try {
    const raw = localStorage.getItem(getClientProfileKey(userId));
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

export function saveLocalClientProfile(userId, data) {
  if (!userId) return;
  localStorage.setItem(getClientProfileKey(userId), JSON.stringify(data));
}
