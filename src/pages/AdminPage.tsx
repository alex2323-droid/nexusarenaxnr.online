import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { tournamentService, userService, bracketService } from '../services/db';
import { db } from '../lib/firebase';
import { collection, query, orderBy, limit, getDocs, doc, getDoc } from 'firebase/firestore';
import axios from 'axios';
import { Trophy, Plus, Minus, Settings, Trash2, Check, Users, Clock, CreditCard, Eye, History, X, AlertTriangle, Workflow, Mail } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../lib/utils';
import EmailAdmin from '../components/EmailAdmin';

const AdminPage: React.FC = () => {
  const { user, isAdmin } = useAuth();
  const [tournaments, setTournaments] = useState<any[]>([]);
  const [pendingParticipants, setPendingParticipants] = useState<any[]>([]);
  const [isCreating, setIsCreating] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'tournaments' | 'payments' | 'ranking' | 'emails'>('tournaments');
  const [userSearchTerm, setUserSearchTerm] = useState('');
  const [userSearchResults, setUserSearchResults] = useState<any[]>([]);
  const [selectedUser, setSelectedUser] = useState<any | null>(null);
  const [userStatsForm, setUserStatsForm] = useState({
    wins: 0,
    losses: 0,
    tournaments: 0,
    points: 0
  });
  
  const [formData, setFormData] = useState({
    name: '',
    game: '',
    gameMode: 'Battle Royale',
    startDate: '',
    maxParticipants: 16,
    prizePool: '',
    rules: '',
    bannerImage: '',
    roomCreationTime: '',
    roomNumber: '',
    roomPassword: '',
    entryFee: ''
  });

  useEffect(() => {
    if (isAdmin) {
      const unsubscribeTournaments = tournamentService.listenTournaments((ts) => {
        setTournaments(ts);
        // For each upcoming tournament, listen to participants to find pending payments
        ts.forEach(t => {
          if (t.status === 'upcoming') {
            tournamentService.listenAllParticipants(t.id, (ps) => {
              const pending = ps.filter(p => p.paymentStatus === 'pending').map(p => ({
                ...p,
                tournamentId: t.id,
                tournamentName: t.name
              }));
              setPendingParticipants(prev => {
                const others = prev.filter(p => p.tournamentId !== t.id);
                return [...others, ...pending];
              });
            });
          }
        });
      });
      return unsubscribeTournaments;
    }
  }, [isAdmin]);

  const [expandedTournamentId, setExpandedTournamentId] = useState<string | null>(null);
  const [currentParticipants, setCurrentParticipants] = useState<any[]>([]);
  const [viewingParticipant, setViewingParticipant] = useState<any | null>(null);
  const [tournamentToDelete, setTournamentToDelete] = useState<any | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isGeneratingBracket, setIsGeneratingBracket] = useState<string | null>(null);
  const [confirmingStartTournament, setConfirmingStartTournament] = useState<any | null>(null);
  const [startConfirmCountdown, setStartConfirmCountdown] = useState(0);
  const [roomInfo, setRoomInfo] = useState({ number: '', password: '' });
  const [placementPoints, setPlacementPoints] = useState<{[key: string]: number}>({});
  const [placementPosition, setPlacementPosition] = useState<{[key: string]: number}>({});
  const [toast, setToast] = useState<{ message: string, type: 'success' | 'error' | 'info' } | null>(null);

  const showToast = (message: string, type: 'success' | 'error' | 'info' = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  };

  useEffect(() => {
    let timer: any;
    if (startConfirmCountdown > 0) {
      timer = setInterval(() => {
        setStartConfirmCountdown(prev => prev - 1);
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [startConfirmCountdown]);

  useEffect(() => {
    if (expandedTournamentId) {
      const unsubscribe = tournamentService.listenAllParticipants(expandedTournamentId, setCurrentParticipants);
      return unsubscribe;
    }
  }, [expandedTournamentId]);

  const handleApprovePayment = async (participant: any) => {
    if (!participant) return;
    try {
      let codeToUse = participant.paymentCode;

      if (!codeToUse) {
        const tournamentParticipants = (await tournamentService.getParticipants(participant.tournamentId)) || [] as any[];
        const existingCodes = new Set(tournamentParticipants.map((p: any) => p.paymentCode).filter(Boolean));
        
        let attempts = 0;
        do {
          codeToUse = Math.floor(1000 + Math.random() * 9000).toString();
          attempts++;
        } while (existingCodes.has(codeToUse) && attempts < 100);
      }

      await tournamentService.approvePayment(participant.tournamentId, participant.userId, codeToUse);
      showToast(`Pago de ${participant.userName} aprobado con éxito`);

      // Enviar email de confirmación
      try {
        const userSnap = await getDoc(doc(db, 'users', participant.userId));
        const userData = userSnap.exists() ? userSnap.data() : null;
        if (userData?.email) {
          await axios.post('/api/emails/payment-confirmation', {
            userId: participant.userId,
            tournamentId: participant.tournamentId,
            paymentCode: codeToUse,
            tournamentName: participant.tournamentName || tournaments.find(t => t.id === participant.tournamentId)?.name,
            userName: participant.userName,
            userEmail: userData.email
          });
          console.log('Confirmation email sent');
        }
      } catch (err) {
        console.error('Failed to send confirmation email:', err);
      }

      // Enviar notificación al creador del torneo
      const tournament = tournaments.find(t => t.id === participant.tournamentId);
      if (tournament?.createdBy) {
        await userService.sendNotification(
          tournament.createdBy,
          'Pago Aprobado',
          `El pago de ${participant.userName} para el torneo "${tournament.name}" ha sido aprobado por un administrador.`,
          'payment_approved'
        );
      }

      if (viewingParticipant?.userId === participant.userId) {
        setViewingParticipant(prev => prev ? ({ ...prev, paymentStatus: 'approved', paymentCode: codeToUse }) : null);
      }
    } catch (error) {
      console.error(error);
      showToast('Error al aprobar el pago', 'error');
    }
  };

  const handleRejectPayment = async (participant: any) => {
    if (!participant) return;
    try {
      await tournamentService.rejectPayment(participant.tournamentId, participant.userId);
      showToast(`Pago de ${participant.userName} rechazado`, 'info');
      if (viewingParticipant?.userId === participant.userId) {
        setViewingParticipant(prev => prev ? ({ ...prev, paymentStatus: 'rejected' }) : null);
      }
    } catch (error) {
      console.error(error);
      showToast('Error al rechazar el pago', 'error');
    }
  };

  useEffect(() => {
    if (activeTab === 'ranking' && userSearchResults.length === 0) {
      const fetchInitialUsers = async () => {
        try {
          const q = query(collection(db, 'users'), orderBy('stats.wins', 'desc'), limit(20));
          const snap = await getDocs(q);
          setUserSearchResults(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
        } catch (error) {
          console.error(error);
        }
      };
      fetchInitialUsers();
    }
  }, [activeTab]);

  const handleUserSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userSearchTerm.trim()) return;
    try {
      const results = await userService.searchUsers(userSearchTerm);
      setUserSearchResults(results);
    } catch (error) {
      console.error(error);
      showToast('Error al buscar usuarios', 'error');
    }
  };

  const handleEditUserStats = (u: any) => {
    setSelectedUser(u);
    setUserStatsForm({
      wins: u.stats?.wins || 0,
      losses: u.stats?.losses || 0,
      tournaments: u.stats?.tournaments || 0,
      points: u.stats?.points || 0
    });
  };

  const handleUpdateUserStats = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUser) return;
    try {
      await userService.updateStats(selectedUser.id, userStatsForm);
      showToast(`Estadísticas de ${selectedUser.displayName} actualizadas`);
      setSelectedUser(null);
      // Refresh results if possible
      setUserSearchResults(prev => prev.map(u => u.id === selectedUser.id ? { ...u, stats: userStatsForm } : u));
    } catch (error) {
      console.error(error);
      showToast('Error al actualizar estadísticas', 'error');
    }
  };

  const handleQuickStatIncrement = async (userId: string, stat: 'wins' | 'losses' | 'tournaments' | 'points', amount: number) => {
    try {
      await userService.incrementStat(userId, stat, amount);
      setUserSearchResults(prev => prev.map(u => {
        if (u.id === userId) {
          const currentVal = u.stats?.[stat] || 0;
          return {
            ...u,
            stats: {
              ...u.stats,
              [stat]: Math.max(0, currentVal + amount)
            }
          };
        }
        return u;
      }));
      showToast('Estadística actualizada');
    } catch (error) {
      console.error(error);
      showToast('Error al actualizar', 'error');
    }
  };

  if (!isAdmin) {
    return (
      <div className="text-center py-20">
        <h1 className="text-3xl font-display uppercase italic">Acceso Denegado</h1>
        <p className="text-gray-500 mt-4">Acceso restringido a administradores autorizados.</p>
      </div>
    );
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const data = {
        ...formData,
        startDate: new Date(formData.startDate),
        roomCreationTime: formData.roomCreationTime ? new Date(formData.roomCreationTime) : null,
      };

      if (editingId) {
        await tournamentService.update(editingId, data);
      } else {
        await tournamentService.create({
          ...data,
          registeredParticipants: 0,
          status: 'upcoming',
          createdBy: user?.uid
        });
      }

      setIsCreating(false);
      setEditingId(null);
      setFormData({
        name: '',
        game: '',
        gameMode: 'Battle Royale',
        startDate: '',
        maxParticipants: 16,
        prizePool: '',
        rules: '',
        bannerImage: '',
        roomCreationTime: '',
        roomNumber: '',
        roomPassword: '',
        entryFee: ''
      });
    } catch (error) {
      alert('Error saving tournament');
    }
  };

  const handleEdit = (tournament: any) => {
    setEditingId(tournament.id);
    setFormData({
      name: tournament.name,
      game: tournament.game,
      gameMode: tournament.gameMode || 'Battle Royale',
      startDate: tournament.startDate?.toDate ? tournament.startDate.toDate().toISOString().slice(0, 16) : '',
      maxParticipants: tournament.maxParticipants,
      prizePool: tournament.prizePool || '',
      rules: tournament.rules || '',
      bannerImage: tournament.bannerImage || '',
      roomCreationTime: tournament.roomCreationTime?.toDate ? tournament.roomCreationTime.toDate().toISOString().slice(0, 16) : '',
      roomNumber: tournament.roomNumber || '',
      roomPassword: tournament.roomPassword || '',
      entryFee: tournament.entryFee || ''
    });
    setIsCreating(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleDelete = async () => {
    if (!tournamentToDelete) return;
    
    setIsDeleting(true);
    try {
      if (expandedTournamentId === tournamentToDelete.id) {
        setExpandedTournamentId(null);
      }
      await tournamentService.delete(tournamentToDelete.id);
      setTournamentToDelete(null);
    } catch (error: any) {
      console.error('Delete error:', error);
      alert('Error al eliminar el torneo. Asegúrate de tener permisos de administrador.');
    } finally {
      setIsDeleting(false);
    }
  };

  const handleBannerUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 800 * 1024) {
      showToast('La imagen es demasiado grande. Máximo 800KB para optimizar carga.', 'error');
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      setFormData(prev => ({ ...prev, bannerImage: reader.result as string }));
    };
    reader.readAsDataURL(file);
  };

  return (
    <div className="space-y-8">
      {/* Tournament Start Confirmation Dialog */}
      <AnimatePresence>
        {confirmingStartTournament && (
          <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/90 backdrop-blur-md overflow-y-auto">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 30 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 30 }}
              className="bg-zinc-950 border-2 border-white/10 rounded-3xl md:rounded-[3rem] p-5 md:p-10 max-w-lg w-full shadow-[0_0_50px_rgba(0,0,0,0.5)] relative overflow-hidden my-auto"
            >
              {/* Decorative background element */}
              <div className="absolute -top-24 -left-24 w-48 h-48 bg-primary/20 rounded-full blur-[80px]" />
              <div className="absolute -bottom-24 -right-24 w-48 h-48 bg-primary/10 rounded-full blur-[80px]" />

              <div className="relative space-y-5 md:space-y-8">
                <div className="flex flex-col items-center text-center space-y-3 md:space-y-4">
                  <div className="w-14 h-14 md:w-20 md:h-20 rounded-full bg-primary/10 flex items-center justify-center text-primary border border-primary/20 shadow-lg shadow-primary/10">
                    <motion.div
                      animate={{ scale: [1, 1.1, 1] }}
                      transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                    >
                      <Workflow className="w-7 h-7 md:w-10 md:h-10" />
                    </motion.div>
                  </div>
                  
                  <div className="space-y-1">
                    <h3 className="text-2xl md:text-4xl font-display uppercase italic tracking-tighter text-white">¿COMENZAR AHORA?</h3>
                    <p className="text-xs md:text-base text-gray-400">Vas a iniciar el torneo <span className="text-white font-bold">{confirmingStartTournament.name}</span>.</p>
                  </div>
                </div>

                <div className="glass-morphism p-4 md:p-6 rounded-2xl md:rounded-[2rem] border border-white/5 space-y-3 bg-white/5">
                  <ul className="space-y-2 md:space-y-3">
                    <li className="flex items-start gap-3 text-xs md:text-sm text-gray-400">
                      <div className="w-1.5 h-1.5 rounded-full bg-primary mt-1.5 shrink-0" />
                      <span>Inscripciones cerradas permanentemente.</span>
                    </li>
                    <li className="flex items-start gap-3 text-xs md:text-sm text-gray-400">
                      <div className="w-1.5 h-1.5 rounded-full bg-primary mt-1.5 shrink-0" />
                      <span>Notificación automática a participantes.</span>
                    </li>
                    <li className="flex items-start gap-3 text-xs md:text-sm text-gray-400">
                      <div className="w-1.5 h-1.5 rounded-full bg-primary mt-1.5 shrink-0" />
                      <span>Activación de brackets y resultados.</span>
                    </li>
                  </ul>
                </div>

                <div className="space-y-3 md:space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 md:gap-4">
                    <div className="space-y-1">
                      <label className="text-[9px] md:text-[10px] uppercase font-black tracking-widest text-gray-500 ml-1">ID de la Sala</label>
                      <input 
                        type="text" 
                        placeholder="Ej: 1234567"
                        className="w-full bg-white/5 border border-white/10 rounded-xl md:rounded-2xl p-3 md:p-4 outline-none focus:border-primary transition-all text-white font-mono text-sm"
                        value={roomInfo.number}
                        onChange={e => setRoomInfo({...roomInfo, number: e.target.value})}
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[9px] md:text-[10px] uppercase font-black tracking-widest text-gray-500 ml-1">Contraseña</label>
                      <input 
                        type="text" 
                        placeholder="Ej: 9999"
                        className="w-full bg-white/5 border border-white/10 rounded-xl md:rounded-2xl p-3 md:p-4 outline-none focus:border-primary transition-all text-white font-mono text-sm"
                        value={roomInfo.password}
                        onChange={e => setRoomInfo({...roomInfo, password: e.target.value})}
                      />
                    </div>
                  </div>
                  <p className="text-[8px] md:text-[10px] text-gray-600 uppercase font-bold text-center px-2">
                    Estos datos serán visibles al instante para los jugadores.
                  </p>
                </div>

                <div className="flex flex-col sm:flex-row gap-2 md:gap-4 pt-1 md:pt-4">
                  <button
                    onClick={() => {
                      setConfirmingStartTournament(null);
                      setStartConfirmCountdown(0);
                    }}
                    className="w-full sm:flex-1 py-3.5 md:py-5 bg-white/5 hover:bg-white/10 text-white rounded-xl md:rounded-2xl font-display uppercase italic transition-all border border-white/10 font-bold text-xs md:text-base order-2 sm:order-1 sm:skew-x-[-10deg]"
                  >
                    CANCELAR
                  </button>
                  <button
                    onClick={async () => {
                      const t = confirmingStartTournament;
                      setConfirmingStartTournament(null);
                      setStartConfirmCountdown(0);
                      
                      setIsGeneratingBracket(t.id);
                      try {
                        await tournamentService.update(t.id, {
                          roomNumber: roomInfo.number,
                          roomPassword: roomInfo.password
                        });
                        await bracketService.generateBracket(t.id);
                        await tournamentService.startTournament(t.id);
                        showToast('Brackets generados y torneo iniciado con éxito.');
                      } catch (err) {
                        console.error(err);
                        showToast('Error al iniciar el torneo.', 'error');
                      } finally {
                        setIsGeneratingBracket(null);
                      }
                    }}
                    disabled={startConfirmCountdown > 0}
                    className={cn(
                      "w-full sm:flex-[1.5] py-3.5 md:py-5 rounded-xl md:rounded-2xl font-display uppercase italic transition-all flex items-center justify-center gap-2 font-black tracking-tighter text-xs md:text-base order-1 sm:order-2 sm:skew-x-[-10deg]",
                      startConfirmCountdown > 0 
                        ? "bg-gray-800 text-gray-500 cursor-not-allowed" 
                        : "bg-primary text-black hover:bg-white hover:scale-[1.02] shadow-[0_0_30px_rgba(var(--primary),0.3)] shadow-primary/30"
                    )}
                  >
                    {startConfirmCountdown > 0 ? (
                      `ESPERAR (${startConfirmCountdown})`
                    ) : (
                      'INICIAR TORNEO'
                    )}
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <h1 className="text-3xl md:text-4xl font-display uppercase italic tracking-tighter flex items-center gap-3">
          <Settings className="text-primary" /> Panel de Admin
        </h1>
        <button 
          onClick={() => {
            setIsCreating(!isCreating);
            if (isCreating) setEditingId(null);
          }}
          className="w-full sm:w-auto bg-primary text-black px-6 py-2 font-display uppercase skew-x-[-10deg] flex items-center justify-center gap-2"
        >
          <Plus size={18} /> {isCreating ? 'Cancelar' : 'Nuevo Torneo'}
        </button>
      </div>

      {/* Tabs */}
      <div className="flex gap-4 border-b border-white/10 overflow-x-auto pb-1 no-scrollbar whitespace-nowrap">
        <button 
          onClick={() => setActiveTab('tournaments')}
          className={cn(
            "pb-4 px-2 font-display uppercase italic text-lg transition-all relative",
            activeTab === 'tournaments' ? "text-primary" : "text-gray-500 hover:text-white"
          )}
        >
          Torneos
          {activeTab === 'tournaments' && <motion.div layoutId="underline" className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary" />}
        </button>
        <button 
          onClick={() => setActiveTab('payments')}
          className={cn(
            "pb-4 px-2 font-display uppercase italic text-lg transition-all relative flex items-center gap-2",
            activeTab === 'payments' ? "text-primary" : "text-gray-500 hover:text-white"
          )}
        >
          Pendientes
          {pendingParticipants.length > 0 && (
            <span className="bg-primary text-black text-[10px] font-bold px-1.5 py-0.5 rounded-full">
              {pendingParticipants.length}
            </span>
          )}
          {activeTab === 'payments' && <motion.div layoutId="underline" className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary" />}
        </button>
        <button 
          onClick={() => setActiveTab('ranking')}
          className={cn(
            "pb-4 px-2 font-display uppercase italic text-lg transition-all relative flex items-center gap-2",
            activeTab === 'ranking' ? "text-primary" : "text-gray-500 hover:text-white"
          )}
        >
          Ranking
          {activeTab === 'ranking' && <motion.div layoutId="underline" className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary" />}
        </button>
        <button 
          onClick={() => setActiveTab('emails')}
          className={cn(
            "pb-4 px-2 font-display uppercase italic text-lg transition-all relative flex items-center gap-2",
            activeTab === 'emails' ? "text-primary" : "text-gray-500 hover:text-white"
          )}
        >
          <Mail size={20} />
          Correos
          {activeTab === 'emails' && <motion.div layoutId="underline" className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary" />}
        </button>
      </div>

      {isCreating && (
        <motion.form 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          onSubmit={handleSubmit}
          className="glass p-8 rounded-3xl space-y-6 max-w-2xl mx-auto border-primary/30 border"
        >
          <h2 className="text-2xl font-display uppercase italic text-primary">
            {editingId ? 'Editar Torneo' : 'Nuevo Torneo'}
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="text-xs uppercase font-bold text-gray-500">Nombre del Torneo</label>
              <input 
                type="text" 
                required
                className="w-full bg-white/5 border border-white/10 rounded-lg p-3 outline-none focus:border-primary transition-colors"
                value={formData.name}
                onChange={e => setFormData({...formData, name: e.target.value})}
              />
            </div>
            <div className="space-y-3">
              <label className="text-xs uppercase font-bold text-gray-500">Juego / Disciplina</label>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {[
                  { id: 'Blood Strike', name: 'Blood Strike' },
                  { id: 'Valorant', name: 'Valorant' },
                  { id: 'Free Fire', name: 'Free Fire' },
                  { id: 'FC 24', name: 'FC 24' },
                  { id: 'COD Mobile', name: 'COD Mobile' },
                  { id: 'PUBG Mobile', name: 'PUBG Mobile' }
                ].map(game => (
                  <button
                    key={game.id}
                    type="button"
                    onClick={() => setFormData({...formData, game: game.name})}
                    className={cn(
                      "px-3 py-2 text-[10px] uppercase font-black tracking-widest border rounded-xl transition-all",
                      formData.game === game.name 
                        ? "bg-primary border-primary text-black shadow-lg shadow-primary/20" 
                        : "bg-white/5 border-white/10 text-gray-400 hover:bg-white/10 hover:border-white/20"
                    )}
                  >
                    {game.name}
                  </button>
                ))}
              </div>
              <input 
                type="text" 
                required
                placeholder="O escribe otro juego..."
                className="w-full bg-black/20 border border-white/10 rounded-xl p-3 outline-none focus:border-primary transition-colors text-sm"
                value={formData.game}
                onChange={e => setFormData({...formData, game: e.target.value})}
              />
            </div>
            <div className="space-y-2">
              <label className="text-xs uppercase font-bold text-gray-500">Modo de Juego</label>
              <select 
                required
                className="w-full bg-white/5 border border-white/10 rounded-lg p-3 outline-none focus:border-primary transition-colors text-white"
                value={formData.gameMode}
                onChange={e => setFormData({...formData, gameMode: e.target.value})}
              >
                <option value="Battle Royale" className="bg-zinc-900">Battle Royale</option>
                <option value="Batalla de Escuadrones" className="bg-zinc-900">Batalla de Escuadrones</option>
                <option value="Buscar y Destruir" className="bg-zinc-900">Buscar y Destruir</option>
              </select>
            </div>
            <div className="space-y-2">
              <label className="text-xs uppercase font-bold text-gray-500">Fecha de Inicio</label>
              <input 
                type="datetime-local" 
                required
                className="w-full bg-white/5 border border-white/10 rounded-lg p-3 outline-none focus:border-primary transition-colors"
                value={formData.startDate}
                onChange={e => setFormData({...formData, startDate: e.target.value})}
              />
            </div>
            <div className="space-y-2">
              <label className="text-xs uppercase font-bold text-gray-500">Máximo Participantes</label>
              <input 
                type="number" 
                required
                className="w-full bg-white/5 border border-white/10 rounded-lg p-3 outline-none focus:border-primary transition-colors"
                value={Number.isNaN(formData.maxParticipants) ? '' : formData.maxParticipants}
                onChange={e => setFormData({...formData, maxParticipants: parseInt(e.target.value) || 0})}
              />
            </div>
            <div className="space-y-2">
              <label className="text-xs uppercase font-bold text-gray-500">Bolsa de Premios</label>
              <input 
                type="text" 
                className="w-full bg-white/5 border border-white/10 rounded-lg p-3 outline-none focus:border-primary transition-colors"
                placeholder="Ex: $500 USD"
                value={formData.prizePool}
                onChange={e => setFormData({...formData, prizePool: e.target.value})}
              />
            </div>
            <div className="space-y-2">
              <label className="text-xs uppercase font-bold text-gray-500">Entry Fee (Costo de Inscripción)</label>
              <input 
                type="text" 
                className="w-full bg-white/5 border border-white/10 rounded-lg p-3 outline-none focus:border-primary transition-colors"
                placeholder="Ex: 5$ o Gratis"
                value={formData.entryFee}
                onChange={e => setFormData({...formData, entryFee: e.target.value})}
              />
            </div>
            <div className="space-y-2">
              <label className="text-xs uppercase font-bold text-gray-500">Fecha/Hora Creación de Sala</label>
              <input 
                type="datetime-local" 
                className="w-full bg-white/5 border border-white/10 rounded-lg p-3 outline-none focus:border-primary transition-colors"
                value={formData.roomCreationTime}
                onChange={e => setFormData({...formData, roomCreationTime: e.target.value})}
              />
            </div>
             <div className="space-y-2">
              <label className="text-xs uppercase font-bold text-gray-500">Banner del Torneo</label>
              <div className="space-y-4">
                <div className="flex flex-col sm:flex-row gap-4">
                  <div className="flex-1 space-y-3">
                    <div className="relative group">
                      <input 
                        type="file" 
                        accept="image/*"
                        onChange={handleBannerUpload}
                        className="hidden"
                        id="banner-upload"
                      />
                      <label 
                        htmlFor="banner-upload"
                        className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-white/10 rounded-2xl bg-white/5 hover:bg-white/10 hover:border-primary/50 transition-all cursor-pointer group"
                      >
                        <div className="flex flex-col items-center justify-center pt-5 pb-6">
                          <Plus className="w-8 h-8 text-gray-500 group-hover:text-primary transition-colors mb-2" />
                          <p className="text-[10px] text-gray-500 uppercase font-black tracking-widest group-hover:text-white">Subir desde Galería</p>
                        </div>
                      </label>
                    </div>

                    <div className="space-y-1">
                      <p className="text-[10px] uppercase font-black text-gray-600 tracking-widest ml-1">O usar URL externa</p>
                      <input 
                        type="text" 
                        className="w-full bg-white/5 border border-white/10 rounded-xl p-3 outline-none focus:border-primary transition-colors text-xs text-white"
                        placeholder="https://images.unsplash.com/..."
                        value={formData.bannerImage}
                        onChange={e => setFormData({...formData, bannerImage: e.target.value})}
                      />
                    </div>
                  </div>

                  {formData.bannerImage && (
                    <div className="w-full sm:w-48 h-48 rounded-2xl overflow-hidden flex-shrink-0 border border-white/10 relative group">
                      <img src={formData.bannerImage} alt="Preview" className="w-full h-full object-cover" />
                      <button 
                        type="button"
                        onClick={() => setFormData({...formData, bannerImage: ''})}
                        className="absolute top-2 right-2 p-2 bg-black/60 rounded-lg text-white hover:bg-red-500 transition-colors opacity-0 group-hover:opacity-100"
                      >
                        <X size={16} />
                      </button>
                    </div>
                  )}
                </div>

                <div className="flex flex-wrap gap-2">
                  <p className="w-full text-[8px] uppercase font-black text-gray-600 tracking-widest mb-1">Preconfigurados:</p>
                  {['Blood Strike', 'Valorant', 'Free Fire', 'FC 24'].map(gameName => (
                    <button
                      key={gameName}
                      type="button"
                      onClick={() => {
                        const images: Record<string, string> = {
                          'Blood Strike': 'https://images.unsplash.com/photo-1614294149010-950b698f72c0?q=80&w=1000',
                          'Valorant': 'https://images.unsplash.com/photo-1560253023-3ec5d502959f?q=80&w=1000',
                          'Free Fire': 'https://images.unsplash.com/photo-1542751371-adc38448a05e?q=80&w=1000',
                          'FC 24': 'https://images.unsplash.com/photo-1612287230202-1ff1d85d1bdf?q=80&w=1000'
                        };
                        setFormData({...formData, bannerImage: images[gameName] || ''});
                      }}
                      className="text-[9px] uppercase font-bold px-3 py-1.5 bg-white/5 border border-white/10 rounded-lg hover:bg-primary hover:text-black transition-all hover:scale-105 active:scale-95"
                    >
                      {gameName}
                    </button>
                  ))}
                </div>
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-xs uppercase font-bold text-gray-500">Número de Sala</label>
              <input 
                type="text" 
                className="w-full bg-white/5 border border-white/10 rounded-lg p-3 outline-none focus:border-primary transition-colors"
                value={formData.roomNumber}
                onChange={e => setFormData({...formData, roomNumber: e.target.value})}
              />
            </div>
            <div className="space-y-2">
              <label className="text-xs uppercase font-bold text-gray-500">Contraseña de Sala</label>
              <input 
                type="text" 
                className="w-full bg-white/5 border border-white/10 rounded-lg p-3 outline-none focus:border-primary transition-colors"
                value={formData.roomPassword}
                onChange={e => setFormData({...formData, roomPassword: e.target.value})}
              />
            </div>
          </div>
          <div className="space-y-2">
            <label className="text-xs uppercase font-bold text-gray-500">Reglas</label>
            <textarea 
              className="w-full bg-white/5 border border-white/10 rounded-lg p-3 outline-none focus:border-primary transition-colors h-32"
              value={formData.rules}
              onChange={e => setFormData({...formData, rules: e.target.value})}
            />
          </div>
          <button type="submit" className="w-full bg-primary text-black py-4 font-display uppercase text-xl skew-x-[-10deg]">
             {editingId ? 'Actualizar Torneo' : 'Publicar Torneo'}
          </button>
        </motion.form>
      )}

      {activeTab === 'tournaments' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
            <motion.div 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="glass p-6 rounded-2xl border-white/10 border relative overflow-hidden group hover:border-primary/40 transition-all"
            >
              <div className="absolute -right-4 -top-4 text-primary/5 group-hover:text-primary/10 transition-colors">
                <Trophy size={80} />
              </div>
              <p className="text-[10px] uppercase font-black tracking-widest text-gray-500">Total Torneos</p>
              <p className="text-4xl font-display italic mt-1 text-white">{tournaments.length}</p>
              <div className="mt-4 flex items-center gap-2 text-[9px] text-primary font-bold uppercase tracking-widest">
                <div className="w-1.5 h-1.5 bg-primary rounded-full animate-pulse" />
                Sincronizado
              </div>
            </motion.div>
            
            <motion.div 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="glass p-6 rounded-2xl border-white/10 border relative overflow-hidden group hover:border-blue-500/40 transition-all"
            >
              <div className="absolute -right-4 -top-4 text-blue-500/5 group-hover:text-blue-500/10 transition-colors">
                <Clock size={80} />
              </div>
              <p className="text-[10px] uppercase font-black tracking-widest text-gray-500">Próximos</p>
              <p className="text-4xl font-display italic mt-1 text-white">
                {tournaments.filter(t => t.status === 'upcoming').length}
              </p>
            </motion.div>

            <motion.div 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="glass p-6 rounded-2xl border-white/10 border relative overflow-hidden group hover:border-green-500/40 transition-all"
            >
              <div className="absolute -right-4 -top-4 text-green-500/5 group-hover:text-green-500/10 transition-colors">
                <Workflow size={80} />
              </div>
              <p className="text-[10px] uppercase font-black tracking-widest text-gray-500">En Curso</p>
              <p className="text-4xl font-display italic mt-1 text-white">
                {tournaments.filter(t => t.status === 'live' || t.status === 'ongoing').length}
              </p>
            </motion.div>

            <motion.div 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="glass p-6 rounded-2xl border-white/10 border relative overflow-hidden group hover:border-gray-500/40 transition-all"
            >
              <div className="absolute -right-4 -top-4 text-gray-500/5 group-hover:text-gray-500/10 transition-colors">
                <Check size={80} />
              </div>
              <p className="text-[10px] uppercase font-black tracking-widest text-gray-500">Finalizados</p>
              <p className="text-4xl font-display italic mt-1 text-white">
                {tournaments.filter(t => t.status === 'finished').length}
              </p>
            </motion.div>
          </div>

          <div className="space-y-4">
            {/* Desktop Table */}
            <div className="glass rounded-[2rem] border-white/10 border overflow-hidden hidden md:block">
              <table className="w-full text-left">
                <thead className="bg-white/5 text-[10px] uppercase font-black text-gray-500 border-b border-white/10 tracking-[0.2em]">
                  <tr>
                    <th className="px-8 py-5">Status</th>
                    <th className="px-6 py-5">Torneo</th>
                    <th className="px-6 py-5">Juego</th>
                    <th className="px-6 py-5">Fecha</th>
                    <th className="px-6 py-5">Inscripción</th>
                    <th className="px-8 py-5 text-right">Acciones</th>
                  </tr>
                </thead>
                <motion.tbody 
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
                {tournaments.map((t) => (
                  <React.Fragment key={t.id}>
                    <motion.tr 
                      variants={{
                        hidden: { opacity: 0, y: 10 },
                        visible: { opacity: 1, y: 0 }
                      }}
                      className={cn(
                        "hover:bg-white/[0.03] transition-colors cursor-pointer group",
                        expandedTournamentId === t.id && "bg-white/[0.05]"
                      )}
                      onClick={() => setExpandedTournamentId(expandedTournamentId === t.id ? null : t.id)}
                    >
                      <td className="px-8 py-6">
                        <div className={cn(
                          "w-2.5 h-2.5 rounded-full shadow-[0_0_8px_rgba(0,0,0,0.5)]",
                          t.status === 'upcoming' ? "bg-blue-500 shadow-blue-500/50" :
                          t.status === 'live' || t.status === 'ongoing' ? "bg-primary animate-pulse shadow-primary/50" :
                          "bg-gray-600"
                        )} />
                      </td>
                      <td className="px-6 py-6">
                        <div className="flex items-center gap-4">
                          <div className="w-12 h-12 rounded-xl overflow-hidden bg-white/5 border border-white/10 flex-shrink-0 group-hover:scale-105 transition-transform">
                            {t.bannerImage ? (
                              <img src={t.bannerImage} alt={t.name} className="w-full h-full object-cover" />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center">
                                <Trophy size={16} className="text-gray-700" />
                              </div>
                            )}
                          </div>
                          <div className="min-w-0">
                            <p className="font-bold text-white uppercase italic tracking-tighter truncate leading-tight">{t.name}</p>
                            <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest mt-0.5">ID: {t.id.slice(0, 8)}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-6">
                        <span className="text-[10px] bg-white/5 border border-white/5 px-2.5 py-1 rounded text-primary uppercase font-black tracking-widest">
                          {t.game}
                        </span>
                      </td>
                      <td className="px-6 py-6 font-medium text-white/80">
                        <div className="text-xs uppercase font-black">{t.startDate?.toDate ? t.startDate.toDate().toLocaleDateString() : 'N/A'}</div>
                        <div className="text-[10px] text-gray-500 uppercase font-bold mt-0.5">{t.startDate?.toDate ? t.startDate.toDate().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'N/A'}</div>
                      </td>
                      <td className="px-6 py-6 text-sm font-mono text-primary font-black italic">
                        {t.entryFee || 'Gratis'}
                      </td>
                      <td className="px-8 py-6 text-right">
                        <div className="flex justify-end gap-2" onClick={e => e.stopPropagation()}>
                          <button 
                            onClick={() => handleEdit(t)}
                            className="p-2.5 bg-white/5 hover:bg-primary hover:text-black rounded-xl transition-all border border-white/5"
                            title="Editar"
                          >
                            <Settings size={18} />
                          </button>
                          <button 
                            onClick={() => setTournamentToDelete(t)}
                            className="p-2.5 bg-white/5 hover:bg-red-500 hover:text-white rounded-xl transition-all border border-white/5"
                            title="Eliminar"
                          >
                            <Trash2 size={18} />
                          </button>
                        </div>
                      </td>
                    </motion.tr>
                    
                    <AnimatePresence>
                      {expandedTournamentId === t.id && (
                        <motion.tr
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          exit={{ opacity: 0 }}
                        >
                          <td colSpan={6} className="px-8 py-8 bg-black/40">
                            <div className="space-y-6">
                              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                                <div className="space-y-1">
                                  <h4 className="text-xl font-display uppercase italic text-white flex items-center gap-3">
                                    <Users size={24} className="text-primary" /> Participantes ({currentParticipants.length})
                                  </h4>
                                  <p className="text-[10px] uppercase font-black tracking-widest text-gray-500 ml-9">Gestión de inscritos y validación de pagos</p>
                                </div>
                                {t.status === 'upcoming' && (
                                  <button
                                    disabled={isGeneratingBracket === t.id}
                                    onClick={async (e) => {
                                      e.stopPropagation();
                                      const approvedCount = currentParticipants.filter(p => p.paymentStatus === 'approved').length;
                                      if (approvedCount < 2) {
                                        alert('Se necesitan al menos 2 participantes APROBADOS para generar los brackets.');
                                        return;
                                      }
                                      setConfirmingStartTournament(t);
                                      setRoomInfo({ number: t.roomNumber || '', password: t.roomPassword || '' });
                                      setStartConfirmCountdown(3);
                                    }}
                                    className={cn(
                                      "bg-primary text-black px-6 py-2.5 rounded-xl font-display uppercase italic text-sm transition-all shadow-lg shadow-primary/20 flex items-center gap-2 hover:bg-white active:scale-95",
                                      isGeneratingBracket === t.id && "opacity-70 cursor-wait"
                                    )}
                                  >
                                    {isGeneratingBracket === t.id ? (
                                      <>
                                        <div className="w-4 h-4 border-2 border-black/30 border-t-black rounded-full animate-spin" />
                                        Generando Brackets...
                                      </>
                                    ) : (
                                      <>
                                        <Workflow size={16} />
                                        Generar Brackets e Iniciar
                                      </>
                                    )}
                                  </button>
                                )}
                              </div>

                              {currentParticipants.length === 0 ? (
                                <p className="text-sm text-gray-600 italic py-10 text-center bg-white/[0.02] rounded-3xl border border-dashed border-white/5">No hay participantes registrados aún</p>
                              ) : (
                                <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-4">
                                  {currentParticipants.map((p, pIdx) => (
                                    <motion.div 
                                      initial={{ opacity: 0, y: 10 }}
                                      animate={{ opacity: 1, y: 0 }}
                                      transition={{ delay: pIdx * 0.05 }}
                                      key={p.userId} 
                                      className="p-4 bg-white/5 border border-white/10 rounded-2xl flex flex-col gap-4 group hover:border-primary/40 transition-all shadow-lg hover:shadow-primary/5"
                                    >
                                      <div className="flex items-center gap-4">
                                        <div className="relative">
                                          <img 
                                            src={p.photoURL || `https://api.dicebear.com/7.x/avataaars/svg?seed=${p.userId}`} 
                                            className="w-12 h-12 rounded-xl bg-zinc-800 object-cover border border-white/10" 
                                            alt="" 
                                          />
                                          <div className={cn(
                                            "absolute -bottom-1 -right-1 w-4 h-4 rounded-full border-2 border-zinc-950",
                                            p.paymentStatus === 'approved' ? "bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.5)]" : 
                                            p.paymentStatus === 'pending' ? "bg-yellow-500 shadow-[0_0_8px_rgba(234,179,8,0.5)]" : 
                                            p.paymentStatus === 'rejected' ? "bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.5)]" : "bg-gray-500"
                                          )} />
                                        </div>
                                        <div className="min-w-0 flex-1">
                                          <p className="font-bold text-white truncate text-base tracking-tight uppercase italic">{p.userName}</p>
                                          <p className="text-[10px] font-bold text-primary truncate tracking-widest uppercase mt-0.5">{p.gameNick || 'Sin Nickname'}</p>
                                        </div>
                                      </div>

                                      <div className="space-y-3">
                                        <div className="flex justify-between items-center bg-black/40 p-2 rounded-xl border border-white/5">
                                          <div className="text-left">
                                            <p className="text-[8px] uppercase font-black text-gray-500 tracking-widest">Código</p>
                                            <p className="font-mono text-xs text-white font-bold tracking-widest mt-0.5">{p.paymentCode || '----'}</p>
                                          </div>
                                          <div className="text-right">
                                            <p className="text-[8px] uppercase font-black text-gray-500 tracking-widest">Referencia</p>
                                            <p className="font-mono text-[10px] text-gray-400 mt-0.5 truncate max-w-[100px]">{p.paymentReference || 'N/A'}</p>
                                          </div>
                                        </div>

                                        <div className="flex gap-2">
                                          <button 
                                            onClick={() => setViewingParticipant({...p, tournamentId: t.id})}
                                            className="flex-1 p-2.5 bg-white/5 hover:bg-primary hover:text-black rounded-xl transition-all text-primary border border-primary/20 flex items-center justify-center gap-2 group/btn"
                                            title="Ver Detalles"
                                          >
                                            <Eye size={16} />
                                          </button>
                                          {p.paymentStatus === 'pending' ? (
                                            <>
                                              <button 
                                                onClick={() => handleRejectPayment({...p, tournamentId: t.id})}
                                                className="flex-1 bg-red-500/10 text-red-500 hover:bg-red-500 hover:text-white rounded-xl text-[9px] font-black uppercase tracking-widest transition-all border border-red-500/20"
                                              >
                                                Rechazar
                                              </button>
                                              <button 
                                                onClick={() => handleApprovePayment({...p, tournamentId: t.id})}
                                                className="flex-1 bg-green-500 text-black hover:bg-white rounded-xl text-[9px] font-black uppercase tracking-widest transition-all shadow-lg shadow-green-500/20"
                                              >
                                                Aprobar
                                              </button>
                                            </>
                                          ) : (
                                            <div className="flex-1 flex gap-1 items-center justify-end">
                                              {[1, 2, 3].map(place => (
                                                <button 
                                                  key={place}
                                                  onClick={() => {
                                                    if (confirm(`¿Asignar ${place}er lugar a ${p.userName}?`)) {
                                                      userService.awardTournamentPlacement(p.userId, t.id, t.name, place);
                                                      showToast(`${place}er lugar asignado a ${p.userName}`);
                                                    }
                                                  }}
                                                  className={cn(
                                                    "w-7 h-7 rounded-lg transition-all flex items-center justify-center border font-black text-[10px]",
                                                    place === 1 ? "bg-yellow-500/10 text-yellow-500 border-yellow-500/30 hover:bg-yellow-500 hover:text-black" :
                                                    place === 2 ? "bg-gray-400/10 text-gray-400 border-gray-400/30 hover:bg-gray-400 hover:text-black" :
                                                    "bg-amber-700/10 text-amber-700 border-amber-700/30 hover:bg-amber-700 hover:text-white"
                                                  )}
                                                  title={`Asignar ${place}ro`}
                                                >
                                                  {place}
                                                </button>
                                              ))}
                                              <button 
                                                onClick={() => handleQuickStatIncrement(p.userId, 'wins', 1)}
                                                className="p-2 bg-primary/10 hover:bg-primary hover:text-black rounded-lg transition-all text-primary border border-primary/20 ml-1"
                                                title="+1 Ganada"
                                              >
                                                <Trophy size={14} />
                                              </button>
                                            </div>
                                          )}
                                        </div>
                                      </div>
                                    </motion.div>
                                  ))}
                                </div>
                              )}
                            </div>
                          </td>
                        </motion.tr>
                      )}
                    </AnimatePresence>
                  </React.Fragment>
                ))}
                </motion.tbody>
              </table>
            </div>

            {/* Mobile Tournament Cards */}
            <div className="grid grid-cols-1 gap-4 md:hidden">
              {tournaments.map((t) => (
                <div key={t.id} className="glass rounded-[2rem] border-white/10 border overflow-hidden p-5 flex flex-col gap-4">
                  <div className="flex justify-between items-start gap-4">
                    <div className="flex items-center gap-4 min-w-0">
                      <div className="w-14 h-14 rounded-2xl overflow-hidden bg-zinc-900 border border-white/10 flex-shrink-0">
                        {t.bannerImage ? (
                          <img src={t.bannerImage} alt={t.name} className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <Trophy size={20} className="text-gray-700" />
                          </div>
                        )}
                      </div>
                      <div className="min-w-0">
                        <h3 className="font-bold text-white uppercase italic tracking-tighter text-lg truncate leading-tight">{t.name}</h3>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-[9px] bg-white/10 px-2.5 py-1 rounded-md text-primary uppercase font-black tracking-widest border border-white/5">
                            {t.game}
                          </span>
                          <span className={cn(
                            "w-2 h-2 rounded-full",
                            t.status === 'upcoming' ? "bg-blue-500" :
                            t.status === 'live' || t.status === 'ongoing' ? "bg-primary animate-pulse" : "bg-gray-600"
                          )} />
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3 bg-black/40 p-3 rounded-2xl border border-white/5">
                    <div className="text-left">
                      <p className="text-[8px] uppercase font-black text-gray-500 tracking-widest">Fecha</p>
                      <p className="text-xs text-white font-bold mt-1">{t.startDate?.toDate ? t.startDate.toDate().toLocaleDateString() : 'N/A'}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-[8px] uppercase font-black text-gray-500 tracking-widest">Inscritos</p>
                      <p className="text-xs text-primary font-black italic mt-1">{t.registeredParticipants || 0}/{t.maxParticipants}</p>
                    </div>
                  </div>
                  
                  <div className="flex gap-2">
                    <button 
                      onClick={() => setExpandedTournamentId(expandedTournamentId === t.id ? null : t.id)}
                      className="flex-[2] py-3 bg-white/5 rounded-xl text-[10px] font-black uppercase tracking-widest text-white border border-white/10 flex items-center justify-center gap-2 active:scale-95 transition-all"
                    >
                      <Users size={16} /> {expandedTournamentId === t.id ? 'Ocultar' : 'Participantes'}
                    </button>
                    <button onClick={() => handleEdit(t)} className="flex-1 p-3 bg-white/5 rounded-xl text-gray-400 border border-white/10 flex items-center justify-center"><Settings size={18} /></button>
                    <button onClick={() => setTournamentToDelete(t)} className="flex-1 p-3 bg-red-500/10 rounded-xl text-red-500 border border-red-500/10 flex items-center justify-center"><Trash2 size={18} /></button>
                  </div>

                  <AnimatePresence>
                    {expandedTournamentId === t.id && (
                      <motion.div 
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="overflow-hidden space-y-4 pt-4 border-t border-white/5"
                      >
                        {t.status === 'upcoming' && (
                          <button
                            disabled={isGeneratingBracket === t.id}
                            onClick={async () => {
                              const approvedCount = currentParticipants.filter(p => p.paymentStatus === 'approved').length;
                              if (approvedCount < 2) return alert('Mínimo 2 aprobados');
                              setConfirmingStartTournament(t);
                              setRoomInfo({ number: t.roomNumber || '', password: t.roomPassword || '' });
                              setStartConfirmCountdown(3);
                            }}
                            className="w-full bg-primary text-black py-4 rounded-2xl font-display uppercase italic text-xs flex items-center justify-center gap-2 shadow-lg shadow-primary/20 active:scale-95 transition-all"
                          >
                            <Workflow size={16} /> Iniciar Torneo
                          </button>
                        )}
                        <div className="space-y-3 max-h-[400px] overflow-y-auto pr-2 no-scrollbar">
                          {currentParticipants.length === 0 ? (
                            <p className="text-[10px] text-gray-600 uppercase font-black tracking-widest text-center py-8">Sin inscritos aún</p>
                          ) : (
                            currentParticipants.map((p) => (
                              <div key={p.userId} className="p-3 bg-white/5 border border-white/5 rounded-2xl flex items-center justify-between gap-3">
                                <div className="flex items-center gap-3 min-w-0">
                                  <img src={p.photoURL || `https://api.dicebear.com/7.x/avataaars/svg?seed=${p.userId}`} className="w-10 h-10 rounded-xl border border-white/10" alt="" />
                                  <div className="min-w-0">
                                    <p className="font-bold text-white text-xs uppercase italic truncate tracking-tight">{p.userName}</p>
                                    <p className={cn(
                                      "text-[9px] uppercase font-black tracking-widest mt-0.5",
                                      p.paymentStatus === 'approved' ? "text-green-500" : "text-yellow-500"
                                    )}>{p.paymentStatus}</p>
                                  </div>
                                </div>
                                <button 
                                  onClick={() => setViewingParticipant({...p, tournamentId: t.id})}
                                  className="p-2.5 bg-white/5 text-primary rounded-xl border border-primary/20"
                                >
                                  <Eye size={16} />
                                </button>
                              </div>
                            ))
                          )}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {activeTab === 'payments' && (
        <motion.div 
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-6"
        >
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div>
              <h2 className="text-2xl font-display uppercase italic text-white flex items-center gap-3">
                <Check className="text-primary" /> Validar Inscripciones
              </h2>
              <p className="text-[10px] uppercase font-black tracking-widest text-gray-500 mt-1">Revisión manual de referencias de pago y aprobación</p>
            </div>
            <div className="bg-white/5 border border-white/10 px-4 py-2 rounded-xl">
              <p className="text-[8px] uppercase font-black text-gray-500 tracking-widest">Pendientes</p>
              <p className="text-lg font-bold text-primary">{pendingParticipants.length}</p>
            </div>
          </div>

          <div className="glass rounded-[2rem] border-white/10 border overflow-hidden">
            {/* Desktop Table */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-left">
                <thead className="bg-white/5 text-[10px] uppercase font-black text-gray-500 border-b border-white/10 tracking-[0.2em]">
                  <tr>
                    <th className="px-8 py-5">Jugador</th>
                    <th className="px-6 py-5">Torneo</th>
                    <th className="px-6 py-5">Referencia</th>
                    <th className="px-6 py-5">Código</th>
                    <th className="px-6 py-5">Fecha Solicitud</th>
                    <th className="px-8 py-5 text-right">Acción</th>
                  </tr>
                </thead>
                <motion.tbody 
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
                  {pendingParticipants.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-8 py-20 text-center">
                        <div className="flex flex-col items-center gap-4 opacity-30">
                          <Check size={48} />
                          <p className="text-xs uppercase font-black tracking-widest">No hay pagos pendientes por validar</p>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    pendingParticipants.map((p, idx) => (
                      <motion.tr 
                        key={idx} 
                        variants={{
                          hidden: { opacity: 0, y: 10 },
                          visible: { opacity: 1, y: 0 }
                        }}
                        className="hover:bg-white/[0.03] transition-colors group"
                      >
                        <td className="px-8 py-6">
                          <div className="flex items-center gap-4">
                            <div className="relative group-hover:scale-110 transition-transform">
                              <img 
                                src={p.photoURL || `https://api.dicebear.com/7.x/avataaars/svg?seed=${p.userId}`} 
                                className="w-10 h-10 rounded-xl bg-zinc-800 object-cover border border-white/10 shadow-lg" 
                                alt="" 
                              />
                              <div className="absolute -bottom-1 -right-1 w-3 h-3 bg-yellow-500 rounded-full border-2 border-zinc-950 animate-pulse" />
                            </div>
                            <div className="min-w-0">
                              <p className="font-bold text-white uppercase italic text-sm tracking-tight">{p.userName}</p>
                              <button 
                                onClick={() => setViewingParticipant(p)}
                                className="text-[9px] text-primary font-black uppercase tracking-widest hover:text-white transition-colors flex items-center gap-1 mt-0.5"
                              >
                                <Eye size={10} /> Perfil
                              </button>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-6">
                          <p className="text-xs text-white/70 font-bold uppercase tracking-tight truncate max-w-[150px]">{p.tournamentName}</p>
                        </td>
                        <td className="px-6 py-6">
                          <div className="bg-primary/10 border border-primary/20 px-3 py-1.5 rounded-lg inline-block">
                            <p className="font-mono text-primary text-xs font-black tracking-widest">{p.paymentReference}</p>
                          </div>
                        </td>
                        <td className="px-6 py-6">
                          <p className="font-mono text-white/50 text-xs tracking-widest italic">{p.paymentCode || 'Pending'}</p>
                        </td>
                        <td className="px-6 py-6">
                          <div className="text-[10px] uppercase font-black text-gray-500">
                            {p.registeredAt?.toDate ? p.registeredAt.toDate().toLocaleDateString() : 'N/A'}
                          </div>
                          <div className="text-[9px] font-bold text-gray-600 mt-0.5">
                            {p.registeredAt?.toDate ? p.registeredAt.toDate().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'N/A'}
                          </div>
                        </td>
                        <td className="px-8 py-6 text-right">
                          <div className="flex justify-end gap-2">
                            <button 
                              onClick={() => handleRejectPayment(p)}
                              className="p-2.5 bg-white/5 hover:bg-red-500 hover:text-white rounded-xl transition-all border border-white/5 text-red-500"
                              title="Rechazar"
                            >
                              <X size={18} />
                            </button>
                            <button 
                              onClick={() => handleApprovePayment(p)}
                              className="px-5 py-2.5 bg-green-500 text-black hover:bg-white rounded-xl font-black text-[10px] uppercase tracking-widest transition-all shadow-lg shadow-green-500/20 active:scale-95 flex items-center gap-2"
                            >
                              <Check size={14} /> Aprobar
                            </button>
                          </div>
                        </td>
                      </motion.tr>
                    ))
                  )}
                </motion.tbody>
              </table>
            </div>

            {/* Mobile Cards */}
            <div className="md:hidden divide-y divide-white/5">
              {pendingParticipants.length === 0 ? (
                <div className="px-8 py-16 text-center">
                  <p className="text-[10px] uppercase font-black tracking-widest text-gray-600">No hay pagos pendientes</p>
                </div>
              ) : (
                pendingParticipants.map((p, idx) => (
                  <div key={idx} className="p-5 space-y-4 bg-white/[0.01]">
                    <div className="flex justify-between items-start">
                      <div className="flex items-center gap-4">
                        <img 
                          src={p.photoURL || `https://api.dicebear.com/7.x/avataaars/svg?seed=${p.userId}`} 
                          className="w-12 h-12 rounded-2xl border border-white/10 shadow-lg" 
                          alt="" 
                        />
                        <div className="min-w-0">
                          <p className="font-bold text-white uppercase italic text-base tracking-tighter">{p.userName}</p>
                          <p className="text-[10px] text-gray-500 font-bold uppercase truncate max-w-[120px]">{p.tournamentName}</p>
                        </div>
                      </div>
                      <button 
                        onClick={() => setViewingParticipant(p)} 
                        className="p-3 bg-white/5 rounded-xl text-primary border border-primary/20"
                      >
                        <Eye size={18} />
                      </button>
                    </div>
                    
                    <div className="bg-black/40 p-4 rounded-2xl border border-white/5 space-y-3">
                      <div className="flex justify-between items-center">
                        <span className="text-[8px] uppercase font-black text-gray-500 tracking-widest">Referencia</span>
                        <span className="font-mono text-xs text-primary font-black tracking-widest">{p.paymentReference}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-[8px] uppercase font-black text-gray-500 tracking-widest">Fecha</span>
                        <span className="text-[10px] text-white font-bold">{p.registeredAt?.toDate ? p.registeredAt.toDate().toLocaleString([], { dateStyle: 'short', timeStyle: 'short' }) : 'N/A'}</span>
                      </div>
                    </div>
                    
                    <div className="flex gap-2">
                      <button 
                        onClick={() => handleRejectPayment(p)}
                        className="flex-1 bg-red-500/10 text-red-500 py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest border border-red-500/20 active:scale-95 transition-all"
                      >
                        Rechazar
                      </button>
                      <button 
                        onClick={() => handleApprovePayment(p)}
                        className="flex-[2] bg-green-500 text-black py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-2 active:scale-95 transition-all shadow-lg shadow-green-500/20"
                      >
                        <Check size={14} /> Confirmar
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </motion.div>
      )}

      {/* Participant Detail Modal */}
      <AnimatePresence>
        {viewingParticipant && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setViewingParticipant(null)}
              className="absolute inset-0 bg-black/80 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className="relative w-full max-w-md glass border-white/10 border rounded-3xl overflow-hidden"
            >
              <div className="p-6 border-b border-white/10 flex justify-between items-center">
                <h3 className="text-xl font-display uppercase italic tracking-tighter flex items-center gap-2">
                  <Eye className="text-primary" size={20} /> Detalle del Participante
                </h3>
                <button 
                  onClick={() => setViewingParticipant(null)}
                  className="p-2 hover:bg-white/10 rounded-full text-gray-400"
                >
                  <X size={20} />
                </button>
              </div>

              <div className="p-6 space-y-6">
                <div>
                  <p className="text-[10px] uppercase font-bold text-gray-500 mb-1">Jugador</p>
                  <p className="text-xl font-bold text-white">{viewingParticipant.userName}</p>
                  <p className="text-xs text-gray-400 mt-0.5">ID: {viewingParticipant.userId}</p>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="p-3 bg-white/5 border border-white/5 rounded-xl col-span-1">
                    <p className="text-[10px] uppercase font-bold text-gray-500 mb-0.5">Game ID</p>
                    <p className="text-sm font-mono text-white">{viewingParticipant.gameId || 'N/A'}</p>
                  </div>
                  <div className="p-3 bg-white/5 border border-white/5 rounded-xl col-span-1">
                    <p className="text-[10px] uppercase font-bold text-gray-500 mb-0.5">Nickname</p>
                    <p className="text-sm font-bold text-primary truncate tracking-tight">{viewingParticipant.gameNick || 'N/A'}</p>
                  </div>
                  <div className="p-3 bg-white/5 rounded-xl">
                    <p className="text-[10px] uppercase font-bold text-gray-500 mb-1">Estado Pago</p>
                    <span className={cn(
                      "text-xs font-bold uppercase",
                      viewingParticipant.paymentStatus === 'approved' ? "text-green-500" : 
                      viewingParticipant.paymentStatus === 'pending' ? "text-yellow-500" : 
                      viewingParticipant.paymentStatus === 'rejected' ? "text-red-500" : "text-gray-500"
                    )}>
                      {viewingParticipant.paymentStatus}
                    </span>
                  </div>
                  <div className="p-3 bg-white/5 rounded-xl">
                    <p className="text-[10px] uppercase font-bold text-gray-500 mb-1">Código Asignado</p>
                    <p className="font-mono text-white">{viewingParticipant.paymentCode || 'Ninguno'}</p>
                  </div>
                  <div className="p-3 bg-white/5 rounded-xl">
                    <p className="text-[10px] uppercase font-bold text-gray-500 mb-1">Referencia</p>
                    <p className="font-mono text-primary">{viewingParticipant.paymentReference || 'N/A'}</p>
                  </div>
                  <div className="p-3 bg-white/5 rounded-xl text-center md:text-left col-span-2 md:col-span-1">
                    <p className="text-[10px] uppercase font-bold text-gray-500 mb-1">Torneo</p>
                    <p className="text-xs text-white truncate font-medium">
                      {viewingParticipant.tournamentName || tournaments.find(t => t.id === viewingParticipant.tournamentId)?.name || 'Consultando...'}
                    </p>
                  </div>
                </div>

                {viewingParticipant.paymentStatus === 'pending' && (
                  <div className="flex gap-3">
                    <button 
                      onClick={() => handleRejectPayment(viewingParticipant)}
                      className="flex-1 bg-red-500/10 text-red-500 py-3 rounded-xl text-xs font-bold uppercase transition-colors hover:bg-red-500 hover:text-black"
                    >
                      Rechazar Pago
                    </button>
                    <button 
                      onClick={() => handleApprovePayment(viewingParticipant)}
                      className="flex-1 bg-green-500 text-black py-3 rounded-xl text-xs font-bold uppercase transition-colors hover:bg-white"
                    >
                      Aprobar Pago
                    </button>
                  </div>
                )}

                <div className="space-y-3">
                  <h4 className="text-[10px] uppercase font-bold text-gray-500 flex items-center gap-2">
                    <History size={12} /> Historial de Eventos
                  </h4>
                  <div className="space-y-2">
                    {viewingParticipant.registeredAt && (
                      <div className="flex items-center gap-3 p-2 border-l-2 border-primary/30 bg-white/5 rounded-r-lg">
                        <Clock size={14} className="text-primary" />
                        <div>
                          <p className="text-[10px] font-bold text-white uppercase">Registro Solicitado</p>
                          <p className="text-[10px] text-gray-500">{viewingParticipant.registeredAt.toDate?.().toLocaleString()}</p>
                        </div>
                      </div>
                    )}
                    {viewingParticipant.approvedAt && (
                      <div className="flex items-center gap-3 p-2 border-l-2 border-green-500/30 bg-white/5 rounded-r-lg">
                        <Check size={14} className="text-green-500" />
                        <div>
                          <p className="text-[10px] font-bold text-white uppercase">Pago Confirmado</p>
                          <p className="text-[10px] text-gray-500">{viewingParticipant.approvedAt.toDate?.().toLocaleString()}</p>
                        </div>
                      </div>
                    )}
                    {viewingParticipant.rejectedAt && (
                      <div className="flex items-center gap-3 p-2 border-l-2 border-red-500/30 bg-white/5 rounded-r-lg">
                        <X size={14} className="text-red-500" />
                        <div>
                          <p className="text-[10px] font-bold text-white uppercase">Pago Rechazado</p>
                          <p className="text-[10px] text-gray-500">{viewingParticipant.rejectedAt.toDate?.().toLocaleString()}</p>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                <div className="pt-4 mt-2 border-t border-white/5">
                  <button 
                    onClick={() => setViewingParticipant(null)}
                    className="w-full bg-white/5 hover:bg-white/10 text-gray-400 py-3 rounded-xl text-xs font-bold uppercase transition-colors"
                  >
                    Cerrar Detalles
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
        {/* User Search & Stats Management */}
        {activeTab === 'ranking' && (
          <div className="space-y-8">
            {/* Direct Tournament Placement Tool */}
            <div className="glass p-8 rounded-3xl border border-primary/20 bg-primary/5">
              <div className="flex items-center gap-4 mb-6">
                <div className="w-12 h-12 rounded-2xl bg-primary/20 flex items-center justify-center">
                  <Workflow className="text-primary" size={24} />
                </div>
                <div>
                  <h2 className="text-2xl font-display uppercase italic text-white tracking-tight">Asignar Podio de Torneo</h2>
                  <p className="text-[10px] uppercase font-bold text-gray-500 tracking-widest">Asignación rápida de puestos y puntos</p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="space-y-4">
                  <label className="text-xs uppercase font-bold text-gray-500">1. Selecciona un Torneo</label>
                  <div className="grid grid-cols-1 gap-2 max-h-[300px] overflow-y-auto pr-2 no-scrollbar">
                    {tournaments.filter(t => t.status !== 'upcoming').map(t => (
                      <button
                        key={t.id}
                        onClick={() => setExpandedTournamentId(t.id)}
                        className={cn(
                          "w-full text-left p-4 rounded-xl border transition-all flex items-center justify-between group",
                          expandedTournamentId === t.id 
                            ? "bg-primary border-primary text-black" 
                            : "bg-white/5 border-white/10 text-white hover:border-primary/50"
                        )}
                      >
                        <div className="min-w-0">
                          <p className="font-bold truncate text-sm">{t.name}</p>
                          <p className={cn("text-[10px] uppercase font-bold", expandedTournamentId === t.id ? "text-black/60" : "text-gray-500")}>
                            {t.game} • {t.status}
                          </p>
                        </div>
                        <Check size={16} className={cn("transition-opacity", expandedTournamentId === t.id ? "opacity-100" : "opacity-0")} />
                      </button>
                    ))}
                    {tournaments.filter(t => t.status !== 'upcoming').length === 0 && (
                      <p className="text-xs text-gray-500 italic p-4 text-center bg-white/5 rounded-xl border border-dashed border-white/10">
                        No hay torneos finalizados u en curso aún.
                      </p>
                    )}
                  </div>
                </div>

                <div className="space-y-4">
                  <label className="text-xs uppercase font-bold text-gray-500">2. Asignar Resultado</label>
                  <div className="bg-black/40 rounded-2xl border border-white/10 p-4 min-h-[300px]">
                    {!expandedTournamentId ? (
                      <div className="h-full flex flex-col items-center justify-center text-gray-500 text-center space-y-2 opacity-50">
                        <Users size={40} strokeWidth={1} />
                        <p className="text-xs uppercase font-bold tracking-widest">Selecciona un torneo para ver participantes</p>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {currentParticipants.length === 0 ? (
                          <p className="text-center text-gray-500 italic py-10">Cargando participantes...</p>
                        ) : (
                          currentParticipants.filter(p => p.paymentStatus === 'approved').map((p, idx) => (
                            <div key={idx} className="flex items-center justify-between p-3 bg-white/5 border border-white/5 rounded-xl">
                              <div className="flex items-center gap-3">
                                <img 
                                  src={p.photoURL || `https://api.dicebear.com/7.x/avataaars/svg?seed=${p.userId}`} 
                                  className="w-8 h-8 rounded-lg" 
                                  alt="" 
                                />
                                <span className="font-bold text-sm truncate max-w-[120px]">{p.userName}</span>
                              </div>
                              <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center">
                                <div className="flex gap-1">
                                  {[1, 2, 3].map(place => (
                                    <button
                                      key={place}
                                      onClick={() => {
                                        const tName = tournaments.find(t => t.id === expandedTournamentId)?.name || 'Torneo';
                                        if (confirm(`¿Asignar ${place}er lugar a ${p.userName}?`)) {
                                          userService.awardTournamentPlacement(p.userId, expandedTournamentId, tName, place);
                                          showToast(`${place}er lugar asignado a ${p.userName}`);
                                        }
                                      }}
                                      className={cn(
                                        "w-8 h-8 rounded-lg flex items-center justify-center border font-black text-xs transition-all",
                                        p.placement === place ? (
                                          place === 1 ? "bg-yellow-500 text-black border-yellow-500" :
                                          place === 2 ? "bg-gray-400 text-black border-gray-400" :
                                          "bg-amber-700 text-white border-amber-700"
                                        ) : (
                                          place === 1 ? "bg-yellow-500/10 text-yellow-500 border-yellow-500/30 hover:bg-yellow-500 hover:text-black" :
                                          place === 2 ? "bg-gray-400/10 text-gray-400 border-gray-400/30 hover:bg-gray-400 hover:text-black" :
                                          "bg-amber-700/10 text-amber-700 border-amber-700/30 hover:bg-amber-700 hover:text-white"
                                        )
                                      )}
                                    >
                                      {place}
                                    </button>
                                  ))}
                                </div>
                                <div className="flex items-center gap-2 bg-white/5 p-1 rounded-xl border border-white/5">
                                  <div className="flex flex-col">
                                    <span className="text-[8px] uppercase text-gray-500 font-bold ml-1">Pos</span>
                                    <input 
                                      type="number"
                                      placeholder="Ex: 4"
                                      className="w-10 bg-transparent text-white text-xs font-bold outline-none border-none p-1 text-center"
                                      value={placementPosition[p.userId] ?? (Number.isNaN(p.placement) || !p.placement || p.placement <= 3 ? '' : p.placement)}
                                      onChange={(e) => setPlacementPosition({...placementPosition, [p.userId]: parseInt(e.target.value) || 0})}
                                    />
                                  </div>
                                  <div className="flex flex-col">
                                    <span className="text-[8px] uppercase text-gray-500 font-bold ml-1">Pts</span>
                                    <input 
                                      type="number"
                                      placeholder="Ex: 10"
                                      className="w-12 bg-transparent text-primary text-xs font-bold outline-none border-none p-1 text-center"
                                      value={placementPoints[p.userId] ?? (Number.isNaN(p.pointsAwarded) || !p.pointsAwarded ? '' : p.pointsAwarded)}
                                      onChange={(e) => setPlacementPoints({...placementPoints, [p.userId]: parseInt(e.target.value) || 0})}
                                    />
                                  </div>
                                  <button 
                                    onClick={() => {
                                      const tName = tournaments.find(t => t.id === expandedTournamentId)?.name || 'Torneo';
                                      const pos = placementPosition[p.userId];
                                      const pts = placementPoints[p.userId];
                                      if (!pos) {
                                        alert('Ingresa una posición');
                                        return;
                                      }
                                      userService.awardTournamentPlacement(p.userId, expandedTournamentId, tName, pos, pts);
                                      showToast(`Posición ${pos} asignada a ${p.userName}`);
                                    }}
                                    className="p-2 bg-primary/20 text-primary hover:bg-primary hover:text-black rounded-lg transition-all border border-primary/20"
                                    title="Guardar Clasificación"
                                  >
                                    <Check size={14} />
                                  </button>
                                </div>
                              </div>
                            </div>
                          ))
                        )}
                        {currentParticipants.filter(p => p.paymentStatus === 'approved').length === 0 && (
                          <div className="py-10 text-center space-y-2 opacity-50">
                            <AlertTriangle size={30} className="mx-auto text-yellow-500" />
                            <p className="text-[10px] uppercase font-bold">No hay participantes aprobados en este torneo</p>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>

            <div className="glass p-8 rounded-3xl border border-white/10">
              <h2 className="text-2xl font-display uppercase italic mb-6 flex items-center gap-3">
                <Trophy className="text-primary" /> Gestión de Ranking
              </h2>
              <form onSubmit={handleUserSearch} className="flex gap-3">
                <input 
                  type="text" 
                  value={userSearchTerm}
                  onChange={(e) => setUserSearchTerm(e.target.value)}
                  placeholder="Buscar jugador por nombre de usuario..."
                  className="flex-1 bg-white/5 border border-white/10 px-6 py-4 rounded-xl text-white focus:border-primary outline-none"
                />
                <button 
                  type="submit"
                  className="bg-primary text-black px-8 rounded-xl font-display uppercase italic skew-x-[-10deg] hover:bg-white transition-all"
                >
                  Buscar
                </button>
              </form>

              {userSearchResults.length > 0 && (
                <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-4">
                  {userSearchResults.map((u, idx) => (
                    <div key={idx} className="bg-white/5 border border-white/5 p-5 rounded-2xl flex flex-col gap-4 group hover:border-primary/50 transition-all">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3 overflow-hidden">
                          <img 
                            src={u.photoURL || `https://api.dicebear.com/7.x/avataaars/svg?seed=${u.id}`} 
                            className="w-12 h-12 rounded-xl bg-zinc-800 border border-white/10"
                            alt="" 
                          />
                          <div className="overflow-hidden">
                            <p className="font-bold text-white truncate">{u.displayName}</p>
                            <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest">{u.platform || 'PC'}</p>
                          </div>
                        </div>
                        <button 
                          onClick={() => handleEditUserStats(u)}
                          className="p-2.5 bg-white/5 hover:bg-primary hover:text-black rounded-lg transition-all text-primary border border-primary/20"
                        >
                          <Settings size={16} />
                        </button>
                      </div>

                      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2">
                        <div className="bg-zinc-900 rounded-xl p-3 border border-primary/20 text-center">
                          <p className="text-[9px] uppercase font-black text-primary mb-2">Points</p>
                          <div className="flex items-center justify-center gap-2">
                            <button onClick={() => handleQuickStatIncrement(u.id, 'points', -25)} className="p-1 hover:text-red-500 transition-colors"><Minus size={10}/></button>
                            <span className="text-xl font-display italic text-primary">{u.stats?.points || 0}</span>
                            <button onClick={() => handleQuickStatIncrement(u.id, 'points', 25)} className="p-1 hover:text-green-500 transition-colors"><Plus size={10}/></button>
                          </div>
                        </div>
                        <div className="bg-black/40 rounded-xl p-3 border border-white/5 text-center">
                          <p className="text-[9px] uppercase font-black text-gray-500 mb-2">Wins</p>
                          <div className="flex items-center justify-center gap-2">
                            <button onClick={() => handleQuickStatIncrement(u.id, 'wins', -1)} className="p-1 hover:text-red-500 transition-colors"><Minus size={12}/></button>
                            <span className="text-xl font-display italic text-white">{u.stats?.wins || 0}</span>
                            <button onClick={() => handleQuickStatIncrement(u.id, 'wins', 1)} className="p-1 hover:text-green-500 transition-colors"><Plus size={12}/></button>
                          </div>
                        </div>
                        <div className="bg-black/40 rounded-xl p-3 border border-white/5 text-center">
                          <p className="text-[9px] uppercase font-black text-gray-500 mb-2">Played</p>
                          <div className="flex items-center justify-center gap-2">
                            <button onClick={() => handleQuickStatIncrement(u.id, 'tournaments', -1)} className="p-1 hover:text-red-500 transition-colors"><Minus size={12}/></button>
                            <span className="text-xl font-display italic text-white">{u.stats?.tournaments || 0}</span>
                            <button onClick={() => handleQuickStatIncrement(u.id, 'tournaments', 1)} className="p-1 hover:text-green-500 transition-colors"><Plus size={12}/></button>
                          </div>
                        </div>
                        <div className="bg-black/40 rounded-xl p-3 border border-white/5 text-center">
                          <p className="text-[9px] uppercase font-black text-gray-500 mb-2">Losses</p>
                          <div className="flex items-center justify-center gap-2">
                            <button onClick={() => handleQuickStatIncrement(u.id, 'losses', -1)} className="p-1 hover:text-red-500 transition-colors"><Minus size={12}/></button>
                            <span className="text-xl font-display italic text-gray-400">{u.stats?.losses || 0}</span>
                            <button onClick={() => handleQuickStatIncrement(u.id, 'losses', 1)} className="p-1 hover:text-green-500 transition-colors"><Plus size={12}/></button>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Quick Summary of Stats (optional) */}
          </div>
        )}

        {activeTab === 'emails' && (
          <div className="space-y-8">
            <EmailAdmin />
          </div>
        )}

      </AnimatePresence>

      {/* Stats Edit Modal */}
      <AnimatePresence>
        {selectedUser && (
          <div className="fixed inset-0 z-[150] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelectedUser(null)}
              className="absolute inset-0 bg-black/90 backdrop-blur-md"
            />
            <motion.div 
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className="relative w-full max-w-md glass border border-white/10 rounded-3xl overflow-hidden shadow-2xl"
            >
              <div className="p-8 space-y-6">
                <div className="flex items-center gap-4">
                  <img 
                    src={selectedUser.photoURL || `https://api.dicebear.com/7.x/avataaars/svg?seed=${selectedUser.id}`} 
                    className="w-16 h-16 rounded-2xl"
                    alt="" 
                  />
                  <div>
                    <h3 className="text-2xl font-display uppercase italic tracking-tight">{selectedUser.displayName}</h3>
                    <p className="text-[10px] uppercase font-bold text-gray-500 tracking-widest mt-1">Editar Estadísticas</p>
                  </div>
                </div>

                <form onSubmit={handleUpdateUserStats} className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-[10px] uppercase font-bold text-gray-500 px-1">Torneos Jugados</label>
                      <input 
                        type="number" 
                        value={userStatsForm.tournaments}
                        onChange={(e) => setUserStatsForm(prev => ({ ...prev, tournaments: parseInt(e.target.value) || 0 }))}
                        className="w-full bg-white/5 border border-white/10 px-4 py-3 rounded-xl text-white outline-none focus:border-primary"
                      />
                    </div>
                    <div className="space-y-2">
                       <label className="text-[10px] uppercase font-bold text-gray-500 px-1">Victorias</label>
                       <input 
                         type="number" 
                         value={userStatsForm.wins}
                         onChange={(e) => setUserStatsForm(prev => ({ ...prev, wins: parseInt(e.target.value) || 0 }))}
                         className="w-full bg-zinc-900 border border-white/10 px-4 py-3 rounded-xl text-white outline-none focus:border-primary font-bold"
                       />
                    </div>
                    <div className="space-y-2">
                       <label className="text-[10px] uppercase font-bold text-gray-500 px-1 text-primary">Puntos</label>
                       <input 
                         type="number" 
                         value={userStatsForm.points}
                         onChange={(e) => setUserStatsForm(prev => ({ ...prev, points: parseInt(e.target.value) || 0 }))}
                         className="w-full bg-zinc-900 border border-primary/20 px-4 py-3 rounded-xl text-primary outline-none focus:border-primary font-bold"
                       />
                    </div>
                    <div className="space-y-2">
                       <label className="text-[10px] uppercase font-bold text-gray-500 px-1">Derrotas</label>
                       <input 
                         type="number" 
                         value={userStatsForm.losses}
                         onChange={(e) => setUserStatsForm(prev => ({ ...prev, losses: parseInt(e.target.value) || 0 }))}
                         className="w-full bg-zinc-900 border border-white/10 px-4 py-3 rounded-xl text-white outline-none focus:border-primary"
                       />
                    </div>
                  </div>

                  <div className="flex gap-3 pt-4">
                    <button 
                      type="button"
                      onClick={() => setSelectedUser(null)}
                      className="flex-1 px-6 py-4 bg-white/5 text-gray-400 rounded-xl font-display uppercase text-sm skew-x-[-10deg] hover:bg-white/10 transition-colors"
                    >
                      Cancelar
                    </button>
                    <button 
                      type="submit"
                      className="flex-1 px-6 py-4 bg-primary text-black rounded-xl font-display uppercase text-sm skew-x-[-10deg] hover:bg-white transition-colors"
                    >
                      Guardar
                    </button>
                  </div>
                </form>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
      <AnimatePresence>
        {tournamentToDelete && (
          <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => !isDeleting && setTournamentToDelete(null)}
              className="absolute inset-0 bg-black/90 backdrop-blur-md"
            />
            <motion.div 
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className="relative w-full max-w-md glass border-red-500/30 border-2 rounded-3xl overflow-hidden shadow-2xl shadow-red-500/10"
            >
              <div className="p-8 text-center space-y-6">
                <div className="w-20 h-20 bg-red-500/10 rounded-full flex items-center justify-center mx-auto border border-red-500/20">
                  <AlertTriangle className="text-red-500" size={40} />
                </div>
                
                <div className="space-y-2">
                  <h3 className="text-2xl font-display uppercase italic text-white tracking-tight">
                    ¿Eliminar Torneo?
                  </h3>
                  <p className="text-gray-400 text-sm leading-relaxed">
                    Estás a punto de eliminar <span className="text-white font-bold">"{tournamentToDelete.name}"</span>. 
                    Esta acción borrará permanentemente todos los participantes, brackets y mensajes del chat. 
                    <span className="block mt-2 text-red-400 font-bold uppercase text-[10px] tracking-widest">No se puede deshacer</span>
                  </p>
                </div>

                <div className="flex flex-col gap-3">
                  <button 
                    disabled={isDeleting}
                    onClick={handleDelete}
                    className={cn(
                      "w-full py-4 bg-red-600 text-white font-display uppercase text-lg skew-x-[-10deg] flex items-center justify-center gap-2 transition-all hover:bg-red-500 active:scale-95",
                      isDeleting && "opacity-50 cursor-not-allowed"
                    )}
                  >
                    {isDeleting ? (
                      <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    ) : (
                      <>Eliminar Permanentemente</>
                    )}
                  </button>
                  <button 
                    disabled={isDeleting}
                    onClick={() => setTournamentToDelete(null)}
                    className="w-full py-3 text-gray-500 font-display uppercase tracking-widest text-xs hover:text-white transition-colors disabled:opacity-50"
                  >
                    Cancelar
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Toast Notifications */}
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: 50, x: '-50%' }}
            animate={{ opacity: 1, y: 0, x: '-50%' }}
            exit={{ opacity: 0, y: 20, x: '-50%' }}
            className={cn(
              "fixed bottom-8 left-1/2 z-[200] px-6 py-3 rounded-2xl font-bold uppercase italic text-sm shadow-2xl flex items-center gap-3 min-w-[300px] border",
              toast.type === 'success' && "bg-green-500 text-black border-green-400",
              toast.type === 'error' && "bg-red-500 text-white border-red-400",
              toast.type === 'info' && "bg-blue-500 text-white border-blue-400"
            )}
          >
            {toast.type === 'success' && <Check size={18} />}
            {toast.type === 'error' && <AlertTriangle size={18} />}
            {toast.type === 'info' && <Clock size={18} />}
            {toast.message}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default AdminPage;
