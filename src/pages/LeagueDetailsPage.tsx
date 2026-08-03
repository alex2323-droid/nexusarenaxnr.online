import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { db } from '../lib/firebase';
import { doc, getDoc, updateDoc, arrayUnion } from 'firebase/firestore';
import { useAuth } from '../contexts/AuthContext';
import { Shield, Trophy, Users, Monitor, Smartphone, ChevronRight, AlertCircle, CheckCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import toast from 'react-hot-toast';
import { cn } from '../lib/utils';

const LeagueDetailsPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const { user, profile } = useAuth();
  const [league, setLeague] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [showRegistration, setShowRegistration] = useState(false);
  
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

  if (loading) return <div className="min-h-[60vh] flex items-center justify-center">Cargando...</div>;
  if (!league) return <div className="min-h-[60vh] flex items-center justify-center">Liga no encontrada.</div>;

  const isClanRegistered = league.registeredClans?.some((c: any) => c.clanId === profile?.clanId);
  const clanIsFull = (league.registeredClans?.length || 0) >= (league.maxClans || 16);

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

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-8">
             <div className="glass p-6 rounded-3xl border border-white/10">
                 <h2 className="text-2xl font-display uppercase text-primary mb-6">Sistema de Puntos y Clasificación</h2>
                 <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                     <div className="bg-white/5 border border-white/10 p-4 rounded-2xl text-center">
                         <p className="text-[10px] font-black uppercase text-gray-500 tracking-widest mb-1">Octavos</p>
                         <p className="text-2xl font-display italic text-white">+50 pts</p>
                     </div>
                     <div className="bg-white/5 border border-white/10 p-4 rounded-2xl text-center">
                         <p className="text-[10px] font-black uppercase text-gray-500 tracking-widest mb-1">Cuartos</p>
                         <p className="text-2xl font-display italic text-white">+100 pts</p>
                     </div>
                     <div className="bg-white/5 border border-white/10 p-4 rounded-2xl text-center">
                         <p className="text-[10px] font-black uppercase text-gray-500 tracking-widest mb-1">Semifinal</p>
                         <p className="text-2xl font-display italic text-amber-500">+250 pts</p>
                     </div>
                     <div className="bg-white/5 border border-primary/30 p-4 rounded-2xl text-center shadow-[0_0_15px_rgba(var(--primary-rgb),0.1)]">
                         <p className="text-[10px] font-black uppercase text-primary tracking-widest mb-1">Campeón</p>
                         <p className="text-2xl font-display italic text-primary">+500 pts</p>
                     </div>
                 </div>
                 <p className="text-sm text-gray-400 mt-6 leading-relaxed">
                     El sistema de clasificación arranca desde Octavos de Final (16 Clanes). 
                     Cada ronda superada otorga puntos acumulables para el Ranking Global de Clanes. 
                     Las partidas se juegan al mejor de 3 (BO3).
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
