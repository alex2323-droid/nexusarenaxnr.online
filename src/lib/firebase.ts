import { initializeApp } from 'firebase/app';
import { getAuth, User, signInWithEmailAndPassword, createUserWithEmailAndPassword, sendPasswordResetEmail } from 'firebase/auth';
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

export const loginWithEmail = async (email: string, pass: string) => {
  try {
    const result = await signInWithEmailAndPassword(auth, email, pass);
    return result;
  } catch (error: any) {
    console.error("Login try error:", error);
    if (error.code === 'auth/invalid-credential') {
      alert("Error: Correo o contraseña incorrectos.");
    } else {
      alert(`Error al iniciar sesión: ${error.message}`);
    }
    throw error;
  }
};

export const registerWithEmail = async (email: string, pass: string) => {
  try {
    const result = await createUserWithEmailAndPassword(auth, email, pass);
    return result;
  } catch (error: any) {
    console.error("Register try error:", error);
    if (error.code === 'auth/email-already-in-use') {
      alert("Error: Ya existe una cuenta con este correo.");
    } else if (error.code === 'auth/weak-password') {
      alert("Error: La contraseña debe tener al menos 6 caracteres.");
    } else {
      alert(`Error al registrar: ${error.message}`);
    }
    throw error;
  }
};

export const resetPassword = async (email: string) => {
  try {
    await sendPasswordResetEmail(auth, email);
    alert('Se ha enviado un correo para restablecer o crear tu contraseña. Revisa tu bandeja de entrada o spam.');
  } catch (error: any) {
    console.error('Password reset error:', error);
    alert(`Error al enviar el correo: ${error.message}`);
    throw error;
  }
};

