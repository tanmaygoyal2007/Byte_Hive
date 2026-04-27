export type LocalAuthRole = "student" | "faculty";
export type AuthUser = {
  uid: string;
  email: string;
  displayName: string;
};

const LOCAL_AUTH_EVENT = "bytehive-local-auth-changed";
const LOCAL_USERS_KEY = "bytehive-local-auth-users";
const LOCAL_SESSION_KEY = "bytehive-local-auth-session";

type LocalAuthUserRecord = {
  uid: string;
  email: string;
  password: string;
  displayName: string;
  role: LocalAuthRole;
};

function readJSON<T>(key: string): T | null {
  if (typeof window === "undefined") return null;
  try {
    const stored = localStorage.getItem(key);
    return stored ? JSON.parse(stored) : null;
  } catch {
    return null;
  }
}

function writeJSON<T>(key: string, value: T): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // ignore
  }
}

type LocalAuthMemory = {
  currentUid: string | null;
  roleByUid: Map<string, LocalAuthRole>;
  users: LocalAuthUserRecord[];
};

const globalAuthMemory = globalThis as typeof globalThis & {
  __bytehiveAuthMemory?: LocalAuthMemory;
};

function createAuthError(code: string) {
  const error = new Error(code) as Error & { code: string };
  error.code = code;
  return error;
}

function getAuthMemory() {
  if (!globalAuthMemory.__bytehiveAuthMemory) {
    globalAuthMemory.__bytehiveAuthMemory = {
      currentUid: null,
      roleByUid: new Map<string, LocalAuthRole>(),
      users: [],
    };
  }

  return globalAuthMemory.__bytehiveAuthMemory;
}

function readLocalUsers(): LocalAuthUserRecord[] {
  if (typeof window !== "undefined") {
    const stored = readJSON<LocalAuthUserRecord[]>(LOCAL_USERS_KEY);
    if (stored) return stored;
  }
  return getAuthMemory().users;
}

function saveLocalUsers(users: LocalAuthUserRecord[]) {
  if (typeof window !== "undefined") {
    writeJSON(LOCAL_USERS_KEY, users);
  }
  getAuthMemory().users = users;
}

function readLocalSession(): LocalAuthUserRecord | null {
  if (typeof window !== "undefined") {
    const uid = localStorage.getItem(LOCAL_SESSION_KEY);
    if (uid) {
      const users = readLocalUsers();
      return users.find((user) => user.uid === uid) ?? null;
    }
    return null;
  }
  const { currentUid, users } = getAuthMemory();
  if (!currentUid) return null;
  return users.find((user) => user.uid === currentUid) ?? null;
}

function saveLocalSession(uid: string | null) {
  getAuthMemory().currentUid = uid;

  if (typeof window !== "undefined") {
    if (uid) {
      localStorage.setItem(LOCAL_SESSION_KEY, uid);
    } else {
      localStorage.removeItem(LOCAL_SESSION_KEY);
    }
    window.dispatchEvent(new CustomEvent(LOCAL_AUTH_EVENT));
  }
}

function toLocalUser(record: LocalAuthUserRecord | null) {
  if (!record) return null;

  return {
    uid: record.uid,
    email: record.email,
    displayName: record.displayName,
  } satisfies AuthUser;
}

export function getCurrentAuthUser() {
  return toLocalUser(readLocalSession());
}

export function getStoredAuthRole(uid: string) {
  if (typeof window !== "undefined") {
    const storageKey = `bytehive-auth-role-${uid}`;
    const stored = localStorage.getItem(storageKey);
    if (stored === "student" || stored === "faculty") return stored;
  }
  return getAuthMemory().roleByUid.get(uid) ?? null;
}

export function setStoredAuthRole(uid: string, role: LocalAuthRole) {
  getAuthMemory().roleByUid.set(uid, role);
  if (typeof window !== "undefined") {
    localStorage.setItem(`bytehive-auth-role-${uid}`, role);
  }
}

export function hasLocalAccount(email: string) {
  const normalizedEmail = email.trim().toLowerCase();
  return readLocalUsers().some((user) => user.email === normalizedEmail);
}

export async function configureAuthPersistence() {
  if (typeof window !== "undefined") {
    const storedUsers = readJSON<LocalAuthUserRecord[]>(LOCAL_USERS_KEY);
    if (storedUsers) {
      getAuthMemory().users = storedUsers;
    }
    const currentUid = localStorage.getItem(LOCAL_SESSION_KEY);
    if (currentUid) {
      getAuthMemory().currentUid = currentUid;
    }
  }
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

export async function changePassword(payload: {
  email: string;
  oldPassword: string;
  newPassword: string;
}) {
  const normalizedEmail = payload.email.trim().toLowerCase();
  const users = readLocalUsers();
  const userIndex = users.findIndex((user) => user.email === normalizedEmail);

  if (userIndex === -1) {
    throw createAuthError("auth/user-not-found");
  }

  const user = users[userIndex];

  if (user.password !== payload.oldPassword) {
    throw createAuthError("auth/wrong-password");
  }

  if (payload.oldPassword === payload.newPassword) {
    throw createAuthError("auth/password-same");
  }

  if (payload.newPassword.length < 6) {
    throw createAuthError("auth/weak-password");
  }

  const updatedUsers = [...users];
  updatedUsers[userIndex] = { ...user, password: payload.newPassword };
  saveLocalUsers(updatedUsers);

  return { success: true };
}

export function subscribeToAuthState(callback: (user: AuthUser | null) => void) {
  const sync = () => callback(toLocalUser(readLocalSession()));
  sync();

  if (typeof window === "undefined") {
    return () => undefined;
  }

  window.addEventListener(LOCAL_AUTH_EVENT, sync);

  return () => {
    window.removeEventListener(LOCAL_AUTH_EVENT, sync);
  };
}
