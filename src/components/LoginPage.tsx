import React, { useState } from 'react';
import { Trophy, ChevronRight, Zap, Target, Loader2, Gamepad2, Shield } from 'lucide-react';
import { signInWithGoogle } from '../lib/firebase';
import { motion } from 'motion/react';

export default function LoginPage() {
  const [isLoading, setIsLoading] = useState(false);

  const handleLogin = async () => {
    setIsLoading(true);
    try {
      await signInWithGoogle();
    } catch (error) {
      console.error(error);
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-black flex items-center justify-center relative overflow-hidden font-sans">
      {/* Deep Space Background with gradients */}
      <div className="absolute inset-0 bg-[#05050a] z-0">
        <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1542751371-adc38448a05e?auto=format&fit=crop&q=80')] bg-cover bg-center opacity-[0.12] mix-blend-screen grayscale" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(59,130,246,0.15),transparent_40%),radial-gradient(circle_at_80%_80%,rgba(225,29,72,0.1),transparent_40%)]" />
        <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(255,255,255,0.015)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.015)_1px,transparent_1px)] bg-[size:48px_48px]" />
      </div>

      {/* Floating Elements */}
      <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none">
        <motion.div
           animate={{ y: [0, -20, 0], opacity: [0.3, 0.6, 0.3] }}
           transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }}
           className="absolute top-[20%] left-[10%] w-64 h-64 bg-primary/10 rounded-full blur-[80px]"
        />
        <motion.div
           animate={{ y: [0, 20, 0], opacity: [0.2, 0.5, 0.2] }}
           transition={{ duration: 7, repeat: Infinity, ease: "easeInOut", delay: 1 }}
           className="absolute bottom-[20%] right-[10%] w-72 h-72 bg-rose-500/10 rounded-full blur-[90px]"
        />
      </div>

      <div className="relative z-10 w-full max-w-[420px] p-4 sm:p-6">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
          className="bg-black/60 backdrop-blur-3xl border border-white/10 rounded-[2rem] overflow-hidden shadow-[0_0_80px_rgba(0,0,0,0.8),inset_0_1px_1px_rgba(255,255,255,0.15)] relative"
        >
          {/* Edge Highlights */}
          <div className="absolute top-0 inset-x-0 h-[1.5px] bg-gradient-to-r from-transparent via-primary/80 to-transparent" />
          <div className="absolute bottom-0 inset-x-0 h-[1px] bg-gradient-to-r from-transparent via-rose-500/40 to-transparent" />
          
          <div className="p-6 sm:p-8">
            <div className="flex flex-col items-center mb-8 sm:mb-10 relative">
              <motion.div 
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: "spring", stiffness: 200, damping: 20, delay: 0.2 }}
                className="w-20 h-20 sm:w-24 sm:h-24 mb-6 bg-gradient-to-br from-primary via-rose-500 to-indigo-600 rounded-[1.5rem] sm:rounded-[2rem] p-[2px] relative skew-x-[0deg]"
              >
                <div className="absolute inset-0 bg-primary/30 blur-2xl rounded-full" />
                <div className="w-full h-full bg-zinc-950 rounded-[22px] sm:rounded-[30px] flex items-center justify-center relative z-10 overflow-hidden">
                  <img src="/logo.png" alt="Nexus Arena" className="w-[70%] h-[70%] object-contain" onError={(e) => {
                    e.currentTarget.style.display = 'none';
                    e.currentTarget.parentElement?.querySelector('svg')?.classList.remove('hidden');
                  }} />
                  <Trophy className="text-white drop-shadow-[0_0_15px_rgba(59,130,246,0.8)] hidden" size={32} />
                </div>
              </motion.div>
              
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                className="text-center"
              >
                <h1 className="text-4xl sm:text-5xl tracking-tighter uppercase italic font-display text-white mb-2 leading-[0.8] drop-shadow-md">
                  Nexus <br/><span className="text-primary tracking-tight">Arena</span>
                </h1>
                <p className="text-[9px] sm:text-[10px] text-zinc-400 font-mono tracking-[0.2em] uppercase flex items-center justify-center gap-2 mt-4 ml-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse shadow-[0_0_10px_rgba(59,130,246,0.8)]" />
                  Plataforma Competitiva
                </p>
              </motion.div>
            </div>

            <div className="space-y-2.5 sm:space-y-3 mb-8 sm:mb-10">
              {[
                { icon: Trophy, text: "Compite en torneos pro", color: "text-yellow-400", bg: "bg-yellow-400/10", border: 'border-yellow-400/20' },
                { icon: Shield, text: "Matchmaking de alto nivel", color: "text-primary", bg: "bg-primary/10", border: 'border-primary/20' },
                { icon: Gamepad2, text: "Gana premios y prestigio", color: "text-rose-400", bg: "bg-rose-400/10", border: 'border-rose-400/20' }
              ].map((feature, idx) => (
                <motion.div 
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.4 + (idx * 0.1) }}
                  key={idx} 
                  className={`flex items-center gap-3 sm:gap-4 text-[12px] sm:text-[13px] text-zinc-300 font-medium ${feature.bg} p-3 sm:p-3.5 rounded-xl sm:rounded-2xl border ${feature.border} backdrop-blur-sm shadow-inner`}
                >
                  <div className={`p-1.5 ${feature.bg} rounded-xl border ${feature.border}`}>
                    <feature.icon size={16} className={feature.color} />
                  </div>
                  <span className="tracking-wide uppercase font-display text-[10px] sm:text-[11px] font-bold skew-x-[-10deg] mt-0.5 text-white/90">{feature.text}</span>
                </motion.div>
              ))}
            </div>

            <motion.button
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.7 }}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={handleLogin}
              disabled={isLoading}
              className="w-full bg-white text-black py-3.5 sm:py-4 px-6 rounded-xl sm:rounded-2xl font-display text-base sm:text-lg uppercase italic font-black tracking-wider flex items-center justify-center gap-2 sm:gap-3 transition-colors hover:bg-zinc-200 shadow-[0_10px_30px_rgba(255,255,255,0.15)] hover:shadow-[0_10px_40px_rgba(255,255,255,0.25)] relative overflow-hidden group"
            >
              <div className="absolute inset-0 border-[2px] border-white/20 rounded-xl sm:rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
              {isLoading ? (
                <Loader2 className="animate-spin text-black" size={24} />
              ) : (
                <>
                  <img 
                    src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" 
                    alt="Google"
                    className="w-5 h-5 relative z-10 drop-shadow-sm"
                  />
                  <span className="relative z-10 mt-0.5 skew-x-[-10deg]">Acceder con Google</span>
                  <ChevronRight size={18} className="relative z-10 opacity-50" />
                </>
              )}
            </motion.button>
          </div>
          
          <div className="bg-white/[0.02] border-t border-white/5 p-4 text-center backdrop-blur-md">
            <p className="text-[9px] text-zinc-500 max-w-[280px] mx-auto uppercase tracking-widest leading-relaxed">
              Sistema de Autenticación Seguro. Al ingresar aceptas las <span className="text-zinc-300">Normativas Oficiales</span> de la Arena.
            </p>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
