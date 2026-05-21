import { db, auth } from '../lib/firebase';
import axios from 'axios';
import { 
  collection, 
  doc, 
  getDocs, 
  getDoc, 
  addDoc, 
  setDoc, 
  updateDoc, 
  deleteDoc, 
  query, 
  where, 
  orderBy, 
  limit, 
  startAfter,
  QueryDocumentSnapshot,
  onSnapshot,
  serverTimestamp,
  increment
} from 'firebase/firestore';
import { handleFirestoreError, OperationType } from '../lib/utils';

export const tournamentService = {
  async getPaginated(pageSize: number, lastVisibleDoc?: QueryDocumentSnapshot) {
    const path = 'tournaments';
    try {
      let q = query(
        collection(db, path), 
        orderBy('startDate', 'desc'), 
        limit(pageSize)
      );

      if (lastVisibleDoc) {
        q = query(q, startAfter(lastVisibleDoc));
      }

      const snapshot = await getDocs(q);
      const tournaments = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      const lastDoc = snapshot.docs[snapshot.docs.length - 1];
      
      return {
        tournaments,
        lastDoc,
        hasMore: snapshot.docs.length === pageSize
      };
    } catch (error) {
      handleFirestoreError(error, OperationType.LIST, path, auth);
      return { tournaments: [], lastDoc: null, hasMore: false };
    }
  },

  async getAll() {
    const path = 'tournaments';
    try {
      const q = query(collection(db, path), orderBy('startDate', 'desc'));
      const snapshot = await getDocs(q);
      return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    } catch (error) {
      handleFirestoreError(error, OperationType.LIST, path, auth);
    }
  },

  async getById(id: string) {
    const path = `tournaments/${id}`;
    try {
      const docSnap = await getDoc(doc(db, 'tournaments', id));
      return docSnap.exists() ? { id: docSnap.id, ...docSnap.data() } : null;
    } catch (error) {
      handleFirestoreError(error, OperationType.GET, path, auth);
    }
  },

  listenTournament(id: string, callback: (tournament: any) => void) {
    const path = `tournaments/${id}`;
    return onSnapshot(doc(db, 'tournaments', id), (docSnap) => {
      callback(docSnap.exists() ? { id: docSnap.id, ...docSnap.data() } : null);
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, path, auth);
    });
  },

  async create(data: any) {
    const path = 'tournaments';
    try {
      // Validate bannerImage
      let validatedBannerImage = data.bannerImage;
      const isValidUrl = (url: string) => {
        try {
          const parsed = new URL(url);
          return parsed.protocol === 'http:' || parsed.protocol === 'https:' || parsed.protocol === 'data:';
        } catch {
          return false;
        }
      };

      if (!validatedBannerImage || !isValidUrl(validatedBannerImage)) {
        // Default placeholder for tournaments if invalid or missing
        validatedBannerImage = 'https://images.unsplash.com/photo-1542751371-adc38448a05e?auto=format&fit=crop&q=80';
      }

      return await addDoc(collection(db, path), {
        ...data,
        bannerImage: validatedBannerImage,
        createdAt: serverTimestamp(),
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, path, auth);
    }
  },

  async registerParticipant(tournamentId: string, userId: string, userName: string, photoURL: string, paymentCode: string, gameId?: string, gameNick?: string) {
    const path = `tournaments/${tournamentId}/participants/${userId}`;
    try {
      await setDoc(doc(db, 'tournaments', tournamentId, 'participants', userId), {
        userId,
        userName,
        photoURL,
        registeredAt: serverTimestamp(),
        paymentStatus: 'approved',
        paymentCode,
        gameId: gameId || '',
        gameNick: gameNick || ''
      });
      await updateDoc(doc(db, 'tournaments', tournamentId), {
        registeredParticipants: increment(1)
      });

      // Fetch tournament data for notification content
      const tournamentSnap = await getDoc(doc(db, 'tournaments', tournamentId));
      const tournamentData = tournamentSnap.exists() ? tournamentSnap.data() : null;

      // Notify participant
      if (tournamentData) {
        await userService.sendNotification(
          userId,
          'Registro Confirmado',
          `Te has inscrito exitosamente en el torneo "${tournamentData.name}". ¡Prepárate para la batalla!`,
          'registration_success',
          `/tournament/${tournamentId}`
        );
      }

      // Notify tournament creator
      try {
        if (tournamentSnap.exists()) {
          if (tournamentData.createdBy && tournamentData.createdBy !== userId) {
            await userService.sendNotification(
              tournamentData.createdBy,
              'Nuevo Participante',
              `${userName} se ha inscrito en tu torneo "${tournamentData.name}".`,
              'registration',
              `/tournament/${tournamentId}`
            );

            // Send email to creator
            try {
              const creatorSnap = await getDoc(doc(db, 'users', tournamentData.createdBy));
              const creatorData = creatorSnap.exists() ? creatorSnap.data() : null;
              if (creatorData?.email) {
                await axios.post('/api/emails/new-participant', {
                  creatorEmail: creatorData.email,
                  creatorName: creatorData.displayName,
                  participantName: userName,
                  tournamentName: tournamentData.name,
                  isPaid: false
                });
              }
            } catch (err) {
              console.error('Error sending email to tournament creator:', err);
            }
          }
        }
      } catch (err) {
        console.error('Error sending registration notification to creator:', err);
      }
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, path, auth);
    }
  },

  async startTournament(tournamentId: string) {
    const path = `tournaments/${tournamentId}`;
    try {
      await updateDoc(doc(db, 'tournaments', tournamentId), {
        status: 'ongoing',
        updatedAt: serverTimestamp(),
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, path, auth);
    }
  },

  listenParticipant(tournamentId: string, userId: string, callback: (participant: any) => void) {
    const path = `tournaments/${tournamentId}/participants/${userId}`;
    return onSnapshot(doc(db, 'tournaments', tournamentId, 'participants', userId), (docSnap) => {
      callback(docSnap.exists() ? { id: docSnap.id, ...docSnap.data() } : null);
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, path, auth);
    });
  },

  async setTypingStatus(tournamentId: string, userId: string, userName: string, isTyping: boolean) {
    const path = `tournaments/${tournamentId}/participants/${userId}`;
    try {
      await setDoc(doc(db, 'tournaments', tournamentId, 'participants', userId), {
        userName,
        isTyping,
        lastTypingAt: serverTimestamp()
      }, { merge: true });
    } catch (error) {
      // Quietly fail for typing status to avoid disruptive errors
      console.error('Error updating typing status:', error);
    }
  },

  listenTypingParticipants(tournamentId: string, currentUserId: string, callback: (users: any[]) => void) {
    const path = `tournaments/${tournamentId}/participants`;
    const q = query(
      collection(db, 'tournaments', tournamentId, 'participants'),
      where('isTyping', '==', true)
    );

    return onSnapshot(q, (snapshot) => {
      const typingUsers = snapshot.docs
        .map(doc => ({ id: doc.id, ...doc.data() }))
        .filter((u: any) => u.id !== currentUserId);
      callback(typingUsers);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, path, auth);
    });
  },

  async isRegistered(tournamentId: string, userId: string) {
    const path = `tournaments/${tournamentId}/participants/${userId}`;
    try {
      const docSnap = await getDoc(doc(db, 'tournaments', tournamentId, 'participants', userId));
      return docSnap.exists();
    } catch (error) {
      handleFirestoreError(error, OperationType.GET, path, auth);
    }
  },

  async requestRegistrationWithPayment(tournamentId: string, userId: string, userName: string, photoURL: string, paymentReference: string, paymentCode: string, gameId?: string, gameNick?: string) {
    const path = `tournaments/${tournamentId}/participants/${userId}`;
    try {
      await setDoc(doc(db, 'tournaments', tournamentId, 'participants', userId), {
        userId,
        userName,
        photoURL,
        registeredAt: serverTimestamp(),
        paymentStatus: 'pending',
        paymentReference,
        paymentCode,
        gameId: gameId || '',
        gameNick: gameNick || ''
      });

      // Notify tournament creator about pending payment
      try {
        const tournamentSnap = await getDoc(doc(db, 'tournaments', tournamentId));
        if (tournamentSnap.exists()) {
          const tournamentData = tournamentSnap.data();
          if (tournamentData.createdBy && tournamentData.createdBy !== userId) {
            await userService.sendNotification(
              tournamentData.createdBy,
              'Nuevo Pago Pendiente',
              `${userName} ha solicitado inscribirse en "${tournamentData.name}". Por favor, valida el pago.`,
              'payment_pending'
            );

            // Send email to creator
            try {
              const creatorSnap = await getDoc(doc(db, 'users', tournamentData.createdBy));
              const creatorData = creatorSnap.exists() ? creatorSnap.data() : null;
              if (creatorData?.email) {
                await axios.post('/api/emails/new-participant', {
                  creatorEmail: creatorData.email,
                  creatorName: creatorData.displayName,
                  participantName: userName,
                  tournamentName: tournamentData.name,
                  isPaid: true
                });
              }
            } catch (err) {
              console.error('Error sending email to tournament creator:', err);
            }
          }
        }
      } catch (err) {
        console.error('Error sending payment requested notification to creator:', err);
      }
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, path, auth);
    }
  },

  async approvePayment(tournamentId: string, userId: string, code: string) {
    const path = `tournaments/${tournamentId}/participants/${userId}`;
    try {
      await updateDoc(doc(db, 'tournaments', tournamentId, 'participants', userId), {
        paymentStatus: 'approved',
        paymentCode: code,
        approvedAt: serverTimestamp()
      });
      await updateDoc(doc(db, 'tournaments', tournamentId), {
        registeredParticipants: increment(1)
      });

      // Notify participant
      const tournamentSnap = await getDoc(doc(db, 'tournaments', tournamentId));
      if (tournamentSnap.exists()) {
        const tournamentData = tournamentSnap.data();
        await userService.sendNotification(
          userId,
          'Pago Aprobado',
          `Tu pago para el torneo "${tournamentData.name}" ha sido aprobado. ¡Ya estás oficialmente inscrito! Código: ${code}`,
          'payment_approved',
          `/tournament/${tournamentId}`
        );
      }
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, path, auth);
    }
  },

  async rejectPayment(tournamentId: string, userId: string) {
    const path = `tournaments/${tournamentId}/participants/${userId}`;
    try {
      await updateDoc(doc(db, 'tournaments', tournamentId, 'participants', userId), {
        paymentStatus: 'rejected',
        rejectedAt: serverTimestamp()
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, path, auth);
    }
  },

  async getParticipant(tournamentId: string, userId: string) {
    const path = `tournaments/${tournamentId}/participants/${userId}`;
    try {
      const docSnap = await getDoc(doc(db, 'tournaments', tournamentId, 'participants', userId));
      return docSnap.exists() ? { id: docSnap.id, ...docSnap.data() } : null;
    } catch (error) {
      handleFirestoreError(error, OperationType.GET, path, auth);
    }
  },

  async getParticipants(tournamentId: string) {
    const path = `tournaments/${tournamentId}/participants`;
    try {
      const q = query(collection(db, 'tournaments', tournamentId, 'participants'));
      const snapshot = await getDocs(q);
      return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    } catch (error) {
      handleFirestoreError(error, OperationType.LIST, path, auth);
    }
  },

  listenAllParticipants(tournamentId: string, callback: (participants: any[]) => void) {
    const q = query(collection(db, 'tournaments', tournamentId, 'participants'), orderBy('registeredAt', 'desc'));
    return onSnapshot(q, (snapshot) => {
      callback(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, `tournaments/${tournamentId}/participants`, auth);
    });
  },

  async markChatWelcomeVisible(tournamentId: string, userId: string) {
    const path = `tournaments/${tournamentId}/participants/${userId}`;
    try {
      await updateDoc(doc(db, 'tournaments', tournamentId, 'participants', userId), {
        chatWelcomeSent: true
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, path, auth);
    }
  },

  async completeTournament(tournamentId: string, winnerId: string) {
    const path = `tournaments/${tournamentId}`;
    try {
      await updateDoc(doc(db, 'tournaments', tournamentId), {
        status: 'completed',
        winnerId,
        updatedAt: serverTimestamp(),
      });

      // Give winner credit for winning the tournament
      const winnerRef = doc(db, 'users', winnerId);
      await setDoc(winnerRef, {
        stats: {
          tournaments: increment(1)
        }
      }, { merge: true });
      
      console.log(`Tournament ${tournamentId} completed. Winner: ${winnerId}`);
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, path, auth);
    }
  },

  async update(id: string, data: any) {
    const path = `tournaments/${id}`;
    try {
      await updateDoc(doc(db, 'tournaments', id), {
        ...data,
        updatedAt: serverTimestamp(),
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, path, auth);
    }
  },

  async delete(id: string) {
    const path = `tournaments/${id}`;
    try {
      // 1. Delete all matches
      const matchesSnapshot = await getDocs(collection(db, 'tournaments', id, 'matches'));
      const matchDeletions = matchesSnapshot.docs.map(d => deleteDoc(d.ref));
      
      // 2. Delete all participants
      const participantsSnapshot = await getDocs(collection(db, 'tournaments', id, 'participants'));
      const participantDeletions = participantsSnapshot.docs.map(d => deleteDoc(d.ref));
      
      // 3. Delete all chat messages
      const chatSnapshot = await getDocs(collection(db, 'tournaments', id, 'chat'));
      const chatDeletions = chatSnapshot.docs.map(d => deleteDoc(d.ref));

      // Execute all subcollection deletions
      await Promise.all([...matchDeletions, ...participantDeletions, ...chatDeletions]);

      // 4. Finally delete the tournament document
      await deleteDoc(doc(db, 'tournaments', id));
      
      console.log(`Tournament ${id} and all its subcollections deleted successfully`);
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, path, auth);
    }
  },

  listenTournaments(callback: (tournaments: any[]) => void) {
    const q = query(collection(db, 'tournaments'), orderBy('startDate', 'desc'));
    return onSnapshot(q, (snapshot) => {
      callback(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'tournaments', auth);
    });
  },

  subscribeToRecent(pageSize: number, callback: (data: { tournaments: any[], lastDoc: QueryDocumentSnapshot | null }) => void) {
    const q = query(
      collection(db, 'tournaments'), 
      orderBy('startDate', 'desc'), 
      limit(pageSize)
    );
    return onSnapshot(q, (snapshot) => {
      const tournaments = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      const lastDoc = snapshot.docs[snapshot.docs.length - 1] || null;
      callback({ tournaments, lastDoc });
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'tournaments', auth);
    });
  }
};

