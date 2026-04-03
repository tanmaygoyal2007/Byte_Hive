import { getApp, getApps, initializeApp } from "firebase/app";
import { connectAuthEmulator, getAuth } from "firebase/auth";
import { connectFirestoreEmulator, getFirestore } from "firebase/firestore";
import { firebaseEmulatorConfig, firebaseWebConfig } from "./config";

const app = getApps().length > 0 ? getApp() : initializeApp(firebaseWebConfig);
const auth = getAuth(app);
const db = getFirestore(app);

let emulatorConnected = false;

if (typeof window !== "undefined" && firebaseEmulatorConfig.useEmulators && !emulatorConnected) {
  connectAuthEmulator(
    auth,
    `http://${firebaseEmulatorConfig.authHost}:${firebaseEmulatorConfig.authPort}`,
    { disableWarnings: true }
  );
  connectFirestoreEmulator(db, firebaseEmulatorConfig.firestoreHost, firebaseEmulatorConfig.firestorePort);
  emulatorConnected = true;
}

export { app, auth, db };
