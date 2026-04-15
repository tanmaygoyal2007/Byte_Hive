export type LocalAuthRole = "student" | "faculty";
export type AuthUser = {
  uid: string;
  email: string;
  displayName: string;
};

const LOCAL_AUTH_EVENT = "bytehive-local-auth-changed";
type LocalAuthUserRecord = {
  uid: string;
  email: string;
  password: string;
  displayName: string;
  role: LocalAuthRole;
};

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

function readLocalUsers() {
  return getAuthMemory().users;
}

function saveLocalUsers(users: LocalAuthUserRecord[]) {
  getAuthMemory().users = users;
}

function readLocalSession() {
  const { currentUid, users } = getAuthMemory();
  if (!currentUid) return null;
  return users.find((user) => user.uid === currentUid) ?? null;
}

function saveLocalSession(uid: string | null) {
  getAuthMemory().currentUid = uid;

  if (typeof window !== "undefined") {
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

export function getStoredAuthRole(uid: string) {
  return getAuthMemory().roleByUid.get(uid) ?? null;
}

export function setStoredAuthRole(uid: string, role: LocalAuthRole) {
  getAuthMemory().roleByUid.set(uid, role);
}

export function hasLocalAccount(email: string) {
  const normalizedEmail = email.trim().toLowerCase();
  return readLocalUsers().some((user) => user.email === normalizedEmail);
}

export async function configureAuthPersistence() {
  if (typeof window !== "undefined") {
    localStorage.removeItem("bytehive-local-auth-users");
    localStorage.removeItem("bytehive-local-auth-session");
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
