import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { db } from '../lib/firebase';
import { doc, getDoc, updateDoc, arrayUnion, collection, addDoc, serverTimestamp } from 'firebase/firestore';
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
  const [bracketSubTab, setBracketSubTab] = useState<'standings' | 'brackets'>('standings');
  const [matches, setMatches] = useState<any[]>([]);
  const [expandedMatchId, setExpandedMatchId] = useState<string | null>(null);
  
  // Registration form
  const [mainPlayers, setMainPlayers] = useState([
    { name: '', platform: 'Mobile' },
    { name: '', platform: 'Mobile' },
    { name: '', platform: 'Mobile' },
    { name: '', platform: 'Mobile' }
  ]);
  const [subPlayers, setSubPlayers] = useState([
    { name: '', platform: 'Mobile' },
    { name: '', platform: 'Mobile' }
  ]);
  const [platform, setPlatform] = useState('Mobile');

  // Combined creation & registration state
  const [registeringWithNewClan, setRegisteringWithNewClan] = useState(false);
  const [newClanName, setNewClanName] = useState('');
  const [newClanTag, setNewClanTag] = useState('');
  const [newClanDescription, setNewClanDescription] = useState('');

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
      if (!user) {
          toast.error('Debes iniciar sesión para inscribirte.');
          return;
      }
      
      if (mainPlayers.some(p => !p.name.trim())) {
          toast.error('Debes especificar los 4 participantes titulares.');
          return;
      }

      let activeClanId = profile?.clanId;
      let activeClanName = profile?.clanName;
      let activeClanTag = profile?.clanTag;

      const toastId = toast.loading('Procesando inscripción...');
      
      try {
          // If they are registering while creating a new clan
          if (registeringWithNewClan) {
              if (!newClanName || !newClanTag) {
                  toast.error('Nombre y Tag del clan son obligatorios.', { id: toastId });
                  return;
              }

              // Create Clan exactly like in ClansPage.tsx
              const clanDocRef = await addDoc(collection(db, 'clans'), {
                name: newClanName,
                tag: newClanTag.toUpperCase(),
                description: newClanDescription,
                leaderId: user.uid,
                leaderName: profile?.displayName || profile?.username || user.displayName || 'Líder',
                members: [{
                   uid: user.uid,
                   displayName: profile?.displayName || profile?.username || user.displayName || 'Jugador',
                   role: 'Líder',
                   joinedAt: new Date().toISOString()
                }],
                stats: { wins: 0, points: 0, tournamentsPlayed: 0 },
                createdAt: serverTimestamp()
              });

              activeClanId = clanDocRef.id;
              activeClanName = newClanName;
              activeClanTag = newClanTag.toUpperCase();

              // Update user's profile so they belong to this clan now
              await updateDoc(doc(db, 'users', user.uid), {
                clanId: activeClanId,
                clanName: activeClanName,
                clanTag: activeClanTag
              });
          }

          if (!activeClanId) {
              toast.error('Debes pertenecer a un clan para inscribirte o activar la creación conjunta.', { id: toastId });
              return;
          }
          
          const registrationData = {
              clanId: activeClanId,
              clanName: activeClanName,
              clanTag: activeClanTag,
              mainPlayers,
              subPlayers: subPlayers.filter(p => p.name.trim()),
              platform,
              registeredAt: new Date().toISOString()
          };
          
          // Register in league
          await updateDoc(doc(db, 'leagues', id!), {
              registeredClans: arrayUnion(registrationData)
          });
          
          toast.success(
              registeringWithNewClan 
                ? '¡Clan creado e inscrito exitosamente en la liga!' 
                : '¡Clan inscrito exitosamente en la liga!',
              { id: toastId }
          );
          
          setShowRegistration(false);
          setRegisteringWithNewClan(false);
          setNewClanName('');
          setNewClanTag('');
          setNewClanDescription('');
          setMainPlayers([
            { name: '', platform: 'Mobile' },
            { name: '', platform: 'Mobile' },
            { name: '', platform: 'Mobile' },
            { name: '', platform: 'Mobile' }
          ]);
          setSubPlayers([
            { name: '', platform: 'Mobile' },
            { name: '', platform: 'Mobile' }
          ]);
          
          // Refresh
          const docSnap = await getDoc(doc(db, 'leagues', id!));
          if (docSnap.exists()) setLeague({ id: docSnap.id, ...docSnap.data() });
      } catch (err) {
          console.error(err);
          toast.error('Error al procesar la inscripción.', { id: toastId });
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

  const getLeagueStandings = () => {
    if (!league || !league.registeredClans) return [];

    const standings = league.registeredClans.map((clan: any) => {
      let matchesPlayed = 0;
      let wins = 0;
      let losses = 0;
      let roundsWon = 0;
      let roundsLost = 0;
      let maxRoundReached = -1;
      let eliminated = false;

      // Scan matches
      matches.forEach((m: any) => {
        const isP1 = m.player1Id === clan.clanId;
        const isP2 = m.player2Id === clan.clanId;

        if (isP1 || isP2) {
          if (m.status === 'completed') {
            matchesPlayed++;
            if (isP1) {
              roundsWon += Number(m.score1 || 0);
              roundsLost += Number(m.score2 || 0);
              if (m.winnerId === clan.clanId) {
                wins++;
              } else {
                losses++;
                eliminated = true;
              }
            } else {
              roundsWon += Number(m.score2 || 0);
              roundsLost += Number(m.score1 || 0);
              if (m.winnerId === clan.clanId) {
                wins++;
              } else {
                losses++;
                eliminated = true;
              }
            }
            maxRoundReached = Math.max(maxRoundReached, m.round);
          } else if (m.status === 'bye') {
            wins++;
            maxRoundReached = Math.max(maxRoundReached, m.round);
          }
        }
      });

      // Calculate points based on max round reached matching the points configuration
      let points = 5; // Base participation points
      let statusLabel = "Inscrito";
      let statusColor = "text-green-500 border-green-500/20 bg-green-500/5";

      if (matches.length > 0) {
        // Find total rounds
        const totalRounds = [...new Set(matches.map((m: any) => m.round as number))].length;
        
        const isWinnerOfFinal = matches.some((m: any) => m.round === totalRounds - 1 && m.status === 'completed' && m.winnerId === clan.clanId);
        const lostInFinal = matches.some((m: any) => m.round === totalRounds - 1 && m.status === 'completed' && m.winnerId !== clan.clanId && (m.player1Id === clan.clanId || m.player2Id === clan.clanId));
        const lostInSemis = matches.some((m: any) => m.round === totalRounds - 2 && m.status === 'completed' && m.winnerId !== clan.clanId && (m.player1Id === clan.clanId || m.player2Id === clan.clanId)) && totalRounds > 1;
        const lostInCuartos = matches.some((m: any) => m.round === totalRounds - 3 && m.status === 'completed' && m.winnerId !== clan.clanId && (m.player1Id === clan.clanId || m.player2Id === clan.clanId)) && totalRounds > 2;
        const lostInOctavos = matches.some((m: any) => m.round === totalRounds - 4 && m.status === 'completed' && m.winnerId !== clan.clanId && (m.player1Id === clan.clanId || m.player2Id === clan.clanId)) && totalRounds > 3;

        if (isWinnerOfFinal) {
          points = 500;
          statusLabel = "Campeón 🏆";
          statusColor = "text-primary border-primary/30 bg-primary/10 font-bold";
        } else if (lostInFinal) {
          points = 250;
          statusLabel = "Subcampeón 🥈";
          statusColor = "text-gray-300 border-gray-400/30 bg-gray-400/10 font-bold";
        } else if (lostInSemis) {
          points = 100;
          statusLabel = "Semifinalista";
          statusColor = "text-amber-500 border-amber-500/20 bg-amber-500/5";
        } else if (lostInCuartos) {
          points = 50;
          statusLabel = "Cuartos de Final";
          statusColor = "text-blue-400 border-blue-400/20 bg-blue-400/5";
        } else if (lostInOctavos) {
          points = 25;
          statusLabel = "Octavos de Final";
          statusColor = "text-purple-400 border-purple-400/20 bg-purple-400/5";
        } else if (!eliminated && league.status === 'in_progress') {
          statusLabel = "En Juego ⚔️";
          statusColor = "text-yellow-500 border-yellow-500/20 bg-yellow-500/5 animate-pulse font-bold";
        } else {
          statusLabel = "Eliminado";
          statusColor = "text-red-500 border-red-500/20 bg-red-500/5";
        }
      } else {
        statusLabel = "Inscrito";
        statusColor = "text-green-500 border-green-500/20 bg-green-500/5";
      }

      return {
        clanId: clan.clanId,
        clanName: clan.clanName,
        clanTag: clan.clanTag,
        platform: clan.platform,
        matchesPlayed,
        wins,
        losses,
        roundsWon,
        roundsLost,
        roundDiff: roundsWon - roundsLost,
        points,
        statusLabel,
        statusColor,
        eliminated
      };
    });

    // Sort standings:
    // 1st: Points (descending)
    // 2nd: Wins (descending)
    // 3rd: Round Diff (descending)
    // 4th: Clan Name (ascending)
    return standings.sort((a: any, b: any) => {
      if (b.points !== a.points) return b.points - a.points;
      if (b.wins !== a.wins) return b.wins - a.wins;
      if (b.roundDiff !== a.roundDiff) return b.roundDiff - a.roundDiff;
      return a.clanName.localeCompare(b.clanName);
    });
  };

  const renderLeagueStandingsTable = () => {
    const standings = getLeagueStandings();

    if (!standings || standings.length === 0) {
      return (
        <div className="text-center py-20 bg-white/5 rounded-3xl border border-dashed border-white/10">
          <Trophy size={48} className="mx-auto text-gray-700 mb-4 animate-pulse" />
          <p className="text-gray-500 uppercase tracking-widest text-sm font-bold">No hay datos de clasificación aún</p>
          <p className="text-xs text-gray-600 mt-2 uppercase">Inscribe clanes e inicia el torneo para ver la tabla de posiciones.</p>
        </div>
      );
    }

    // Top 3 spotlight cards
    const podiumClans = standings.slice(0, 3);

    return (
      <div className="space-y-8">
        {/* Podium cards */}
        {podiumClans.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {podiumClans.map((clan: any, idx: number) => {
              const placeColors = [
                { border: 'border-yellow-500/40 bg-yellow-500/5', text: 'text-yellow-400', badge: '🥇 1er Lugar' },
                { border: 'border-slate-400/40 bg-slate-400/5', text: 'text-slate-300', badge: '🥈 2do Lugar' },
                { border: 'border-amber-700/40 bg-amber-700/5', text: 'text-amber-600', badge: '🥉 3er Lugar' }
              ];
              const style = placeColors[idx] || { border: 'border-white/5 bg-white/5', text: 'text-white', badge: `${idx + 1}º Lugar` };

              return (
                <div key={clan.clanId} className={cn("border-2 rounded-2xl p-4 flex items-center justify-between relative overflow-hidden", style.border)}>
                  <div className="space-y-1">
                    <span className={cn("text-[9px] font-black uppercase tracking-widest", style.text)}>{style.badge}</span>
                    <h4 className="text-lg font-display uppercase font-bold truncate max-w-[150px]">
                      {clan.clanName}
                    </h4>
                    <p className="text-xs text-gray-400 font-bold font-mono">[{clan.clanTag}] • {clan.points} PTS</p>
                  </div>
                  <div className="text-right">
                    <div className="text-2xl font-display font-black italic text-primary">{clan.wins} - {clan.losses}</div>
                    <div className="text-[8px] text-gray-500 font-bold uppercase tracking-wider">Victorias / Derrotas</div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Responsive Table */}
        <div className="overflow-x-auto border border-white/10 rounded-2xl bg-zinc-950/20">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-white/5 border-b border-white/10 text-gray-400 uppercase tracking-wider text-[10px] font-black font-mono">
                <th className="py-4 px-4 text-center w-12">#</th>
                <th className="py-4 px-4">Clan</th>
                <th className="py-4 px-4 text-center">PJ</th>
                <th className="py-4 px-4 text-center">PG</th>
                <th className="py-4 px-4 text-center">PP</th>
                <th className="py-4 px-4 text-center font-mono">R. Fav</th>
                <th className="py-4 px-4 text-center font-mono">R. Con</th>
                <th className="py-4 px-4 text-center">DF</th>
                <th className="py-4 px-4 text-center">Puntos</th>
                <th className="py-4 px-4 text-right pr-6">Estado</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {standings.map((clan: any, idx: number) => {
                return (
                  <tr key={clan.clanId} className="hover:bg-white/5 transition-colors text-sm">
                    <td className="py-4 px-4 text-center font-display font-black">
                      {idx + 1 === 1 ? <span className="text-yellow-400">🥇</span> :
                       idx + 1 === 2 ? <span className="text-slate-300">🥈</span> :
                       idx + 1 === 3 ? <span className="text-amber-600">🥉</span> :
                       <span className="text-gray-500">{idx + 1}</span>}
                    </td>
                    <td className="py-4 px-4 font-bold">
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-mono bg-white/5 text-primary px-1.5 py-0.5 rounded">
                          [{clan.clanTag}]
                        </span>
                        <span className="truncate max-w-[120px] sm:max-w-[180px]" title={clan.clanName}>
                          {clan.clanName}
                        </span>
                      </div>
                    </td>
                    <td className="py-4 px-4 text-center font-mono font-bold text-gray-400">{clan.matchesPlayed}</td>
                    <td className="py-4 px-4 text-center font-mono font-bold text-green-500">{clan.wins}</td>
                    <td className="py-4 px-4 text-center font-mono font-bold text-red-500">{clan.losses}</td>
                    <td className="py-4 px-4 text-center font-mono text-gray-400 text-xs">{clan.roundsWon}</td>
                    <td className="py-4 px-4 text-center font-mono text-gray-400 text-xs">{clan.roundsLost}</td>
                    <td className={cn(
                      "py-4 px-4 text-center font-mono text-xs font-bold",
                      clan.roundDiff > 0 ? "text-green-500" : clan.roundDiff < 0 ? "text-red-500" : "text-gray-500"
                    )}>
                      {clan.roundDiff > 0 ? `+${clan.roundDiff}` : clan.roundDiff}
                    </td>
                    <td className="py-4 px-4 text-center font-display font-black italic text-primary text-base">{clan.points}</td>
                    <td className="py-4 px-4 text-right pr-6">
                      <span className={cn("text-[9px] font-black uppercase tracking-wider px-2 py-1 rounded-md border", clan.statusColor)}>
                        {clan.statusLabel}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
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

                 <div className="glass p-6 rounded-3xl border border-white/10">
                     <h2 className="text-2xl font-display uppercase text-primary mb-6">Clanes Inscritos</h2>
                     {league.registeredClans && league.registeredClans.length > 0 ? (
                         <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                             {league.registeredClans.map((clan: any, idx: number) => {
                                 const normalizedMain = (clan.mainPlayers || []).map((p: any) => 
                                     typeof p === 'string' ? { name: p, platform: clan.platform || 'Mobile' } : p
                                  );
                                  const normalizedSubs = (clan.subPlayers || []).map((p: any) => 
                                      typeof p === 'string' ? { name: p, platform: clan.platform || 'Mobile' } : p
                                  );

                                  return (
                                      <div key={idx} className="bg-white/5 border border-white/10 p-5 rounded-2xl flex flex-col justify-between gap-4">
                                          <div>
                                              <div className="flex items-center justify-between">
                                                  <div className="flex items-center gap-2">
                                                     <span className="text-[10px] font-mono font-bold text-primary bg-primary/10 px-2 py-0.5 rounded">[{clan.clanTag}]</span>
                                                     <span className="font-bold text-lg">{clan.clanName}</span>
                                                  </div>
                                                  <span className="text-[9px] font-mono bg-white/5 text-gray-400 px-2 py-1 rounded border border-white/5">
                                                      {clan.platform || 'Híbrido'}
                                                  </span>
                                              </div>
                                              
                                              <div className="mt-4 space-y-3">
                                                  <div className="text-[10px] text-primary/80 font-black uppercase tracking-wider font-mono">
                                                      Titulares
                                                  </div>
                                                  <div className="grid grid-cols-2 gap-2">
                                                      {normalizedMain.map((p: any, pIdx: number) => (
                                                          <div key={`m-${pIdx}`} className="bg-black/30 border border-white/5 rounded-xl px-3 py-2 flex items-center justify-between gap-2">
                                                              <span className="text-xs text-gray-300 truncate max-w-[100px]" title={p.name}>{p.name}</span>
                                                              {p.platform === 'Mobile' ? (
                                                                  <Smartphone size={12} className="text-gray-500 shrink-0" title="Mobile" />
                                                              ) : (
                                                                  <Monitor size={12} className="text-gray-500 shrink-0" title="PC" />
                                                              )}
                                                          </div>
                                                      ))}
                                                  </div>

                                                  {normalizedSubs.length > 0 && (
                                                      <>
                                                          <div className="text-[10px] text-gray-500 font-black uppercase tracking-wider font-mono pt-1">
                                                              Suplentes
                                                          </div>
                                                          <div className="grid grid-cols-2 gap-2">
                                                              {normalizedSubs.map((p: any, pIdx: number) => (
                                                                  <div key={`s-${pIdx}`} className="bg-black/30 border border-white/5 rounded-xl px-3 py-2 flex items-center justify-between gap-2">
                                                                      <span className="text-xs text-gray-400 truncate max-w-[100px]" title={p.name}>{p.name}</span>
                                                                      {p.platform === 'Mobile' ? (
                                                                          <Smartphone size={12} className="text-gray-500 shrink-0" title="Mobile" />
                                                                      ) : (
                                                                          <Monitor size={12} className="text-gray-500 shrink-0" title="PC" />
                                                                      )}
                                                                  </div>
                                                              ))}
                                                          </div>
                                                      </>
                                                  )}
                                              </div>
                                          </div>
                                      </div>
                                  );
                              })}
                         </div>
                     ) : (
                         <div className="text-center py-10 text-gray-500">
                             Nadie se ha inscrito aún. ¡Sé el primero!
                         </div>
                     )}
                 </div>
               </>
             ) : (
                <div className="glass p-6 rounded-3xl border border-white/10 space-y-6 overflow-hidden">
                  <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-white/5 pb-4">
                    <div className="space-y-1">
                      <h2 className="text-2xl font-display uppercase text-primary tracking-tight">
                        {bracketSubTab === 'standings' ? 'Tabla de Clasificación' : 'Árbol de Brackets'}
                      </h2>
                      <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider font-mono">
                        {bracketSubTab === 'standings' ? 'Ranking de rendimiento en tiempo real' : 'Brackets del torneo eliminatorio'}
                      </p>
                    </div>
                    
                    <div className="flex bg-black/50 p-1.5 rounded-xl border border-white/10 self-stretch sm:self-auto">
                      <button
                        onClick={() => setBracketSubTab('standings')}
                        className={cn(
                          "flex-1 sm:flex-initial px-4 py-2 rounded-lg text-xs font-black uppercase tracking-wider transition-all",
                          bracketSubTab === 'standings' ? "bg-primary text-black shadow-lg shadow-primary/15 font-bold" : "text-gray-400 hover:text-white"
                        )}
                      >
                        Clasificación
                      </button>
                      <button
                        onClick={() => setBracketSubTab('brackets')}
                        className={cn(
                          "flex-1 sm:flex-initial px-4 py-2 rounded-lg text-xs font-black uppercase tracking-wider transition-all",
                          bracketSubTab === 'brackets' ? "bg-primary text-black shadow-lg shadow-primary/15 font-bold" : "text-gray-400 hover:text-white"
                        )}
                      >
                        Brackets
                      </button>
                    </div>
                  </div>

                  {bracketSubTab === 'standings' ? (
                    renderLeagueStandingsTable()
                  ) : (
                    <div>
                      {isAdmin && matches && matches.length > 0 && (
                        <div className="flex justify-end mb-4">
                          <button 
                            onClick={handleGenerateLeagueBracket}
                            className="bg-primary/20 text-primary border border-primary/30 text-[10px] font-black uppercase py-2 px-4 rounded-xl hover:bg-primary hover:text-black transition-colors"
                          >
                            Regenerar Brackets
                          </button>
                        </div>
                      )}
                      {renderLeagueBracket()}
                    </div>
                  )}
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
                             <div className="space-y-4">
                                 {profile?.clanId ? (
                                     <button 
                                         onClick={() => {
                                             setRegisteringWithNewClan(false);
                                             setShowRegistration(true);
                                         }}
                                         className="w-full bg-primary text-black font-display font-bold uppercase italic py-4 rounded-xl skew-x-[-5deg] hover:bg-white transition-colors animate-pulse"
                                     >
                                         Inscribir a [{profile.clanTag}]
                                     </button>
                                 ) : (
                                     <div className="space-y-3 text-center">
                                         <Users className="mx-auto text-amber-500 mb-2" size={32} />
                                         <p className="text-xs text-gray-400 mb-4">No tienes un clan registrado aún. ¡Puedes crear tu clan y registrar a tus participantes todo en un solo paso!</p>
                                         <button 
                                             onClick={() => {
                                                 setRegisteringWithNewClan(true);
                                                 setShowRegistration(true);
                                             }}
                                             className="w-full bg-primary text-black font-display font-bold uppercase italic py-3 rounded-xl hover:bg-white transition-colors"
                                         >
                                             Crear Clan e Inscribirse
                                         </button>
                                         <div className="text-[10px] text-gray-500">o si prefieres unirte a uno existente:</div>
                                         <Link to="/clans" className="block text-primary hover:underline text-xs font-bold uppercase tracking-wider">
                                             Ver Directorio de Clanes
                                         </Link>
                                     </div>
                                 )}
                             </div>
                         ) : (
                             <form onSubmit={handleRegister} className="space-y-4">
                                 {registeringWithNewClan && (
                                     <div className="space-y-3 p-4 bg-primary/5 border border-primary/25 rounded-2xl">
                                         <span className="text-[10px] font-black text-primary uppercase tracking-wider block">Nuevo Clan</span>
                                         <div className="space-y-2">
                                             <input 
                                                 type="text" 
                                                 placeholder="Nombre de tu nuevo Clan"
                                                 required
                                                 className="w-full bg-black/40 border border-white/10 rounded-xl p-3 outline-none focus:border-primary text-sm"
                                                 value={newClanName}
                                                 onChange={e => setNewClanName(e.target.value)}
                                             />
                                             <input 
                                                 type="text" 
                                                 placeholder="Tag del Clan (Ej: VNZ, max 4 letras)"
                                                 required
                                                 maxLength={4}
                                                 className="w-full bg-black/40 border border-white/10 rounded-xl p-3 outline-none focus:border-primary text-sm uppercase"
                                                 value={newClanTag}
                                                 onChange={e => setNewClanTag(e.target.value.toUpperCase())}
                                             />
                                             <textarea 
                                                 placeholder="Descripción breve (opcional)"
                                                 className="w-full bg-black/40 border border-white/10 rounded-xl p-3 outline-none focus:border-primary text-sm resize-none h-16"
                                                 value={newClanDescription}
                                                 onChange={e => setNewClanDescription(e.target.value)}
                                             />
                                         </div>
                                     </div>
                                 )}

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
                                     {mainPlayers.map((player: any, idx) => (
                                         <div key={`main-${idx}`} className="flex gap-2">
                                             <input 
                                                 type="text"
                                                 placeholder={`Titular ${idx + 1} (Nickname/ID)`}
                                                 required
                                                 className="flex-1 bg-black/40 border border-white/10 rounded-xl p-3 outline-none focus:border-primary text-sm"
                                                 value={player.name}
                                                 onChange={e => {
                                                     const newPlayers = [...mainPlayers];
                                                     newPlayers[idx] = { ...newPlayers[idx], name: e.target.value };
                                                     setMainPlayers(newPlayers);
                                                 }}
                                             />
                                             <select 
                                                 className="bg-black/40 border border-white/10 rounded-xl px-3 outline-none focus:border-primary text-xs font-bold w-28 text-gray-300"
                                                 value={player.platform}
                                                 onChange={e => {
                                                     const newPlayers = [...mainPlayers];
                                                     newPlayers[idx] = { ...newPlayers[idx], platform: e.target.value };
                                                     setMainPlayers(newPlayers);
                                                 }}
                                             >
                                                 <option value="Mobile">📱 Mobile</option>
                                                 <option value="PC">💻 PC</option>
                                             </select>
                                         </div>
                                     ))}
                                 </div>
                                 
                                 <div className="space-y-2">
                                     <label className="text-xs font-black uppercase text-gray-500">Suplentes (Hasta 2 Opcionales)</label>
                                     {subPlayers.map((player: any, idx) => (
                                         <div key={`sub-${idx}`} className="flex gap-2">
                                             <input 
                                                 type="text"
                                                 placeholder={`Suplente ${idx + 1} (Opcional)`}
                                                 className="flex-1 bg-black/40 border border-white/10 rounded-xl p-3 outline-none focus:border-primary text-sm"
                                                 value={player.name}
                                                 onChange={e => {
                                                     const newPlayers = [...subPlayers];
                                                     newPlayers[idx] = { ...newPlayers[idx], name: e.target.value };
                                                     setSubPlayers(newPlayers);
                                                 }}
                                             />
                                             <select 
                                                 className="bg-black/40 border border-white/10 rounded-xl px-3 outline-none focus:border-primary text-xs font-bold w-28 text-gray-300"
                                                 value={player.platform}
                                                 onChange={e => {
                                                     const newPlayers = [...subPlayers];
                                                     newPlayers[idx] = { ...newPlayers[idx], platform: e.target.value };
                                                     setSubPlayers(newPlayers);
                                                 }}
                                             >
                                                 <option value="Mobile">📱 Mobile</option>
                                                 <option value="PC">💻 PC</option>
                                             </select>
                                         </div>
                                     ))}
                                 </div>
                                 
                                 <div className="pt-4 flex gap-2">
                                     <button 
                                         type="button" 
                                         onClick={() => {
                                             setShowRegistration(false);
                                             setRegisteringWithNewClan(false);
                                         }} 
                                         className="w-1/3 bg-white/10 text-white font-bold py-3 rounded-xl hover:bg-white/20"
                                     >
                                         Cancelar
                                     </button>
                                     <button 
                                         type="submit" 
                                         className="w-2/3 bg-primary text-black font-display font-bold uppercase italic py-3 rounded-xl hover:bg-white transition-colors"
                                     >
                                         {registeringWithNewClan ? 'Crear e Inscribir' : 'Confirmar'}
                                     </button>
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
