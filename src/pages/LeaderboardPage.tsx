import React, { useEffect, useState } from 'react';
import { db } from '../lib/firebase';
import { collection, query, orderBy, limit, getDocs } from 'firebase/firestore';
import { Trophy, Medal, Crown, Star } from 'lucide-react';
import { motion } from 'motion/react';
import { cn } from '../lib/utils';

const LeaderboardPage: React.FC = () => {
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchLeaderboard = async () => {
      // Sort by points for more granular ranking
      const q = query(collection(db, 'users'), orderBy('stats.points', 'desc'), limit(10));
      const snapshot = await getDocs(q);
      setUsers(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      setLoading(false);
    };

    fetchLeaderboard();
  }, []);

  const getRankIcon = (index: number) => {
    switch(index) {
      case 0: return <Crown className="text-yellow-400" size={24} />;
      case 1: return <Medal className="text-gray-300" size={24} />;
      case 2: return <Medal className="text-amber-600" size={24} />;
      default: return <span className="text-gray-500 font-mono font-bold text-xl">{index + 1}</span>;
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <div className="text-center space-y-4">
        <h1 className="text-5xl md:text-7xl font-display uppercase italic tracking-tighter">Ranking <span className="text-primary">Regional</span></h1>
        <p className="text-gray-500 uppercase tracking-widest text-xs font-bold font-mono">Los 10 mejores jugadores de la plataforma</p>
      </div>

      <div className="glass rounded-3xl border border-white/10 overflow-hidden">
        <div className="grid grid-cols-12 px-8 py-4 bg-white/5 border-b border-white/10 text-[10px] uppercase font-bold text-gray-500 tracking-widest">
          <div className="col-span-1">Rango</div>
          <div className="col-span-7">Jugador</div>
          <div className="col-span-1 text-center">Torneos</div>
          <div className="col-span-1 text-center">Victorias</div>
          <div className="col-span-2 text-right">Puntos</div>
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
          {loading ? (
            [1, 2, 3, 4, 5].map(i => (
              <div key={i} className="h-20 bg-white/5 animate-pulse mx-4 my-2 rounded-xl" />
            ))
          ) : users.length === 0 ? (
            <div className="text-center py-20 text-gray-500">Aún no hay estadísticas registradas.</div>
          ) : (
            users.map((user, idx) => (
              <motion.div
                key={user.id}
                variants={{
                  hidden: { opacity: 0, y: 10 },
                  visible: { opacity: 1, y: 0 }
                }}
                whileHover={{ backgroundColor: "rgba(255, 255, 255, 0.03)", x: 4 }}
                className={cn(
                  "grid grid-cols-12 px-8 py-6 items-center transition-colors",
                  idx === 0 && "bg-primary/5"
                )}
              >
                <div className="col-span-1 flex justify-center">
                  {getRankIcon(idx)}
                </div>
                <div className="col-span-7 flex items-center gap-4">
                   <img 
                    src={user.photoURL || `https://api.dicebear.com/7.x/avataaars/svg?seed=${user.id}`} 
                    className="w-10 h-10 rounded-xl bg-zinc-800 border border-white/10" 
                    alt={user.displayName} 
                   />
                   <div>
                     <p className="font-bold uppercase tracking-tight text-lg">{user.displayName}</p>
                     <p className="text-[10px] text-gray-500 uppercase font-bold tracking-widest">{user.platform}</p>
                   </div>
                </div>
                <div className="col-span-1 text-center font-display italic text-gray-400 text-lg">
                  {user.stats?.tournaments || 0}
                </div>
                <div className="col-span-1 text-center font-display italic text-white text-lg">
                  {user.stats?.wins || 0}
                </div>
                <div className="col-span-2 text-right font-display italic text-primary text-3xl">
                  {user.stats?.points || 0}
                </div>
              </motion.div>
            ))
          )}
        </motion.div>
      </div>
    </div>
  );
};

export default LeaderboardPage;
