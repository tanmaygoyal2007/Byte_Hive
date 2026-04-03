import {
  browserLocalPersistence,
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  setPersistence,
  signInWithEmailAndPassword,
  signOut,
  updateProfile,
  type User,
} from "firebase/auth";
import { addDoc, collection, doc, serverTimestamp, setDoc, updateDoc } from "firebase/firestore";
import { auth, db } from "./client";

export type FirebaseAuthRole = "student" | "faculty";

const roleKey = (uid: string) => `bytehive-auth-role:${uid}`;

export function getStoredAuthRole(uid: string) {
  return localStorage.getItem(roleKey(uid)) as FirebaseAuthRole | null;
}

export function setStoredAuthRole(uid: string, role: FirebaseAuthRole) {
  localStorage.setItem(roleKey(uid), role);
}

export async function configureAuthPersistence() {
  await setPersistence(auth, browserLocalPersistence);
}

export async function signupWithEmail(payload: {
  role: FirebaseAuthRole;
  email: string;
  password: string;
  name: string;
}) {
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

export async function logoutUser() {
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
  return onAuthStateChanged(auth, callback);
}
