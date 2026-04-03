import { adminAuth } from "./firebase-admin";

export type VerifiedFirebaseUser = {
  uid: string;
  email: string | null;
  displayName: string | null;
  provider: string | null;
};

function getProviderName(decodedToken: Record<string, unknown>) {
  const firebaseData = decodedToken.firebase as { sign_in_provider?: string; identities?: Record<string, unknown> } | undefined;
  if (!firebaseData) return null;
  if (firebaseData.identities?.email) return "password";
  return firebaseData.sign_in_provider ?? null;
}

export async function verifyFirebaseIdToken(idToken: string): Promise<VerifiedFirebaseUser> {
  const decodedToken = await adminAuth.verifyIdToken(idToken);

  return {
    uid: decodedToken.uid,
    email: decodedToken.email ?? null,
    displayName: decodedToken.name ?? null,
    provider: getProviderName(decodedToken as unknown as Record<string, unknown>),
  };
}

export function getBearerToken(authorization: string | null) {
  if (!authorization?.startsWith("Bearer ")) {
    throw new Error("Missing Bearer token.");
  }

  const token = authorization.replace("Bearer ", "").trim();
  if (!token) {
    throw new Error("Missing Bearer token.");
  }

  return token;
}
