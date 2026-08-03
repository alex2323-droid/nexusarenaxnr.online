import React, { useEffect, useState } from 'react';
import { Zap, ZapOff } from 'lucide-react';
import { motion } from 'motion/react';

const PerformanceToggle: React.FC = () => {
  const [perfMode, setPerfMode] = useState<boolean>(() => {
    return localStorage.getItem('perf-mode') === 'true';
  });

  useEffect(() => {
    if (perfMode) {
      document.body.classList.add('perf-mode');
      localStorage.setItem('perf-mode', 'true');
    } else {
      document.body.classList.remove('perf-mode');
      localStorage.setItem('perf-mode', 'false');
    }
  }, [perfMode]);

  return (
    <motion.button
      whileTap={{ scale: 0.9 }}
      onClick={() => setPerfMode(!perfMode)}
      className={`p-2.5 rounded-xl border flex items-center gap-1.5 transition-all cursor-pointer text-xs font-mono font-black uppercase tracking-wider ${
        perfMode
          ? 'bg-amber-500/10 border-amber-500/30 text-amber-400 hover:bg-amber-500/20 shadow-[0_0_15px_rgba(245,158,11,0.08)]'
          : 'bg-surface hover:bg-white/5 border-border text-gray-400 hover:text-white'
      }`}
      title={perfMode ? "Modo Rendimiento Activo (Efectos desactivados para gama baja)" : "Activar Modo Rendimiento (Optimiza para gama baja)"}
      aria-label="Toggle performance mode"
    >
      {perfMode ? (
        <>
          <ZapOff size={15} className="text-amber-400" />
          <span className="hidden sm:inline">Ahorro Activo</span>
        </>
      ) : (
        <>
          <Zap size={15} className="text-gray-400 group-hover:text-primary" />
          <span className="hidden sm:inline">Ahorro</span>
        </>
      )}
    </motion.button>
  );
};

export default PerformanceToggle;
