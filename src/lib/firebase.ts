import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider, signInWithPopup, User } from 'firebase/auth';
import { initializeFirestore, doc, getDocFromServer } from 'firebase/firestore';
import firebaseConfig from '../../firebase-applet-config.json';

// Intercept and suppress benign internal Firestore BloomFilter error logs
const originalConsoleError = console.error;
console.error = (...args: any[]) => {
  const isBloomFilterError = args.some(
    arg => typeof arg === 'string' && (arg.includes('BloomFilter') || arg.includes('Invalid hash count: 0'))
  );
  if (isBloomFilterError) {
    return;
  }
  originalConsoleError(...args);
};

const app = initializeApp(firebaseConfig);

export const db = (firebaseConfig as any).firestoreDatabaseId 
  ? initializeFirestore(app, { experimentalForceLongPolling: true }, (firebaseConfig as any).firestoreDatabaseId)
  : initializeFirestore(app, { experimentalForceLongPolling: true });

export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();
googleProvider.addScope('https://www.googleapis.com/auth/gmail.readonly');
googleProvider.addScope('https://www.googleapis.com/auth/gmail.send');

// Cache the access token in memory.
let cachedAccessToken: string | null = null;
export const getAccessToken = async (): Promise<string | null> => {
  return cachedAccessToken;
};

export const signInWithGoogle = async () => {
  try {
    const result = await signInWithPopup(auth, googleProvider);
    const credential = GoogleAuthProvider.credentialFromResult(result);
    if (credential?.accessToken) {
      cachedAccessToken = credential.accessToken;
    }
    return result;
  } catch (error: any) {
    console.error("Login try error:", error);
    if (error.code === 'auth/unauthorized-domain') {
      alert("Error: Este dominio no está autorizado para iniciar sesión. Por favor autoriza este dominio en tu consola de Firebase (Authentication > Configuración > Dominios autorizados).");
    } else {
      alert(`Error al iniciar sesión: ${error.message}`);
    }
    throw error;
  }
};
