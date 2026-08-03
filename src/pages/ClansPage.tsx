import React, { useState, useEffect } from 'react';
import { db } from '../lib/firebase';
import { collection, query, getDocs, addDoc, serverTimestamp, doc, updateDoc, arrayUnion } from 'firebase/firestore';
import { useAuth } from '../contexts/AuthContext';
import { Users, Shield, Plus, Crown, Search } from 'lucide-react';
import { motion } from 'motion/react';
import toast from 'react-hot-toast';
import { cn } from '../lib/utils';
import ClansPerformanceChart from '../components/ClansPerformanceChart';

const ClansPage: React.FC = () => {
  const { user, profile } = useAuth();
  const [clans, setClans] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [newClan, setNewClan] = useState({ name: '', tag: '', description: '' });

  const fetchClans = async () => {
    try {
      const q = query(collection(db, 'clans'));
      const snapshot = await getDocs(q);
      setClans(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchClans();
  }, []);

  const handleCreateClan = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    if (!newClan.name || !newClan.tag) {
      toast.error('Nombre y Tag son requeridos');
      return;
    }
    
    // Check if user is already in a clan (prevent creating multiple)
    if (profile?.clanId) {
       toast.error('Ya perteneces a un clan.');
       return;
    }

    try {
      const docRef = await addDoc(collection(db, 'clans'), {
        name: newClan.name,
        tag: newClan.tag.toUpperCase(),
        description: newClan.description,
        leaderId: user.uid,
        leaderName: profile?.displayName || user.displayName,
        members: [{
           uid: user.uid,
           displayName: profile?.displayName || user.displayName,
           role: 'Líder',
           joinedAt: new Date().toISOString()
        }],
        stats: { wins: 0, points: 0, tournamentsPlayed: 0 },
        createdAt: serverTimestamp()
      });

      // Update user's profile
      await updateDoc(doc(db, 'users', user.uid), {
        clanId: docRef.id,
        clanName: newClan.name,
        clanTag: newClan.tag.toUpperCase()
      });

      toast.success('¡Clan creado exitosamente!');
      setShowCreate(false);
      fetchClans();
    } catch (error) {
      console.error(error);
      toast.error('Error al crear el clan');
    }
  };

  const handleJoinClan = async (clanId: string, clanName: string, clanTag: string) => {
      if (!user) {
          toast.error('Debes iniciar sesión');
          return;
      }
      if (profile?.clanId) {
          toast.error('Ya perteneces a un clan.');
          return;
      }
      
      try {
          await updateDoc(doc(db, 'clans', clanId), {
              members: arrayUnion({
                  uid: user.uid,
                  displayName: profile?.displayName || user.displayName,
                  role: 'Miembro',
                  joinedAt: new Date().toISOString()
              })
          });
          
          await updateDoc(doc(db, 'users', user.uid), {
             clanId: clanId,
             clanName: clanName,
             clanTag: clanTag
          });
          
          toast.success(`Te uniste al clan ${clanName}`);
          fetchClans();
      } catch (e) {
          toast.error('Error al unirse al clan');
      }
  };

  return (
    <div className="max-w-7xl mx-auto space-y-8 pb-20">
      <div className="flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="text-center md:text-left space-y-2">
          <h1 className="text-4xl md:text-6xl font-display uppercase italic tracking-tighter">
            Directorio de <span className="text-primary">Clanes</span>
          </h1>
          <p className="text-gray-500 uppercase tracking-widest text-xs font-bold font-mono">
            Únete a un clan o crea el tuyo para competir en Ligas
          </p>
        </div>
        {user && !profile?.clanId && (
            <button 
                onClick={() => setShowCreate(true)}
                className="bg-primary text-black px-6 py-3 font-display uppercase italic text-sm md:text-base skew-x-[-10deg] hover:bg-white transition-colors flex items-center gap-2 font-bold"
            >
                <Plus size={18} className="skew-x-[10deg]" />
                <span className="skew-x-[10deg]">Crear Clan</span>
            </button>
        )}
      </div>

      {showCreate && (
          <motion.form 
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            onSubmit={handleCreateClan} 
            className="glass p-6 rounded-2xl border border-primary/30 space-y-4 max-w-2xl mx-auto"
          >
              <h2 className="text-2xl font-display uppercase text-primary">Crear Nuevo Clan</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <input 
                      type="text" 
                      placeholder="Nombre del Clan"
                      required
                      className="bg-black/30 border border-white/10 rounded-xl p-3 outline-none focus:border-primary w-full"
                      value={newClan.name}
                      onChange={e => setNewClan({...newClan, name: e.target.value})}
                  />
                  <input 
                      type="text" 
                      placeholder="Tag (Ej: NAVI, FAZE) - Max 4 letras"
                      required
                      maxLength={4}
                      className="bg-black/30 border border-white/10 rounded-xl p-3 outline-none focus:border-primary w-full uppercase"
                      value={newClan.tag}
                      onChange={e => setNewClan({...newClan, tag: e.target.value})}
                  />
              </div>
              <textarea 
                  placeholder="Descripción de tu clan..."
                  className="bg-black/30 border border-white/10 rounded-xl p-3 outline-none focus:border-primary w-full h-24"
                  value={newClan.description}
                  onChange={e => setNewClan({...newClan, description: e.target.value})}
              />
              <div className="flex justify-end gap-2">
                  <button type="button" onClick={() => setShowCreate(false)} className="px-4 py-2 text-gray-400 hover:text-white">Cancelar</button>
                  <button type="submit" className="bg-primary text-black font-bold px-6 py-2 rounded-xl">Crear</button>
              </div>
          </motion.form>
      )}

      {/* Visual analytics chart for clans participation & success rate */}
      {!loading && clans.length > 0 && (
          <ClansPerformanceChart clans={clans} />
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {loading ? (
            <div className="col-span-full text-center py-20 text-gray-500">Cargando clanes...</div>
        ) : clans.length === 0 ? (
            <div className="col-span-full text-center py-20 text-gray-500">Aún no hay clanes creados.</div>
        ) : (
            clans.map(clan => (
                <div key={clan.id} className="glass p-6 rounded-3xl border border-white/10 hover:border-primary/50 transition-colors flex flex-col h-full relative overflow-hidden group">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-bl-full -z-10 group-hover:bg-primary/20 transition-colors" />
                    
                    <div className="flex items-start justify-between mb-4">
                        <div>
                            <div className="flex items-center gap-2">
                                <span className="bg-primary/20 text-primary px-2 py-1 rounded text-xs font-bold font-mono tracking-widest border border-primary/30">
                                    [{clan.tag}]
                                </span>
                                <h3 className="text-xl font-display uppercase font-bold truncate max-w-[150px]" title={clan.name}>{clan.name}</h3>
                            </div>
                            <p className="text-xs text-gray-500 mt-1 flex items-center gap-1">
                                <Crown size={12} className="text-yellow-500" /> Líder: {clan.leaderName}
                            </p>
                        </div>
                        <div className="text-right">
                            <p className="text-2xl font-display italic text-primary">{clan.stats?.points || 0}</p>
                            <p className="text-[10px] uppercase text-gray-500 font-bold tracking-widest">Puntos</p>
                        </div>
                    </div>
                    
                    <p className="text-sm text-gray-400 mb-6 flex-grow">{clan.description || 'Sin descripción'}</p>
                    
                    <div className="flex items-center justify-between mt-auto">
                        <div className="flex items-center gap-1 text-sm text-gray-300 bg-white/5 px-3 py-1.5 rounded-lg border border-white/5">
                            <Users size={16} />
                            <span className="font-bold">{clan.members?.length || 0} Miembros</span>
                        </div>
                        {user && !profile?.clanId && (
                            <button 
                                onClick={() => handleJoinClan(clan.id, clan.name, clan.tag)}
                                className="bg-white/10 hover:bg-primary hover:text-black text-white px-4 py-1.5 rounded-lg text-sm font-bold transition-colors"
                            >
                                Unirse
                            </button>
                        )}
                        {profile?.clanId === clan.id && (
                            <span className="text-primary text-xs font-bold uppercase tracking-widest">Tu Clan</span>
                        )}
                    </div>
                </div>
            ))
        )}
      </div>
    </div>
  );
};

export default ClansPage;
