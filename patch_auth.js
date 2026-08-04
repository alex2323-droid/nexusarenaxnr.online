const fs = require('fs');
let code = fs.readFileSync('src/contexts/AuthContext.tsx', 'utf8');

code = code.replace(
  "import { doc, getDoc, setDoc, serverTimestamp, onSnapshot } from 'firebase/firestore';",
  "import { doc, getDoc, setDoc, updateDoc, serverTimestamp, onSnapshot } from 'firebase/firestore';"
);

code = code.replace(
  "await setDoc(userRef, newProfile);",
  "await setDoc(userRef, newProfile);\n          } else {\n            await updateDoc(userRef, { isOnline: true, lastActive: serverTimestamp() });\n          }"
);

code = code.replace(
  "setLoading(false);",
  "setLoading(false);\n\n          // Handle presence on disconnect (best effort for browser)\n          const handleVisibilityChange = () => {\n            if (document.visibilityState === 'hidden') {\n              updateDoc(userRef, { isOnline: false, lastActive: serverTimestamp() }).catch(console.error);\n            } else {\n              updateDoc(userRef, { isOnline: true, lastActive: serverTimestamp() }).catch(console.error);\n            }\n          };\n          window.addEventListener('visibilitychange', handleVisibilityChange);\n\n          const handleBeforeUnload = () => {\n            updateDoc(userRef, { isOnline: false, lastActive: serverTimestamp() }).catch(console.error);\n          };\n          window.addEventListener('beforeunload', handleBeforeUnload);\n"
);

// Oh wait, the setLoading(false) replacement might be matched twice. Let me do it carefully.
