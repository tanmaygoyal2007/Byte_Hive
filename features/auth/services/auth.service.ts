export type LocalAuthRole = "student" | "faculty";
export type AuthUser = {
  uid: string;
  email: string;
  displayName: string;
};

const roleKey = (uid: string) => `bytehive-auth-role:${uid}`;
const LOCAL_AUTH_USERS_KEY = "bytehive-local-auth-users";
const LOCAL_AUTH_SESSION_KEY = "bytehive-local-auth-session";
const LOCAL_AUTH_EVENT = "bytehive-local-auth-changed";
type LocalAuthUserRecord = {
  uid: string;
  email: string;
  password: string;
  displayName: string;
  role: LocalAuthRole;
};

function createAuthError(code: string) {
  const error = new Error(code) as Error & { code: string };
  error.code = code;
  return error;
}

function readLocalUsers() {
  if (typeof window === "undefined") return [] as LocalAuthUserRecord[];

  try {
    const stored = localStorage.getItem(LOCAL_AUTH_USERS_KEY);
    return stored ? JSON.parse(stored) as LocalAuthUserRecord[] : [];
  } catch {
    return [] as LocalAuthUserRecord[];
  }
}

function saveLocalUsers(users: LocalAuthUserRecord[]) {
  if (typeof window === "undefined") return;
  localStorage.setItem(LOCAL_AUTH_USERS_KEY, JSON.stringify(users));
}

function readLocalSession() {
  if (typeof window === "undefined") return null as LocalAuthUserRecord | null;

  try {
    const stored = localStorage.getItem(LOCAL_AUTH_SESSION_KEY);
    if (!stored) return null;
    const session = JSON.parse(stored) as { uid: string } | null;
    if (!session?.uid) return null;
    return readLocalUsers().find((user) => user.uid === session.uid) ?? null;
  } catch {
    return null as LocalAuthUserRecord | null;
  }
}

function saveLocalSession(uid: string | null) {
  if (typeof window === "undefined") return;

  if (uid) {
    localStorage.setItem(LOCAL_AUTH_SESSION_KEY, JSON.stringify({ uid }));
  } else {
    localStorage.removeItem(LOCAL_AUTH_SESSION_KEY);
  }

  window.dispatchEvent(new CustomEvent(LOCAL_AUTH_EVENT));
}

function toLocalUser(record: LocalAuthUserRecord | null) {
  if (!record) return null;

  return {
    uid: record.uid,
    email: record.email,
    displayName: record.displayName,
  } satisfies AuthUser;
}

export function getStoredAuthRole(uid: string) {
  return localStorage.getItem(roleKey(uid)) as LocalAuthRole | null;
}

export function setStoredAuthRole(uid: string, role: LocalAuthRole) {
  localStorage.setItem(roleKey(uid), role);
}

export async function configureAuthPersistence() {
  return;
}

export async function signupWithEmail(payload: {
  role: LocalAuthRole;
  email: string;
  password: string;
  name: string;
}) {
  const normalizedEmail = payload.email.trim().toLowerCase();
  const existingUsers = readLocalUsers();

  if (existingUsers.some((user) => user.email === normalizedEmail)) {
    throw createAuthError("auth/email-already-in-use");
  }

  const localUser: LocalAuthUserRecord = {
    uid: `local-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    email: normalizedEmail,
    password: payload.password,
    displayName: payload.name.trim() || "ByteHive User",
    role: payload.role,
  };

  saveLocalUsers([...existingUsers, localUser]);
  setStoredAuthRole(localUser.uid, payload.role);
  saveLocalSession(localUser.uid);
  return toLocalUser(localUser);
}

export async function loginWithEmail(payload: {
  role: LocalAuthRole;
  email: string;
  password: string;
}) {
  const normalizedEmail = payload.email.trim().toLowerCase();
  const match = readLocalUsers().find((user) => user.email === normalizedEmail);

  if (!match || match.password !== payload.password) {
    throw createAuthError("auth/invalid-credential");
  }

  setStoredAuthRole(match.uid, payload.role);
  saveLocalSession(match.uid);
  return toLocalUser(match);
}

export async function logoutUser() {
  saveLocalSession(null);
}

export function subscribeToAuthState(callback: (user: AuthUser | null) => void) {
  const sync = () => callback(toLocalUser(readLocalSession()));
  sync();

  if (typeof window === "undefined") {
    return () => undefined;
  }

  window.addEventListener(LOCAL_AUTH_EVENT, sync);
  window.addEventListener("storage", sync);

  return () => {
    window.removeEventListener(LOCAL_AUTH_EVENT, sync);
    window.removeEventListener("storage", sync);
  };
}
