import React, { useState, useEffect } from 'react';
import { db } from '../lib/firebase';
import { collection, query, getDocs, addDoc, serverTimestamp, doc, updateDoc, arrayUnion } from 'firebase/firestore';
import { useAuth } from '../contexts/AuthContext';
import { Shield, Trophy, Users, Monitor, Smartphone, ChevronRight } from 'lucide-react';
import { motion } from 'motion/react';
import toast from 'react-hot-toast';
import { cn } from '../lib/utils';
import { Link } from 'react-router-dom';

const LeaguesPage: React.FC = () => {
  const { user, profile } = useAuth();
  const [leagues, setLeagues] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchLeagues = async () => {
    try {
      const q = query(collection(db, 'leagues'));
      const snapshot = await getDocs(q);
      setLeagues(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLeagues();
  }, []);

  return (
    <div className="max-w-7xl mx-auto space-y-8 pb-20">
      <div className="text-center space-y-4">
        <h1 className="text-5xl md:text-7xl font-display uppercase italic tracking-tighter">
          Nexus <span className="text-primary">Ligas</span>
        </h1>
        <p className="text-gray-500 uppercase tracking-widest text-xs font-bold font-mono">
          Competiciones por Clanes • Sistema de Puntos • Octavos a Finales
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {loading ? (
            <div className="col-span-full text-center py-20 text-gray-500">Cargando ligas...</div>
        ) : leagues.length === 0 ? (
            <div className="col-span-full text-center py-20 text-gray-500">
                <Shield size={48} className="mx-auto mb-4 text-white/10" />
                No hay ligas activas en este momento. Vuelve más tarde.
            </div>
        ) : (
            leagues.map(league => (
                <Link to={`/league/${league.id}`} key={league.id} className="glass p-6 rounded-3xl border border-white/10 hover:border-primary/50 transition-colors flex flex-col relative overflow-hidden group">
                     <div className="flex justify-between items-start mb-4 relative z-10">
                        <div>
                            <span className={cn(
                                "text-[10px] uppercase font-black tracking-widest px-2 py-1 rounded-full border",
                                league.status === 'open' ? "bg-green-500/10 text-green-500 border-green-500/20" :
                                league.status === 'in_progress' ? "bg-amber-500/10 text-amber-500 border-amber-500/20" :
                                "bg-gray-500/10 text-gray-400 border-gray-500/20"
                            )}>
                                {league.status === 'open' ? 'Inscripciones Abiertas' : league.status === 'in_progress' ? 'En Curso' : 'Finalizada'}
                            </span>
                            <h2 className="text-2xl font-display uppercase italic mt-2">{league.name}</h2>
                            <p className="text-sm text-gray-400 font-bold">{league.game}</p>
                        </div>
                        <div className="text-right">
                           <Trophy className="text-primary mb-1 ml-auto" size={24} />
                           <p className="text-sm font-bold text-white">{league.prize}</p>
                        </div>
                     </div>
                     
                     <div className="grid grid-cols-2 gap-2 mt-4 relative z-10">
                         <div className="bg-white/5 border border-white/10 p-3 rounded-xl flex flex-col items-center justify-center gap-1">
                             <Users size={16} className="text-gray-400" />
                             <span className="text-xs font-bold">{league.registeredClans?.length || 0} / {league.maxClans || 16} Clanes</span>
                         </div>
                         <div className="bg-white/5 border border-white/10 p-3 rounded-xl flex flex-col items-center justify-center gap-1">
                             {league.platform === 'Mobile' ? <Smartphone size={16} className="text-gray-400" /> : <Monitor size={16} className="text-gray-400" />}
                             <span className="text-xs font-bold">{league.platform}</span>
                         </div>
                     </div>
                     
                     <div className="mt-6 flex items-center justify-between text-primary group-hover:text-white transition-colors relative z-10">
                         <span className="text-xs font-black uppercase tracking-widest">Ver Detalles y Brackets</span>
                         <ChevronRight size={16} />
                     </div>
                </Link>
            ))
        )}
      </div>
    </div>
  );
};

export default LeaguesPage;