export const matchService = {
  listenMatches(tournamentId: string, callback: (matches: any[]) => void) {
    const q = query(
      collection(db, 'tournaments', tournamentId, 'matches'),
      orderBy('round', 'asc')
    );
    return onSnapshot(q, (snapshot) => {
      callback(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, `tournaments/${tournamentId}/matches`, auth);
    });
  },

  async createMatch(tournamentId: string, data: any) {
    const path = `tournaments/${tournamentId}/matches`;
    try {
      return await addDoc(collection(db, 'tournaments', tournamentId, 'matches'), {
        ...data,
        status: 'pending',
        updatedAt: serverTimestamp(),
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, path, auth);
    }
  },

  async updateMatch(tournamentId: string, matchId: string, data: any) {
    const path = `tournaments/${tournamentId}/matches/${matchId}`;
    try {
      const matchRef = doc(db, 'tournaments', tournamentId, 'matches', matchId);
      const matchDoc = await getDoc(matchRef);
      
      if (!matchDoc.exists()) return;
      const oldMatch = matchDoc.data();

      // If completing a match, move winner to next round
      if (data.status === 'completed' && oldMatch.status !== 'completed' && data.winnerId) {
        // Move winner to next match if exists
        if (oldMatch.nextMatchId) {
          const nextMatchRef = doc(db, 'tournaments', tournamentId, 'matches', oldMatch.nextMatchId);
          const nextMatchDoc = await getDoc(nextMatchRef);
          
          if (nextMatchDoc.exists()) {
            const nextMatchData: any = nextMatchDoc.data();
            const winnerName = data.winnerId === oldMatch.player1Id ? oldMatch.player1Name : oldMatch.player2Name;
            const winnerPhotoURL = data.winnerId === oldMatch.player1Id ? oldMatch.player1PhotoURL : oldMatch.player2PhotoURL;
            
            // Determine if winner goes to player1 slot or player2 slot in next match
            // We can use the matchIndex parity for this
            const isPlayer1Slot = oldMatch.matchIndex % 2 === 0;
            
            await updateDoc(nextMatchRef, {
              [isPlayer1Slot ? 'player1Id' : 'player2Id']: data.winnerId,
              [isPlayer1Slot ? 'player1Name' : 'player2Name']: winnerName,
              [isPlayer1Slot ? 'player1PhotoURL' : 'player2PhotoURL']: winnerPhotoURL,
              status: (isPlayer1Slot ? nextMatchData.player2Id : nextMatchData.player1Id) ? 'ongoing' : 'pending',
              updatedAt: serverTimestamp()
            });
          }
        }
      }

      await updateDoc(matchRef, {
        ...data,
        updatedAt: serverTimestamp(),
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, path, auth);
    }
  }
};

export const bracketService = {
  async generateBracket(tournamentId: string) {
    const path = `tournaments/${tournamentId}/matches`;
    try {
      // 1. Get approved participants
      const participants = (await tournamentService.getParticipants(tournamentId)) as any[];
      const approved = (participants || []).filter((p: any) => p.paymentStatus === 'approved');
      
      if (approved.length < 2) throw new Error('Se necesitan al menos 2 participantes aprobados');

      // 2. Determine bracket size (next power of 2)
      const participantCount = approved.length;
      let bracketSize = 1;
      while (bracketSize < participantCount) bracketSize *= 2;
      
      const rounds = Math.log2(bracketSize);
      
      // Shuffle participants for random seeding
      const shuffled = [...approved].sort(() => Math.random() - 0.5);

      const matchesByRound: any[][] = [];
      
      // 3. Generate matches for all rounds
      for (let r = 0; r < rounds; r++) {
        const matchesInRound = bracketSize / Math.pow(2, r + 1);
        matchesByRound[r] = [];
        
        for (let i = 0; i < matchesInRound; i++) {
          const matchId = `r${r}-m${i}`;
          const matchData: any = {
            id: matchId,
            tournamentId,
            round: r,
            matchIndex: i,
            status: 'pending',
            player1Id: null,
            player1Name: 'POR DETERMINAR',
            player1PhotoURL: null,
            player2Id: null,
            player2Name: 'POR DETERMINAR',
            player2PhotoURL: null,
            nextMatchId: r < rounds - 1 ? `r${r+1}-m${Math.floor(i / 2)}` : null
          };

          // Populate Round 0 with players or byes
          if (r === 0) {
            const p1Idx = i * 2;
            const p2Idx = i * 2 + 1;
            
            if (p1Idx < participantCount) {
              matchData.player1Id = shuffled[p1Idx].userId;
              matchData.player1Name = shuffled[p1Idx].userName;
              matchData.player1PhotoURL = shuffled[p1Idx].photoURL;
            }
            
            if (p2Idx < participantCount) {
              matchData.player2Id = shuffled[p2Idx].userId;
              matchData.player2Name = shuffled[p2Idx].userName;
              matchData.player2PhotoURL = shuffled[p2Idx].photoURL;
            } else {
              // Bye situation
              matchData.status = 'bye';
              matchData.winnerId = matchData.player1Id;
              matchData.winnerName = matchData.player1Name;
              matchData.winnerPhotoURL = matchData.player1PhotoURL;
              matchData.player2Name = 'BYE';
            }
          }

          matchesByRound[r].push(matchData);
        }
      }

      // 4. Save matches to Firestore
      const batchPromises = [];
      for (const round of matchesByRound) {
        for (const match of round) {
          batchPromises.push(setDoc(doc(db, 'tournaments', tournamentId, 'matches', match.id), {
            ...match,
            updatedAt: serverTimestamp()
          }));
        }
      }
      
      await Promise.all(batchPromises);

      // Handle byes: advance players immediately
      const byes = matchesByRound[0].filter(m => m.status === 'bye');
      for (const match of byes) {
        if (match.nextMatchId) {
          const nextMatchRef = doc(db, 'tournaments', tournamentId, 'matches', match.nextMatchId);
          const nextMatchDoc = await getDoc(nextMatchRef);
          if (nextMatchDoc.exists()) {
             const isPlayer1Slot = match.matchIndex % 2 === 0;
             await updateDoc(nextMatchRef, {
               [isPlayer1Slot ? 'player1Id' : 'player2Id']: match.player1Id,
               [isPlayer1Slot ? 'player1Name' : 'player2Name']: match.player1Name,
               [isPlayer1Slot ? 'player1PhotoURL' : 'player2PhotoURL']: match.player1PhotoURL,
               updatedAt: serverTimestamp()
             });
          }
        }
      }

      console.log(`Bracket generated for tournament ${tournamentId}`);
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, path, auth);
    }
  },

  listenMatches(tournamentId: string, callback: (matches: any[]) => void) {
    const q = query(
      collection(db, 'tournaments', tournamentId, 'matches'),
      orderBy('round', 'asc'),
      orderBy('matchIndex', 'asc')
    );
    return onSnapshot(q, (snapshot) => {
      callback(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, `tournaments/${tournamentId}/matches`, auth);
    });
  }
};

export const chatService = {
  listenMessages(tournamentId: string, callback: (messages: any[]) => void) {
    const q = query(
      collection(db, 'tournaments', tournamentId, 'chat'), 
      orderBy('createdAt', 'asc')
    );
    return onSnapshot(q, (snapshot) => {
      callback(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, `tournaments/${tournamentId}/chat`, auth);
    });
  },

  async sendMessage(tournamentId: string, message: string, userId: string, userName: string, senderPhotoURL: string, isSystem: boolean = false, replyTo?: any) {
    const path = `tournaments/${tournamentId}/chat`;
    try {
      await addDoc(collection(db, 'tournaments', tournamentId, 'chat'), {
        tournamentId,
        senderId: isSystem ? 'system' : userId,
        senderName: isSystem ? 'Sistema' : userName,
        senderPhotoURL: isSystem ? 'https://api.dicebear.com/7.x/bottts/svg?seed=system' : senderPhotoURL,
        message,
        isSystem,
        replyTo: replyTo ? {
          id: replyTo.id,
          message: replyTo.message,
          senderName: replyTo.senderName
        } : null,
        createdAt: serverTimestamp(),
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, path, auth);
    }
  },

  async updateMessage(tournamentId: string, messageId: string, newMessage: string) {
    const path = `tournaments/${tournamentId}/chat/${messageId}`;
    try {
      await updateDoc(doc(db, 'tournaments', tournamentId, 'chat', messageId), {
        message: newMessage,
        updatedAt: serverTimestamp(),
        isEdited: true
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, path, auth);
    }
  }
};

export const userService = {
  async updateProfile(userId: string, data: any) {
    const path = `users/${userId}`;
    try {
      await updateDoc(doc(db, 'users', userId), data);
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, path, auth);
    }
  },

  listenNotifications(userId: string, callback: (notifications: any[]) => void) {
    const q = query(
      collection(db, 'users', userId, 'notifications'), 
      orderBy('createdAt', 'desc')
    );
    return onSnapshot(q, (snapshot) => {
      callback(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, `users/${userId}/notifications`, auth);
    });
  },

  async sendNotification(userId: string, title: string, content: string, type: string = 'info', link?: string) {
    const path = `users/${userId}/notifications`;
    try {
      await addDoc(collection(db, 'users', userId, 'notifications'), {
        title,
        content,
        type,
        link: link || null,
        read: false,
        createdAt: serverTimestamp(),
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, path, auth);
    }
  },

  async markNotificationAsRead(userId: string, notificationId: string) {
    const path = `users/${userId}/notifications/${notificationId}`;
    try {
      await updateDoc(doc(db, 'users', userId, 'notifications', notificationId), {
        read: true
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, path, auth);
    }
  },

  async markAllNotificationsAsRead(userId: string) {
    const path = `users/${userId}/notifications`;
    try {
      const q = query(collection(db, path), where('read', '==', false));
      const snapshot = await getDocs(q);
      const batchPromises = snapshot.docs.map(doc => updateDoc(doc.ref, { read: true }));
      await Promise.all(batchPromises);
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, path, auth);
    }
  },

  async searchUsers(searchTerm: string) {
    const path = 'users';
    try {
      // Basic search by display name (case sensitive in Firestore unfortunately without extra fields)
      // For a better search, we'd need a lowercase field or Algolia, but for now we'll do what we can.
      const q = query(
        collection(db, path),
        where('displayName', '>=', searchTerm),
        where('displayName', '<=', searchTerm + '\uf8ff'),
        limit(10)
      );
      const snapshot = await getDocs(q);
      return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    } catch (error) {
      handleFirestoreError(error, OperationType.LIST, path, auth);
      return [];
    }
  },

  async getUserById(userId: string) {
    const path = `users/${userId}`;
    try {
      const docSnap = await getDoc(doc(db, 'users', userId));
      return docSnap.exists() ? { id: docSnap.id, ...docSnap.data() } : null;
    } catch (error) {
      handleFirestoreError(error, OperationType.GET, path, auth);
    }
  },

  async updateStats(userId: string, stats: { wins?: number, losses?: number, tournaments?: number, points?: number }) {
    const path = `users/${userId}`;
    try {
      await updateDoc(doc(db, 'users', userId), {
        "stats.wins": stats.wins !== undefined ? stats.wins : 0,
        "stats.losses": stats.losses !== undefined ? stats.losses : 0,
        "stats.tournaments": stats.tournaments !== undefined ? stats.tournaments : 0,
        "stats.points": stats.points !== undefined ? stats.points : 0,
        updatedAt: serverTimestamp()
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, path, auth);
    }
  },

  async incrementStat(userId: string, stat: 'wins' | 'losses' | 'tournaments' | 'points', amount: number = 1) {
    const path = `users/${userId}`;
    try {
      await updateDoc(doc(db, 'users', userId), {
        [`stats.${stat}`]: increment(amount),
        updatedAt: serverTimestamp()
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, path, auth);
    }
  },

  async awardTournamentPlacement(userId: string, tournamentId: string, tournamentName: string, placement: number, points?: number) {
    const path = `users/${userId}`;
    try {
      // Award points and stats based on placement
      // Default points if not provided: 1st: 100, 2nd: 50, 3rd: 25, others: 10
      const winsToAdd = placement === 1 ? 1 : 0;
      let pointsToAdd = points;
      
      if (pointsToAdd === undefined) {
        pointsToAdd = placement === 1 ? 100 : placement === 2 ? 50 : placement === 3 ? 25 : 10;
      }
      
      // 1. Update User Stats
      await updateDoc(doc(db, 'users', userId), {
        [`stats.wins`]: increment(winsToAdd),
        [`stats.points`]: increment(pointsToAdd),
        [`stats.tournaments`]: increment(1),
        updatedAt: serverTimestamp()
      });
      
      // 2. Update Participant record in the tournament
      try {
        await updateDoc(doc(db, 'tournaments', tournamentId, 'participants', userId), {
          placement,
          pointsAwarded: pointsToAdd,
          awardedAt: serverTimestamp()
        });
      } catch (e) {
        console.error('Error updating participant placement:', e);
      }
      
      const placementText = placement === 1 ? '🥇 1er Lugar' : 
                          placement === 2 ? '🥈 2do Lugar' : 
                          placement === 3 ? '🥉 3er Lugar' : 
                          `${placement}er Lugar`;
      
      await this.sendNotification(
        userId,
        '¡Resultado de Torneo!',
        `Has obtenido el ${placementText} (+${pointsToAdd} pts) en el torneo "${tournamentName}".`,
        'tournament_reward'
      );
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, path, auth);
    }
  }
};

export const friendService = {
  async sendRequest(fromUser: any, toUser: any) {
    // Generate a deterministic ID based on sorted UIDs to avoid duplicates
    const ids = [fromUser.uid, toUser.id].sort();
    const requestId = ids.join('_');
    const path = `friendRequests/${requestId}`;
    
    try {
      // Check if already friends
      const friendDoc = await getDoc(doc(db, 'users', fromUser.uid, 'friends', toUser.id));
      if (friendDoc.exists()) {
        throw new Error('Ya son amigos');
      }

      // Check if request already pending or accepted
      const reqSnap = await getDoc(doc(db, 'friendRequests', requestId));
      if (reqSnap.exists()) {
        const data = reqSnap.data();
        if (data.status === 'pending') {
          if (data.fromId === fromUser.uid) {
            throw new Error('Solicitud ya enviada');
          } else {
            throw new Error('Ya tienes una solicitud pendiente de este usuario');
          }
        }
        if (data.status === 'accepted') {
          throw new Error('Ya son amigos');
        }
      }

      await setDoc(doc(db, 'friendRequests', requestId), {
        fromId: fromUser.uid,
        fromName: fromUser.displayName,
        fromPhotoURL: fromUser.photoURL,
        toId: toUser.id,
        toName: toUser.displayName,
        status: 'pending',
        createdAt: serverTimestamp()
      });

      // Send notification to recipient
      await userService.sendNotification(
        toUser.id,
        'Nueva solicitud de amistad',
        `${fromUser.displayName} te ha enviado una solicitud de amistad.`,
        'friend_request',
        '/profile'
      );
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, path, auth);
    }
  },

  async acceptRequest(request: any, currentUser: any) {
    const path = `friendRequests/${request.id}`;
    try {
      // Update request status
      await updateDoc(doc(db, 'friendRequests', request.id), {
        status: 'accepted',
        acceptedAt: serverTimestamp()
      });

      // Add to current user's friends
      await setDoc(doc(db, 'users', currentUser.uid, 'friends', request.fromId), {
        uid: request.fromId,
        displayName: request.fromName,
        photoURL: request.fromPhotoURL,
        addedAt: serverTimestamp()
      });

      // Add current user to requester's friends
      await setDoc(doc(db, 'users', request.fromId, 'friends', currentUser.uid), {
        uid: currentUser.uid,
        displayName: currentUser.displayName,
        photoURL: currentUser.photoURL,
        addedAt: serverTimestamp()
      });

      // Notify the requester
      await userService.sendNotification(
        request.fromId,
        'Solicitud de amistad aceptada',
        `${currentUser.displayName} ha aceptado tu solicitud de amistad.`,
        'friend_accepted',
        '/profile'
      );
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, path, auth);
    }
  },

  async declineRequest(requestId: string) {
    const path = `friendRequests/${requestId}`;
    try {
      await updateDoc(doc(db, 'friendRequests', requestId), {
        status: 'declined',
        declinedAt: serverTimestamp()
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, path, auth);
    }
  },

  listenFriends(userId: string, callback: (friends: any[]) => void) {
    const path = `users/${userId}/friends`;
    const q = query(collection(db, path), orderBy('addedAt', 'desc'));
    return onSnapshot(q, (snapshot) => {
      callback(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, path, auth);
    });
  },

  listenIncomingRequests(userId: string, callback: (requests: any[]) => void) {
    const path = 'friendRequests';
    const q = query(
      collection(db, path),
      where('toId', '==', userId),
      where('status', '==', 'pending'),
      orderBy('createdAt', 'desc')
    );
    return onSnapshot(q, (snapshot) => {
      callback(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, path, auth);
    });
  }
};

export const gamesService = {
  async getAll() {
    const path = 'games';
    try {
      const q = query(collection(db, path));
      const snapshot = await getDocs(q);
      return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    } catch (error) {
      handleFirestoreError(error, OperationType.LIST, path, auth);
      return [];
    }
  },

  listenGames(callback: (games: any[]) => void) {
    const path = 'games';
    const q = query(collection(db, path));
    return onSnapshot(q, (snapshot) => {
      callback(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, path, auth);
    });
  },

  async create(data: any) {
    const path = 'games';
    try {
      const id = data.id || 'game-' + Date.now().toString();
      const docRef = doc(db, 'games', id);
      const gameData = {
        name: data.name,
        genre: data.genre,
        image: data.image,
        isComingSoon: !!data.isComingSoon,
        iconName: data.iconName || 'Gamepad2'
      };
      await setDoc(docRef, gameData);
      return { id, ...gameData };
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, path, auth);
    }
  },

  async update(id: string, data: any) {
    const path = `games/${id}`;
    try {
      const docRef = doc(db, 'games', id);
      const gameData = {
        name: data.name,
        genre: data.genre,
        image: data.image,
        isComingSoon: !!data.isComingSoon,
        iconName: data.iconName || 'Gamepad2'
      };
      await setDoc(docRef, gameData);
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, path, auth);
    }
  },

  async delete(id: string) {
    const path = `games/${id}`;
    try {
      await deleteDoc(doc(db, 'games', id));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, path, auth);
    }
  }
};

