export type UserRole = "citizen" | "engineer";

const STORAGE_KEY = "aqi_user_role";

export function getStoredRole(): UserRole | null {
  if (typeof window === "undefined") return null;
  try {
    const v = window.localStorage.getItem(STORAGE_KEY);
    return v === "citizen" || v === "engineer" ? v : null;
  } catch {
    return null;
  }
}

export function storeRole(role: UserRole): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, role);
  } catch {
    // ignore — non-critical, role just won't persist across reloads
  }
}