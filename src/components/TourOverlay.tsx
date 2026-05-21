import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, ChevronRight, ChevronLeft, Gamepad2, Trophy, Zap, Sparkles, Check, HelpCircle } from 'lucide-react';

interface TourStep {
  title: string;
  description: string;
  selector?: string;
  icon: React.ComponentType<any>;
}

interface TourOverlayProps {
  isOpen: boolean;
  onClose: () => void;
}

export const TourOverlay: React.FC<TourOverlayProps> = ({ isOpen, onClose }) => {
  const [currentStep, setCurrentStep] = useState(0);
  const [rect, setRect] = useState<DOMRect | null>(null);

  const steps: TourStep[] = [
    {
      title: "Bienvenido a Nexus Arena ⚔️🔥",
      description: "La plataforma de eSports definitiva para la comunidad gamer de Venezuela. Acompáñanos en este recorrido rápido y descubre cómo participar, competir y coronarte campeón de nuestros torneos oficiales.",
      icon: Sparkles
    },
    {
      title: "Sección de Juegos Destacados 🕹️✨",
      description: "Aquí verás los títulos más jugados y competitivos del país, con banners épicos actualizados por nuestros administradores. Consulta ligas activas y próximos eventos preparados especialmente para ti.",
      selector: "#featured-games-section",
      icon: Gamepad2
    },
    {
      title: "Arena de Torneos 🏆🔥",
      description: "Explora la cartelera completa de competencias activas y programadas. Desde aquí podrás monitorear las fechas de inicio, el valor de la inscripción, el cupo de participantes y el estatus en tiempo real.",
      selector: "#tournaments-section",
      icon: Trophy
    },
    {
      title: "Inscripción Express y Soporte ⚡📲",
      description: "Inscribirse es sumamente rápido: selecciona cualquier torneo para abrir los detalles, coloca tu referencia bancaria u opcionalmente contacta con el soporte directo vía WhatsApp para una verificación instantánea.",
      selector: "#sample-tournament-card",
      icon: Zap
    }
  ];

  const currentStepData = steps[currentStep];

  // Update bounding rect of target selector
  useEffect(() => {
    if (!isOpen) return;

    const selector = currentStepData?.selector;
    if (!selector) {
      setRect(null);
      return;
    }

    const element = document.querySelector(selector);
    if (element) {
      // Smooth scroll to the target
      element.scrollIntoView({ behavior: 'smooth', block: 'center' });

      // Delay checking rectangle to let scrolling settle
      const timer = setTimeout(() => {
        setRect(element.getBoundingClientRect());
      }, 400);

      const handleResizeOrScroll = () => {
        setRect(element.getBoundingClientRect());
      };

      window.addEventListener('resize', handleResizeOrScroll);
      window.addEventListener('scroll', handleResizeOrScroll);
      
      return () => {
        clearTimeout(timer);
        window.removeEventListener('resize', handleResizeOrScroll);
        window.removeEventListener('scroll', handleResizeOrScroll);
      };
    } else {
      setRect(null);
    }
  }, [isOpen, currentStep, currentStepData?.selector]);

  if (!isOpen) return null;

  const handleNext = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(prev => prev + 1);
    } else {
      handleComplete();
    }
  };

  const handlePrev = () => {
    if (currentStep > 0) {
      setCurrentStep(prev => prev - 1);
    }
  };

  const handleComplete = () => {
    localStorage.setItem('nexus_arena_tour_completed', 'true');
    setCurrentStep(0);
    onClose();
  };

  const IconComponent = currentStepData.icon;

  return (
    <div className="fixed inset-0 z-[150] overflow-hidden select-none pointer-events-none">
      {/* Fullscreen Spotlight Overlay */}
      <AnimatePresence>
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="absolute inset-0 bg-black/55 backdrop-blur-[2px] pointer-events-auto"
          style={
            rect ? {
              clipPath: `polygon(
                0% 0%, 
                0% 100%, 
                ${rect.left}px 100%, 
                ${rect.left}px ${rect.top}px, 
                ${rect.right}px ${rect.top}px, 
                ${rect.right}px ${rect.bottom}px, 
                ${rect.left}px ${rect.bottom}px, 
                ${rect.left}px 100%, 
                100% 100%, 
                100% 0%
              )`
            } : undefined
          }
        />
      </AnimatePresence>

      {/* Target Highlight Pulsing Ring */}
      <AnimatePresence>
        {rect && (
          <motion.div
            key={`highlight-${currentStep}`}
            className="fixed border-2 border-primary rounded-2xl z-[151] shadow-[0_0_20px_rgba(59,130,246,0.6)] pointer-events-none"
            initial={{ 
              opacity: 0, 
              x: rect.left - 8, 
              y: rect.top - 8, 
              width: rect.width + 16, 
              height: rect.height + 16 
            }}
            animate={{ 
              opacity: 1,
              x: rect.left - 8,
              y: rect.top - 8,
              width: rect.width + 16,
              height: rect.height + 16,
              scale: [1, 1.015, 1],
            }}
            exit={{ opacity: 0 }}
            transition={{
              scale: { repeat: Infinity, duration: 2, ease: "easeInOut" },
              duration: 0.3
            }}
          />
        )}
      </AnimatePresence>

      {/* Tutorial Dialog Card */}
      <div className="absolute inset-x-0 bottom-16 sm:bottom-24 lg:bottom-28 z-[152] flex justify-center p-4">
        <motion.div
          initial={{ opacity: 0, y: 50, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 30, scale: 0.95 }}
          transition={{ type: "spring", damping: 25, stiffness: 200 }}
          className="w-full max-w-[480px] bg-zinc-950/35 border border-white/15 rounded-2xl sm:rounded-[2rem] p-5 sm:p-7 shadow-[0_25px_60px_rgba(0,0,0,0.65),inset_0_1px_2px_rgba(255,255,255,0.15)] pointer-events-auto backdrop-blur-xl md:backdrop-blur-2xl text-white overflow-hidden relative bg-clip-padding"
        >
          {/* Subtle colored top line */}
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-primary via-indigo-500 to-primary opacity-80" />
          
          <button 
            onClick={handleComplete}
            className="absolute top-4 right-4 text-zinc-400 hover:text-white transition-colors cursor-pointer"
            title="Omitir recorrido"
          >
            <X size={16} />
          </button>

          <div className="flex gap-4 items-start pr-4">
            <div className="p-3 rounded-xl bg-primary/10 border border-primary/20 text-primary shrink-0 self-start">
              <IconComponent size={20} className="animate-pulse" />
            </div>

            <div className="space-y-2 flex-grow">
              <span className="text-[10px] uppercase tracking-widest text-primary font-bold font-mono">
                Paso {currentStep + 1} de {steps.length}
              </span>
              <h4 className="text-lg font-display uppercase tracking-wider text-white">
                {currentStepData.title}
              </h4>
              <p className="text-xs text-zinc-300 leading-relaxed font-sans">
                {currentStepData.description}
              </p>
            </div>
          </div>

          {/* Dialog Action Footer */}
          <div className="flex items-center justify-between border-t border-white/5 mt-5 sm:mt-6 pt-4">
            {/* Skip button / Dot Indicators */}
            <div className="flex items-center gap-1.5">
              {steps.map((_, index) => (
                <button
                  key={index}
                  onClick={() => setCurrentStep(index)}
                  className={`h-2 rounded-full transition-all duration-300 cursor-pointer ${
                    index === currentStep 
                      ? "w-5 bg-primary" 
                      : "w-2 bg-white/25 hover:bg-white/40"
                  }`}
                  title={`Paso ${index + 1}`}
                />
              ))}
            </div>

            {/* Navigation buttons */}
            <div className="flex items-center gap-2">
              {currentStep > 0 && (
                <button
                  onClick={handlePrev}
                  className="px-3 py-2 text-xs font-semibold text-zinc-400 hover:text-white bg-white/5 hover:bg-white/10 border border-white/5 rounded-xl transition-all flex items-center gap-1 cursor-pointer"
                >
                  <ChevronLeft size={14} /> Atrás
                </button>
              )}

              <button
                onClick={handleNext}
                className="px-4 py-2.5 text-xs font-display uppercase italic tracking-wider text-black bg-primary hover:bg-white rounded-xl transition-all flex items-center gap-1 cursor-pointer font-bold shadow-[0_0_15px_rgba(59,130,246,0.2)] skew-x-[-10deg] active:scale-95"
              >
                {currentStep === steps.length - 1 ? (
                  <>¡Listo! <Check size={13} className="inline ml-0.5" /></>
                ) : (
                  <>Siguiente <ChevronRight size={13} /></>
                )}
              </button>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
};
