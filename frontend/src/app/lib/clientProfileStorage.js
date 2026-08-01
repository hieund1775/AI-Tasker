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

export function buildClientProfileFromUser(apiUser) {
  if (!apiUser) return null;

  const id = apiUser.id || apiUser.Id || "";
  const localProfile = getLocalClientProfile(id);
  const fullName =
    apiUser.fullName ||
    apiUser.FullName ||
    apiUser.name ||
    apiUser.Name ||
    apiUser.email?.split("@")[0] ||
    "Client";

  return {
    id,
    fullName,
    name: fullName,
    email: localProfile.email || apiUser.email || apiUser.Email || "",
    createdAt: apiUser.createdAt || apiUser.CreatedAt,
    profile: {
      company: localProfile.companyName || "",
      phone: localProfile.phone || apiUser.phoneNumber || apiUser.PhoneNumber || "",
      location: localProfile.location || "",
      website: localProfile.website || "",
      industry: localProfile.industry || "",
      bio: localProfile.bio || "",
    },
  };
}
