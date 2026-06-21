import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { tournamentService, chatService, matchService, bracketService } from '../services/db';
import { Trophy, Calendar, Users, MessageSquare, Info, Send, ChevronRight, Zap, CreditCard, ExternalLink, Clock, Reply, Edit2, X, Plus, Swords, CheckCircle2, LayoutPanelLeft, Radio, Crown, Medal, ChevronDown, ChevronUp, Award, Activity, Loader2, Upload, Hash } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../lib/utils';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import CountdownTimer from '../components/CountdownTimer';
import YoutubeLivePlayer from '../components/YoutubeLivePlayer';

const TournamentPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const { user, profile, isAdmin } = useAuth();
  const [tournament, setTournament] = useState<any>(null);
  const [activeTab, setActiveTab] = useState<'info' | 'chat' | 'results' | 'participants'>('info');
  const [messages, setMessages] = useState<any[]>([]);
  const [participantsList, setParticipantsList] = useState<any[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [isRegistered, setIsRegistered] = useState(false);
  const [participant, setParticipant] = useState<any>(null);
  const [regForm, setRegForm] = useState({ reference: '' });
  const [isExtractingRef, setIsExtractingRef] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleExtractReference = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsExtractingRef(true);
    try {
      const base64Str = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = (event) => {
          const img = new window.Image();
          img.src = event.target?.result as string;
          img.onload = () => {
            const canvas = document.createElement('canvas');
            let width = img.width;
            let height = img.height;
            const MAX_SIZE = 800;
            if (width > height) {
              if (width > MAX_SIZE) {
                height *= MAX_SIZE / width;
                width = MAX_SIZE;
              }
            } else {
              if (height > MAX_SIZE) {
                width *= MAX_SIZE / height;
                height = MAX_SIZE;
              }
            }
            canvas.width = width;
            canvas.height = height;
            const ctx = canvas.getContext('2d');
            ctx?.drawImage(img, 0, 0, width, height);
            resolve(canvas.toDataURL('image/jpeg', 0.6));
          };
          img.onerror = reject;
        };
        reader.onerror = reject;
      });

      const [mimeType, base64] = base64Str.split(';base64,');

      const res = await fetch('/api/extract-payment-reference', {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ imageBase64: base64, mimeType: mimeType.split(':')[1] })
      });
      const data = await res.json();
      if (data.error) {
        showToast(data.error, 'error');
        return;
      }
      if (data.reference && data.reference !== 'NO_ENCONTRADO') {
        const numbers = data.reference.replace(/[^0-9]/g, '');
        setRegForm(prev => ({ ...prev, reference: numbers.slice(-8) }));
        showToast('Referencia extraída exitosamente.', 'success');
      } else {
        showToast('No se pudo encontrar la referencia en la imagen.', 'error');
      }
    } catch (err) {
      showToast('Error al analizar el comprobante.', 'error');
    } finally {
      setIsExtractingRef(false);
    }
  };
  const [loading, setLoading] = useState(true);
  const [showRegConfirm, setShowRegConfirm] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [showStartConfirm, setShowStartConfirm] = useState(false);
  const [verificationCode, setVerificationCode] = useState('');
  const [roomDetails, setRoomDetails] = useState({ roomNumber: '', roomPassword: '' });
  const [isSavingRoom, setIsSavingRoom] = useState(false);
  const [typingUsers, setTypingUsers] = useState<any[]>([]);
  const typingTimeoutRef = useRef<any>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const [replyingTo, setReplyingTo] = useState<any>(null);
  const [editingMessage, setEditingMessage] = useState<any>(null);
  const [editText, setEditText] = useState('');
  const [isStarting, setIsStarting] = useState(false);
  const [matches, setMatches] = useState<any[]>([]);
  const [isCreatingMatch, setIsCreatingMatch] = useState(false);
  const [newMatch, setNewMatch] = useState({ p1Id: '', p2Id: '', round: 1 });
  const [toast, setToast] = useState<{ message: string, type: 'success' | 'error' | 'info' } | null>(null);
  const [expandedMatchId, setExpandedMatchId] = useState<string | null>(null);

  const showToast = (message: string, type: 'success' | 'error' | 'info' = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  };

  useEffect(() => {
    // Generate a random 4-digit code for verification once per session or on load
    const generatedCode = Math.floor(1000 + Math.random() * 9000).toString();
    if (/^\d{4}$/.test(generatedCode)) {
      setVerificationCode(generatedCode);
    } else {
      setVerificationCode('1234'); // Fallback robust code
    }
  }, []);

  useEffect(() => {
    if (!id) return;
    
    // Listen for participant data
    let unsubscribeParticipant: (() => void) | undefined;
    if (id && user) {
      unsubscribeParticipant = tournamentService.listenParticipant(id, user.uid, (pData) => {
        setParticipant(pData);
        setIsRegistered(!!pData && pData.paymentStatus === 'approved');
        if (pData?.paymentCode) {
          setVerificationCode(pData.paymentCode);
        }
      });
    }

    // Listen for typing users
    let unsubscribeTyping: (() => void) | undefined;
    if (id && user && activeTab === 'chat') {
      unsubscribeTyping = tournamentService.listenTypingParticipants(id, user.uid, (users) => {
        setTypingUsers(users);
      });
    }

    // Fetch tournament data real-time
    const unsubscribeTournament = tournamentService.listenTournament(id, (data) => {
      setTournament(data);
      if (data) {
        setRoomDetails({
          roomNumber: data.roomNumber || '',
          roomPassword: data.roomPassword || ''
        });
      }
      setLoading(false);
    });

    // Listen for participants
    let unsubscribeParticipants: (() => void) | undefined;
    if (id && activeTab === 'participants') {
      unsubscribeParticipants = tournamentService.listenAllParticipants(id, (pList) => {
        setParticipantsList(pList);
      });
    }

    // Listen for chat messages
    const unsubscribeChat = chatService.listenMessages(id, (newMessages) => {
      setMessages(newMessages);
    });

    // Listen for matches
    const unsubscribeMatches = matchService.listenMatches(id, (newMatches) => {
      setMatches(newMatches);
    });

    return () => {
      unsubscribeTournament();
      if (unsubscribeParticipant) unsubscribeParticipant();
      if (unsubscribeTyping) unsubscribeTyping();
      if (unsubscribeParticipants) unsubscribeParticipants();
      if (id && user) {
        const userName = profile?.displayName || user.displayName || 'Usuario';
        tournamentService.setTypingStatus(id, user.uid, userName, false);
      }
      unsubscribeChat();
      unsubscribeMatches();
    };
  }, [id, user, activeTab]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, typingUsers]);

  const isFree = useMemo(() => {
    if (!tournament?.entryFee) return true;
    const feeStr = tournament.entryFee.toString().toLowerCase().trim();
    return feeStr === 'gratis' || feeStr === 'free' || feeStr === '0';
  }, [tournament?.entryFee]);

  const handleRegister = async () => {
    if (!user || !id || !tournament) return;
    
    // If it's a paid tournament and not confirmed, show modal
    if (!isFree && !showRegConfirm) {
      setShowRegConfirm(true);
      return;
    }

    if (tournament.status !== 'upcoming') {
      showToast('El registro para este torneo ya no está disponible.', 'error');
      return;
    }
    if (tournament.registeredParticipants >= tournament.maxParticipants) {
      showToast('Lo sentimos, el torneo ya está lleno.', 'error');
      return;
    }

    try {
      if (!isFree) {
        if (!regForm.reference || !regForm.reference.trim()) {
          showToast('Por favor ingresa la referencia de tu pago', 'error');
          return;
        }
        setIsSubmitting(true);
        await tournamentService.requestRegistrationWithPayment(
          id, 
          user.uid, 
          profile?.displayName || user.displayName || 'Jugador',
          profile?.photoURL || user.photoURL || `https://api.dicebear.com/7.x/avataaars/svg?seed=${user.uid}`,
          regForm.reference.trim(),
          verificationCode,
          profile?.gameId,
          profile?.gameNick
        );

        try {
          await fetch('/api/emails/registration-alert', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              participantName: profile?.displayName || user.displayName || 'Jugador',
              tournamentName: tournament.name,
              reference: regForm.reference.trim()
            })
          });
        } catch (e) {
          console.error("Error sending registration alert", e);
        }

        setShowSuccessModal(true);
      } else {
        setIsSubmitting(true);
        await tournamentService.registerParticipant(
          id, 
          user.uid,
          profile?.displayName || user.displayName || 'Jugador',
          profile?.photoURL || user.photoURL || `https://api.dicebear.com/7.x/avataaars/svg?seed=${user.uid}`,
          verificationCode,
          profile?.gameId,
          profile?.gameNick
        );

        try {
          await fetch('/api/emails/registration-alert', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              participantName: profile?.displayName || user.displayName || 'Jugador',
              tournamentName: tournament.name,
              reference: 'GRATUITO'
            })
          });
        } catch (e) {
          console.error("Error sending registration alert", e);
        }

        setShowSuccessModal(true);
      }
      
      const pData = (await tournamentService.getParticipant(id, user.uid)) as any;
      setParticipant(pData);
      setIsRegistered(!!pData && pData.paymentStatus === 'approved');
      
      // Refresh tournament data to update participant count
      const updatedData = await tournamentService.getById(id);
      setTournament(updatedData);
      setIsSubmitting(false);
      setShowRegConfirm(false);
    } catch (error) {
      console.error('Error en el registro:', error);
      showToast('Error en el registro. Inténtalo de nuevo.', 'error');
      setIsSubmitting(false);
    }
  };

  const handleTyping = () => {
    if (!id || !user || (!isRegistered && !isAdmin)) return;

    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    
    const userName = profile?.displayName || user.displayName || 'Usuario';
    tournamentService.setTypingStatus(id, user.uid, userName, true);

    typingTimeoutRef.current = setTimeout(() => {
      if (id && user) {
        tournamentService.setTypingStatus(id, user.uid, userName, false);
      }
    }, 3000);
  };
  
  const handleSendMessage = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!newMessage.trim() || !user || !id) return;

    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    const userName = profile?.displayName || user.displayName || 'Usuario';
    tournamentService.setTypingStatus(id, user.uid, userName, false);

    // Check if user is allowed to send (must be registered or admin)
    if (!isRegistered && !isAdmin) {
      alert('Debes estar inscrito para enviar mensajes.');
      return;
    }

    try {
      if (editingMessage) {
        await chatService.updateMessage(id, editingMessage.id, newMessage);
        setEditingMessage(null);
      } else {
        await chatService.sendMessage(
          id, 
          newMessage, 
          user.uid, 
          profile?.displayName || user.displayName || 'Anon',
          profile?.photoURL || user.photoURL || `https://api.dicebear.com/7.x/avataaars/svg?seed=${user.uid}`,
          false,
          replyingTo
        );
        setReplyingTo(null);
      }
      setNewMessage('');
    } catch (error) {
      console.error('Error al enviar/editar mensaje:', error);
    }
  };
  
  const handleSaveRoomDetails = async () => {
    if (!id || !isAdmin) return;
    setIsSavingRoom(true);
    try {
      await tournamentService.update(id, {
        roomNumber: roomDetails.roomNumber,
        roomPassword: roomDetails.roomPassword
      });
      setTournament(prev => ({ ...prev, ...roomDetails }));
      alert('Detalles de sala actualizados correctamente');
    } catch (error) {
      alert('Error al guardar detalles de sala');
    } finally {
      setIsSavingRoom(false);
    }
  };

  const handleStartTournament = async () => {
    if (!id || !isAdmin) return;
    
    const approvedCount = participantsList.filter(p => p.paymentStatus === 'approved').length;
    
    if (approvedCount < 2) {
      alert('Se necesitan al menos 2 participantes APROBADOS para generar los brackets.');
      return;
    }
    
    setIsStarting(true);
    try {
      // 1. Generate brackets first
      await bracketService.generateBracket(id);
      
      // 2. Start tournament
      await tournamentService.startTournament(id);
      
      await chatService.sendMessage(
        id, 
        "🔥 ¡EL TORNEO HA COMENZADO OFICIALMENTE! Los brackets han sido generados. ¡Mucha suerte a todos!", 
        "system", 
        "Sistema", 
        "", 
        true
      );
      setShowStartConfirm(false);
    } catch (error) {
      console.error('Error starting tournament:', error);
      alert('Error al iniciar el torneo: ' + (error instanceof Error ? error.message : 'Error desconocido'));
    } finally {
      setIsStarting(false);
    }
  };

  const handleAddMatch = async () => {
    if (!id || !newMatch.p1Id || !newMatch.p2Id) return;
    try {
      await matchService.createMatch(id, {
        player1Id: newMatch.p1Id,
        player2Id: newMatch.p2Id,
        player1Name: participantsList.find(p => p.userId === newMatch.p1Id)?.userName || 'Jugador 1',
        player2Name: participantsList.find(p => p.userId === newMatch.p2Id)?.userName || 'Jugador 2',
        round: newMatch.round,
        score1: 0,
        score2: 0,
      });
      setIsCreatingMatch(false);
      setNewMatch({ p1Id: '', p2Id: '', round: 1 });
    } catch (error) {
      alert('Error al crear enfrentamiento');
    }
  };

  const handleUpdateMatchScore = async (matchId: string, winnerId: string, score1: number, score2: number) => {
    if (!id) return;
    try {
      await matchService.updateMatch(id, matchId, {
        winnerId,
        score1,
        score2,
        status: 'completed'
      });
    } catch (error) {
      alert('Error al actualizar resultado');
    }
  };

  const handleGenerateBracket = async () => {
    if (!id || !isAdmin) return;
    if (confirm('Esto generará una nueva estructura de llaves basada en los participantes actuales. ¿Continuar?')) {
      try {
        await bracketService.generateBracket(id);
        alert('Llaves generadas correctamente');
      } catch (error) {
        alert('Error al generar llaves: ' + (error instanceof Error ? error.message : 'Error desconocido'));
      }
    }
  };

  const renderBracket = () => {
    if (!matches || matches.length === 0) {
      return (
        <div className="text-center py-20 bg-white/5 rounded-3xl border border-dashed border-white/10">
          <Trophy size={48} className="mx-auto text-gray-700 mb-4" />
          <p className="text-gray-500 uppercase tracking-widest text-sm font-bold">No hay llaves generadas aún</p>
          {isAdmin && tournament.status === 'ongoing' && (
            <button 
              onClick={handleGenerateBracket}
              className="mt-6 bg-primary text-black px-8 py-3 rounded-xl font-display uppercase italic tracking-tighter skew-x-[-10deg]"
            >
              Generar Llaves (Bracket)
            </button>
          )}
        </div>
      );
    }

    const rounds = [...new Set(matches.map((m: any) => m.round as number))].sort((a: any, b: any) => a - b) as number[];
    
    return (
      <div className="overflow-x-auto pb-12 custom-scrollbar">
        <div className="flex gap-20 min-w-max p-8">
          {rounds.map((roundIdx) => {
            const roundMatches = matches.filter(m => m.round === roundIdx);
            const totalRounds = rounds.length;
            const isFirstRound = roundIdx === 0;
            const isFinal = roundIdx === totalRounds - 1;
            const isSemiFinal = roundIdx === totalRounds - 2 && totalRounds > 2;
            const isQuarterFinal = roundIdx === totalRounds - 3 && totalRounds > 3;

            let roundTitle = `Ronda ${roundIdx + 1}`;
            if (isFinal) roundTitle = "Gran Final";
            else if (isSemiFinal) roundTitle = "Semifinales";
            else if (isQuarterFinal) roundTitle = "Cuartos de Final";

            return (
              <div key={roundIdx} className="w-72 flex flex-col">
                <div className="mb-12 text-center relative">
                  <div className="bg-primary/20 text-primary text-[10px] font-black uppercase tracking-[0.3em] py-2 px-4 rounded-xl border border-primary/20 inline-block shadow-lg shadow-primary/5">
                    {roundTitle}
                  </div>
                  <div className="absolute top-full left-1/2 -translate-x-1/2 w-px h-8 bg-gradient-to-b from-primary/20 to-transparent mt-2" />
                </div>
                
                <div className="flex flex-col justify-around flex-grow gap-8">
                  {roundMatches.map((match, idx) => {
                    const isCompleted = match.status === 'completed';
                    const isBye = match.status === 'bye';
                    const p1Winner = match.winnerId === match.player1Id;
                    const p2Winner = match.winnerId === match.player2Id;
                             const isExpanded = expandedMatchId === match.id;
                    
                    return (
                      <div key={match.id} className="relative group/match">
                        {/* Connector logic for a cleaner hierarchical look */}
                        {!isFinal && (
                          <div className="absolute left-full top-1/2 -translate-y-1/2 flex items-center">
                            <div className="w-10 h-[2px] bg-white/10 group-hover/match:bg-primary/30 transition-colors" />
                            {idx % 2 === 0 ? (
                              <div className="w-[2px] h-[calc(50%+2rem)] bg-white/10 relative -top-[calc(25%+1rem)] group-hover/match:bg-primary/30 transition-colors" />
                            ) : (
                              <div className="w-[2px] h-[calc(50%+2rem)] bg-white/10 relative top-[calc(25%+1rem)] group-hover/match:bg-primary/30 transition-colors" />
                            )}
                          </div>
                        )}

                        <motion.div 
                          initial={{ opacity: 0, x: -10 }}
                          animate={{ opacity: 1, x: 0 }}
                          layout
                          onClick={() => setExpandedMatchId(isExpanded ? null : match.id)}
                          className={cn(
                            "bg-zinc-900 border-2 rounded-2xl p-4 space-y-2 transition-all relative overflow-hidden shadow-xl cursor-pointer",
                            isExpanded ? "border-primary/50 ring-1 ring-primary/20" : 
                            isCompleted ? "border-white/5 bg-zinc-950/50" : 
                            match.status === 'ongoing' ? "border-primary shadow-[0_0_30px_rgba(var(--primary-rgb),0.15)] ring-1 ring-primary/30" :
                            "border-white/10 hover:border-white/20"
                          )}
                        >
                          {/* Match Order / Label */}
                          <div className="absolute -top-1 -right-1 flex gap-px">
                             <div className="bg-zinc-800 text-gray-500 text-[8px] font-black p-1 rounded-bl-lg uppercase tracking-tighter">
                                MATCH #{idx + 1}
                             </div>
                             {isExpanded ? (
                               <div className="bg-primary/20 text-primary p-1 rounded-bl-lg">
                                 <ChevronUp size={8} />
                               </div>
                             ) : (
                               <div className="bg-white/5 text-gray-500 p-1 rounded-bl-lg">
                                 <ChevronDown size={8} />
                               </div>
                             )}
                          </div>

                          {/* Player 1 Slot */}
                          <div className={cn(
                            "flex justify-between items-center p-2.5 rounded-xl transition-all",
                            p1Winner ? "bg-primary/10 text-primary ring-1 ring-primary/20" : 
                            isCompleted ? "text-gray-600 opacity-60" : "text-gray-300"
                          )}>
                            <div className="flex items-center gap-3 overflow-hidden">
                              <div className="relative">
                                <img 
                                  src={match.player1PhotoURL || (match.player1Id ? `https://api.dicebear.com/7.x/avataaars/svg?seed=${match.player1Id}` : 'https://api.dicebear.com/7.x/initials/svg?seed=TBD')} 
                                  className={cn(
                                    "w-8 h-8 rounded-lg bg-zinc-800 flex-shrink-0 object-cover border border-white/5",
                                    p1Winner ? "border-primary/50" : ""
                                  )} 
                                  alt="" 
                                />
                                {p1Winner && (
                                  <div className="absolute -top-1 -left-1 bg-primary rounded-full p-0.5 shadow-lg">
                                    <CheckCircle2 size={10} className="text-black" />
                                  </div>
                                )}
                              </div>
                              <div className="flex flex-col">
                                <span className={cn(
                                  "text-[10px] font-black uppercase truncate max-w-[100px]",
                                  p1Winner ? "text-primary" : ""
                                )}>
                                  {match.player1Name || 'Esperando...'}
                                </span>
                                {match.player1Id && <span className="text-[8px] opacity-40 font-mono">ID: {match.player1Id.slice(0, 5)}</span>}
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                               <span className={cn(
                                 "text-sm font-display font-black min-w-[20px] text-center",
                                 p1Winner ? "text-primary" : "text-gray-500"
                               )}>
                                 {match.score1 ?? (isCompleted ? 0 : '-')}
                               </span>
                            </div>
                          </div>

                          <div className="flex items-center gap-4 px-2">
                            <div className="h-[1px] flex-grow bg-white/5" />
                            <span className="text-[8px] font-black text-gray-700 uppercase tracking-widest">VS</span>
                            <div className="h-[1px] flex-grow bg-white/5" />
                          </div>

                          {/* Player 2 Slot */}
                          <div className={cn(
                            "flex justify-between items-center p-2.5 rounded-xl transition-all",
                            p2Winner ? "bg-primary/10 text-primary ring-1 ring-primary/20" : 
                            isCompleted ? "text-gray-600 opacity-60" : "text-gray-300"
                          )}>
                            <div className="flex items-center gap-3 overflow-hidden">
                              <div className="relative">
                                <img 
                                  src={match.player2PhotoURL || (match.player2Id ? `https://api.dicebear.com/7.x/avataaars/svg?seed=${match.player2Id}` : 'https://api.dicebear.com/7.x/initials/svg?seed=TBD')} 
                                  className={cn(
                                    "w-8 h-8 rounded-lg bg-zinc-800 flex-shrink-0 object-cover border border-white/5",
                                    p2Winner ? "border-primary/50" : ""
                                  )} 
                                  alt="" 
                                />
                                {p2Winner && (
                                  <div className="absolute -top-1 -left-1 bg-primary rounded-full p-0.5 shadow-lg">
                                    <CheckCircle2 size={10} className="text-black" />
                                  </div>
                                )}
                              </div>
                              <div className="flex flex-col">
                                <span className={cn(
                                  "text-[10px] font-black uppercase truncate max-w-[100px]",
                                  p2Winner ? "text-primary" : ""
                                )}>
                                  {match.player2Name || 'Esperando...'}
                                </span>
                                {match.player2Id && <span className="text-[8px] opacity-40 font-mono">ID: {match.player2Id.slice(0, 5)}</span>}
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                               <span className={cn(
                                 "text-sm font-display font-black min-w-[20px] text-center",
                                 p2Winner ? "text-primary" : "text-gray-500"
                               )}>
                                 {match.score2 ?? (isCompleted ? 0 : '-')}
                               </span>
                            </div>
                          </div>

                          {/* Expanded Details */}
                          <AnimatePresence>
                            {isExpanded && (
                              <motion.div
                                initial={{ height: 0, opacity: 0 }}
                                animate={{ height: 'auto', opacity: 1 }}
                                exit={{ height: 0, opacity: 0 }}
                                className="overflow-hidden bg-black/30 rounded-xl p-3 mt-4 space-y-3"
                              >
                                {isCompleted ? (
                                  <div className="space-y-2">
                                    <div className="flex items-center gap-2 text-[10px] font-black uppercase text-primary tracking-widest">
                                      <Award size={12} /> Ganador: {match.winnerId === match.player1Id ? match.player1Name : match.player2Name}
                                    </div>
                                    <div className="flex justify-between items-center text-[8px] font-bold text-gray-500 uppercase">
                                      <span>Resultado Final</span>
                                      <span className="font-mono text-white">{match.score1} - {match.score2}</span>
                                    </div>
                                    {match.updatedAt && (
                                      <div className="text-[8px] text-gray-600 italic">
                                        Completado el {new Date(match.updatedAt.toDate()).toLocaleString()}
                                      </div>
                                    )}
                                  </div>
                                ) : match.status === 'ongoing' ? (
                                  <div className="space-y-2">
                                    <div className="flex items-center gap-2 text-[10px] font-black uppercase text-yellow-500 tracking-widest animate-pulse">
                                      <Activity size={12} /> Partido en Curso
                                    </div>
                                    <p className="text-[8px] text-gray-400 leading-relaxed uppercase font-bold">
                                      Los jugadores se encuentran en la arena. El resultado será actualizado por un administrador al finalizar.
                                    </p>
                                  </div>
                                ) : isBye ? (
                                  <div className="space-y-1">
                                    <div className="text-[10px] font-black text-yellow-500 uppercase">Avanza por BYE</div>
                                    <p className="text-[8px] text-gray-400">Este jugador avanza automáticamente a la siguiente ronda.</p>
                                  </div>
                                ) : (
                                  <div className="space-y-2">
                                    <div className="text-[10px] font-black text-gray-500 uppercase">En Espera</div>
                                    <p className="text-[8px] text-gray-500">Pendiente de completar enfrentamientos previos o inicio de ronda.</p>
                                  </div>
                                )}

                                {/* Admin Controls - Integrated into expanded view */}
                                {isAdmin && !isCompleted && !isBye && match.player1Id && match.player2Id && (
                                  <div className="flex gap-2 pt-2">
                                     <button 
                                       onClick={(e) => {
                                         e.stopPropagation();
                                         handleUpdateMatchScore(match.id, match.player1Id, 1, 0);
                                       }}
                                       className="flex-1 bg-primary text-black text-[9px] font-black uppercase py-2 rounded-lg hover:bg-white transition-all shadow-lg shadow-primary/10"
                                     >
                                       P1 Winner
                                     </button>
                                     <button 
                                       onClick={(e) => {
                                         e.stopPropagation();
                                         handleUpdateMatchScore(match.id, match.player2Id, 0, 1);
                                       }}
                                       className="flex-1 bg-primary text-black text-[9px] font-black uppercase py-2 rounded-lg hover:bg-white transition-all shadow-lg shadow-primary/10"
                                     >
                                       P2 Winner
                                     </button>
                                  </div>
                                )}
                              </motion.div>
                            )}
                          </AnimatePresence>
                        </motion.div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  const isUserOnline = (msgCreatedAt: any) => {
    if (!msgCreatedAt) return false;
    const now = new Date().getTime();
    const msgTime = msgCreatedAt.toDate().getTime();
    return (now - msgTime) < 1000 * 60 * 5; // Consider online if sent message in last 5 mins
  };

  if (loading) return <div className="flex justify-center py-20"><Zap className="animate-spin text-primary" size={48} /></div>;
  if (!tournament) return <div className="text-center py-20">Torneo no encontrado</div>;

  return (
    <div className="space-y-8 pb-20">
      {/* Toast Notification */}
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: 50, x: '-50%' }}
            animate={{ opacity: 1, y: 0, x: '-50%' }}
            exit={{ opacity: 0, y: 20, x: '-50%' }}
            className={cn(
              "fixed bottom-10 left-1/2 z-[100] px-6 py-3 rounded-2xl shadow-2xl font-display uppercase italic tracking-wider flex items-center gap-3 border backdrop-blur-xl",
              toast.type === 'success' ? "bg-green-600/90 border-green-400 text-white" :
              toast.type === 'error' ? "bg-red-600/90 border-red-400 text-white" :
              "bg-primary/90 border-primary text-black"
            )}
          >
            {toast.type === 'success' ? <CheckCircle2 size={20} /> : 
             toast.type === 'error' ? <X size={20} /> : <Info size={20} />}
            {toast.message}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Enhanced Tournament Hero Banner */}
      <section className="relative group">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="relative h-[400px] md:h-[500px] rounded-[2.5rem] overflow-hidden border border-white/10 shadow-2xl shadow-primary/5"
        >
          {/* Background Image with Parallax-like scaling on hover */}
          <img 
            src={tournament.bannerImage || "https://images.unsplash.com/photo-1542751371-adc38448a05e?q=80&w=2070&auto=format&fit=crop"} 
            className="w-full h-full object-cover transition-transform duration-1000 group-hover:scale-110" 
            alt={tournament.name} 
          />
          
          {/* Multi-layered Overlays */}
          <div className="absolute inset-0 bg-gradient-to-t from-black via-black/60 to-transparent" />
          <div className="absolute inset-0 bg-gradient-to-r from-black/60 via-transparent to-transparent" />
          
          {/* Content Container */}
          <div className="absolute inset-0 flex flex-col justify-end p-8 md:p-16 space-y-6">
            <motion.div 
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.2 }}
              className="flex items-center gap-4"
            >
              <div className="px-4 py-1.5 bg-primary/90 text-black text-xs font-black uppercase tracking-[0.2em] skew-x-[-15deg] shadow-lg shadow-primary/20">
                <span className="inline-block skew-x-[15deg]">{tournament.game}</span>
              </div>

              {tournament.gameMode && (
                <div className="px-4 py-1.5 bg-white/10 text-white text-xs font-black uppercase tracking-[0.2em] skew-x-[-15deg] border border-white/20 backdrop-blur-md">
                  <span className="inline-block skew-x-[15deg]">{tournament.gameMode}</span>
                </div>
              )}
            </motion.div>

            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.3 }}
              className="flex flex-col md:flex-row md:items-end gap-4 md:gap-6"
            >
              <h1 className="text-5xl md:text-8xl font-display uppercase italic tracking-tighter leading-[0.9] drop-shadow-2xl">
                {tournament.name}
              </h1>

              <div className="flex flex-col gap-4 mb-2 md:mb-4">
                <div className={cn(
                  "inline-flex items-center gap-2 px-5 py-2 rounded-2xl border-2 backdrop-blur-md text-[10px] md:text-xs font-black uppercase tracking-[0.2em] w-fit",
                  tournament.status === 'upcoming' ? "border-blue-500/50 text-blue-400 bg-blue-500/10" : 
                  tournament.status === 'ongoing' ? "border-green-500/50 text-green-400 bg-green-500/10" : 
                  "border-gray-500/50 text-gray-400 bg-gray-500/10"
                )}>
                  {tournament.status === 'upcoming' ? <Clock size={14} /> : 
                   tournament.status === 'ongoing' ? <Zap size={14} className="animate-pulse" /> : 
                   <CheckCircle2 size={14} />}
                  <span>
                    {tournament.status === 'upcoming' ? 'En Preparación' : 
                     tournament.status === 'ongoing' ? 'En Curso' : 'Finalizado'}
                  </span>
                </div>

                {tournament.status === 'upcoming' && tournament.startDate && (
                  <CountdownTimer 
                    targetDate={new Date(tournament.startDate.toDate())} 
                  />
                )}
              </div>
            </motion.div>

            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.4 }}
              className="flex flex-wrap items-center gap-y-4 gap-x-8 text-sm md:text-lg font-medium text-gray-100"
            >
              <div className="flex items-center gap-3 bg-white/5 border border-white/10 px-4 py-2 rounded-2xl backdrop-blur-md">
                <Calendar className="text-primary" size={20} /> 
                <span>{format(tournament.startDate.toDate(), "d 'de' MMMM, p", { locale: es })}</span>
              </div>
              <div className="flex items-center gap-3 bg-white/5 border border-white/10 px-4 py-2 rounded-2xl backdrop-blur-md">
                <Trophy className="text-primary" size={20} /> 
                <span className="font-display italic uppercase tracking-wider">{tournament.prizePool || 'Gloria Eterna'}</span>
              </div>
              <div className="flex items-center gap-3 bg-white/5 border border-white/10 px-4 py-2 rounded-2xl backdrop-blur-md">
                <Users className="text-primary" size={20} /> 
                <span>{tournament.registeredParticipants} / {tournament.maxParticipants} <span className="text-xs text-gray-500 ml-1">Lugares</span></span>
              </div>
              {tournament.entryFee && (
                <div className="flex items-center gap-3 bg-primary/10 border border-primary/30 px-4 py-2 rounded-2xl backdrop-blur-md text-primary font-bold">
                  <CreditCard size={20} /> 
                  <span>{isFree ? 'INSCRIPCIÓN GRATIS' : `ENTRY FEE: ${tournament.entryFee}`}</span>
                </div>
              )}
            </motion.div>

            {/* Banner Action Buttons */}
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 }}
              className="flex flex-wrap gap-4 pt-4"
            >
              {!isRegistered && participant?.paymentStatus !== 'pending' && tournament.status === 'upcoming' && (
                <button 
                  onClick={handleRegister}
                  disabled={isSubmitting}
                  className="bg-primary text-black px-8 py-3 rounded-xl font-display uppercase italic text-lg skew-x-[-15deg] transition-all flex items-center gap-2 hover:bg-white shadow-xl shadow-primary/20 active:scale-95 disabled:opacity-50 disabled:cursor-wait"
                >
                  {isSubmitting ? (
                    <Loader2 size={20} className="animate-spin text-black" />
                  ) : (
                    <Zap size={20} />
                  )}
                  {isSubmitting ? 'PROCESANDO REGISTRO...' : 'INSCRIBIRME AHORA'}
                </button>
              )}

              {participant?.paymentStatus === 'pending' && (
                <div className="bg-yellow-500/20 border border-yellow-500/50 text-yellow-500 px-8 py-3 rounded-xl font-display uppercase italic text-lg skew-x-[-15deg] flex items-center gap-2 shadow-xl shadow-yellow-500/10">
                  <Clock size={20} /> EN REVISIÓN
                </div>
              )}

              {!isFree && participant?.paymentStatus !== 'pending' && (
                <a 
                  href={`https://wa.me/584124780457?text=Hola,%20quisiera%20validar%20mi%20inscripción%20en%20el%20torneo%20"${tournament.name}".%20Mi%20código%20de%20verificación%20es:%20${verificationCode}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="bg-[#25D366] text-white px-8 py-3 rounded-xl font-display uppercase italic text-lg skew-x-[-15deg] transition-all flex items-center gap-2 hover:bg-white hover:text-[#25D366] shadow-xl shadow-green-500/20 active:scale-95"
                >
                  <MessageSquare size={20} /> VALIDAR INSCRIPCIÓN
                </a>
              )}
            </motion.div>
          </div>

          {/* Decorative Corner Accent */}
          <div className="absolute top-0 right-0 w-32 h-32 bg-primary/20 blur-[80px] -mr-16 -mt-16 rounded-full" />
        </motion.div>
      </section>

      {/* Payment Instructions if Fee Exists and is not Free */}
      {tournament.entryFee && !isFree && !isRegistered && participant?.paymentStatus !== 'pending' && (
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-yellow-500/10 border border-yellow-500/30 p-6 rounded-3xl flex flex-col md:flex-row gap-6 items-center"
        >
          <div className="bg-yellow-500/20 p-4 rounded-2xl">
            <CreditCard size={32} className="text-yellow-500" />
          </div>
          <div className="flex-grow space-y-4">
            <h4 className="font-display uppercase text-lg text-yellow-500">Instrucciones de Pago</h4>
            <p className="text-sm text-gray-300">
              Realiza el pago correspondiente vía <b>Pago Móvil 🇻🇪</b> y envía el comprobante para validar tu cupo. Puedes copiar los datos haciendo clic en ellos:
            </p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
               <button 
                 onClick={() => {
                   navigator.clipboard.writeText('32868567');
                   alert('CI Copiada: 32.868.567');
                 }}
                 className="p-4 bg-black/40 border border-white/5 rounded-2xl hover:border-primary/50 transition-all text-left group"
               >
                 <p className="text-[10px] uppercase font-bold text-gray-500 group-hover:text-primary">Pago Móvil (CI)</p>
                 <p className="font-mono text-white">32.868.567</p>
               </button>
               <button 
                 onClick={() => {
                   navigator.clipboard.writeText('0114');
                   alert('Banco Copiado: 0114-Bancaribe');
                 }}
                 className="p-4 bg-black/40 border border-white/5 rounded-2xl hover:border-primary/50 transition-all text-left group"
               >
                 <p className="text-[10px] uppercase font-bold text-gray-500 group-hover:text-primary">Banco</p>
                 <p className="font-mono text-white">0114-Bancaribe</p>
               </button>
               <button 
                 onClick={() => {
                   navigator.clipboard.writeText('04124780457');
                   alert('Teléfono Copiado: 0412-4780457');
                 }}
                 className="p-4 bg-black/40 border border-white/5 rounded-2xl hover:border-primary/50 transition-all text-left group"
               >
                 <p className="text-[10px] uppercase font-bold text-gray-500 group-hover:text-primary">Teléfono</p>
                 <p className="font-mono text-white">0412-4780457</p>
               </button>
            </div>
            <p className="text-xs text-gray-400 italic">* Una vez realizado el pago, presiona el botón de la derecha para enviar el comprobante por WhatsApp. Tu código de verificación es: <span className="text-primary font-mono font-bold">{verificationCode}</span></p>
          </div>
          <a 
            href={`https://wa.me/584124780457?text=Hola,%20adjunto%20mi%20comprobante%20de%20pago%20para%20el%20torneo%20"${tournament.name}".%20Mi%20código%20de%20verificación%20es:%20${verificationCode}`}
            target="_blank"
            rel="noopener noreferrer"
            className="whitespace-nowrap bg-[#25D366] text-black px-6 py-3 rounded-xl font-display uppercase skew-x-[-10deg] flex items-center gap-2 hover:bg-white transition-colors"
          >
            <MessageSquare size={18} /> Enviar Comprobante
          </a>
        </motion.div>
      )}

      {/* Room Details for Admin and Approved Participants */}
      {(isAdmin || (isRegistered && (tournament.roomNumber || tournament.roomPassword))) && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-primary/5 border border-primary/20 rounded-3xl p-6 md:p-8 space-y-6"
        >
          <div className="flex items-center justify-between">
            <h3 className="text-xl md:text-2xl font-display uppercase italic flex items-center gap-3">
              <Zap className="text-primary" /> Detalles de la Sala
            </h3>
            {isAdmin && (
              <span className="text-[10px] bg-primary text-black px-2 py-1 rounded font-black uppercase tracking-tighter italic">Admin View</span>
            )}
          </div>

          {(isRegistered || isAdmin || !!participant) && (
            <p className="text-[10px] md:text-xs text-primary/80 font-bold uppercase italic tracking-widest bg-primary/5 px-4 py-2 rounded-lg border border-primary/10">
              * El número y la contraseña de la sala aparecerán aquí en la hora establecida
            </p>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-[10px] uppercase font-bold text-gray-500">Número de Sala (ID)</label>
                {isAdmin ? (
                  <input
                    type="text"
                    value={roomDetails.roomNumber}
                    onChange={(e) => setRoomDetails(prev => ({ ...prev, roomNumber: e.target.value }))}
                    placeholder="Ingresa el ID de la sala"
                    className="w-full bg-black/40 border border-white/10 rounded-xl p-4 outline-none focus:border-primary transition-colors font-mono"
                  />
                ) : (
                  <div className="bg-black/40 border border-white/10 rounded-xl p-4 flex items-center justify-between group">
                    <span className="font-mono text-xl text-white">{tournament.roomNumber || 'PENDIENTE...'}</span>
                    {tournament.roomNumber && (
                      <button 
                        onClick={() => {
                          navigator.clipboard.writeText(tournament.roomNumber);
                          alert('ID de sala copiado');
                        }}
                        className="text-primary opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        Copiar
                      </button>
                    )}
                  </div>
                )}
              </div>
            </div>

            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-[10px] uppercase font-bold text-gray-500">Contraseña de Sala</label>
                {isAdmin ? (
                  <input
                    type="text"
                    value={roomDetails.roomPassword}
                    onChange={(e) => setRoomDetails(prev => ({ ...prev, roomPassword: e.target.value }))}
                    placeholder="Ingresa la contraseña"
                    className="w-full bg-black/40 border border-white/10 rounded-xl p-4 outline-none focus:border-primary transition-colors font-mono"
                  />
                ) : (
                  <div className="bg-black/40 border border-white/10 rounded-xl p-4 flex items-center justify-between group">
                    <span className="font-mono text-xl text-white">{tournament.roomPassword || 'PENDIENTE...'}</span>
                    {tournament.roomPassword && (
                      <button 
                        onClick={() => {
                          navigator.clipboard.writeText(tournament.roomPassword);
                          alert('Contraseña copiada');
                        }}
                        className="text-primary opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        Copiar
                      </button>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>

          {isAdmin && (
            <div className="flex justify-end pt-2">
              <button
                onClick={handleSaveRoomDetails}
                disabled={isSavingRoom}
                className="bg-primary text-black px-8 py-3 rounded-xl font-display uppercase italic tracking-tighter skew-x-[-10deg] hover:bg-white transition-all disabled:opacity-50"
              >
                {isSavingRoom ? 'Guardando...' : 'Actualizar Detalles de Sala'}
              </button>
            </div>
          )}

          {!isAdmin && (
            <p className="text-xs text-gray-500 italic">
              * Estos detalles son confidenciales y solo para participantes confirmados. Por favor no los compartas.
            </p>
          )}
        </motion.div>
      )}

      {/* Main Content Area */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Registration Confirmation Modal */}
        <AnimatePresence>
          {showRegConfirm && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4">
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setShowRegConfirm(false)}
                className="absolute inset-0 bg-black/80 backdrop-blur-sm"
              />
              <motion.div 
                initial={{ opacity: 0, scale: 0.95, y: 15 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 15 }}
                className="relative bg-zinc-900 border border-white/10 p-5 sm:p-8 rounded-2xl md:rounded-3xl max-w-md w-full space-y-4 sm:space-y-6 shadow-2xl overflow-y-auto max-h-[95vh] sm:max-h-[92vh] scrollbar-thin"
              >
                <div className="text-center space-y-2">
                  <div className="w-12 h-12 sm:w-16 sm:h-16 bg-primary/20 rounded-xl sm:rounded-2xl flex items-center justify-center mx-auto mb-2.5 sm:mb-4">
                    <Trophy className="text-primary w-6 h-6 sm:w-8 sm:h-8" />
                  </div>
                  <h3 className="text-xl sm:text-2xl font-display uppercase italic tracking-tighter leading-tight">¿Confirmar Registro?</h3>
                  <p className="text-gray-400 text-xs sm:text-sm max-w-xs mx-auto">
                    {isFree 
                        ? `Estás por registrarte en ${tournament.name} de forma gratuita.`
                        : `Estás por registrarte en ${tournament.name} por ${tournament.entryFee}.`
                    }
                  </p>
                </div>

                {tournament.entryFee && !isFree && (
                  <div className="space-y-3 sm:space-y-4 py-3 sm:py-4 border-y border-white/5">
                    <div className="space-y-1.5">
                      <label className="text-[9px] sm:text-[10px] uppercase font-black tracking-widest text-gray-500">Referencia o Captura de Pago</label>
                      <div className="relative flex gap-2">
                        <div className="relative flex-1">
                          <Hash className="absolute left-3 top-1/2 -translate-y-1/2 text-primary" size={14} />
                          <input 
                            type="text" 
                            placeholder="Número de referencia"
                            className="w-full bg-white/5 border border-white/10 rounded-xl p-3 pl-9 outline-none focus:border-primary transition-colors text-xs sm:text-sm tracking-widest disabled:opacity-50"
                            value={regForm.reference}
                            disabled={isSubmitting || isExtractingRef}
                            onChange={(e) => setRegForm({ reference: e.target.value })}
                          />
                        </div>

                        <label className={`w-14 shrink-0 bg-white/5 border border-white/10 rounded-xl flex items-center justify-center cursor-pointer hover:bg-white/10 transition-colors ${isExtractingRef ? 'opacity-50 pointer-events-none' : ''}`}>
                          <input 
                            type="file" 
                            accept="image/*" 
                            className="hidden" 
                            onChange={handleExtractReference} 
                          />
                          {isExtractingRef ? (
                            <Loader2 className="animate-spin text-primary" size={20} />
                          ) : (
                            <Upload className="text-primary" size={20} />
                          )}
                        </label>
                      </div>
                      {isExtractingRef && <p className="text-[10px] text-primary animate-pulse ml-1">Extrayendo datos de la captura...</p>}
                    </div>
                    <div className="p-3.5 sm:p-4 bg-primary/5 border border-primary/20 rounded-xl space-y-2.5 sm:space-y-3">
                      <div>
                        <p className="text-[9px] sm:text-[10px] uppercase font-bold text-primary mb-0.5">Tu Código de Verificación</p>
                        <p className="text-xl sm:text-2xl font-display italic text-white tracking-[0.2em]">{verificationCode}</p>
                      </div>
                      
                      <a 
                        href={`https://wa.me/584124780457?text=Hola,%20quisiera%20validar%20mi%20inscripción%20para%20el%20torneo%20"${tournament.name}".%20Mi%20código%20es%20${verificationCode}%20y%20mi%20referencia%20es%20${regForm.reference || 'PENDIENTE'}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="w-full bg-[#25D366]/15 hover:bg-[#25D366]/25 text-[#25D366] py-2.5 rounded-xl font-display uppercase italic text-[9px] sm:text-[10px] border border-[#25D366]/30 flex items-center justify-center gap-1.5 transition-all active:scale-95"
                      >
                        <MessageSquare size={12} className="shrink-0" /> Enviar Comprobante por WhatsApp
                      </a>

                      <p className="text-[9px] text-gray-500 italic leading-relaxed text-center">
                        Deberás enviar este código junto a tu comprobante por WhatsApp para validar tu inscripción.
                      </p>
                    </div>
                  </div>
                )}

                <div className="flex gap-3 pt-2">
                  <button 
                    onClick={() => setShowRegConfirm(false)}
                    className="flex-1 py-3 sm:py-4 rounded-xl font-display uppercase text-xs sm:text-sm border border-white/10 hover:bg-white/5 transition-colors"
                  >
                    Cerrar
                  </button>
                  <button 
                    onClick={handleRegister}
                    disabled={isSubmitting || (
                      tournament.entryFee && 
                      !isFree && 
                      (!regForm.reference || !regForm.reference.trim())
                    )}
                    className="flex-1 py-3 sm:py-4 bg-primary text-black rounded-xl font-display uppercase text-xs sm:text-sm skew-x-[-10deg] hover:bg-white transition-colors disabled:opacity-50 disabled:cursor-wait flex items-center justify-center gap-1.5 font-bold"
                  >
                    {isSubmitting ? (
                      <>
                        <Loader2 size={14} className="animate-spin text-black shrink-0" />
                        <span>Procesando...</span>
                      </>
                    ) : (
                      <span>Confirmar</span>
                    )}
                  </button>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        {/* Start Tournament Confirmation Modal */}
        <AnimatePresence>
          {showStartConfirm && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setShowStartConfirm(false)}
                className="absolute inset-0 bg-black/90 backdrop-blur-md"
              />
              <motion.div 
                initial={{ opacity: 0, scale: 0.9, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.9, y: 20 }}
                className="relative bg-zinc-900 border-2 border-primary/30 p-8 rounded-3xl max-w-md w-full space-y-6 shadow-[0_0_50px_rgba(59,130,246,0.2)]"
              >
                <div className="text-center space-y-4">
                  <div className="w-20 h-20 bg-primary/20 rounded-full flex items-center justify-center mx-auto border-2 border-primary/50">
                    <Zap className="text-primary animate-pulse" size={40} />
                  </div>
                  <h3 className="text-3xl font-display uppercase italic tracking-tighter text-white">¿COMENZAR AHORA?</h3>
                  <div className="space-y-2">
                    <p className="text-gray-400 text-sm">
                      Estás por iniciar el torneo <span className="text-white font-bold">{tournament.name}</span>.
                    </p>
                    <ul className="text-[10px] text-left bg-black/40 p-4 rounded-xl space-y-2 border border-white/5">
                      <li className="flex items-center gap-2 text-primary">
                        <div className="w-1 h-1 bg-current rounded-full" /> Se cerrarán las inscripciones permanentemente.
                      </li>
                      <li className="flex items-center gap-2 text-primary">
                        <div className="w-1 h-1 bg-current rounded-full" /> Se enviará una notificación a todos los participantes.
                      </li>
                      <li className="flex items-center gap-2 text-primary">
                        <div className="w-1 h-1 bg-current rounded-full" /> Se habilitarán las tablas de resultados.
                      </li>
                    </ul>
                  </div>
                </div>

                <div className="flex gap-3 pt-2">
                  <button 
                    onClick={() => setShowStartConfirm(false)}
                    className="flex-1 px-6 py-4 rounded-xl font-display uppercase text-sm border border-white/10 hover:bg-white/5 transition-colors"
                  >
                    Cancelar
                  </button>
                  <button 
                    onClick={handleStartTournament}
                    disabled={isStarting}
                    className="flex-1 px-6 py-4 bg-primary text-black rounded-xl font-display uppercase text-sm skew-x-[-10deg] hover:bg-white transition-all shadow-lg shadow-primary/30"
                  >
                    {isStarting ? 'Iniciando...' : 'INICIAR TORNEO'}
                  </button>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>
        {/* Registration Success Modal */}
        <AnimatePresence>
          {showSuccessModal && (
            <div className="fixed inset-0 z-[100] flex items-center justify-center p-3 sm:p-4">
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setShowSuccessModal(false)}
                className="absolute inset-0 bg-black/80 backdrop-blur-md"
              />
              <motion.div 
                initial={{ opacity: 0, scale: 0.95, y: 15 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 15 }}
                className="relative w-full max-w-lg bg-[#0a0a0a] border border-white/10 rounded-[2rem] sm:rounded-[2.5rem] overflow-y-auto max-h-[95vh] sm:max-h-[92vh] scrollbar-thin shadow-[0_20px_50px_rgba(0,0,0,0.5)]"
              >
                {/* Header Decoration */}
                <div className="h-2 bg-gradient-to-r from-primary via-white to-primary opacity-50" />
                
                <div className="p-6 sm:p-10 text-center space-y-5 sm:space-y-6">
                  {/* Success Icon */}
                  <div className="flex justify-center">
                    <div className="w-14 h-14 sm:w-20 sm:h-20 bg-primary/10 rounded-full flex items-center justify-center text-primary border border-primary/20 animate-pulse">
                      <CheckCircle2 className="w-8 h-8 sm:w-12 sm:h-12" />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <h2 className="text-2xl sm:text-3xl font-display uppercase italic tracking-tighter leading-tight">
                        {isFree ? (
                          <>¡Inscripción<br /><span className="text-primary">Confirmada!</span></>
                        ) : (
                          <>¡Solicitud de <br /><span className="text-primary">Inscripción Enviada!</span></>
                        )}
                    </h2>
                    <p className="text-gray-400 text-xs sm:text-sm max-w-xs mx-auto leading-relaxed">
                        {isFree ? (
                          "¡Te has inscrito correctamente en el torneo!"
                        ) : (
                          "Tu registro está pendiente de validación por un administrador."
                        )}
                    </p>
                  </div>

                  {/* Verification Code Box (Only for paid) */}
                  {!isFree && (
                    <div className="bg-white/5 border border-white/10 rounded-xl sm:rounded-2xl p-3 sm:p-4 space-y-1">
                      <span className="text-[9px] sm:text-[10px] uppercase font-black tracking-widest text-gray-500">Tu código de validación</span>
                      <div className="text-xl sm:text-2xl font-mono font-bold tracking-[0.4em] text-white">
                        {verificationCode}
                      </div>
                    </div>
                  )}

                  <div className="grid grid-cols-1 gap-2.5 sm:gap-3">
                    {!isFree ? (
                      <a 
                        href={`https://wa.me/584124780457?text=Hola,%20acabo%20de%20inscribirme%20en%20el%20torneo%20"${tournament?.name}".%20Aquí%20adjunto%20mi%20comprobante%20de%20pago.%20Mi%20código%20de%20verificación%20es:%20${verificationCode}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="w-full bg-[#25D366] hover:bg-white hover:text-[#25D366] text-white py-3.5 sm:py-4 rounded-xl font-display uppercase italic text-sm sm:text-lg transition-all flex items-center justify-center gap-2 active:scale-95 shadow-lg shadow-green-500/20"
                      >
                        <MessageSquare size={18} /> ENVIAR COMPROBANTE
                      </a>
                    ) : (
                      <button 
                        onClick={() => setShowSuccessModal(false)}
                        className="w-full bg-primary hover:bg-white text-black hover:text-black py-3.5 sm:py-4 rounded-xl font-display uppercase italic text-sm sm:text-lg transition-all flex items-center justify-center gap-2 active:scale-95 shadow-lg shadow-primary/20 font-bold"
                      >
                        ¡ENTRAR A LA ARENA!
                      </button>
                    )}
                    
                    {!isFree && (
                      <button 
                        onClick={() => setShowSuccessModal(false)}
                        className="w-full bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white py-2.5 sm:py-3 rounded-xl font-display uppercase italic text-xs transition-all"
                      >
                        Cerrar y ver detalles
                      </button>
                    )}
                  </div>
                </div>

                {/* Footer Tip */}
                <div className="bg-primary/5 p-3.5 sm:p-4 text-center border-t border-white/5">
                  <p className="text-[10px] uppercase font-bold text-primary/60 tracking-wider">
                    {isFree ? (
                      "¡Busca tu nombre en la pestaña de participantes!"
                    ) : (
                      "Recibirás una notificación una vez que tu pago sea aprobado"
                    )}
                  </p>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        {/* Tabs and Details */}
        <div className="lg:col-span-2 space-y-6">
          <div className="flex gap-2 p-1 bg-white/5 rounded-2xl border border-white/10 overflow-x-auto no-scrollbar">
                {(['info', 'results', 'chat', 'participants'] as const)
                  .filter(tab => {
                    const isOngoingOrCompleted = tournament.status !== 'upcoming';
                    const isFull = tournament.registeredParticipants >= tournament.maxParticipants;
                    
                    // If tournament is started or full, most tabs are restricted
                    if (isOngoingOrCompleted || isFull) {
                      if (tab === 'chat' || tab === 'participants' || tab === 'results') {
                        return isRegistered || isAdmin;
                      }
                    }

                    if (tab === 'chat' || tab === 'participants') return isRegistered || isAdmin;
                    return true;
                  })
                  .map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={cn(
                  "flex-1 px-6 py-3 rounded-xl font-display uppercase text-sm transition-all skew-x-[-10deg] whitespace-nowrap",
                  activeTab === tab ? "bg-primary text-black" : "text-gray-400 hover:text-white hover:bg-white/5"
                )}
              >
                {tab === 'info' ? 'Información' : tab === 'results' ? 'Resultados' : tab === 'chat' ? 'Chat en Vivo' : 'Participantes'}
              </button>
            ))}
          </div>

          <div className="glass p-6 md:p-8 rounded-3xl min-h-[400px] relative overflow-hidden">
            <AnimatePresence mode="wait">
              {activeTab !== 'info' && !isRegistered && !isAdmin && (tournament.status !== 'upcoming' || tournament.registeredParticipants >= tournament.maxParticipants) ? (
                <motion.div
                  key="restricted-overlay"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="flex flex-col items-center justify-center h-[400px] text-center space-y-4"
                >
                  <div className="w-20 h-20 bg-zinc-900 rounded-3xl flex items-center justify-center border border-white/10 shadow-2xl">
                    <Users size={40} className="text-gray-600" />
                  </div>
                  <div className="space-y-2">
                    <h3 className="text-2xl font-display uppercase italic tracking-tighter text-white">Sala Privada</h3>
                    <p className="text-sm text-gray-500 max-w-xs mx-auto">
                      El acceso a esta sección está restringido a participantes confirmados una vez que el torneo comienza o se llena.
                    </p>
                  </div>
                </motion.div>
              ) : activeTab === 'info' && (
                <motion.div
                  key="info"
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 10 }}
                  className="space-y-6"
                >
                  {tournament.status === 'ongoing' && (
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <h3 className="text-xl font-display uppercase italic flex items-center gap-2">
                          <Radio className="text-red-500 animate-pulse" size={20} /> Transmisión en Vivo
                        </h3>
                        <div className="flex items-center gap-2 bg-red-600/10 border border-red-600/20 px-3 py-1 rounded-full text-[10px] font-bold text-red-500 uppercase tracking-widest">
                          <div className="w-1.5 h-1.5 bg-red-600 rounded-full animate-pulse" />
                          En Vivo
                        </div>
                      </div>
                      <YoutubeLivePlayer />
                    </div>
                  )}

                  <h3 className="text-2xl font-display uppercase italic flex items-center gap-3">
                    <Info className="text-primary" /> Reglas del Juego
                  </h3>
                  <div className="prose prose-invert max-w-none text-gray-300 whitespace-pre-wrap mb-8">
                    {tournament.rules || "No hay reglas específicas para este torneo."}
                  </div>

                  {(isRegistered || isAdmin || !!participant) && (
                    <div className="p-4 bg-white/5 border border-white/10 rounded-2xl flex items-center gap-4">
                      <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center flex-shrink-0">
                        <Info className="text-primary" size={20} />
                      </div>
                      <p className="text-sm font-bold uppercase italic tracking-wider text-gray-400">
                        El número y la contraseña de la sala aparecerán aquí en la hora establecida
                      </p>
                    </div>
                  )}

                  {tournament.roomCreationTime && (
                    <div className="bg-primary/10 border border-primary/20 p-6 rounded-2xl flex items-center gap-4">
                      <Clock className="text-primary" size={32} />
                      <div>
                        <p className="text-[10px] uppercase font-bold text-primary">Creación de Sala</p>
                        <p className="text-lg font-display uppercase italic">
                          {format(tournament.roomCreationTime.toDate(), "PPP p", { locale: es })}
                        </p>
                      </div>
                    </div>
                  )}
                </motion.div>
              )}

              {activeTab === 'chat' && (
                <motion.div
                  key="chat"
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 10 }}
                  className="flex flex-col h-[600px]"
                >
                  {isRegistered || isAdmin ? (
                    <>
                      <div className="flex-grow overflow-y-auto space-y-6 pr-4 custom-scrollbar p-2">
                        {messages.map((msg) => {
                          if (msg.isSystem) {
                            return (
                              <motion.div 
                                layout
                                key={msg.id}
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                className="flex justify-center py-6"
                              >
                                <div className="relative group">
                                  <div className="absolute inset-0 bg-primary/20 blur-xl opacity-0 group-hover:opacity-100 transition-opacity" />
                                  <div className="relative bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl px-8 py-3 text-center">
                                    <p className="text-[11px] italic text-primary/70 font-medium tracking-wide">
                                      {msg.message}
                                    </p>
                                    <div className="flex items-center justify-center gap-2 mt-1.5">
                                      <div className="h-[1px] w-4 bg-primary/20" />
                                      <Zap size={8} className="text-primary/40" />
                                      <div className="h-[1px] w-4 bg-primary/20" />
                                    </div>
                                  </div>
                                </div>
                              </motion.div>
                            );
                          }
                          
                          const isOwnMessage = msg.senderId === user?.uid;

                          return (
                            <motion.div 
                              layout
                              key={msg.id} 
                              initial={{ opacity: 0, x: isOwnMessage ? 20 : -20 }}
                              animate={{ opacity: 1, x: 0 }}
                              className={cn(
                                "flex gap-3 max-w-[90%] group",
                                isOwnMessage ? "ml-auto flex-row-reverse" : "flex-row"
                              )}
                            >
                              {/* Avatar */}
                              <div className="relative flex-shrink-0 mt-auto mb-1">
                                <div className={cn(
                                  "w-10 h-10 rounded-xl overflow-hidden border-2 transition-transform group-hover:scale-105",
                                  isOwnMessage ? "border-primary/20" : "border-white/10"
                                )}>
                                  <img 
                                    src={msg.senderPhotoURL || `https://api.dicebear.com/7.x/avataaars/svg?seed=${msg.senderId}`} 
                                    className="w-full h-full object-cover bg-zinc-800" 
                                    alt={msg.senderName} 
                                  />
                                </div>
                                {isUserOnline(msg.createdAt) && (
                                  <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-primary border-2 border-black rounded-full" />
                                )}
                              </div>
                              
                              {/* Message Content */}
                              <div className={cn(
                                "flex flex-col gap-1.5",
                                isOwnMessage ? "items-end" : "items-start"
                              )}>
                                <div className={cn(
                                  "flex items-center gap-2 px-1",
                                  isOwnMessage ? "flex-row-reverse" : "flex-row"
                                )}>
                                  <span className={cn(
                                    "text-[10px] uppercase font-black tracking-wider",
                                    isOwnMessage ? "text-primary/70" : "text-gray-400"
                                  )}>
                                    {isOwnMessage ? 'Tú' : msg.senderName}
                                  </span>
                                  <span className="text-[9px] text-gray-600 font-mono">
                                    {msg.createdAt && format(msg.createdAt.toDate(), "HH:mm")}
                                  </span>
                                  {msg.isEdited && (
                                    <span className="text-[9px] text-gray-500 italic">(editado)</span>
                                  )}
                                </div>
                                
                                <div className="relative group/actions">
                                  <div className={cn(
                                    "px-5 py-3.5 rounded-[1.25rem] text-sm leading-relaxed shadow-xl transition-all",
                                    isOwnMessage 
                                      ? "bg-gradient-to-br from-primary/90 to-primary text-black rounded-tr-none font-medium selection:bg-black selection:text-primary" 
                                      : "bg-zinc-800/80 backdrop-blur-md text-white rounded-tl-none border border-white/10 hover:border-white/20"
                                  )}>
                                    {msg.replyTo && (
                                      <div className={cn(
                                        "mb-2 p-2 rounded-lg text-xs border-l-4",
                                        isOwnMessage ? "bg-black/10 border-black/30 text-black/70" : "bg-white/5 border-primary/50 text-gray-400"
                                      )}>
                                        <p className="font-bold mb-0.5">{msg.replyTo.senderName}</p>
                                        <p className="line-clamp-1 italic">{msg.replyTo.message}</p>
                                      </div>
                                    )}
                                    {msg.message}
                                  </div>

                                  {/* Actions */}
                                  <div className={cn(
                                    "absolute top-0 opacity-0 group-hover/actions:opacity-100 transition-opacity flex gap-1",
                                    isOwnMessage ? "right-full mr-2" : "left-full ml-2"
                                  )}>
                                    <button 
                                      onClick={() => {
                                        setReplyingTo(msg);
                                        setEditingMessage(null);
                                        setNewMessage('');
                                      }}
                                      className="p-1.5 bg-zinc-800 border border-white/10 rounded-lg hover:bg-primary hover:text-black transition-colors"
                                      title="Responder"
                                    >
                                      <Reply size={14} />
                                    </button>
                                    {isAdmin && (
                                      <button 
                                        onClick={() => {
                                          setEditingMessage(msg);
                                          setNewMessage(msg.message);
                                          setReplyingTo(null);
                                        }}
                                        className="p-1.5 bg-zinc-800 border border-white/10 rounded-lg hover:bg-yellow-500 hover:text-black transition-colors"
                                        title="Editar"
                                      >
                                        <Edit2 size={14} />
                                      </button>
                                    )}
                                  </div>
                                </div>
                              </div>
                            </motion.div>
                          );
                        })}
                        {typingUsers.length > 0 && (
                          <motion.div 
                            layout
                            initial={{ opacity: 0, y: 5 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="flex items-center gap-2 px-4 py-2 text-xs text-gray-500 italic"
                          >
                            <div className="flex gap-1">
                              <span className="w-1 h-1 bg-primary rounded-full animate-bounce" />
                              <span className="w-1 h-1 bg-primary rounded-full animate-bounce [animation-delay:0.2s]" />
                              <span className="w-1 h-1 bg-primary rounded-full animate-bounce [animation-delay:0.4s]" />
                            </div>
                            {typingUsers.length === 1 
                              ? `${typingUsers[0].userName || 'Alguien'} está escribiendo...` 
                              : `${typingUsers.length} personas están escribiendo...`}
                          </motion.div>
                        )}
                        <div ref={chatEndRef} />
                      </div>
                      
                      {user ? (
                        <div className="mt-4 space-y-2">
                          <AnimatePresence>
                            {replyingTo && (
                              <motion.div 
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: 10 }}
                                className="bg-primary/10 border-l-4 border-primary p-3 rounded-r-xl flex items-center justify-between"
                              >
                                <div className="text-xs">
                                  <p className="text-primary font-bold uppercase tracking-widest text-[9px]">Respondiendo a {replyingTo.senderName}</p>
                                  <p className="text-gray-300 line-clamp-1 italic">{replyingTo.message}</p>
                                </div>
                                <button onClick={() => setReplyingTo(null)} className="text-gray-500 hover:text-white">
                                  <X size={16} />
                                </button>
                              </motion.div>
                            )}
                            {editingMessage && (
                              <motion.div 
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: 10 }}
                                className="bg-yellow-500/10 border-l-4 border-yellow-500 p-3 rounded-r-xl flex items-center justify-between"
                              >
                                <div className="text-xs">
                                  <p className="text-yellow-500 font-bold uppercase tracking-widest text-[9px]">Editando mensaje de {editingMessage.senderName}</p>
                                  <p className="text-gray-300 line-clamp-1 italic">{editingMessage.message}</p>
                                </div>
                                <button onClick={() => { setEditingMessage(null); setNewMessage(''); }} className="text-gray-500 hover:text-white">
                                  <X size={16} />
                                </button>
                              </motion.div>
                            )}
                          </AnimatePresence>
                          <form onSubmit={(e) => { e.preventDefault(); handleSendMessage(e); }} className="flex gap-2">
                             <input 
                               type="text" 
                               value={newMessage}
                               onChange={(e) => {
                                 setNewMessage(e.target.value);
                                 handleTyping();
                               }}
                               placeholder={editingMessage ? "Modificar mensaje..." : replyingTo ? "Escribe tu respuesta..." : "Escribe un mensaje para los jugadores..."}
                               className="flex-grow bg-white/5 border border-white/10 rounded-xl px-4 py-4 outline-none focus:border-primary transition-colors text-sm"
                             />
                             <button 
                               type="submit" 
                               disabled={!newMessage.trim()}
                               className={cn(
                                 "px-6 rounded-xl transition-all disabled:opacity-50",
                                 editingMessage ? "bg-yellow-500 text-black" : "bg-primary text-black"
                               )}
                             >
                               {editingMessage ? <Edit2 size={20} /> : <Send size={20} />}
                             </button>
                          </form>
                        </div>
                      ) : (
                        <div className="mt-4 p-4 glass rounded-2xl text-center text-sm text-gray-500 italic">
                          Inicia sesión para participar en el chat en tiempo real
                        </div>
                      )}
                    </>
                  ) : (
                    <div className="flex flex-col items-center justify-center h-full space-y-4 text-center">
                      <div className="w-16 h-16 bg-zinc-800 rounded-2xl flex items-center justify-center text-gray-500">
                        <MessageSquare size={32} />
                      </div>
                      <div className="space-y-1">
                        <h4 className="text-lg font-display uppercase italic text-gray-400">Chat Bloqueado</h4>
                        <p className="text-xs text-gray-500 max-w-[200px]">Debes estar inscrito y aprobado en el torneo para participar en el chat.</p>
                      </div>
                    </div>
                  )}
                </motion.div>
              )}


              {activeTab === 'participants' && (
                <motion.div
                  key="participants"
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 10 }}
                  className="space-y-6"
                >
                  <div className="flex items-center justify-between border-b border-white/10 pb-4">
                    <h3 className="text-2xl font-display uppercase italic flex items-center gap-3">
                      <Users className="text-primary" /> Jugadores Inscritos
                    </h3>
                    <span className="text-xs font-bold text-gray-500 uppercase tracking-widest bg-white/5 px-3 py-1 rounded-lg">
                      Confirmados: {participantsList.filter(p => p.paymentStatus === 'approved' || p.paymentStatus === 'none').length}
                    </span>
                  </div>

                  <motion.div 
                    initial="hidden"
                    animate="visible"
                    variants={{
                      hidden: { opacity: 0 },
                      visible: {
                        opacity: 1,
                        transition: {
                          staggerChildren: 0.05
                        }
                      }
                    }}
                    className="grid grid-cols-1 md:grid-cols-2 gap-4"
                  >
                    {(() => {
                      const visibleParticipants = participantsList.filter(p => isAdmin || p.paymentStatus === 'approved' || p.paymentStatus === 'none' || p.userId === user?.uid);
                      return visibleParticipants.length > 0 ? (
                        visibleParticipants.map((p) => {
                          const isConfirmed = p.paymentStatus === 'approved' || p.paymentStatus === 'none';
                          return (
                            <motion.div 
                              key={p.id} 
                            variants={{
                              hidden: { opacity: 0, y: 10 },
                              visible: { opacity: 1, y: 0 }
                            }}
                            whileHover={{ scale: 1.02 }}
                            className={cn(
                              "flex items-center justify-between p-4 rounded-2xl border transition-all cursor-default",
                              isConfirmed ? "bg-white/5 border-white/10" : "bg-yellow-500/5 border-yellow-500/20 grayscale opacity-60"
                            )}
                          >
                            <div className="flex items-center gap-4">
                              <div className="relative">
                                <img 
                                  src={p.photoURL || `https://api.dicebear.com/7.x/avataaars/svg?seed=${p.userId}`} 
                                  className="w-10 h-10 rounded-xl bg-zinc-800 object-cover" 
                                  alt={p.userName} 
                                />
                                {isConfirmed && (
                                  <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-primary rounded-full border-2 border-zinc-900 flex items-center justify-center">
                                    <Zap size={8} className="text-black" />
                                  </div>
                                )}
                              </div>
                              <div>
                                <p className={cn(
                                  "font-bold text-sm",
                                  isConfirmed ? "text-white" : "text-gray-500"
                                )}>
                                  {p.userName}
                                </p>
                                <p className="text-[10px] uppercase font-bold text-gray-500 tracking-widest">
                                  {isConfirmed ? 'Inscrito' : 'Pendiente Verificación'}
                                </p>
                              </div>
                            </div>
                            <div className="text-right">
                              <p className="text-[10px] text-gray-600 uppercase font-bold">Registro</p>
                              <p className="text-[10px] text-gray-400 font-mono">
                                {p.registeredAt && format(p.registeredAt.toDate(), "dd/MM HH:mm")}
                              </p>
                            </div>
                          </motion.div>
                        );
                        })
                      ) : (
                        <div className="col-span-2 py-20 text-center space-y-4">
                          <Users size={48} className="mx-auto text-gray-800" />
                          <p className="text-gray-500 uppercase font-bold text-xs">No hay participantes registrados aún</p>
                        </div>
                      );
                    })()}
                  </motion.div>
                </motion.div>
              )}

              {activeTab === 'results' && (
                <motion.div
                  key="results"
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 10 }}
                  className="space-y-6"
                >
                  <div className="flex items-center justify-between border-b border-white/10 pb-4">
                    <div className="space-y-1">
                      <h3 className="text-2xl font-display uppercase italic flex items-center gap-3">
                        <Swords className="text-primary" /> Estructura de Llaves
                      </h3>
                      <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Bracket del Torneo</p>
                    </div>
    {isAdmin && tournament.status === 'ongoing' && matches.length > 0 && (
      <div className="flex gap-2">
        <button 
          onClick={async () => {
            if (!confirm('¿Simular ganadores para todos los enfrentamientos activos?')) return;
            const activeMatches = matches.filter(m => m.status === 'pending' && m.player1Id && m.player2Id);
            for (const match of activeMatches) {
               const winner = Math.random() > 0.5 ? 'player1' : 'player2';
               const winnerId = winner === 'player1' ? match.player1Id : match.player2Id;
               const winnerName = winner === 'player1' ? match.player1Name : match.player2Name;
               await matchService.updateMatch(id, match.id, {
                 player1Score: winner === 'player1' ? 1 : 0,
                 player2Score: winner === 'player2' ? 1 : 0,
                 winnerId,
                 winnerName,
                 status: 'completed'
               });
            }
          }}
          className="bg-primary/10 text-primary px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-widest hover:bg-primary hover:text-black transition-all border border-primary/20"
        >
          Simular Ronda
        </button>
        <button 
          onClick={handleGenerateBracket}
          className="bg-white/5 text-gray-400 px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-widest hover:bg-red-500/10 hover:text-red-500 transition-all border border-white/5"
        >
          Reiniciar Llaves
        </button>
      </div>
    )}
                  </div>

                  {renderBracket()}

                  {/* Manual Placements Table */}
                  {participantsList.some(p => p.placement) && (
                    <motion.div 
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="mt-12 space-y-6"
                    >
                      <div className="flex items-center gap-3">
                        <Trophy className="text-primary" />
                        <h3 className="text-2xl font-display uppercase italic text-white tracking-tight">Tabla de Clasificación</h3>
                      </div>
                      <div className="glass rounded-3xl border border-white/10 overflow-hidden">
                        <div className="grid grid-cols-12 px-4 md:px-6 py-4 bg-white/5 border-b border-white/10 text-[9px] md:text-[10px] uppercase font-bold text-gray-500 tracking-widest text-center">
                          <div className="col-span-3 md:col-span-2 text-left md:ml-2">Puesto</div>
                          <div className="col-span-6 md:col-span-6 text-left">Jugador</div>
                          <div className="col-span-3 md:col-span-4 text-right md:mr-4">Puntos</div>
                        </div>
                        <motion.div 
                          initial="hidden"
                          animate="visible"
                          variants={{
                            hidden: { opacity: 0 },
                            visible: {
                              opacity: 1,
                              transition: {
                                staggerChildren: 0.05
                              }
                            }
                          }}
                          className="divide-y divide-white/5"
                        >
                          {participantsList
                            .filter(p => p.placement)
                            .sort((a, b) => a.placement - b.placement)
                            .map((p, idx) => (
                              <motion.div 
                                key={idx} 
                                variants={{
                                  hidden: { opacity: 0, x: -10 },
                                  visible: { opacity: 1, x: 0 }
                                }}
                                whileHover={{ backgroundColor: "rgba(255, 255, 255, 0.03)" }}
                                className="grid grid-cols-12 px-4 md:px-6 py-4 items-center transition-colors"
                              >
                                <div className="col-span-3 md:col-span-2 flex items-center gap-1.5 md:gap-2">
                                  {p.placement === 1 && <Crown className="text-yellow-400 w-4 h-4 md:w-5 md:h-5" />}
                                  {p.placement === 2 && <Medal className="text-gray-300 w-4 h-4 md:w-5 md:h-5" />}
                                  {p.placement === 3 && <Medal className="text-amber-600 w-4 h-4 md:w-5 md:h-5" />}
                                  <span className={cn(
                                    "font-black font-display italic",
                                    p.placement === 1 ? "text-yellow-400 text-xl md:text-2xl" : 
                                    p.placement === 2 ? "text-gray-300 text-base md:text-lg" : 
                                    p.placement === 3 ? "text-amber-600 text-base md:text-lg" : "text-gray-500 text-base md:text-lg"
                                  )}>
                                    #{p.placement}
                                  </span>
                                </div>
                                <div className="col-span-6 md:col-span-6 flex items-center gap-2 md:gap-3">
                                  <img 
                                    src={p.photoURL || `https://api.dicebear.com/7.x/avataaars/svg?seed=${p.userId}`} 
                                    className="w-8 h-8 md:w-10 md:h-10 rounded-lg md:rounded-xl"
                                    alt="" 
                                  />
                                  <span className="font-bold text-white uppercase tracking-tight text-xs md:text-sm truncate mr-2">{p.userName}</span>
                                </div>
                                <div className="col-span-3 md:col-span-4 text-right">
                                  <span className="font-display italic text-lg md:text-2xl text-primary font-black">+{p.pointsAwarded || 0}</span>
                                  <span className="hidden md:inline text-[10px] text-gray-500 font-bold ml-1 uppercase">PTS</span>
                                </div>
                              </motion.div>
                            ))}
                        </motion.div>
                      </div>
                    </motion.div>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* Sidebar / Registration */}
        <div className="space-y-6">
          <div className="glass p-6 rounded-3xl border-primary/20 border-2">
            <h3 className="text-xl font-display uppercase italic tracking-tighter">Estado de Registro</h3>
            <div className="mt-6 space-y-4">
              <div className="flex justify-between items-end">
                <span className="text-xs uppercase font-bold text-gray-500">Espacios Disponibles</span>
                <span className="text-2xl font-display italic text-primary">
                  {tournament.maxParticipants - tournament.registeredParticipants}
                </span>
              </div>
              <div className="h-2 bg-white/5 rounded-full overflow-hidden">
                <motion.div 
                  initial={{ width: 0 }}
                  animate={{ width: `${(tournament.registeredParticipants / tournament.maxParticipants) * 100}%` }}
                  className="h-full bg-primary"
                />
              </div>

              {user ? (
                participant ? (
                  participant.paymentStatus === 'pending' ? (
                    <div className="space-y-4">
                      <div className="bg-yellow-500/10 border border-yellow-500/50 text-yellow-500 p-4 rounded-xl text-center font-bold text-sm">
                         VERIFICANDO PAGO...
                         <p className="text-[10px] font-normal mt-1 opacity-70">Tu participación estará lista en breve.</p>
                      </div>
                      <div className="bg-white/5 border border-white/10 p-4 rounded-xl text-center">
                        <p className="text-[10px] uppercase font-bold text-gray-500 mb-1">CÓDIGO DE VERIFICACIÓN</p>
                        <p className="text-2xl font-display italic text-primary tracking-[0.2em]">
                          {participant.paymentCode}
                        </p>
                      </div>
                    </div>
                  ) : participant.paymentStatus === 'approved' ? (
                    <div className="space-y-4">
                      <div className="bg-green-500/10 border border-green-500/50 text-green-500 p-4 rounded-xl text-center font-bold text-sm">
                         ¡REGISTRO CONFIRMADO!
                      </div>
                      <div className="bg-primary/20 border border-primary/50 p-4 rounded-xl text-center">
                        <p className="text-[10px] uppercase font-bold text-primary mb-1">CÓDIGO DE ENTRADA</p>
                        <p className="text-3xl font-display italic text-white tracking-[0.2em]">
                          {participant.paymentCode}
                        </p>
                      </div>
                    </div>
                  ) : participant.paymentStatus === 'rejected' ? (
                    <div className="space-y-4">
                      <div className="bg-red-500/10 border border-red-500/50 text-red-500 p-4 rounded-xl text-center font-bold text-sm">
                         PAGO RECHAZADO
                         <p className="text-[10px] font-normal mt-1 opacity-70">Tu comprobante no fue validado. Por favor, intenta de nuevo con la referencia correcta.</p>
                      </div>
                      <button 
                        onClick={() => {
                          setRegForm({ reference: '' });
                          setShowRegConfirm(true);
                        }}
                        className="w-full bg-primary text-black py-4 font-display uppercase text-xl skew-x-[-10deg] hover:bg-white transition-colors"
                      >
                        REINTENTAR REGISTRO
                      </button>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <div className="bg-green-500/10 border border-green-500/50 text-green-500 p-4 rounded-xl text-center font-bold text-sm">
                         ¡ESTÁS REGISTRADO EN ESTE TORNEO!
                      </div>
                      <div className="bg-primary/20 border border-primary/50 p-4 rounded-xl text-center">
                        <p className="text-[10px] uppercase font-bold text-primary mb-1">CÓDIGO DE ENTRADA</p>
                        <p className="text-3xl font-display italic text-white tracking-[0.2em]">
                          {participant.paymentCode}
                        </p>
                      </div>
                    </div>
                  )
                ) : tournament.status !== 'upcoming' ? (
                  <div className="bg-zinc-800 border border-white/10 p-4 rounded-xl text-center font-bold text-sm text-gray-400">
                     EL REGISTRO ESTÁ CERRADO
                  </div>
                ) : tournament.registeredParticipants >= tournament.maxParticipants ? (
                  <div className="bg-red-500/10 border border-red-500/50 text-red-500 p-4 rounded-xl text-center font-bold text-sm">
                     TORNEO LLENO
                  </div>
                ) : (
                  <div className="space-y-4">
                    <button 
                      onClick={handleRegister}
                      disabled={isSubmitting}
                      className="w-full bg-primary text-black py-4 font-display uppercase text-xl skew-x-[-10deg] animate-pulse hover:animate-none disabled:opacity-50 disabled:animate-none flex items-center justify-center gap-2"
                    >
                      {isSubmitting ? (
                        <>
                          <Loader2 size={24} className="animate-spin text-black" />
                          <span>PROCESANDO...</span>
                        </>
                      ) : (
                        <span>REGISTRARME AHORA</span>
                      )}
                    </button>
                    {tournament.entryFee && !isFree && (
                      <p className="text-[10px] text-center text-gray-500">
                        Al registrarte, declaras haber enviado el comprobante por WhatsApp.
                      </p>
                    )}
                  </div>
                )
              ) : (
                <div className="text-center py-2 text-sm text-gray-400">Inicia sesión para participar</div>
              )}
            </div>
          </div>

          {/* Admin Control Panel */}
          {isAdmin && tournament.status === 'upcoming' && (
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="bg-primary/10 border-2 border-primary/50 p-6 rounded-3xl space-y-4 shadow-xl shadow-primary/5"
            >
              <div className="flex items-center gap-3">
                <Zap className="text-primary animate-pulse" size={24} />
                <h3 className="text-lg font-display uppercase italic text-primary">Panel de Control</h3>
              </div>
              <p className="text-xs text-gray-400">
                Una vez que comiences el torneo, no se podrán inscribir más jugadores y se habilitarán las funciones de juego.
              </p>
              <button 
                onClick={() => setShowStartConfirm(true)}
                disabled={isStarting || tournament.registeredParticipants < 2}
                className="w-full bg-primary text-black py-4 rounded-xl font-display uppercase tracking-widest text-sm skew-x-[-10deg] hover:bg-white transition-all shadow-lg shadow-primary/20 disabled:grayscale disabled:opacity-50 disabled:cursor-not-allowed group"
              >
                <span className="group-disabled:hidden">Comenzar Torneo Ahora</span>
                <span className="hidden group-disabled:block">Se requieren 2+ Participantes</span>
              </button>
            </motion.div>
          )}

          {/* Social / Sponsors Mock */}
          <div className="glass p-6 rounded-3xl border-white/10 border">
            <p className="text-xs uppercase font-bold text-gray-500 mb-4">Patrocinado por</p>
            <div className="flex flex-wrap gap-4 opacity-30 grayscale items-center justify-center">
               <Zap size={32} />
               <Trophy size={32} />
               <Zap size={32} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TournamentPage;
