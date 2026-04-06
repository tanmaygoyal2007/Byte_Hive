import {
  browserLocalPersistence,
  createUserWithEmailAndPassword,
  getAdditionalUserInfo,
  GoogleAuthProvider,
  onAuthStateChanged,
  setPersistence,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut,
  updateProfile,
  type User,
} from "firebase/auth";
import { addDoc, collection, doc, serverTimestamp, setDoc, updateDoc } from "firebase/firestore";
import { auth, db } from "./client";
import { hasRealFirebaseConfig } from "./config";

export type FirebaseAuthRole = "student" | "faculty";

const roleKey = (uid: string) => `bytehive-auth-role:${uid}`;
const LOCAL_AUTH_USERS_KEY = "bytehive-local-auth-users";
const LOCAL_AUTH_SESSION_KEY = "bytehive-local-auth-session";
const LOCAL_AUTH_EVENT = "bytehive-local-auth-changed";
const REQUIRED_EMAIL_SUFFIX = ".christuniversity.in";

type LocalAuthUserRecord = {
  uid: string;
  email: string;
  password: string;
  displayName: string;
  role: FirebaseAuthRole;
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
  } as User;
}

export function getStoredAuthRole(uid: string) {
  return localStorage.getItem(roleKey(uid)) as FirebaseAuthRole | null;
}

export function setStoredAuthRole(uid: string, role: FirebaseAuthRole) {
  localStorage.setItem(roleKey(uid), role);
}

export async function configureAuthPersistence() {
  if (!hasRealFirebaseConfig) return;
  await setPersistence(auth, browserLocalPersistence);
}

function assertCollegeEmail(email?: string | null) {
  const normalizedEmail = email?.trim().toLowerCase() ?? "";
  if (!normalizedEmail.endsWith(REQUIRED_EMAIL_SUFFIX)) {
    throw createAuthError("auth/unauthorized-domain");
  }
}

export async function signupWithEmail(payload: {
  role: FirebaseAuthRole;
  email: string;
  password: string;
  name: string;
}) {
  if (!hasRealFirebaseConfig) {
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

  const credential = await createUserWithEmailAndPassword(auth, payload.email, payload.password);
  const displayName = payload.name.trim() || "ByteHive User";

  await updateProfile(credential.user, { displayName });
  setStoredAuthRole(credential.user.uid, payload.role);

  await setDoc(
    doc(db, "users", credential.user.uid),
    {
      uid: credential.user.uid,
      email: credential.user.email,
      displayName,
      role: payload.role,
      provider: "password",
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
      lastAction: "signup",
    },
    { merge: true }
  );

  await addDoc(collection(db, "authEvents"), {
    uid: credential.user.uid,
    email: credential.user.email,
    role: payload.role,
    action: "signup",
    timestamp: serverTimestamp(),
  });

  return credential.user;
}

export async function loginWithEmail(payload: {
  role: FirebaseAuthRole;
  email: string;
  password: string;
}) {
  if (!hasRealFirebaseConfig) {
    const normalizedEmail = payload.email.trim().toLowerCase();
    const match = readLocalUsers().find((user) => user.email === normalizedEmail);

    if (!match || match.password !== payload.password) {
      throw createAuthError("auth/invalid-credential");
    }

    setStoredAuthRole(match.uid, payload.role);
    saveLocalSession(match.uid);
    return toLocalUser(match);
  }

  const credential = await signInWithEmailAndPassword(auth, payload.email, payload.password);

  setStoredAuthRole(credential.user.uid, payload.role);

  await setDoc(
    doc(db, "users", credential.user.uid),
    {
      uid: credential.user.uid,
      email: credential.user.email,
      displayName: credential.user.displayName,
      role: payload.role,
      provider: "password",
      updatedAt: serverTimestamp(),
      lastAction: "login",
    },
    { merge: true }
  );

  await addDoc(collection(db, "authEvents"), {
    uid: credential.user.uid,
    email: credential.user.email,
    role: payload.role,
    action: "login",
    timestamp: serverTimestamp(),
  });

  return credential.user;
}

export async function loginWithGoogle(role: FirebaseAuthRole) {
  if (!hasRealFirebaseConfig) {
    throw createAuthError("auth/google-requires-firebase");
  }

  const provider = new GoogleAuthProvider();
  provider.setCustomParameters({
    prompt: "select_account",
  });

  const credential = await signInWithPopup(auth, provider);
  const email = credential.user.email;

  try {
    assertCollegeEmail(email);
  } catch (error) {
    await signOut(auth).catch(() => undefined);
    throw error;
  }

  setStoredAuthRole(credential.user.uid, role);

  const additionalInfo = getAdditionalUserInfo(credential);
  const action = additionalInfo?.isNewUser ? "google-signup" : "google-login";

  await setDoc(
    doc(db, "users", credential.user.uid),
    {
      uid: credential.user.uid,
      email: credential.user.email,
      displayName: credential.user.displayName,
      role,
      provider: "google",
      updatedAt: serverTimestamp(),
      createdAt: additionalInfo?.isNewUser ? serverTimestamp() : undefined,
      lastAction: action,
    },
    { merge: true }
  );

  await addDoc(collection(db, "authEvents"), {
    uid: credential.user.uid,
    email: credential.user.email,
    role,
    action,
    timestamp: serverTimestamp(),
  });

  return credential.user;
}

export async function logoutUser() {
  if (!hasRealFirebaseConfig) {
    saveLocalSession(null);
    return;
  }

  const currentUser = auth.currentUser;
  const currentRole = currentUser ? getStoredAuthRole(currentUser.uid) : null;

  if (currentUser) {
    await updateDoc(doc(db, "users", currentUser.uid), {
      updatedAt: serverTimestamp(),
      lastAction: "logout",
    }).catch(() => undefined);

    await addDoc(collection(db, "authEvents"), {
      uid: currentUser.uid,
      email: currentUser.email,
      role: currentRole,
      action: "logout",
      timestamp: serverTimestamp(),
    }).catch(() => undefined);
  }

  await signOut(auth);
}

export function subscribeToAuthState(callback: (user: User | null) => void) {
  if (!hasRealFirebaseConfig) {
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

  return onAuthStateChanged(auth, callback);
}
