export const firebaseWebConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY ?? "demo-api-key",
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN ?? "demo-bytehive.firebaseapp.com",
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID ?? "demo-bytehive",
  appId: import.meta.env.VITE_FIREBASE_APP_ID ?? "1:1234567890:web:demo-bytehive",
};

export const hasRealFirebaseConfig = Boolean(
  firebaseWebConfig.apiKey &&
  firebaseWebConfig.authDomain &&
  firebaseWebConfig.projectId &&
  firebaseWebConfig.appId &&
  firebaseWebConfig.apiKey !== "demo-api-key" &&
  firebaseWebConfig.authDomain !== "demo-bytehive.firebaseapp.com" &&
  firebaseWebConfig.projectId !== "demo-bytehive" &&
  firebaseWebConfig.appId !== "1:1234567890:web:demo-bytehive"
);

export const firebaseEmulatorConfig = {
  useEmulators: import.meta.env.VITE_FIREBASE_AUTH_EMULATOR === "true",
  authHost: import.meta.env.VITE_FIREBASE_AUTH_EMULATOR_HOST ?? "127.0.0.1",
  authPort: Number(import.meta.env.VITE_FIREBASE_AUTH_EMULATOR_PORT ?? "9099"),
  firestoreHost: import.meta.env.VITE_FIREBASE_FIRESTORE_EMULATOR_HOST ?? "127.0.0.1",
  firestorePort: Number(import.meta.env.VITE_FIREBASE_FIRESTORE_EMULATOR_PORT ?? "8080"),
};
