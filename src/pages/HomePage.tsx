import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { tournamentService, gamesService } from '../services/db';
import { useAuth } from '../contexts/AuthContext';
import { Trophy, Calendar, Users, Zap, Lock, MessageSquare, ChevronDown, ChevronUp, Info, Hash, Clock, Swords, Crown, Target, Shield, Gamepad2, Youtube, CheckCircle2, X, CreditCard, Loader2, Plus, Trash2, Edit, Upload, Image, HelpCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../lib/utils';
import CountdownTimer from '../components/CountdownTimer';
import { TourOverlay } from '../components/TourOverlay';

// DEFAULT POPULAR GAMES AND ICON MAPPINGS FOR PERSISTENCE
const GAME_ICONS: Record<string, any> = {
  Swords,
  Crown,
  Target,
  Shield,
  Gamepad2,
  Trophy,
  Users
};

const DEFAULT_GAMES = [
  { id: 'blood-strike', name: 'Blood Strike', image: 'https://images.unsplash.com/photo-1614294149010-950b698f72c0?q=80&w=2070&auto=format&fit=crop', genre: 'Battle Royale', iconName: 'Swords' },
  { id: 'lol', name: 'League of Legends', image: 'https://images.unsplash.com/photo-1542751371-adc38448a05e?q=80&w=2070&auto=format&fit=crop', genre: 'MOBA', isComingSoon: true, iconName: 'Crown' },
  { id: 'valorant', name: 'Valorant', image: 'https://images.unsplash.com/photo-1560253023-3ec5d502959f?q=80&w=2070&auto=format&fit=crop', genre: 'Shooter', isComingSoon: true, iconName: 'Target' },
  { id: 'fortnite', name: 'Fortnite', image: 'https://images.unsplash.com/photo-1589241062272-c0a000072dfa?q=80&w=1974&auto=format&fit=crop', genre: 'Battle Royale', isComingSoon: true, iconName: 'Shield' },
  { id: 'fc24', name: 'EA Sports FC 24', image: 'https://images.unsplash.com/photo-1612287230202-1ff1d85d1bdf?q=80&w=2071&auto=format&fit=crop', genre: 'Deportes', isComingSoon: true, iconName: 'Gamepad2' },
];

const compressImage = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new window.Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;
        
        // Ideal responsive size for game banners
        const MAX_WIDTH = 800;
        const MAX_HEIGHT = 450;
        
        if (width > MAX_WIDTH) {
          height = Math.round((height * MAX_WIDTH) / width);
          width = MAX_WIDTH;
        }
        if (height > MAX_HEIGHT) {
          width = Math.round((width * MAX_HEIGHT) / height);
          height = MAX_HEIGHT;
        }
        
        canvas.width = width;
        canvas.height = height;
        
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0, width, height);
          const dataUrl = canvas.toDataURL('image/jpeg', 0.7);
          resolve(dataUrl);
        } else {
          resolve(event.target?.result as string);
        }
      };
      img.onerror = () => reject(new Error('Error al decodificar la imagen'));
      img.src = event.target?.result as string;
    };
    reader.onerror = () => reject(new Error('Error al leer el archivo'));
    reader.readAsDataURL(file);
  });
};

