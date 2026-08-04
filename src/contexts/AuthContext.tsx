import React, { createContext, useContext, useEffect, useState } from 'react';
import { onAuthStateChanged, User } from 'firebase/auth';
import { doc, getDoc, setDoc, updateDoc, serverTimestamp, onSnapshot } from 'firebase/firestore';
import { auth, db } from '../lib/firebase';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  isAdmin: boolean;
  profile: any | null;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
  isAdmin: false,
  profile: null,
});

export const useAuth = () => useContext(AuthContext);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [profile, setProfile] = useState<any | null>(null);

  useEffect(() => {
    let unsubscribeProfile: (() => void) | undefined;

    const unsubscribeAuth = onAuthStateChanged(auth, async (user) => {
      setUser(user);
      
      if (unsubscribeProfile) {
        unsubscribeProfile();
        unsubscribeProfile = undefined;
      }

      if (user) {
        try {
          const userRef = doc(db, 'users', user.uid);
          
          let isResolved = false;
          const fallbackTimeout = setTimeout(() => {
            if (!isResolved) {
              setLoading(false);
              isResolved = true;
            }
          }, 4000);

          // Initial setup if doesn't exist
          const userDoc = await getDoc(userRef);
          const adminEmails = ['lila23maria07@gmail.com', 'alexparababi23@gmail.com', 'm04683275@gmail.com'];
          const isUserAdmin = adminEmails.includes(user.email || '');
          setIsAdmin(isUserAdmin);

          if (!userDoc.exists()) {
            const newProfile = {
              uid: user.uid,
              email: user.email,
              displayName: user.displayName || 'Jugador',
              photoURL: user.photoURL || '',
              isAdmin: isUserAdmin,
              platform: 'PC',
              bio: '',
              stats: { wins: 0, losses: 0, tournaments: 0 },
              createdAt: serverTimestamp(),
              isOnline: true,
              lastActive: serverTimestamp()
            };
            await setDoc(userRef, newProfile);
          } else {
            // Update presence for existing user
            await updateDoc(userRef, {
              isOnline: true,
              lastActive: serverTimestamp()
            });
          }

          // Setup presence listeners for window visibility and unload
          const handleVisibilityChange = () => {
            if (document.visibilityState === 'hidden') {
              updateDoc(userRef, { isOnline: false, lastActive: serverTimestamp() }).catch(console.error);
            } else {
              updateDoc(userRef, { isOnline: true, lastActive: serverTimestamp() }).catch(console.error);
            }
          };
          window.addEventListener('visibilitychange', handleVisibilityChange);
          
          const handleBeforeUnload = () => {
            updateDoc(userRef, { isOnline: false, lastActive: serverTimestamp() }).catch(console.error);
          };
          window.addEventListener('beforeunload', handleBeforeUnload);

          // Listen for profile changes
          unsubscribeProfile = onSnapshot(userRef, (docSnap) => {
            isResolved = true;
            clearTimeout(fallbackTimeout);
            if (docSnap.exists()) {
              setProfile(docSnap.data());
            }
            setLoading(false);
          }, (err) => {
            isResolved = true;
            clearTimeout(fallbackTimeout);
            console.error("Profile listen error:", err);
            setLoading(false);
          });
        } catch (error) {
          console.error("Error setting up user profile in auth change:", error);
          const adminEmails = ['lila23maria07@gmail.com', 'alexparababi23@gmail.com', 'm04683275@gmail.com'];
          setIsAdmin(adminEmails.includes(user.email || ''));
          setProfile({
            uid: user.uid,
            email: user.email,
            displayName: user.displayName || 'Jugador',
            photoURL: user.photoURL || '',
            isAdmin: adminEmails.includes(user.email || ''),
            platform: 'PC',
            bio: '',
            stats: { wins: 0, losses: 0, tournaments: 0 },
          });
          setLoading(false);
        }
      } else {
        setIsAdmin(false);
        setProfile(null);
        setLoading(false);
      }
    });

    return () => {
      unsubscribeAuth();
      if (unsubscribeProfile) unsubscribeProfile();
    };
  }, []);

  return (
    <AuthContext.Provider value={{ user, loading, isAdmin, profile }}>
      {children}
    </AuthContext.Provider>
  );
};
