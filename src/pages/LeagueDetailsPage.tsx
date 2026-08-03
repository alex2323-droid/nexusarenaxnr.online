import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { db } from '../lib/firebase';
import { doc, getDoc, updateDoc, arrayUnion } from 'firebase/firestore';
import { useAuth } from '../contexts/AuthContext';
import { 
  Shield, 
  Trophy, 
  Users, 
  Monitor, 
  Smartphone, 
  ChevronRight, 
  AlertCircle, 
  CheckCircle, 
  ChevronUp, 
  ChevronDown, 
  Award, 
  Activity, 
  Zap 
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import toast from 'react-hot-toast';
import { cn } from '../lib/utils';
import { leagueBracketService } from '../services/db';

const LeagueDetailsPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const { user, profile, isAdmin } = useAuth();
  const [league, setLeague] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [showRegistration, setShowRegistration] = useState(false);
  const [activeTab, setActiveTab] = useState<'info' | 'bracket'>('info');
  const [matches, setMatches] = useState<any[]>([]);
  const [expandedMatchId, setExpandedMatchId] = useState<string | null>(null);
  
  // Registration form
  const [mainPlayers, setMainPlayers] = useState(['', '', '', '']);
  const [subPlayers, setSubPlayers] = useState(['', '']);
  const [platform, setPlatform] = useState('Mobile');

  useEffect(() => {
    const fetchLeague = async () => {
      if (!id) return;
      try {
        const docRef = doc(db, 'leagues', id);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          setLeague({ id: docSnap.id, ...docSnap.data() });
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchLeague();
  }, [id]);

  useEffect(() => {
    if (!id) return;
    const unsubscribe = leagueBracketService.listenMatches(id, (newMatches) => {
      setMatches(newMatches);
    });
    return () => unsubscribe();
  }, [id]);

  const handleRegister = async (e: React.FormEvent) => {
      e.preventDefault();
      if (!user || !profile?.clanId) {
          toast.error('Debes pertenecer a un clan para inscribirte.');
          return;
      }
      if (mainPlayers.some(p => !p)) {
          toast.error('Debes especificar los 4 participantes titulares.');
          return;
      }
      
      const registrationData = {
          clanId: profile.clanId,
          clanName: profile.clanName,
          clanTag: profile.clanTag,
          mainPlayers,
          subPlayers: subPlayers.filter(p => p),
          platform,
          registeredAt: new Date().toISOString()
      };
      
      try {
          await updateDoc(doc(db, 'leagues', id!), {
              registeredClans: arrayUnion(registrationData)
          });
          toast.success('¡Clan inscrito exitosamente en la liga!');
          setShowRegistration(false);
          // Refresh
          const docSnap = await getDoc(doc(db, 'leagues', id!));
          if (docSnap.exists()) setLeague({ id: docSnap.id, ...docSnap.data() });
      } catch (err) {
          console.error(err);
          toast.error('Error al inscribir el clan.');
      }
  };

  const handleGenerateLeagueBracket = async () => {
      if (!id) return;
      const toastId = toast.loading('Generando llaves de la liga...');
      try {
          await leagueBracketService.generateBracket(id);
          toast.success('¡Llaves de la liga generadas exitosamente!', { id: toastId });
      } catch (err: any) {
          console.error(err);
          toast.error(err.message || 'Error al generar los brackets.', { id: toastId });
      }
  };

  const handleUpdateLeagueMatchScore = async (matchId: string, winnerId: string, score1: number, score2: number) => {
      if (!id) return;
      try {
          await leagueBracketService.updateMatch(id, matchId, {
              winnerId,
              score1,
              score2,
              status: 'completed'
          });
          toast.success('Resultado actualizado correctamente');
      } catch (err) {
          console.error(err);
          toast.error('Error al actualizar el resultado');
      }
  };

  const renderLeagueBracket = () => {
    if (!matches || matches.length === 0) {
      return (
        <div className="text-center py-20 bg-white/5 rounded-3xl border border-dashed border-white/10">
          <Trophy size={48} className="mx-auto text-gray-700 mb-4 animate-bounce" />
          <p className="text-gray-500 uppercase tracking-widest text-sm font-bold">No hay brackets de liga generados aún</p>
          {isAdmin && (
            <div className="mt-6 flex flex-col items-center gap-3">
              {(league.registeredClans?.length || 0) < 2 ? (
                <div className="flex items-center gap-2 bg-yellow-500/10 border border-yellow-500/30 text-yellow-500 px-4 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider max-w-md mx-auto">
                  <AlertCircle size={14} />
                  Se necesitan al menos 2 clanes inscritos para generar los brackets (Inscritos: {league.registeredClans?.length || 0})
                </div>
              ) : (
                <button 
                  onClick={handleGenerateLeagueBracket}
                  className="bg-primary text-black px-8 py-3 rounded-xl font-display uppercase italic tracking-tighter skew-x-[-10deg] hover:bg-white transition-all font-bold"
                >
                  Generar Brackets de la Liga
                </button>
              )}
            </div>
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
                        {/* Connector logic */}
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

                          {/* Clan 1 Slot */}
                          <div className={cn(
                            "flex justify-between items-center p-2.5 rounded-xl transition-all",
                            p1Winner ? "bg-primary/10 text-primary ring-1 ring-primary/20" : 
                            isCompleted ? "text-gray-600 opacity-60" : "text-gray-300"
                          )}>
                            <div className="flex items-center gap-3 overflow-hidden">
                              <div className="relative">
                                <div className={cn(
                                  "w-8 h-8 rounded-lg bg-zinc-800 flex items-center justify-center font-display font-black text-xs border border-white/5 uppercase",
                                  p1Winner ? "border-primary/50 text-primary" : "text-gray-400"
                                )}>
                                  {match.player1Tag ? match.player1Tag.slice(0, 3) : 'TBD'}
                                </div>
                                {p1Winner && (
                                  <div className="absolute -top-1 -left-1 bg-primary rounded-full p-0.5 shadow-lg">
                                    <CheckCircle size={10} className="text-black" />
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

                          {/* Clan 2 Slot */}
                          <div className={cn(
                            "flex justify-between items-center p-2.5 rounded-xl transition-all",
                            p2Winner ? "bg-primary/10 text-primary ring-1 ring-primary/20" : 
                            isCompleted ? "text-gray-600 opacity-60" : "text-gray-300"
                          )}>
                            <div className="flex items-center gap-3 overflow-hidden">
                              <div className="relative">
                                <div className={cn(
                                  "w-8 h-8 rounded-lg bg-zinc-800 flex items-center justify-center font-display font-black text-xs border border-white/5 uppercase",
                                  p2Winner ? "border-primary/50 text-primary" : "text-gray-400"
                                )}>
                                  {match.player2Tag ? match.player2Tag.slice(0, 3) : 'TBD'}
                                </div>
                                {p2Winner && (
                                  <div className="absolute -top-1 -left-1 bg-primary rounded-full p-0.5 shadow-lg">
                                    <CheckCircle size={10} className="text-black" />
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

                          {/* Expanded Details / Score updates */}
                          <AnimatePresence>
                            {isExpanded && (
                              <motion.div
                                initial={{ height: 0, opacity: 0 }}
                                animate={{ height: 'auto', opacity: 1 }}
                                exit={{ height: 0, opacity: 0 }}
                                className="overflow-hidden bg-black/30 rounded-xl p-3 mt-4 space-y-3"
                                onClick={(e) => e.stopPropagation()} // Prevent closing card when editing
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
                                  </div>
                                ) : match.status === 'ongoing' ? (
                                  <div className="space-y-2">
                                    <div className="flex items-center gap-2 text-[10px] font-black uppercase text-yellow-500 tracking-widest animate-pulse">
                                      <Activity size={12} /> Partida en Curso
                                    </div>
                                  </div>
                                ) : isBye ? (
                                  <div className="space-y-1">
                                    <div className="text-[10px] font-black text-yellow-500 uppercase">Avanza por BYE</div>
                                    <p className="text-[8px] text-gray-400 font-bold uppercase">Este clan avanza automáticamente a la siguiente ronda.</p>
                                  </div>
                                ) : (
                                  <div className="space-y-2">
                                    <div className="text-[10px] font-black text-gray-500 uppercase">En Espera</div>
                                    <p className="text-[8px] text-gray-500 font-bold uppercase">Pendiente de completar rondas previas o inicio.</p>
                                  </div>
                                )}

                                {/* Admin score edit block */}
                                {isAdmin && !isCompleted && !isBye && match.player1Id && match.player2Id && (
                                  <div className="border-t border-white/5 pt-3 space-y-3">
                                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest text-center">Registrar Marcador</p>
                                    
                                    <div className="flex justify-between items-center bg-black/50 p-2 rounded-xl border border-white/5">
                                      {/* Clan 1 Score Adjustment */}
                                      <div className="flex flex-col items-center gap-1">
                                        <span className="text-[8px] font-black truncate max-w-[80px] text-gray-400">{match.player1Name}</span>
                                        <div className="flex items-center gap-1.5">
                                          <button 
                                            onClick={() => handleUpdateLeagueMatchScore(match.id, match.player1Id, 2, 0)}
                                            className="bg-primary hover:bg-white text-black text-[9px] font-bold px-2.5 py-1 rounded transition-colors"
                                            title="Ganador 2-0"
                                          >
                                            2 - 0
                                          </button>
                                          <button 
                                            onClick={() => handleUpdateLeagueMatchScore(match.id, match.player1Id, 2, 1)}
                                            className="bg-primary hover:bg-white text-black text-[9px] font-bold px-2.5 py-1 rounded transition-colors"
                                            title="Ganador 2-1"
                                          >
                                            2 - 1
                                          </button>
                                        </div>
                                      </div>

                                      <span className="text-gray-500 font-black text-xs">VS</span>

                                      {/* Clan 2 Score Adjustment */}
                                      <div className="flex flex-col items-center gap-1">
                                        <span className="text-[8px] font-black truncate max-w-[80px] text-gray-400">{match.player2Name}</span>
                                        <div className="flex items-center gap-1.5">
                                          <button 
                                            onClick={() => handleUpdateLeagueMatchScore(match.id, match.player2Id, 0, 2)}
                                            className="bg-primary hover:bg-white text-black text-[9px] font-bold px-2.5 py-1 rounded transition-colors"
                                            title="Ganador 0-2"
                                          >
                                            0 - 2
                                          </button>
                                          <button 
                                            onClick={() => handleUpdateLeagueMatchScore(match.id, match.player2Id, 1, 2)}
                                            className="bg-primary hover:bg-white text-black text-[9px] font-bold px-2.5 py-1 rounded transition-colors"
                                            title="Ganador 1-2"
                                          >
                                            1 - 2
                                          </button>
                                        </div>
                                      </div>
                                    </div>
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

  if (loading) return <div className="min-h-[60vh] flex items-center justify-center">Cargando...</div>;
  if (!league) return <div className="min-h-[60vh] flex items-center justify-center">Liga no encontrada.</div>;

  const isClanRegistered = league.registeredClans?.some((c: any) => c.clanId === profile?.clanId);
  const clanIsFull = (league.registeredClans?.length || 0) >= (league.maxClans || 16);

  const maxClansValue = league?.maxClans || 16;

  const getLeagueClassificationDescription = (maxClanes: number) => {
    let startRoundText = "";
    if (maxClanes >= 32) {
      startRoundText = `Dieciseisavos de Final (${maxClanes} Clanes)`;
    } else if (maxClanes >= 16) {
      startRoundText = `Octavos de Final (${maxClanes} Clanes)`;
    } else if (maxClanes >= 8) {
      startRoundText = `Cuartos de Final (${maxClanes} Clanes)`;
    } else if (maxClanes >= 4) {
      startRoundText = `Semifinales (${maxClanes} Clanes)`;
    } else if (maxClanes >= 2) {
      startRoundText = `la Gran Final (${maxClanes} Clanes)`;
    } else {
      startRoundText = `Fase de Eliminatorias (${maxClanes} Clanes)`;
    }
    
    return `El sistema de clasificación arranca desde ${startRoundText}. Cada ronda superada otorga puntos acumulables para el Ranking Global de Clanes. Las partidas se juegan al mejor de 3 (BO3).`;
  };

  const getPointsConfig = (maxClanes: number) => {
    const allPoints = [
      { name: '16avos', points: '+25 pts', limit: 32, isChamp: false, colorClass: 'text-white' },
      { name: 'Octavos', points: '+50 pts', limit: 16, isChamp: false, colorClass: 'text-white' },
      { name: 'Cuartos', points: '+100 pts', limit: 8, isChamp: false, colorClass: 'text-white' },
      { name: 'Semifinal', points: '+250 pts', limit: 4, isChamp: false, colorClass: 'text-amber-500' },
      { name: 'Campeón', points: '+500 pts', limit: 2, isChamp: true, colorClass: 'text-primary' }
    ];

    return allPoints.filter(round => maxClanes >= round.limit);
  };

  const dynamicRounds = getPointsConfig(maxClansValue);

  return (
    <div className="max-w-7xl mx-auto space-y-8 pb-20 px-4">
      <div className="glass p-8 rounded-3xl border border-white/10 relative overflow-hidden">
         <div className="absolute top-0 right-0 w-64 h-64 bg-primary/10 rounded-full blur-3xl -z-10" />
         
         <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
            <div>
                <span className={cn(
                    "text-[10px] uppercase font-black tracking-widest px-2 py-1 rounded-full border mb-4 inline-block",
                    league.status === 'open' ? "bg-green-500/10 text-green-500 border-green-500/20" :
                    league.status === 'in_progress' ? "bg-amber-500/10 text-amber-500 border-amber-500/20" :
                    "bg-gray-500/10 text-gray-400 border-gray-500/20"
                )}>
                    {league.status === 'open' ? 'Inscripciones Abiertas' : league.status === 'in_progress' ? 'En Curso' : 'Finalizada'}
                </span>
                <h1 className="text-4xl md:text-6xl font-display uppercase italic tracking-tighter text-white">
                  {league.name}
                </h1>
                <p className="text-lg text-gray-400 font-bold mt-2 flex items-center gap-2">
                    <Shield className="text-primary" size={20} />
                    Liga de Clanes • {league.game}
                </p>
            </div>
            
            <div className="flex flex-col items-end gap-2">
                <div className="flex items-center gap-2 text-2xl font-display italic text-yellow-400">
                    <Trophy size={28} />
                    {league.prize}
                </div>
                <div className="text-xs text-gray-500 font-bold uppercase tracking-widest">
                    Clanes: {league.registeredClans?.length || 0} / {league.maxClans || 16}
                </div>
            </div>
         </div>
      </div>

      {/* Tabs Selector */}
      <div className="flex border-b border-white/10 gap-8">
        <button
          onClick={() => setActiveTab('info')}
          className={cn(
            "pb-4 font-display uppercase italic text-lg tracking-wider border-b-2 transition-all relative font-bold",
            activeTab === 'info' ? "border-primary text-primary" : "border-transparent text-gray-500 hover:text-white"
          )}
        >
          Información de Liga
        </button>
        <button
          onClick={() => setActiveTab('bracket')}
          className={cn(
            "pb-4 font-display uppercase italic text-lg tracking-wider border-b-2 transition-all relative font-bold flex items-center gap-2",
            activeTab === 'bracket' ? "border-primary text-primary" : "border-transparent text-gray-500 hover:text-white"
          )}
        >
          <Trophy size={16} />
          Clasificación / Brackets
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-8">
             {activeTab === 'info' ? (
               <>
                 <div className="glass p-6 rounded-3xl border border-white/10">
                     <h2 className="text-2xl font-display uppercase text-primary mb-6">Sistema de Puntos y Clasificación</h2>
                     <div className={cn(
                         "grid gap-4",
                         dynamicRounds.length >= 5 ? "grid-cols-2 md:grid-cols-5" :
                         dynamicRounds.length === 4 ? "grid-cols-2 md:grid-cols-4" :
                         dynamicRounds.length === 3 ? "grid-cols-2 md:grid-cols-3" :
                         "grid-cols-2"
                     )}>
                         {dynamicRounds.map((round) => (
                             <div 
                                 key={round.name} 
                                 className={cn(
                                     "bg-white/5 p-4 rounded-2xl text-center",
                                     round.isChamp ? "border border-primary/30 shadow-[0_0_15px_rgba(var(--primary-rgb),0.1)]" : "border border-white/10"
                                 )}
                             >
                                 <p className={cn(
                                     "text-[10px] font-black uppercase tracking-widest mb-1",
                                     round.isChamp ? "text-primary" : "text-gray-500"
                                 )}>
                                     {round.name}
                                 </p>
                                 <p className={cn("text-2xl font-display italic", round.colorClass)}>
                                     {round.points}
                                 </p>
                             </div>
                         ))}
                     </div>
                     <p className="text-sm text-gray-400 mt-6 leading-relaxed">
                         {getLeagueClassificationDescription(maxClansValue)}
                     </p>
                 </div>

                 <div className="glass p-6 rounded-3xl border border-white/10 overflow-x-auto">
                     <h2 className="text-2xl font-display uppercase text-primary mb-6">Clanes Inscritos</h2>
                     {league.registeredClans && league.registeredClans.length > 0 ? (
                         <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                             {league.registeredClans.map((clan: any, idx: number) => (
                                 <div key={idx} className="bg-white/5 border border-white/10 p-4 rounded-xl flex justify-between items-center">
                                     <div>
                                         <div className="flex items-center gap-2">
                                            <span className="text-[10px] font-mono font-bold text-primary bg-primary/10 px-2 py-0.5 rounded">[{clan.clanTag}]</span>
                                            <span className="font-bold">{clan.clanName}</span>
                                         </div>
                                         <div className="text-[10px] text-gray-500 mt-1 uppercase tracking-widest flex items-center gap-2">
                                            <span>4 Titulares</span>
                                            <span>•</span>
                                            <span>{clan.subPlayers?.length || 0} Suplentes</span>
                                         </div>
                                     </div>
                                     {clan.platform === 'Mobile' ? <Smartphone size={18} className="text-gray-400" /> : <Monitor size={18} className="text-gray-400" />}
                                 </div>
                             ))}
                         </div>
                     ) : (
                         <div className="text-center py-10 text-gray-500">
                             Nadie se ha inscrito aún. ¡Sé el primero!
                         </div>
                     )}
                 </div>
               </>
             ) : (
               <div className="glass p-6 rounded-3xl border border-white/10 overflow-hidden">
                 <div className="flex justify-between items-center mb-6">
                   <h2 className="text-2xl font-display uppercase text-primary">Brackets de Eliminatoria</h2>
                   {isAdmin && matches && matches.length > 0 && (
                     <button 
                       onClick={handleGenerateLeagueBracket}
                       className="bg-primary/20 text-primary border border-primary/30 text-[10px] font-black uppercase py-2 px-4 rounded-xl hover:bg-primary hover:text-black transition-colors"
                     >
                       Regenerar Brackets
                     </button>
                   )}
                 </div>
                 {renderLeagueBracket()}
               </div>
             )}
          </div>
          
          <div className="space-y-6">
             <div className="glass p-6 rounded-3xl border border-white/10">
                 <h2 className="text-xl font-display uppercase mb-4">Inscripción</h2>
                 
                 {!user ? (
                     <div className="text-center py-6">
                         <AlertCircle className="mx-auto text-amber-500 mb-2" size={32} />
                         <p className="text-sm text-gray-400 mb-4">Debes iniciar sesión para inscribir a tu clan.</p>
                         <Link to="/login" className="bg-primary text-black font-bold px-6 py-2 rounded-xl text-sm">Iniciar Sesión</Link>
                     </div>
                 ) : !profile?.clanId ? (
                     <div className="text-center py-6">
                         <Users className="mx-auto text-amber-500 mb-2" size={32} />
                         <p className="text-sm text-gray-400 mb-4">Debes pertenecer a un clan para participar en Ligas.</p>
                         <Link to="/clans" className="bg-primary text-black font-bold px-6 py-2 rounded-xl text-sm">Buscar o Crear Clan</Link>
                     </div>
                 ) : isClanRegistered ? (
                     <div className="text-center py-6 border border-green-500/20 bg-green-500/5 rounded-2xl">
                         <CheckCircle className="mx-auto text-green-500 mb-2" size={32} />
                         <p className="text-green-400 font-bold">¡Tu clan ya está inscrito!</p>
                     </div>
                 ) : league.status !== 'open' || clanIsFull ? (
                     <div className="text-center py-6">
                         <AlertCircle className="mx-auto text-red-500 mb-2" size={32} />
                         <p className="text-red-400 font-bold">Las inscripciones están cerradas o la liga está llena.</p>
                     </div>
                 ) : (
                     <>
                        {!showRegistration ? (
                            <button 
                                onClick={() => setShowRegistration(true)}
                                className="w-full bg-primary text-black font-display font-bold uppercase italic py-4 rounded-xl skew-x-[-5deg] hover:bg-white transition-colors"
                            >
                                Inscribir a [{profile.clanTag}]
                            </button>
                        ) : (
                            <form onSubmit={handleRegister} className="space-y-4">
                                <div className="space-y-2">
                                    <label className="text-xs font-black uppercase text-gray-500">Plataforma</label>
                                    <select 
                                        className="w-full bg-black/40 border border-white/10 rounded-xl p-3 outline-none focus:border-primary text-sm font-bold"
                                        value={platform}
                                        onChange={e => setPlatform(e.target.value)}
                                    >
                                        <option value="Mobile">Mobile</option>
                                        <option value="PC">PC</option>
                                    </select>
                                </div>
                                
                                <div className="space-y-2">
                                    <label className="text-xs font-black uppercase text-primary">Titulares (4 Requeridos)</label>
                                    {mainPlayers.map((player, idx) => (
                                        <input 
                                            key={`main-${idx}`}
                                            type="text"
                                            placeholder={`Titular ${idx + 1} (Nickname/ID)`}
                                            required
                                            className="w-full bg-black/40 border border-white/10 rounded-xl p-3 outline-none focus:border-primary text-sm"
                                            value={player}
                                            onChange={e => {
                                                const newPlayers = [...mainPlayers];
                                                newPlayers[idx] = e.target.value;
                                                setMainPlayers(newPlayers);
                                            }}
                                        />
                                    ))}
                                </div>
                                
                                <div className="space-y-2">
                                    <label className="text-xs font-black uppercase text-gray-500">Suplentes (Hasta 2 Opcionales)</label>
                                    {subPlayers.map((player, idx) => (
                                        <input 
                                            key={`sub-${idx}`}
                                            type="text"
                                            placeholder={`Suplente ${idx + 1} (Opcional)`}
                                            className="w-full bg-black/40 border border-white/10 rounded-xl p-3 outline-none focus:border-primary text-sm"
                                            value={player}
                                            onChange={e => {
                                                const newPlayers = [...subPlayers];
                                                newPlayers[idx] = e.target.value;
                                                setSubPlayers(newPlayers);
                                            }}
                                        />
                                    ))}
                                </div>
                                
                                <div className="pt-4 flex gap-2">
                                    <button type="button" onClick={() => setShowRegistration(false)} className="w-1/3 bg-white/10 text-white font-bold py-3 rounded-xl hover:bg-white/20">Cancelar</button>
                                    <button type="submit" className="w-2/3 bg-primary text-black font-display font-bold uppercase italic py-3 rounded-xl hover:bg-white transition-colors">Confirmar</button>
                                </div>
                            </form>
                        )}
                     </>
                 )}
             </div>
          </div>
      </div>
    </div>
  );
};

export default LeagueDetailsPage;
