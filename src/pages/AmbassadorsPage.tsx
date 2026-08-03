import React, { useState, useEffect } from 'react';
import { db } from '../lib/firebase';
import { collection, query, where, getDocs, onSnapshot } from 'firebase/firestore';
import { Trophy, Zap, Crown, Award, Star, MessageSquare, Shield, Sparkles, ExternalLink, ArrowRight, UserCheck } from 'lucide-react';
import { motion } from 'motion/react';
import { useAuth } from '../contexts/AuthContext';
import { Link } from 'react-router-dom';

const AmbassadorsPage: React.FC = () => {
  const { user, isAdmin } = useAuth();
  const [ambassadors, setAmbassadors] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Listen to users where isAmbassador is true in real-time
    const q = query(collection(db, 'users'), where('isAmbassador', '==', true));
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const list = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setAmbassadors(list);
      setLoading(false);
    }, (error) => {
      console.error("Error fetching ambassadors:", error);
      setLoading(false);
    });

    return unsubscribe;
  }, []);

  const benefits = [
    {
      icon: Crown,
      title: "Acceso VIP Exclusivo",
      description: "Inscripción garantizada y prioritaria en torneos oficiales de Nexus Arena, incluso si los cupos están totalmente llenos.",
      color: "from-amber-500 to-yellow-400",
      bgLight: "bg-amber-500/10 border-amber-500/30"
    },
    {
      icon: Award,
      title: "Insignia Oficial Pixelada",
      description: "Un emblema exclusivo de 'Embajador Verificado' brillante de 16-bits junto a su avatar en perfiles, foro y tablas de clasificación.",
      color: "from-purple-500 to-pink-500",
      bgLight: "bg-purple-500/10 border-purple-500/30"
    },
    {
      icon: Zap,
      title: "Multiplicador de Nexus Points",
      description: "Un bono del +50% en todos los puntos de clasificación ganados al participar en partidas de liga o en torneos oficiales.",
      color: "from-blue-500 to-cyan-400",
      bgLight: "bg-blue-500/10 border-blue-500/30"
    },
    {
      icon: MessageSquare,
      title: "Soporte Directo con Staff",
      description: "Acceso a canales VIP privados de Discord y línea directa con los administradores principales de la comunidad.",
      color: "from-green-500 to-emerald-400",
      bgLight: "bg-green-500/10 border-green-500/30"
    },
    {
      icon: Sparkles,
      title: "Host de Mini-Eventos",
      description: "Permisos y herramientas para organizar torneos comunitarios avalados con bolsas de premios patrocinadas por Nexus Arena.",
      color: "from-rose-500 to-red-400",
      bgLight: "bg-rose-500/10 border-rose-500/30"
    },
    {
      icon: Shield,
      title: "Moderación de Chat",
      description: "Nivel de confianza prioritario en el foro y herramientas opcionales de moderación para mantener la armonía de la arena.",
      color: "from-teal-500 to-indigo-400",
      bgLight: "bg-teal-500/10 border-teal-500/30"
    }
  ];

  return (
    <div className="space-y-8 md:space-y-12">
      {/* Header section with pixel art aesthetic */}
      <div className="relative overflow-hidden rounded-2xl sm:rounded-[2rem] border border-white/10 bg-gradient-to-br from-zinc-950 to-black p-6 md:p-12 text-center space-y-4 md:space-y-6 shadow-2xl">
        <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(circle_at_center,rgba(245,158,11,0.06)_0%,transparent_100%)] pointer-events-none" />
        
        {/* Pixel style accent badge */}
        <motion.div 
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-500 text-[9px] font-black uppercase tracking-[0.2em]"
        >
          <Crown size={10} className="animate-pulse" /> Programa de Embajadores
        </motion.div>

        <h1 className="text-2xl sm:text-4xl md:text-5xl lg:text-6xl font-display uppercase italic tracking-tighter text-white max-w-4xl mx-auto leading-none">
          EMBAJADORES <span className="text-amber-500 drop-shadow-[0_0_15px_rgba(245,158,11,0.3)]">NEXUS ARENA</span>
        </h1>
        
        <p className="text-gray-400 max-w-2xl mx-auto text-xs sm:text-sm md:text-base font-medium leading-relaxed">
          Nuestros embajadores representan los pilares de la comunidad gamer de Nexus Arena. Son líderes, creadores de contenido y competidores ejemplares autorizados directamente por el equipo administrativo.
        </p>

        {isAdmin && (
          <div className="pt-2 flex justify-center">
            <Link 
              to="/admin" 
              className="bg-amber-500 text-black px-5 py-2.5 rounded-lg font-display text-[10px] uppercase tracking-wider skew-x-[-10deg] flex items-center gap-2 font-black shadow-lg shadow-amber-500/10 hover:bg-white hover:scale-105 transition-all"
            >
              <UserCheck size={14} /> Elegir Embajadores en Admin Panel
            </Link>
          </div>
        )}
      </div>

      {/* Grid of special benefits */}
      <div className="space-y-4">
        <div className="flex flex-col md:flex-row items-start md:items-end justify-between gap-1">
          <div>
            <h2 className="text-xl sm:text-2xl md:text-3xl font-display uppercase italic text-white flex items-center gap-2">
              <Star className="text-amber-500" size={20} /> BENEFICIOS ESPECIALES
            </h2>
            <p className="text-gray-500 text-[9px] sm:text-xs uppercase font-bold tracking-widest mt-0.5">Los privilegios exclusivos otorgados a nuestros embajadores</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
          {benefits.map((b, idx) => {
            const IconComponent = b.icon;
            return (
              <motion.div
                key={idx}
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.05 }}
                className={`p-4 sm:p-5 rounded-xl border ${b.bgLight} transition-all duration-300 hover:scale-[1.01] hover:bg-white/[0.03] hover:border-white/20`}
              >
                <div className={`w-9 h-9 rounded-lg bg-gradient-to-br ${b.color} p-0.5 flex items-center justify-center mb-3 shadow-md`}>
                  <div className="w-full h-full bg-zinc-950 rounded-[7px] flex items-center justify-center text-white">
                    <IconComponent size={16} className="text-amber-500" />
                  </div>
                </div>
                <h3 className="text-sm sm:text-base font-bold text-white mb-1">{b.title}</h3>
                <p className="text-[11px] sm:text-xs text-gray-400 leading-relaxed font-medium">{b.description}</p>
              </motion.div>
            );
          })}
        </div>
      </div>

      {/* Real-time Ambassador List section */}
      <div className="space-y-4">
        <div>
          <h2 className="text-xl sm:text-2xl md:text-3xl font-display uppercase italic text-white flex items-center gap-2">
            <Trophy className="text-amber-500" size={20} /> NUESTRO STAFF DE EMBAJADORES
          </h2>
          <p className="text-gray-500 text-[9px] sm:text-xs uppercase font-bold tracking-widest mt-0.5">Sincronizado con la base de datos en tiempo real</p>
        </div>

        {loading ? (
          <div className="py-16 text-center space-y-3">
            <div className="w-8 h-8 border-4 border-amber-500 border-t-transparent rounded-full animate-spin mx-auto" />
            <p className="text-[10px] uppercase font-mono text-gray-400 tracking-widest font-black">Cargando Embajadores...</p>
          </div>
        ) : ambassadors.length === 0 ? (
          <div className="glass p-8 rounded-2xl border border-white/5 bg-white/[0.01] text-center space-y-3">
            <Crown size={36} className="text-gray-600 mx-auto" />
            <div className="space-y-1">
              <p className="text-base font-bold text-white uppercase">No hay embajadores activos en este momento</p>
              <p className="text-xs text-gray-500 max-w-md mx-auto">
                Los embajadores son seleccionados exclusivamente por los administradores principales según su aporte a la comunidad.
              </p>
            </div>
            {isAdmin && (
              <div className="pt-1">
                <Link to="/admin" className="text-amber-500 text-[10px] uppercase font-black tracking-widest flex items-center justify-center gap-1 hover:text-white transition-colors">
                  Ir al panel para elegir el primer embajador <ArrowRight size={12} />
                </Link>
              </div>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
            {ambassadors.map((amb, idx) => (
              <motion.div
                key={amb.id}
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: idx * 0.05 }}
                className="glass p-4 sm:p-5 rounded-2xl border border-white/10 hover:border-amber-500/40 transition-all text-center relative overflow-hidden group"
              >
                {/* Visual hover grid effect */}
                <div className="absolute top-0 right-0 w-20 h-20 bg-gradient-to-br from-amber-500/5 to-transparent rounded-bl-[80px] pointer-events-none group-hover:from-amber-500/15 transition-all duration-300" />
                
                {/* Ambassador Badge */}
                <div className="absolute top-3 left-3">
                  <span className="bg-amber-500/10 text-amber-500 text-[7px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded border border-amber-500/20 flex items-center gap-0.5">
                    <Zap size={7} className="fill-current" /> Verificado
                  </span>
                </div>

                <div className="flex flex-col items-center space-y-3 pt-3">
                  <div className="relative">
                    <img 
                      src={amb.photoURL || `https://api.dicebear.com/7.x/avataaars/svg?seed=${amb.id}`} 
                      className="w-16 h-16 rounded-xl bg-zinc-900 border-2 border-amber-500/40 object-cover shadow-lg shadow-amber-500/10"
                      alt={amb.displayName} 
                    />
                    <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-amber-500 text-black rounded-lg flex items-center justify-center border border-zinc-950 font-black text-[10px]">
                      ★
                    </div>
                  </div>

                  <div>
                    <h3 className="font-bold text-white text-base group-hover:text-amber-500 transition-colors truncate max-w-[150px]">{amb.displayName}</h3>
                    <p className="text-[9px] text-gray-500 font-bold uppercase tracking-wider mt-0.5">{amb.platform || 'Multiplataforma'}</p>
                  </div>

                  {amb.bio && (
                    <p className="text-[11px] text-gray-450 line-clamp-2 italic font-medium">
                      "{amb.bio}"
                    </p>
                  )}

                  <div className="flex gap-2 text-[10px] font-semibold text-gray-500 uppercase tracking-widest pt-2 w-full border-t border-white/5">
                    <div className="flex-1 text-center">
                      <p className="text-xs font-display italic text-white">{amb.stats?.wins || 0}</p>
                      <p className="text-[7px] text-gray-500">Wins</p>
                    </div>
                    <div className="flex-1 text-center">
                      <p className="text-xs font-display italic text-amber-500">{amb.stats?.points || 0}</p>
                      <p className="text-[7px] text-gray-500">Puntos</p>
                    </div>
                    <div className="flex-1 text-center">
                      <p className="text-xs font-display italic text-white">{amb.stats?.tournaments || 0}</p>
                      <p className="text-[7px] text-gray-500">Juegos</p>
                    </div>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>

      {/* Program details banner */}
      <div className="glass p-6 md:p-10 rounded-2xl sm:rounded-[1.5rem] border border-white/10 bg-white/[0.01] grid grid-cols-1 md:grid-cols-2 gap-6 items-center relative overflow-hidden">
        <div className="absolute top-0 right-0 w-48 h-48 bg-[radial-gradient(circle_at_center,rgba(59,130,246,0.03)_0%,transparent_100%)] pointer-events-none" />
        <div className="space-y-3">
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded bg-blue-500/10 border border-blue-500/20 text-blue-400 text-[8px] font-black uppercase tracking-wider">
            Reclutamiento de Líderes
          </div>
          <h2 className="text-xl md:text-2xl font-display uppercase italic text-white">
            ¿QUIERES SER EMBAJADOR?
          </h2>
          <p className="text-[11px] sm:text-xs md:text-sm text-gray-400 leading-relaxed font-medium">
            Buscamos miembros activos, educados y apasionados que deseen expandir el ecosistema gamer en Venezuela. Si tienes un clan activo, creas contenido en plataformas sociales o eres un competidor respetable en la arena, ¡puedes ser el próximo en postularte!
          </p>
        </div>
        <div className="flex flex-col gap-2.5 sm:flex-row md:justify-end">
          <a 
            href="https://discord.gg/hRtF3YVQ7" 
            target="_blank" 
            rel="noreferrer"
            className="px-5 py-3 bg-primary text-black rounded-lg font-display uppercase text-[10px] font-black skew-x-[-10deg] hover:bg-white text-center transition-all flex items-center justify-center gap-2 shadow-md shadow-primary/10"
          >
            Comunidad Discord <ExternalLink size={12} />
          </a>
          <a 
            href="mailto:soporte@nexusarena.com"
            className="px-5 py-3 bg-white/5 border border-white/10 text-white rounded-lg font-display uppercase text-[10px] font-bold skew-x-[-10deg] hover:bg-white/10 text-center transition-all flex items-center justify-center gap-2"
          >
            Enviar Solicitud
          </a>
        </div>
      </div>
    </div>
  );
};

export default AmbassadorsPage;