const HomePage: React.FC = () => {
  const [tournaments, setTournaments] = useState<any[]>([]);
  const [lastVisible, setLastVisible] = useState<any>(null);
  const [hasMore, setHasMore] = useState(true);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [registeringId, setRegisteringId] = useState<string | null>(null);
  const [confirmingTournament, setConfirmingTournament] = useState<any>(null);
  const [confirmCountdown, setConfirmCountdown] = useState(0);
  const [paymentReference, setPaymentReference] = useState('');
  const [tempVerificationCode, setTempVerificationCode] = useState('');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [userRegistrations, setUserRegistrations] = useState<Record<string, boolean>>({});
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [successData, setSuccessData] = useState<{ tournament: any, code: string } | null>(null);
  const [toast, setToast] = useState<{ message: string, type: 'success' | 'error' | 'info' } | null>(null);
  const { user, profile, isAdmin } = useAuth();

  // Platform onboarding Tour Overlay state
  const [isTourOpen, setIsTourOpen] = useState(false);

  useEffect(() => {
    // Show tutorial overlay to first-time users once the app loads
    const completed = localStorage.getItem('nexus_arena_tour_completed');
    if (completed !== 'true') {
      const timer = setTimeout(() => {
        setIsTourOpen(true);
      }, 1500);
      return () => clearTimeout(timer);
    }
  }, []);

  // POPULAR GAMES REAL-TIME PERSISTENCE VIA FIRESTORE
  const [popularGames, setPopularGames] = useState<any[]>(DEFAULT_GAMES);

  const [isEditMode, setIsEditMode] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingGame, setEditingGame] = useState<any | null>(null);
  const [isCompressing, setIsCompressing] = useState(false);
  const [bannerOption, setBannerOption] = useState<'gallery' | 'url'>('gallery');

  const [gameForm, setGameForm] = useState({
    name: '',
    genre: '',
    image: '',
    isComingSoon: false,
    iconName: 'Gamepad2'
  });

  // Synchronize games from Firestore, seed if empty
  useEffect(() => {
    const unsubscribe = gamesService.listenGames(async (loadedGames) => {
      if (loadedGames && loadedGames.length > 0) {
        // Sort/keep standard arrays
        setPopularGames(loadedGames);
      } else {
        // If there are no games in Firestore and current user is Admin, seed default ones!
        if (isAdmin) {
          try {
            for (const dg of DEFAULT_GAMES) {
              await gamesService.create(dg);
            }
          } catch (e) {
            console.error('Error seeding default games:', e);
          }
        } else {
          setPopularGames(DEFAULT_GAMES);
        }
      }
    });

    return () => unsubscribe();
  }, [isAdmin]);

  const handleOpenAddModal = () => {
    setEditingGame(null);
    setGameForm({
      name: '',
      genre: '',
      image: '',
      isComingSoon: false,
      iconName: 'Gamepad2'
    });
    setBannerOption('gallery');
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (game: any) => {
    setEditingGame(game);
    setGameForm({
      name: game.name,
      genre: game.genre,
      image: game.image,
      isComingSoon: !!game.isComingSoon,
      iconName: game.iconName || 'Gamepad2'
    });
    setBannerOption(game.image?.startsWith('data:') ? 'gallery' : 'url');
    setIsModalOpen(true);
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setIsCompressing(true);
      try {
        const compressedBase64 = await compressImage(file);
        setGameForm(prev => ({ ...prev, image: compressedBase64 }));
        showToast('¡Imagen de galería optimizada con éxito!');
      } catch (err: any) {
        showToast(err.message || 'Error al procesar la imagen de tu galería', 'error');
      } finally {
        setIsCompressing(false);
      }
    }
  };

  const handleSaveGame = async () => {
    if (!gameForm.name.trim()) {
      showToast('El nombre del juego es obligatorio', 'error');
      return;
    }
    if (!gameForm.genre.trim()) {
      showToast('El género del juego es obligatorio', 'error');
      return;
    }
    if (!gameForm.image.trim()) {
      showToast('Debes seleccionar un banner de tu galería o una URL', 'error');
      return;
    }

    try {
      if (editingGame) {
        await gamesService.update(editingGame.id, {
          name: gameForm.name.trim(),
          genre: gameForm.genre.trim(),
          image: gameForm.image,
          isComingSoon: !!gameForm.isComingSoon,
          iconName: gameForm.iconName || 'Gamepad2'
        });
        showToast(`¡"${gameForm.name}" actualizado correctamente!`);
      } else {
        await gamesService.create({
          name: gameForm.name.trim(),
          genre: gameForm.genre.trim(),
          image: gameForm.image,
          isComingSoon: !!gameForm.isComingSoon,
          iconName: gameForm.iconName || 'Gamepad2'
        });
        showToast(`¡"${gameForm.name}" se agregó a la sección de populares!`);
      }
    } catch (err: any) {
      console.error(err);
      showToast('Error al guardar en el servidor', 'error');
    }
    setIsModalOpen(false);
  };

  const handleDeleteGame = async () => {
    if (editingGame) {
      try {
        await gamesService.delete(editingGame.id);
        showToast('Juego eliminado de la sección de populares', 'info');
      } catch (err: any) {
        console.error(err);
        showToast('Error al eliminar el juego', 'error');
      }
      setIsModalOpen(false);
    }
  };

  const showToast = (message: string, type: 'success' | 'error' | 'info' = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  };

  const [pageSize] = useState(6);
  const [lastSync, setLastSync] = useState<Date | null>(null);

  useEffect(() => {
    // Real-time synchronization for the first page of tournaments
    setLoading(true);
    const unsubscribe = tournamentService.subscribeToRecent(pageSize, async ({ tournaments: newTournaments, lastDoc }) => {
      setTournaments(newTournaments);
      setLastVisible(lastDoc);
      setLastSync(new Date());
      setLoading(false);
      
      // Update hasMore based on first page
      setHasMore(newTournaments.length === pageSize);
      
      // Check registrations for the current user
      if (user) {
        const regs: Record<string, boolean> = { ...userRegistrations };
        const tournamentsToCheck = newTournaments.filter(t => regs[t.id] === undefined);
        
        if (tournamentsToCheck.length > 0) {
          await Promise.all(tournamentsToCheck.map(async (t) => {
            const isReg = await tournamentService.isRegistered(t.id, user.uid);
            regs[t.id] = !!isReg;
          }));
          setUserRegistrations(regs);
        }
      }
    });

    return () => unsubscribe();
  }, [user, pageSize]);

  // Infinite Scroll Observer
  useEffect(() => {
    const observer = new IntersectionObserver((entries) => {
      if (entries[0].isIntersecting && hasMore && !loadingMore && !loading) {
        loadMoreTournaments();
      }
    }, { threshold: 0.1 });

    const sentinel = document.getElementById('load-more-sentinel');
    if (sentinel) observer.observe(sentinel);

    return () => observer.disconnect();
  }, [hasMore, loadingMore, loading, lastVisible]);

  useEffect(() => {
    let timer: any;
    if (confirmCountdown > 0) {
      timer = setInterval(() => {
        setConfirmCountdown(prev => prev - 1);
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [confirmCountdown]);

  const loadMoreTournaments = async () => {
    if (loadingMore || !hasMore || !lastVisible) return;
    setLoadingMore(true);
    const result = await tournamentService.getPaginated(pageSize, lastVisible);
    if (result) {
      // Prevent duplicates if by some chance the same tournament shows up
      setTournaments(prev => {
        const newTournaments = result.tournaments.filter(
          nt => !prev.some(pt => pt.id === nt.id)
        );
        return [...prev, ...newTournaments];
      });
      setLastVisible(result.lastDoc);
      setHasMore(result.hasMore);

      if (user) {
        const regs: Record<string, boolean> = { ...userRegistrations };
        await Promise.all(result.tournaments.map(async (t) => {
          const isReg = await tournamentService.isRegistered(t.id, user.uid);
          regs[t.id] = !!isReg;
        }));
        setUserRegistrations(regs);
      }
    }
    setLoadingMore(false);
  };

  const initiateQuickRegister = (tournament: any) => {
    if (!user) {
      showToast('Debes iniciar sesión para inscribirte.', 'error');
      return;
    }

    setConfirmingTournament(tournament);
    setPaymentReference('');
    const code = Math.floor(1000 + Math.random() * 9000).toString();
    setTempVerificationCode(code);
    
    const isFree = !tournament.entryFee || 
                   tournament.entryFee.toString().toLowerCase().trim() === 'gratis' || 
                   tournament.entryFee.toString().toLowerCase().trim() === 'free';

    if (isFree) {
      setConfirmCountdown(3);
    } else {
      setConfirmCountdown(0);
    }
  };

  const handleQuickRegister = async () => {
    if (!confirmingTournament) return;
    const tournament = confirmingTournament;

    const isFree = !tournament.entryFee || 
                   tournament.entryFee.toString().toLowerCase().trim() === 'gratis' || 
                   tournament.entryFee.toString().toLowerCase().trim() === 'free';

    if (!isFree && !paymentReference.trim()) {
      showToast('Debes ingresar la referencia de pago.', 'error');
      return;
    }

    setConfirmCountdown(0);
    setRegisteringId(tournament.id);

    try {
      const verificationCode = tempVerificationCode || Math.floor(1000 + Math.random() * 9000).toString();
      
      if (isFree) {
        await tournamentService.registerParticipant(
          tournament.id,
          user.uid,
          profile?.displayName || user.displayName || 'Jugador',
          profile?.photoURL || user.photoURL || `https://api.dicebear.com/7.x/avataaars/svg?seed=${user.uid}`,
          verificationCode,
          profile?.gameId,
          profile?.gameNick
        );
        setUserRegistrations(prev => ({ ...prev, [tournament.id]: true }));
        setTournaments(prev => prev.map(t => 
          t.id === tournament.id 
            ? { ...t, registeredParticipants: (t.registeredParticipants || 0) + 1 }
            : t
        ));
        setSuccessData({ tournament, code: verificationCode });
        setShowSuccessModal(true);
        setConfirmingTournament(null);
        setPaymentReference('');
      } else {
        await tournamentService.requestRegistrationWithPayment(
          tournament.id,
          user.uid,
          profile?.displayName || user.displayName || 'Jugador',
          profile?.photoURL || user.photoURL || `https://api.dicebear.com/7.x/avataaars/svg?seed=${user.uid}`,
          paymentReference,
          verificationCode,
          profile?.gameId,
          profile?.gameNick
        );
        setSuccessData({ tournament, code: verificationCode });
        setShowSuccessModal(true);
        setConfirmingTournament(null);
        setPaymentReference('');
      }
    } catch (error) {
      console.error('Error in registration:', error);
      showToast('No se pudo completar el registro. Inténtalo de nuevo.', 'error');
    } finally {
      setRegisteringId(null);
    }
  };

  return (
    <div className="space-y-12">
      {/* Real-time Sync Status Bar */}
      {lastSync && (
        <motion.div 
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="fixed top-20 right-8 z-[100] hidden md:flex items-center gap-2 bg-black/60 backdrop-blur-md border border-white/10 px-3 py-1.5 rounded-full"
        >
          <div className="w-2 h-2 bg-primary rounded-full animate-pulse shadow-[0_0_8px_rgba(var(--color-primary),0.6)]" />
          <span className="text-[10px] font-black uppercase tracking-widest text-primary/80">
            Sincronizado {lastSync.toLocaleTimeString()}
          </span>
        </motion.div>
      )}

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

      {/* Registration Modal */}
      <AnimatePresence>
        {confirmingTournament && (
          <div className="fixed inset-0 z-[110] flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-md">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              className="bg-zinc-900 border border-white/10 rounded-[2rem] sm:rounded-[2.5rem] p-5 sm:p-8 max-w-lg w-full shadow-2xl relative overflow-y-auto max-h-[95vh] sm:max-h-[92vh] scrollbar-thin space-y-5 sm:space-y-6"
            >
              <button 
                onClick={() => setConfirmingTournament(null)}
                className="absolute top-4 right-4 sm:top-6 sm:right-6 p-2 hover:bg-white/10 rounded-full text-gray-500 hover:text-white transition-colors z-10"
              >
                <X size={20} className="sm:w-6 sm:h-6" />
              </button>

              <div className="absolute top-0 left-0 w-full h-1 bg-white/5">
                {confirmCountdown > 0 && (
                  <motion.div 
                    initial={{ width: "100%" }}
                    animate={{ width: "0%" }}
                    transition={{ duration: 3, ease: "linear" }}
                    className="h-full bg-primary"
                  />
                )}
              </div>

              <div className="space-y-5 sm:space-y-6">
                <div className="flex items-center gap-3 sm:gap-4 pr-10">
                  <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-xl sm:rounded-2xl bg-primary/10 flex items-center justify-center text-primary border border-primary/20 shrink-0">
                    <Trophy size={24} className="sm:w-7 sm:h-7" />
                  </div>
                  <div>
                    <h3 className="text-xl sm:text-2xl font-display uppercase italic tracking-tight leading-tight">Confirmar Inscripción</h3>
                    <p className="text-[9px] sm:text-[10px] text-primary uppercase font-black tracking-[0.2em]">{confirmingTournament.game}</p>
                  </div>
                </div>

                <div className="space-y-3 sm:space-y-4">
                  <div className="p-4 sm:p-5 bg-white/5 rounded-xl sm:rounded-2xl border border-white/10 space-y-3 sm:space-y-4">
                    <div className="flex justify-between items-center gap-2">
                      <span className="text-[9px] sm:text-[10px] text-gray-500 uppercase font-black tracking-widest shrink-0">Torneo</span>
                      <span className="text-xs sm:text-sm font-bold text-white uppercase italic text-right truncate max-w-[180px] sm:max-w-none">{confirmingTournament.name}</span>
                    </div>
                    <div className="flex justify-between items-center gap-2">
                      <span className="text-[9px] sm:text-[10px] text-gray-500 uppercase font-black tracking-widest shrink-0">Costo de Entrada</span>
                      <div className="flex items-center gap-1.5">
                        <CreditCard size={12} className="text-primary" />
                        <span className={cn(
                          "text-xs sm:text-sm font-black uppercase tracking-tight",
                          (!confirmingTournament.entryFee || confirmingTournament.entryFee.toString().toLowerCase().match(/gratis|free/)) ? "text-green-500" : "text-primary"
                        )}>
                          {confirmingTournament.entryFee || 'Gratis'}
                        </span>
                      </div>
                    </div>
                  </div>

                  {confirmingTournament.entryFee && !confirmingTournament.entryFee.toString().toLowerCase().match(/gratis|free/) && (
                    <motion.div 
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      className="space-y-3 sm:space-y-4 pt-1"
                    >
                      <div className="p-3.5 sm:p-4 bg-yellow-500/5 border border-yellow-500/20 rounded-xl sm:rounded-2xl space-y-2 sm:space-y-3">
                        <p className="text-[9px] sm:text-[10px] text-yellow-500 uppercase font-black tracking-widest flex items-center gap-1.5">
                          <Info size={12} /> Datos de Pago Móvil
                        </p>
                        <div className="grid grid-cols-1 gap-1.5 text-[10px]">
                          <div className="flex justify-between items-center py-1 border-b border-white/5">
                            <span className="text-gray-500 font-bold uppercase">Banco</span>
                            <span className="text-white font-mono z-10 select-all">0102 - Venezuela</span>
                          </div>
                          <div className="flex justify-between items-center py-1 border-b border-white/5">
                            <span className="text-gray-500 font-bold uppercase">Teléfono</span>
                            <span className="text-white font-mono text-primary font-bold z-10 select-all">0414-2943532</span>
                          </div>
                          <div className="flex justify-between items-center py-1">
                            <span className="text-gray-500 font-bold uppercase">Cédula</span>
                            <span className="text-white font-mono z-10 select-all">31.536.656</span>
                          </div>
                        </div>
                      </div>

                      <div className="bg-primary/5 border border-primary/20 rounded-xl sm:rounded-2xl p-3 sm:p-4 space-y-1 text-center">
                        <span className="text-[9px] sm:text-[10px] uppercase font-black tracking-widest text-primary/60">Tu código de validación</span>
                        <div className="text-lg sm:text-xl font-mono font-bold tracking-[0.4em] text-primary">
                          {tempVerificationCode}
                        </div>
                      </div>

                      <div className="space-y-1.5">
                        <label className="text-[9px] sm:text-[10px] text-gray-400 uppercase font-black tracking-widest ml-1">Referencia de Pago</label>
                        <div className="relative">
                          <Hash className="absolute left-4 top-1/2 -translate-y-1/2 text-primary" size={14} />
                          <input 
                            type="text"
                            value={paymentReference}
                            disabled={registeringId === confirmingTournament.id}
                            onChange={(e) => setPaymentReference(e.target.value)}
                            placeholder="Ej: 123456"
                            className="w-full bg-black/40 border border-white/10 rounded-xl sm:rounded-2xl py-3.5 sm:py-4 pl-11 pr-4 outline-none focus:border-primary focus:ring-1 focus:ring-primary/20 transition-all text-xs sm:text-sm font-mono tracking-widest disabled:opacity-50"
                          />
                        </div>
                      </div>

                      <a 
                        href={`https://wa.me/584142943532?text=Hola,%20quisiera%20validar%20mi%20inscripción%20para%20el%20torneo%20"${confirmingTournament.name}".%20Mi%20código%20es%20${tempVerificationCode}%20y%20mi%20referencia%20es%20${paymentReference || 'PENDIENTE'}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className={cn(
                          "w-full bg-[#25D366]/15 hover:bg-[#25D366]/25 text-[#25D366] py-3 rounded-xl font-display uppercase italic text-xs border border-[#25D366]/30 flex items-center justify-center gap-2 transition-all active:scale-95",
                          registeringId === confirmingTournament.id && "pointer-events-none opacity-50"
                        )}
                      >
                        <MessageSquare size={14} /> Enviar Comprobante por WhatsApp
                      </a>
                      
                      <p className="text-[9px] text-gray-500 leading-relaxed italic px-1 text-center font-sans">
                        * Ingresa la referencia y luego presiona "Inscribirme" para guardar tu solicitud en el sistema.
                      </p>
                    </motion.div>
                  )}
                </div>

                {/* Progress Alert Strip */}
                {registeringId === confirmingTournament.id && (
                  <motion.div 
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="p-3 bg-primary/10 border border-primary/20 text-primary rounded-xl text-center text-xs animate-pulse font-sans flex items-center justify-center gap-2"
                  >
                    <Loader2 size={14} className="animate-spin text-primary" /> Guardando tu inscripción de forma segura...
                  </motion.div>
                )}

                <div className="flex gap-3 pt-2">
                  <button
                    onClick={() => setConfirmingTournament(null)}
                    disabled={registeringId === confirmingTournament.id}
                    className="flex-1 py-3.5 sm:py-4 bg-white/5 hover:bg-white/10 text-white rounded-xl sm:rounded-2xl font-display uppercase italic transition-all skew-x-[-10deg] border border-white/10 active:scale-95 text-xs sm:text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Cerrar
                  </button>
                  <button
                    onClick={handleQuickRegister}
                    disabled={(confirmCountdown > 0) || (registeringId === confirmingTournament.id) || (confirmingTournament.entryFee && !confirmingTournament.entryFee.toString().toLowerCase().match(/gratis|free/) && !paymentReference.trim())}
                    className={cn(
                      "flex-1 py-3.5 sm:py-4 rounded-xl sm:rounded-2xl font-display uppercase italic transition-all skew-x-[-10deg] flex items-center justify-center gap-2 text-xs sm:text-sm font-bold",
                      (confirmCountdown > 0) || (registeringId === confirmingTournament.id) || (confirmingTournament.entryFee && !confirmingTournament.entryFee.toString().toLowerCase().match(/gratis|free/) && !paymentReference.trim())
                        ? "bg-gray-800 text-gray-500 cursor-not-allowed" 
                        : "bg-primary text-black hover:bg-white sm:hover:scale-[1.02] shadow-lg shadow-primary/20 active:scale-95"
                    )}
                  >
                    {registeringId === confirmingTournament.id ? (
                      <>
                        <Loader2 size={16} className="animate-spin text-black shrink-0" />
                        <span>Inscribiendo...</span>
                      </>
                    ) : confirmCountdown > 0 ? (
                      `Esperar (${confirmCountdown}s)`
                    ) : (
                      <>
                        <Zap size={16} />
                        ¡Inscribirme!
                      </>
                    )}
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Hero Section */}
      <section className="relative overflow-hidden py-24 px-8 border border-white/10 rounded-[2.5rem] group bg-zinc-950">
        {/* Depth Gradients */}
        <div className="absolute inset-0 bg-gradient-to-r from-zinc-950 via-zinc-950/80 to-transparent z-10" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,_var(--tw-gradient-stops))] from-primary/20 via-transparent to-transparent z-10" />
        <div className="absolute inset-0 bg-gradient-to-b from-black/20 to-zinc-950 z-10" />

        <div className="relative z-20 max-w-2xl space-y-8">
          <motion.div 
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-primary/10 border border-primary/20 text-primary text-[10px] font-black uppercase tracking-[0.2em]"
          >
            <Zap size={14} className="animate-pulse" /> Torneos en Vivo
          </motion.div>
          <motion.h1 
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1, duration: 0.8, ease: "circOut" }}
            className="text-6xl md:text-8xl font-display uppercase italic leading-[0.85] tracking-tighter"
          >
            Domina el <br /><span className="text-primary drop-shadow-[0_0_15px_rgba(var(--color-primary),0.3)]">Campo de Juego</span>
          </motion.h1>
          <motion.p 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="text-text/60 text-lg max-w-md leading-relaxed"
          >
            Regístrate en los torneos más competitivos de Venezuela 🇻🇪. Gana premios, sube en el ranking y demuestra quién es el mejor de la región.
          </motion.p>
          
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="flex flex-wrap gap-4 pt-4"
          >
            <button 
              onClick={() => document.getElementById('tournaments-section')?.scrollIntoView({ behavior: 'smooth' })}
              className="bg-primary hover:bg-white text-black px-8 py-4 rounded-2xl font-display text-lg uppercase italic skew-x-[-15deg] transition-all flex items-center gap-3 shadow-[0_0_20px_rgba(var(--color-primary),0.2)] hover:shadow-primary/40"
            >
              Explorar Torneos
            </button>
            <Link 
              to="/live"
              className="bg-white/5 hover:bg-white/10 text-white border border-white/10 px-8 py-4 rounded-2xl font-display text-lg uppercase italic skew-x-[-15deg] transition-all flex items-center gap-3"
            >
              Ver En Vivo
            </Link>
          </motion.div>
        </div>

        {/* Animated Background Image */}
        <div className="absolute top-0 right-0 w-full lg:w-3/4 h-full pointer-events-none overflow-hidden">
           <motion.img 
            initial={{ scale: 1.1, opacity: 0.2 }}
            animate={{ scale: 1, opacity: 0.3 }}
            whileHover={{ scale: 1.05 }}
            src="https://images.unsplash.com/photo-1542751371-adc38448a05e?auto=format&fit=crop&q=80&w=1200" 
            alt="Gaming Hero" 
            className="w-full h-full object-cover grayscale transition-all duration-[2000ms] group-hover:grayscale-0 group-hover:opacity-40" 
            transition={{ duration: 10, repeat: Infinity, repeatType: "reverse", ease: "linear" }}
           />
        </div>
      </section>

      {/* Featured Games Section */}
      <section id="featured-games-section" className="space-y-8">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-white/10 pb-4 gap-4">
          <h2 className="text-3xl font-display uppercase italic tracking-wider flex items-center gap-3">
            <Zap className="text-primary" /> Juegos Populares
          </h2>
          {isAdmin && (
            <div className="flex items-center gap-3">
              <button
                onClick={() => setIsEditMode(!isEditMode)}
                className={cn(
                  "px-4 py-2 rounded-xl font-display uppercase italic text-xs tracking-wider transition-all duration-300 flex items-center gap-2 border skew-x-[-10deg]",
                  isEditMode
                    ? "bg-primary text-black border-primary shadow-[0_0_15px_rgba(var(--color-primary),0.3)] hover:bg-white"
                    : "bg-white/5 text-zinc-300 border-white/10 hover:bg-white/10 hover:text-white"
                )}
              >
                <Edit size={13} />
                {isEditMode ? "Terminar Edición" : "Añadir / Editar Juegos"}
              </button>
            </div>
          )}
        </div>
        
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {popularGames.map((game: any, idx) => {
            const IconComponent = GAME_ICONS[game.iconName] || Gamepad2;
            const canEdit = isEditMode && isAdmin;
            return (
              <motion.div 
                key={game.id || game.name || idx}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.05 }}
                onClick={() => {
                  if (canEdit) {
                    handleOpenEditModal(game);
                  } else if (!game.isComingSoon) {
                    document.getElementById('tournaments-section')?.scrollIntoView({ behavior: 'smooth' });
                  }
                }}
                className={cn(
                  "group relative h-40 md:h-64 rounded-2xl overflow-hidden border border-white/10 transition-all cursor-pointer select-none",
                  canEdit && "ring-2 ring-primary/40 hover:ring-primary hover:scale-[1.02]"
                )}
              >
                <img 
                  src={game.image} 
                  alt={game.name} 
                  className={cn(
                    "w-full h-full object-cover transition-transform duration-500 group-hover:scale-110",
                    !canEdit && "grayscale group-hover:grayscale-0",
                    game.isComingSoon && !canEdit && "opacity-40"
                  )}
                  referrerPolicy="no-referrer"
                />
                
                {game.isComingSoon && (
                  <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/60 z-20">
                    <Lock className="text-primary mb-2" size={32} />
                    <span className="bg-primary text-black px-4 py-1 text-[10px] font-bold uppercase tracking-[0.2em] skew-x-[-15deg]">
                      Próximamente
                    </span>
                  </div>
                )}

                {/* Edit Action Overlay when in Edit Mode */}
                {canEdit && (
                  <div className="absolute top-2 right-2 z-30 drop-shadow-md">
                    <span className="bg-black/90 text-primary border border-primary/20 hover:border-primary hover:bg-primary hover:text-black px-3 py-1.5 rounded-xl text-[10px] font-display uppercase tracking-wider font-extrabold flex items-center gap-1.5 transition-all">
                      <Edit size={10} /> Editar
                    </span>
                  </div>
                )}

                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent flex flex-col justify-end p-4 z-10">
                  <span className="text-[10px] font-bold text-primary uppercase tracking-widest">{game.genre}</span>
                  <h3 className="text-lg font-display uppercase tracking-tight text-white flex items-center gap-2">
                    <IconComponent size={18} className="text-primary shrink-0" />
                    <span className="truncate">{game.name}</span>
                  </h3>
                </div>
              </motion.div>
            );
          })}

          {/* Plus Add Game Card when in edit mode */}
          {isEditMode && isAdmin && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              onClick={handleOpenAddModal}
              className="group relative h-40 md:h-64 rounded-2xl overflow-hidden border-2 border-dashed border-white/10 hover:border-primary/50 bg-white/[0.01] hover:bg-primary/[0.02] flex flex-col items-center justify-center cursor-pointer transition-all gap-3 text-center p-4 min-h-[160px]"
            >
              <div className="p-4 rounded-xl bg-white/5 text-zinc-400 group-hover:text-primary group-hover:bg-primary/10 border border-white/10 group-hover:border-primary/20 transition-all shadow-inner">
                <Plus size={24} className="group-hover:scale-110 transition-transform" />
              </div>
              <div>
                <span className="text-xs font-display uppercase tracking-widest text-zinc-300 group-hover:text-white transition-all italic block mb-1">
                  Añadir Juego
                </span>
                <span className="text-[10px] font-sans text-zinc-600 block">
                  Sube banners de tu Galería
                </span>
              </div>
            </motion.div>
          )}
        </div>
      </section>

      {/* YouTube & Discord Section */}
      <section className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* YouTube Banner */}
        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true }}
          className="relative overflow-hidden group min-h-[400px] flex flex-col"
        >
          <div className="absolute inset-0 bg-red-600/10 blur-3xl opacity-10 group-hover:opacity-30 transition-opacity" />
          <div className="relative h-full flex flex-col bg-red-600/5 border border-red-600/20 rounded-[2rem] p-6 lg:p-10 items-center lg:items-start text-center lg:text-left gap-6 shadow-2xl transition-all hover:bg-red-600/[0.08] hover:border-red-600/40">
            <div className="bg-red-600 p-3 lg:p-4 rounded-xl lg:rounded-2xl shadow-lg shadow-red-600/30 transform group-hover:scale-110 group-hover:rotate-6 transition-transform">
              <Youtube size={32} className="text-white lg:w-9 lg:h-9" />
            </div>
            <div className="space-y-3 lg:space-y-4 flex-grow">
              <h2 className="text-2xl lg:text-4xl font-display uppercase italic tracking-tighter leading-[0.9]">
                Sigue los Directos en <br className="hidden sm:block" /><span className="text-red-500">Nexus Arena TV</span>
              </h2>
              <p className="text-text/50 text-xs lg:text-base leading-relaxed max-w-sm mx-auto lg:mx-0 font-medium">
                Mira las finales en vivo, repeticiones de jugadas y contenido de la comunidad en nuestro canal oficial.
              </p>
            </div>
            
            <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto sm:items-center">
              <Link 
                to="/live" 
                className="bg-red-600 hover:bg-white hover:text-red-600 text-white px-8 py-3.5 rounded-xl font-display text-base lg:text-lg uppercase italic skew-x-[-10deg] transition-all flex items-center justify-center gap-2 shadow-lg shadow-red-600/20 active:scale-95"
              >
                Ver en Directo
              </Link>
              <a 
                href="https://youtube.com/@nexusarena-v6u?si=22-HWUtDl6deAVDc" 
                target="_blank" 
                rel="noreferrer"
                className="bg-white/5 hover:bg-white/10 text-white px-6 py-3.5 rounded-xl font-display text-[10px] lg:text-xs uppercase italic skew-x-[-10deg] transition-all flex items-center justify-center gap-2 border border-white/10 active:scale-95"
              >
                Canal Oficial
              </a>
            </div>
          </div>
        </motion.div>

        {/* Discord Banner */}
        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true }}
          className="relative overflow-hidden group min-h-[400px] flex flex-col"
        >
          <div className="absolute inset-0 bg-[#5865F2]/10 blur-3xl opacity-10 group-hover:opacity-30 transition-opacity" />
          <div className="relative h-full flex flex-col bg-[#5865F2]/5 border border-[#5865F2]/20 rounded-[2rem] p-6 lg:p-10 items-center lg:items-start text-center lg:text-left gap-6 shadow-2xl transition-all hover:bg-[#5865F2]/[0.08] hover:border-[#5865F2]/40">
            <div className="bg-[#5865F2] p-3 lg:p-4 rounded-xl lg:rounded-2xl shadow-lg shadow-[#5865F2]/30 transform group-hover:scale-110 group-hover:rotate-[-6deg] transition-transform">
              <MessageSquare size={32} className="text-white lg:w-9 lg:h-9" />
            </div>
            <div className="space-y-3 lg:space-y-4 flex-grow">
              <h2 className="text-2xl lg:text-4xl font-display uppercase italic tracking-tighter leading-[0.9]">
                Únete a nuestra <br className="hidden sm:block" /><span className="text-[#5865F2]">Comunidad de Discord</span>
              </h2>
              <p className="text-text/50 text-xs lg:text-base leading-relaxed max-w-sm mx-auto lg:mx-0 font-medium">
                Recibe anuncios en tiempo real, coordina tus partidas y participa en sorteos exclusivos con la comunidad.
              </p>
            </div>
            
            <a 
              href="https://discord.gg/hRtF3YVQ7" 
              target="_blank" 
              rel="noreferrer"
              className="w-full sm:w-auto bg-[#5865F2] hover:bg-white hover:text-[#5865F2] text-white px-8 py-4 rounded-xl font-display text-base lg:text-xl uppercase italic skew-x-[-10deg] transition-all flex items-center justify-center gap-2 shadow-lg shadow-[#5865F2]/20 active:scale-95"
            >
              Unirse al Servidor
            </a>
          </div>
        </motion.div>
      </section>

      {/* Tournament Grid */}
      <section id="tournaments-section" className="space-y-8">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-white/10 pb-6 gap-4">
          <h2 className="text-3xl font-display uppercase italic tracking-wider flex items-center gap-3">
            <Trophy className="text-primary" /> Torneos Disponibles
          </h2>
          <button
            onClick={() => setIsTourOpen(true)}
            className="px-4 py-2 rounded-xl bg-white/5 hover:bg-primary/20 hover:text-white text-zinc-300 border border-white/10 hover:border-primary/40 transition-all font-display uppercase italic text-xs tracking-wider flex items-center gap-2 skew-x-[-10deg] cursor-pointer"
          >
            <HelpCircle size={13} className="text-primary" />
            Guía de Plataforma
          </button>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-64 bg-white/5 animate-pulse rounded-2xl" />
            ))}
          </div>
        ) : tournaments.length === 0 ? (
          <div className="text-center py-20 glass rounded-3xl">
            <p className="text-gray-500">No hay torneos activos en este momento.</p>
          </div>
        ) : (
          <div className="space-y-12">
            <motion.div 
              initial="hidden"
              animate="visible"
              variants={{
                hidden: { opacity: 0 },
                visible: {
                  opacity: 1,
                  transition: {
                    staggerChildren: 0.1
                  }
                }
              }}
              className={cn(
                "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6",
                "snap-y snap-mandatory md:snap-none",
                "max-h-[85vh] md:max-h-none overflow-y-auto md:overflow-visible pb-12 px-2 custom-scrollbar"
              )}
            >
              {tournaments.map((tournament, idx) => {
                const isExpanded = expandedId === tournament.id;
                const isRegistered = userRegistrations[tournament.id];
                const isNew = (() => {
                  if (!tournament.createdAt) return false;
                  try {
                    const createdTime = typeof tournament.createdAt.toDate === 'function' 
                      ? tournament.createdAt.toDate().getTime() 
                      : new Date(tournament.createdAt).getTime();
                    return (Date.now() - createdTime) < 24 * 60 * 60 * 1000;
                  } catch (e) {
                    return false;
                  }
                })();
                
                return (
                  <motion.div
                    key={tournament.id}
                    id={idx === 0 ? "sample-tournament-card" : undefined}
                    layout
                    variants={{
                      hidden: { opacity: 0, y: 20, scale: 0.95 },
                      visible: { opacity: 1, y: 0, scale: 1 }
                    }}
                    className={cn(
                      "group relative flex flex-col bg-surface border border-border rounded-2xl overflow-hidden transition-all duration-300 snap-start scroll-mt-2",
                      isExpanded ? "ring-2 ring-primary border-primary/50 shadow-2xl shadow-primary/20" : "hover:border-primary/50 hover:y-[-5px]"
                    )}
                  >
                    <div 
                      className="h-40 bg-zinc-900 relative overflow-hidden cursor-pointer"
                      onClick={() => setExpandedId(isExpanded ? null : tournament.id)}
                    >
                       <img 
                        src={tournament.bannerImage || "https://images.unsplash.com/photo-1542751371-adc38448a05e?q=80&w=1000"} 
                        className={cn(
                          "w-full h-full object-cover transition-all duration-700",
                          isExpanded ? "opacity-100 scale-105" : "opacity-50 group-hover:opacity-100 group-hover:scale-110 group-hover:blur-[3px] group-hover:brightness-110"
                        )}
                        alt={tournament.name} 
                       />
                       {/* Overlay gradient */}
                       <div className="absolute inset-0 bg-gradient-to-t from-zinc-950 via-transparent to-transparent opacity-60" />
                       
                       <div className="absolute top-4 left-4 z-10 flex flex-wrap gap-2">
                         <span className="px-2 py-1 bg-black/80 text-primary text-[10px] font-bold uppercase tracking-widest border border-primary/30 skew-x-[-10deg] shadow-lg shadow-black/50">
                           {tournament.game}
                         </span>
                         {isNew && (
                           <motion.span 
                            initial={{ scale: 0.8, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            className="px-2 py-1 bg-cyan-500 text-white text-[10px] font-bold uppercase tracking-widest border border-cyan-400/30 shadow-[0_0_15px_rgba(6,182,212,0.5)] flex items-center gap-1.5 skew-x-[-10deg]"
                           >
                             <span className="flex h-2 w-2 relative">
                               <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75"></span>
                               <span className="relative inline-flex rounded-full h-2 w-2 bg-white"></span>
                             </span>
                             <Zap size={10} className="fill-current" /> NUEVO
                           </motion.span>
                         )}
                         <span className="px-2 py-1 bg-primary text-black text-[10px] font-bold uppercase tracking-widest border border-primary/30 skew-x-[-10deg] shadow-lg shadow-primary/20">
                           Entry: {tournament.entryFee || 'Gratis'}
                         </span>
                         {isRegistered && (
                           <span className="px-2 py-1 bg-green-600 text-white text-[10px] font-bold uppercase tracking-widest border border-green-400/30 shadow-lg flex items-center gap-1 skew-x-[-10deg]">
                             <CheckCircle2 size={10} /> INSCRITO
                           </span>
                         )}
                         {tournament.status === 'ongoing' ? (
                           <span className="px-2 py-1 bg-red-600 text-white text-[10px] font-bold uppercase tracking-widest border border-red-400/30 animate-pulse flex items-center gap-1">
                             <div className="w-1 h-1 bg-white rounded-full" /> EN VIVO
                           </span>
                         ) : tournament.startDate && (
                           <CountdownTimer 
                             targetDate={new Date(tournament.startDate.toDate())} 
                             className="border-primary/20 shadow-lg"
                           />
                         )}
                       </div>

                       <div className="absolute bottom-4 right-4 z-10">
                          {isExpanded ? <ChevronUp size={20} className="text-primary" /> : <ChevronDown size={20} className="text-gray-400 group-hover:text-primary transition-colors" />}
                       </div>
                    </div>
  
                    <div className="p-6 space-y-4">
                      <div 
                        className="cursor-pointer"
                        onClick={() => setExpandedId(isExpanded ? null : tournament.id)}
                      >
                        <h3 className="text-xl font-bold font-display uppercase tracking-tight group-hover:text-primary transition-colors text-text flex items-center gap-3">
                          {tournament.name}
                          {isNew && (
                            <span className="flex h-2 w-2 rounded-full bg-cyan-500 animate-pulse shadow-[0_0_10px_rgba(6,182,212,0.8)]" title="Torneo Reciente" />
                          )}
                        </h3>
                        
                        <div className="grid grid-cols-2 gap-4 text-xs text-text/50 mt-2">
                          <div className="flex items-center gap-2">
                            <Calendar size={14} className="text-primary" />
                            <span>{new Date(tournament.startDate?.toDate()).toLocaleDateString()}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <Users size={14} className="text-primary" />
                            <span className="flex items-center gap-1.5">
                              {tournament.registeredParticipants || 0}/{tournament.maxParticipants}
                              <span className="flex h-1.5 w-1.5 relative">
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
                                <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-primary"></span>
                              </span>
                            </span>
                          </div>
                        </div>
                      </div>

                      <AnimatePresence>
                        {isExpanded && (
                          <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: "auto", opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            className="overflow-hidden space-y-4 pt-4 border-t border-white/5"
                          >
                            {/* Rules Section */}
                            <div className="space-y-2">
                              <h4 className="text-[10px] uppercase font-black text-primary tracking-widest flex items-center gap-2">
                                <Info size={12} /> Reglas del Torneo
                              </h4>
                              <p className="text-xs text-text/60 leading-relaxed italic bg-surface p-3 rounded-lg border border-border">
                                {tournament.rules || "No se han definido reglas específicas para este torneo aún."}
                              </p>
                            </div>

                            {/* Room Info Section */}
                            {(tournament.roomNumber || tournament.roomPassword) ? (
                              <div className="space-y-2">
                                <h4 className="text-[10px] uppercase font-black text-primary tracking-widest flex items-center gap-2">
                                  <Lock size={12} /> Información de Sala
                                </h4>
                                <div className="grid grid-cols-2 gap-2">
                                  <div className="bg-surface/50 p-2 rounded border border-border flex flex-col">
                                    <span className="text-[8px] text-text/50 uppercase font-bold">Número (ID)</span>
                                    <span className="text-xs font-mono text-text flex items-center gap-1">
                                      <Hash size={10} className="text-primary" />
                                      {tournament.roomNumber || '---'}
                                    </span>
                                  </div>
                                  <div className="bg-surface/50 p-2 rounded border border-border flex flex-col">
                                    <span className="text-[8px] text-text/50 uppercase font-bold">Contraseña</span>
                                    <span className="text-xs font-mono text-text flex items-center gap-1">
                                      <Lock size={10} className="text-primary" />
                                      {tournament.roomPassword ? '********' : '---'}
                                    </span>
                                  </div>
                                </div>
                                <p className="text-[10px] text-text/40 italic">
                                  * Entra al torneo para ver la contraseña completa si estás registrado.
                                </p>
                              </div>
                            ) : (
                              <div className="flex items-center gap-2 text-gray-500 italic text-xs py-2">
                                <Clock size={12} />
                                <span>Detalles de sala disponibles al comenzar.</span>
                              </div>
                            )}

                            {/* Creation Time */}
                            <div className="text-[10px] text-gray-600 flex items-center gap-2">
                              <Calendar size={10} />
                              <span>Creado: {new Date(tournament.createdAt?.toDate()).toLocaleString()}</span>
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
  
                        <div className="flex flex-col gap-2 pt-2">
                          {!isRegistered ? (
                            <button 
                              onClick={() => initiateQuickRegister(tournament)}
                              disabled={registeringId === tournament.id || tournament.status !== 'upcoming' || (tournament.registeredParticipants >= tournament.maxParticipants)}
                              className={cn(
                                "w-full py-3 font-display uppercase skew-x-[-10deg] transition-all flex items-center justify-center gap-2 disabled:opacity-50",
                                registeringId === tournament.id ? "bg-gray-700 text-gray-400 cursor-wait animate-pulse" :
                                tournament.status !== 'upcoming' ? "bg-red-900/20 text-red-500 cursor-not-allowed border border-red-500/20" :
                                (tournament.registeredParticipants >= tournament.maxParticipants) ? "bg-zinc-800 text-gray-500 cursor-not-allowed" :
                                "bg-primary text-black hover:bg-white shadow-lg shadow-primary/20"
                              )}
                            >
                              {registeringId === tournament.id ? (
                                <Loader2 size={16} className="animate-spin text-gray-400" />
                              ) : (
                                <Zap size={16} />
                              )}
                              {registeringId === tournament.id ? 'Inscribiendo...' : 
                               tournament.status !== 'upcoming' ? 'Cerrado' :
                               (tournament.registeredParticipants >= tournament.maxParticipants) ? 'Cupos Llenos' :
                               'Inscribirme Ahora'}
                            </button>
                          ) : (
                            <div className="w-full py-3 flex items-center justify-center gap-2 text-green-500 text-[10px] font-black uppercase tracking-widest bg-green-500/10 border border-green-500/20 skew-x-[-10deg]">
                              <CheckCircle2 size={12} /> Ya estás Inscrito
                            </div>
                          )}
                          
                          <Link 
                            to={`/tournament/${tournament.id}`}
                            className="block w-full text-center py-3 bg-white/5 text-white font-display uppercase skew-x-[-10deg] border border-white/10 hover:bg-white/10 transition-colors"
                          >
                            Ver Detalles {isRegistered && 'del Torneo'}
                          </Link>
                        </div>
                    </div>
                  </motion.div>
                );
              })}
            </motion.div>

            {/* Sentinel for Infinite Scroll */}
            <div id="load-more-sentinel" className="h-4 w-full" />

            {loadingMore && (
              <div className="flex justify-center p-12">
                <motion.div 
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="flex flex-col items-center gap-4"
                >
                  <div className="w-12 h-12 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
                  <p className="text-[10px] text-primary uppercase font-black tracking-[0.3em] animate-pulse">Cargando más campos de batalla...</p>
                </motion.div>
              </div>
            )}
          </div>
        )}
      </section>
      {/* Registration Success Modal */}
      <AnimatePresence>
        {showSuccessModal && successData && (
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
                    {(!successData.tournament.entryFee || 
                      ['gratis', 'free', '0'].includes(successData.tournament.entryFee.toString().toLowerCase().trim())) ? (
                      <>¡Inscripción<br /><span className="text-primary">Completada!</span></>
                    ) : (
                      <>¡Solicitud de <br /><span className="text-primary">Inscripción Enviada!</span></>
                    )}
                  </h2>
                  <p className="text-gray-400 text-xs sm:text-sm max-w-xs mx-auto leading-relaxed">
                    {(!successData.tournament.entryFee || 
                      ['gratis', 'free', '0'].includes(successData.tournament.entryFee.toString().toLowerCase().trim())) ? (
                      `¡Te has inscrito correctamente en "${successData.tournament.name}" de forma directa y gratuita! Tu cupo está asegurado.`
                    ) : (
                      `Tu registro para "${successData.tournament.name}" está pendiente de validación. Envía tu comprobante ahora.`
                    )}
                  </p>
                </div>

                {/* Verification Code Box (Only for paid) */}
                {(!(!successData.tournament.entryFee || 
                   ['gratis', 'free', '0'].includes(successData.tournament.entryFee.toString().toLowerCase().trim()))) && (
                  <div className="bg-white/5 border border-white/10 rounded-xl sm:rounded-2xl p-3 sm:p-4 space-y-1">
                    <span className="text-[9px] sm:text-[10px] uppercase font-black tracking-widest text-gray-400">Tu código de validación</span>
                    <div className="text-xl sm:text-2xl font-mono font-bold tracking-[0.4em] text-white">
                      {successData.code}
                    </div>
                  </div>
                )}

                <div className="grid grid-cols-1 gap-2.5 sm:gap-3">
                  {(!(!successData.tournament.entryFee || 
                     ['gratis', 'free', '0'].includes(successData.tournament.entryFee.toString().toLowerCase().trim()))) ? (
                    <a 
                      href={`https://wa.me/584142943532?text=Hola,%20acabo%20de%20inscribirme%20en%20el%20torneo%20"${successData.tournament.name}".%20Aquí%20adjunto%20mi%20comprobante%20de%20pago.%20Mi%20código%20de%20verificación%20es:%20${successData.code}`}
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
                  
                  {(!(!successData.tournament.entryFee || 
                     ['gratis', 'free', '0'].includes(successData.tournament.entryFee.toString().toLowerCase().trim()))) && (
                    <button 
                      onClick={() => setShowSuccessModal(false)}
                      className="w-full bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white py-2.5 sm:py-3 rounded-xl font-display uppercase italic text-xs transition-all"
                    >
                      Cerrar
                    </button>
                  )}
                </div>
              </div>

              {/* Footer Tip */}
              <div className="bg-primary/5 p-4 text-center">
                <p className="text-[10px] uppercase font-bold text-primary/60 tracking-wider">
                   {(!successData.tournament.entryFee || 
                    ['gratis', 'free', '0'].includes(successData.tournament.entryFee.toString().toLowerCase().trim())) ? (
                     "¡Visualiza los detalles del torneo para ver las llaves o interactuar!"
                   ) : (
                     "Validación manual en proceso (WhatsApp)"
                   )}
                </p>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Popular Games Editor Modal */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-[110] flex items-center justify-center p-3 sm:p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsModalOpen(false)}
              className="absolute inset-0 bg-black/85 backdrop-blur-md"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              className="relative w-full max-w-lg bg-[#0e0e0e] border border-white/10 rounded-[2rem] sm:rounded-[2.5rem] overflow-y-auto max-h-[95vh] sm:max-h-[92vh] scrollbar-thin shadow-[0_20px_50px_rgba(0,0,0,0.6)]"
            >
              {/* Header Decoration */}
              <div className="h-1.5 bg-gradient-to-r from-primary via-indigo-500 to-primary" />
              
              <div className="p-6 sm:p-10 space-y-6">
                <div>
                  <h3 className="text-2xl font-display uppercase italic tracking-tight flex items-center gap-2.5">
                    {editingGame ? (
                      <>
                        <Edit size={22} className="text-primary" />
                        Editar <span className="text-primary">Juego Popular</span>
                      </>
                    ) : (
                      <>
                        <Plus size={22} className="text-primary" />
                        Añadir <span className="text-primary">Juego Popular</span>
                      </>
                    )}
                  </h3>
                  <p className="text-xs text-zinc-500 mt-1 font-sans">
                    Personaliza los títulos, géneros y banners de la galería de juegos de la plataforma.
                  </p>
                </div>

                <div className="space-y-4">
                  {/* Game Name */}
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-sans uppercase tracking-widest text-zinc-400 font-bold block">Nombre del Juego</label>
                    <input 
                      type="text" 
                      value={gameForm.name}
                      onChange={(e) => setGameForm(prev => ({ ...prev, name: e.target.value }))}
                      placeholder="Ej. Free Fire, Blood Strike, etc."
                      className="w-full bg-black/60 border border-white/10 hover:border-white/20 focus:border-primary/50 focus:outline-none rounded-xl px-4 py-3 text-sm text-white transition-all font-sans"
                    />
                  </div>

                  {/* Genre */}
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-sans uppercase tracking-widest text-zinc-400 font-bold block">Género / Tipo</label>
                    <input 
                      type="text" 
                      value={gameForm.genre}
                      onChange={(e) => setGameForm(prev => ({ ...prev, genre: e.target.value }))}
                      placeholder="Ej. Battle Royale, MOBA, Shooter..."
                      className="w-full bg-black/60 border border-white/10 hover:border-white/20 focus:border-primary/50 focus:outline-none rounded-xl px-4 py-3 text-sm text-white transition-all font-sans"
                    />
                  </div>

                  {/* Icon choice */}
                  <div className="space-y-2">
                    <label className="text-[10px] font-sans uppercase tracking-widest text-zinc-400 font-bold block">Ícono Asociado</label>
                    <div className="flex flex-wrap gap-2">
                      {Object.keys(GAME_ICONS).map((iconKey) => {
                        const IconComponent = GAME_ICONS[iconKey];
                        const isSelected = gameForm.iconName === iconKey;
                        return (
                          <button
                            key={iconKey}
                            type="button"
                            onClick={() => setGameForm(prev => ({ ...prev, iconName: iconKey }))}
                            className={cn(
                              "p-2.5 rounded-xl border transition-all flex items-center justify-center gap-1 text-xs font-mono cursor-pointer min-w-[42px] min-h-[42px]",
                              isSelected 
                                ? "bg-primary/20 text-primary border-primary" 
                                : "bg-white/[0.02] text-zinc-400 border-white/5 hover:border-white/10 hover:bg-white/[0.04]"
                            )}
                            title={iconKey}
                          >
                            <IconComponent size={16} />
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Coming Soon status */}
                  <div className="flex items-center justify-between p-3.5 rounded-xl bg-white/[0.02] border border-white/5">
                    <div className="space-y-0.5">
                      <span className="text-xs font-sans font-bold text-zinc-300 block">Estado: Próximamente (Coming Soon)</span>
                      <span className="text-[10px] text-zinc-500 block font-sans">Bloquea el acceso y muestra un candado de espera.</span>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input 
                        type="checkbox" 
                        checked={gameForm.isComingSoon}
                        onChange={(e) => setGameForm(prev => ({ ...prev, isComingSoon: e.target.checked }))}
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-zinc-805 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-zinc-400 after:border-zinc-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary peer-checked:after:bg-black peer-checked:after:border-black"></div>
                    </label>
                  </div>

                  {/* Banner source switcher */}
                  <div className="space-y-3">
                    <label className="text-[10px] font-sans uppercase tracking-widest text-zinc-400 font-bold block">Imagen de Banner</label>
                    <div className="grid grid-cols-2 gap-2 bg-black/60 p-1 rounded-xl border border-white/5">
                      <button
                        type="button"
                        onClick={() => setBannerOption('gallery')}
                        className={cn(
                          "py-2 rounded-lg text-xs font-display uppercase italic tracking-wider transition-all cursor-pointer flex items-center justify-center gap-2",
                          bannerOption === 'gallery' ? "bg-primary text-black font-bold" : "text-zinc-400 hover:text-white"
                        )}
                      >
                        <Upload size={13} /> Desde Galería
                      </button>
                      <button
                        type="button"
                        onClick={() => setBannerOption('url')}
                        className={cn(
                          "py-2 rounded-lg text-xs font-display uppercase italic tracking-wider transition-all cursor-pointer flex items-center justify-center gap-2",
                          bannerOption === 'url' ? "bg-primary text-black font-bold" : "text-zinc-400 hover:text-white"
                        )}
                      >
                        <Image size={13} /> Pegar Link/URL
                      </button>
                    </div>

                    {bannerOption === 'gallery' ? (
                      <div className="space-y-2">
                        <div className="border border-dashed border-white/10 hover:border-primary/40 rounded-xl p-6 bg-black/40 hover:bg-black/60 flex flex-col items-center justify-center gap-2.5 transition-all text-center relative cursor-pointer group">
                          <input 
                            type="file" 
                            accept="image/*"
                            onChange={handleFileChange}
                            disabled={isCompressing}
                            className="absolute inset-0 opacity-0 cursor-pointer z-10"
                          />
                          {isCompressing ? (
                            <div className="flex flex-col items-center gap-2">
                              <Loader2 className="animate-spin text-primary" size={24} />
                              <span className="text-xs font-sans text-primary">Optimizando imagen...</span>
                            </div>
                          ) : (
                            <>
                              <div className="p-3 bg-white/5 rounded-full border border-white/5 group-hover:border-primary/20 text-zinc-400 group-hover:text-primary transition-all">
                                <Upload size={20} />
                              </div>
                              <div>
                                <span className="text-xs font-bold text-zinc-200 block">Haz clic para buscar en tu galería</span>
                                <span className="text-[9px] text-zinc-500 block mt-1 font-sans">Soporta PNG, JPG y JPEG (Se auto-optimiza al instante)</span>
                              </div>
                            </>
                          )}
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-1.5">
                        <input 
                          type="text" 
                          value={gameForm.image}
                          onChange={(e) => setGameForm(prev => ({ ...prev, image: e.target.value }))}
                          placeholder="https://images.unsplash.com/photo-..."
                          className="w-full bg-black/60 border border-white/10 hover:border-white/20 focus:border-primary/50 focus:outline-none rounded-xl px-4 py-3 text-xs text-white transition-all font-mono"
                        />
                      </div>
                    )}

                    {/* Banner Image Preview */}
                    {gameForm.image && (
                      <div className="space-y-1.5">
                        <span className="text-[9px] font-sans uppercase tracking-widest text-zinc-500 font-bold block">Vista previa del banner</span>
                        <div className="h-28 rounded-xl border border-white/10 overflow-hidden relative bg-black">
                          <img 
                            src={gameForm.image} 
                            alt="Preview" 
                            className="w-full h-full object-cover animate-fade-in" 
                            referrerPolicy="no-referrer"
                            onError={(e) => {
                              (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1542751371-adc38448a05e?q=80&w=2070&auto=format&fit=crop';
                            }}
                          />
                          <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent flex flex-col justify-end p-2.5">
                            <span className="text-[8px] font-bold text-primary uppercase tracking-widest">{gameForm.genre || 'Categoría'}</span>
                            <span className="text-sm font-display uppercase tracking-tight text-white font-extrabold flex items-center gap-1.5">
                              {gameForm.name || 'Nombre del Juego'}
                            </span>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Form Buttons */}
                <div className="flex flex-col sm:flex-row gap-2 pt-2">
                  <button
                    type="button"
                    onClick={handleSaveGame}
                    disabled={isCompressing}
                    className="flex-grow bg-primary hover:bg-white text-black font-display uppercase italic tracking-wider py-3.5 px-6 rounded-xl text-xs sm:text-sm font-black transition-all max-sm:order-1 skew-x-[-12deg] cursor-pointer"
                  >
                    Guardar Cambios
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className="bg-white/5 hover:bg-white/10 text-zinc-400 hover:text-white font-display uppercase italic tracking-wider py-3.5 px-6 rounded-xl text-xs sm:text-sm transition-all max-sm:order-3 skew-x-[-12deg] cursor-pointer"
                  >
                    Cancelar
                  </button>
                  {editingGame && (
                    <button
                      type="button"
                      onClick={handleDeleteGame}
                      className="bg-red-950/20 hover:bg-red-650 text-red-500 hover:text-white border border-red-500/20 hover:border-red-400 font-display uppercase italic py-3.5 px-4 rounded-xl text-xs transition-all max-sm:order-2 skew-x-[-12deg] cursor-pointer flex items-center justify-center"
                    >
                      <Trash2 size={15} />
                    </button>
                  )}
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Brief Tour Overlay */}
      <TourOverlay isOpen={isTourOpen} onClose={() => setIsTourOpen(false)} />
    </div>
  );
};

export default HomePage;
