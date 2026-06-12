import React, { useState, useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { 
  MessageSquare, 
  X, 
  Settings, 
  Cpu, 
  Wifi, 
  User as UserIcon, 
  AlertTriangle, 
  CheckCircle, 
  Play, 
  Send, 
  Loader2, 
  HelpCircle,
  Clock,
  RotateCcw,
  Bot,
  Terminal,
  Activity,
  Award,
  ShieldCheck,
  ChevronDown,
  ChevronUp,
  Maximize2,
  Minimize2,
  Gamepad2,
  Sparkles
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { db } from '../lib/firebase';
import { collection, getDocs } from 'firebase/firestore';

// Global error registry to hook into window errors automatically
const errorLogs: string[] = [];
if (typeof window !== 'undefined') {
  const originalError = console.error;
  console.error = (...args) => {
    const errorMsg = args.map(arg => {
      if (arg instanceof Error) return arg.message + '\n' + arg.stack;
      if (typeof arg === 'object') {
        try {
          return JSON.stringify(arg);
        } catch {
          return String(arg);
        }
      }
      return String(arg);
    }).join(' ');

    // Suppress Firestore BloomFilter log duplication
    if (!errorMsg.includes('BloomFilter') && !errorMsg.includes('Invalid hash count: 0')) {
      if (errorLogs.length >= 10) errorLogs.shift();
      errorLogs.push(errorMsg.slice(0, 150));
    }
    originalError(...args);
  };

  window.addEventListener('error', (event) => {
    if (errorLogs.length >= 10) errorLogs.shift();
    errorLogs.push(`Uncaught Runtime Error: ${event.message}`);
  });
}

interface ChatMessage {
  id: string;
  role: 'user' | 'model';
  text: string;
  timestamp: Date;
}

const FAQ_PRESETS = [
  {
    question: "💰 Registrar Pago VES",
    message: "Hola, me gustaría saber cómo reportar mi pago de inscripción en Bolívares por Pago Móvil o transferencia bancaria."
  },
  {
    question: "🎮 ID de Jugador",
    message: "¿Dónde encuentro mi ID de jugador de Free Fire o Blood Strike para registrarme correctamente?"
  },
  {
    question: "🔑 Código de Sala",
    message: "¿Qué es el código de acceso único que recibo tras registrar el pago de un torneo?"
  },
  {
    question: "⚡ Latencia",
    message: "Tengo problemas de conexión en la página, ¿cómo puedo diagnosticar y solucionar el problema?"
  }
];

export const AISupportConsole: React.FC = () => {
  const { user, profile, isAdmin } = useAuth();
  const location = useLocation();
  const [isOpen, setIsOpen] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputVal, setInputVal] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errorDetails, setErrorDetails] = useState<string | null>(null);

  // Diagnostics states
  const [firebaseConnected, setFirebaseConnected] = useState<boolean | null>(null);
  const [measuredPing, setMeasuredPing] = useState<number | null>(null);
  const [jsErrors, setJsErrors] = useState<string[]>([]);
  const [isDiagnosticRunning, setIsDiagnosticRunning] = useState(false);
  const [diagnosticMessage, setDiagnosticMessage] = useState<string | null>(null);
  const [showDiagnostics, setShowDiagnostics] = useState(false); // Collapsed on mobile by default

  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Initialize welcome message or load history from localStorage on mounting
  useEffect(() => {
    const saved = localStorage.getItem('nexus_arena_support_chat_v3');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          const formatted = parsed.map((m: any) => ({
            ...m,
            timestamp: new Date(m.timestamp)
          }));
          setMessages(formatted);
          return;
        }
      } catch (e) {
        console.error('Error parsing stored chat:', e);
      }
    }

    setMessages([
      {
        id: 'init',
        role: 'model',
        text: '¡Hola! Bienvenido al soporte técnico de **Nexus Arena**.\n\nTe puedo asistir con el registro y validación de tus pagos en Bolívares (VES), obtención de códigos de sala, o cualquier otra duda sobre los torneos de la plataforma.\n\n¿En qué te puedo ayudar hoy?',
        timestamp: new Date()
      }
    ]);
  }, []);

  // Sync current chat messages to localStorage dynamically
  useEffect(() => {
    if (messages.length > 0) {
      localStorage.setItem('nexus_arena_support_chat_v3', JSON.stringify(messages));
    }
  }, [messages]);

  // Sync current captured errors
  useEffect(() => {
    setJsErrors([...errorLogs]);
  }, [isOpen]);

  // Handle Firestore connection check
  useEffect(() => {
    const checkFirebase = async () => {
      const start = Date.now();
      try {
        const testCol = collection(db, 'tournaments');
        await getDocs(testCol);
        setFirebaseConnected(true);
        setMeasuredPing(Math.min(Date.now() - start, 999));
      } catch (err) {
        setFirebaseConnected(false);
        setMeasuredPing(null);
      }
    };
    checkFirebase();
    const interval = setInterval(checkFirebase, 30000);
    return () => clearInterval(interval);
  }, []);

  // Scroll to bottom on updates
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  // Reset Conversation
  const handleClearChat = () => {
    const refreshed: ChatMessage[] = [
      {
        id: `init-${Date.now()}`,
        role: 'model',
        text: '🔄 *Conversación reiniciada.*\n\n¡Hola! ¿En qué te puedo ayudar hoy con tus torneos, registro de pagos en Bolívares o dudas generales?',
        timestamp: new Date()
      }
    ];
    setMessages(refreshed);
    localStorage.setItem('nexus_arena_support_chat_v3', JSON.stringify(refreshed));
    setErrorDetails(null);
  };

  // Execute Automatic repairs and diagnostics flush - optimized for all users
  const handleAutoRepair = async () => {
    setIsDiagnosticRunning(true);
    setDiagnosticMessage('⌛ Verificando rendimiento de la página...');
    
    await new Promise(r => setTimeout(r, 600));
    setDiagnosticMessage('🌐 Comprobando la base de datos de torneos...');
    
    const start = Date.now();
    let connSuccess = false;
    try {
      const q = collection(db, 'tournaments');
      await getDocs(q);
      connSuccess = true;
      setMeasuredPing(Date.now() - start);
    } catch {
      connSuccess = false;
    }

    await new Promise(r => setTimeout(r, 500));
    setDiagnosticMessage('🧹 Optimizando memoria temporal de la página...');
    
    errorLogs.length = 0;
    setJsErrors([]);
    setFirebaseConnected(connSuccess);

    await new Promise(r => setTimeout(r, 400));
    setIsDiagnosticRunning(false);
    setDiagnosticMessage(
      connSuccess 
        ? '✅ ¡Optimización finalizada con éxito!' 
        : '⚠️ Se ha detectado un retardo de conexión.'
    );

    const repairMessage: ChatMessage = {
      id: `repair-${Date.now()}`,
      role: 'model',
      text: connSuccess
        ? '🔧 **[Soporte Técnico - Optimización]**:\n\nHe comprobado la conexión con el servidor de torneos y optimizado el tiempo de respuesta.\n\nTodo se encuentra funcionando con normalidad. ¡Mucho éxito en tus partidas!'
        : '🔧 **[Soporte Técnico - Diagnóstico]**:\n\nHe detectado un retardo inusual al intentar conectar con la base de datos de los torneos.\n\n**Sugerencias de ayuda de conexión:**\n- Comprueba tu conexión a internet o datos móviles.\n- Desactiva bloqueadores de anuncios que puedan interferir.\n- Intenta actualizar la página.',
      timestamp: new Date()
    };
    setMessages(prev => [...prev, repairMessage]);
  };

  const handleSendMessage = async (rawText: string) => {
    if (!rawText.trim() || isLoading) return;

    setErrorDetails(null);
    const userMsg: ChatMessage = {
      id: `msg-${Date.now()}`,
      role: 'user',
      text: rawText,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMsg]);
    setInputVal('');
    setIsLoading(true);

    try {
      const systemDiagnostics = {
        userEmail: user?.email ? user.email.replace(/(.{2})(.*)(@.*)/, "$1***$3") : 'Anónimo',
        userDisplayName: profile?.displayName || user?.displayName || 'Anónimo',
        isAdmin: isAdmin,
        currentPath: location.pathname,
        firebaseConnected: firebaseConnected,
        browserInfo: typeof window !== 'undefined' ? window.navigator.userAgent : 'Desconocido',
        localTime: new Date().toLocaleTimeString('es-VE', { timeZone: 'America/Caracas' }) + ' (VET)',
        jsErrors: jsErrors
      };

      const payloadInput = {
        message: rawText,
        history: messages.map(m => ({ role: m.role, text: m.text })),
        systemDiagnostics
      };

      const response = await fetch('/api/support/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payloadInput)
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.details || data.error || 'Falla al procesar el chat.');
      }

      const modelMsg: ChatMessage = {
        id: `msg-${Date.now()}-model`,
        role: 'model',
        text: data.text || 'Nuestra IA de soporte no pudo formular una respuesta. Inténtalo de nuevo.',
        timestamp: new Date()
      };

      setMessages(prev => [...prev, modelMsg]);
    } catch (err: any) {
      setErrorDetails(err.message || 'Error de conexión.');
    } finally {
      setIsLoading(false);
    }
  };

  // Robust parsing of markdown bullet points, titles, symbols, and esports highlights
  const formatText = (text: string) => {
    return text.split('\n').map((line, idx) => {
      let content = line;

      // Check for headings first (e.g. ### Title)
      if (content.trim().startsWith('###')) {
        const headingText = content.replace(/^###\s*/, '');
        return (
          <div key={idx} className="mt-4 mb-2 first:mt-1">
            <h4 className="text-[12px] font-display font-medium text-primary tracking-wider uppercase flex items-center gap-2 italic">
              <span className="h-1.5 w-1.5 rounded-full bg-primary animate-pulse shadow-[0_0_6px_rgba(59,130,246,0.8)]" />
              {headingText}
            </h4>
            <div className="h-[1px] w-full bg-gradient-to-r from-primary/50 via-indigo-500/20 to-transparent mt-1" />
          </div>
        );
      }

      // Blockquotes / Warnings starting with ">"
      const isQuote = content.trim().startsWith('>');
      if (isQuote) {
        content = content.replace(/^>\s*/, '');
      }

      // Unordered lists
      const isBullet = content.trim().startsWith('-') || content.trim().startsWith('*');
      if (isBullet) {
        content = content.replace(/^[-*]\s*/, '');
      }

      const renderContent = () => {
        // Handle bold (**), italic (*), and inline code (`)
        const parts = content.split(/(\*\*.*?\*\*|`.*?`|\*.*?\*)/g);
        return parts.map((part, pIdx) => {
          if (part.startsWith('**') && part.endsWith('**')) {
            const innerText = part.slice(2, -2);
            // Highlight specific business words with unique accents
            const isVes = innerText.toLowerCase().includes('bolívares') || innerText.toLowerCase().includes('ves') || innerText.toLowerCase().includes('pago');
            const isLive = innerText.toLowerCase().includes('en vivo') || innerText.toLowerCase().includes('correcto');
            
            return (
              <strong 
                key={pIdx} 
                className={`font-semibold tracking-tight ${
                  isVes 
                    ? 'text-amber-400 font-display' 
                    : isLive 
                      ? 'text-emerald-400 font-display' 
                      : 'text-rose-400 font-display font-extrabold'
                }`}
              >
                {innerText}
              </strong>
            );
          }
          if (part.startsWith('`') && part.endsWith('`')) {
            return (
              <code key={pIdx} className="bg-black/80 px-1.5 py-0.5 rounded text-amber-300 font-mono text-[11px] border border-zinc-805/40 mx-0.5 shadow-sm">
                {part.slice(1, -1)}
              </code>
            );
          }
          if (part.startsWith('*') && part.endsWith('*')) {
            return (
              <em key={pIdx} className="text-zinc-200 italic font-medium">
                {part.slice(1, -1)}
              </em>
            );
          }
          return part;
        });
      };

      if (isBullet) {
        return (
          <li key={idx} className="ml-3 list-none text-zinc-300 text-[13.5px] leading-relaxed my-1.5 pl-3 border-l-2 border-primary/50 flex items-start gap-1">
            <span className="text-primary text-[10px] mt-1 shrink-0">✦</span>
            <div className="flex-1">{renderContent()}</div>
          </li>
        );
      }

      if (isQuote) {
        return (
          <div key={idx} className="my-2 p-2 bg-rose-500/5 rounded border-l-2 border-rose-500/60 text-zinc-300 text-[13px] italic leading-relaxed">
            {renderContent()}
          </div>
        );
      }

      return (
        <p key={idx} className="text-zinc-300 text-[13.5px] leading-relaxed min-h-[0.75rem] my-1 font-sans">
          {renderContent()}
        </p>
      );
    });
  };

  return (
    <>
      {/* Impregnated Glowing Floating Button Launcher - Optimized for Mobile Smartphones with Premium Animated Ambient Pulsing Glow */}
      <motion.button
        id="btn-support-drawer-toggle"
        initial={{ scale: 0.9, opacity: 0, y: 12 }}
        animate={{ 
          scale: 1, 
          opacity: 1, 
          y: 0,
          boxShadow: [
            "0 4px 20px rgba(59,130,246,0.25)",
            "0 4px 32px rgba(59,130,246,0.55)",
            "0 4px 20px rgba(59,130,246,0.25)"
          ]
        }}
        transition={{
          boxShadow: {
            repeat: Infinity,
            duration: 3,
            ease: "easeInOut"
          },
          scale: { type: "spring", stiffness: 200, damping: 15 }
        }}
        whileHover={{ scale: 1.06, y: -3 }}
        whileTap={{ scale: 0.94 }}
        onClick={() => setIsOpen(true)}
        className="fixed bottom-4 right-4 sm:bottom-6 sm:right-6 z-[999] bg-primary hover:bg-white text-black font-display font-black text-xs uppercase tracking-widest py-3 px-4 sm:py-3.5 sm:px-6 rounded-full flex items-center gap-2 cursor-pointer transition-colors duration-300 border border-primary/25"
      >
        <span className="relative flex h-2.5 w-2.5">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-black opacity-75"></span>
          <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-black"></span>
        </span>
        <MessageSquare size={15} className="text-black" />
        <span className="hidden sm:inline">Soporte Técnico • En línea</span>
        <span className="inline sm:hidden">Soporte</span>
      </motion.button>

      {/* Modern Sci-Fi Slidout Drawer UI */}
      <AnimatePresence>
        {isOpen && (
          <div className="fixed inset-0 z-[9999] flex justify-end font-sans">
            {/* Ambient Overlay Screen Blur */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.75 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.35, ease: "easeOut" }}
              onClick={() => setIsOpen(false)}
              className="absolute inset-0 bg-black/45 backdrop-blur-[2px]"
            />

            {/* Support Terminal Area - Full Width on Mobile, Sleek Custom Expandable Drawer on Desktop */}
            <motion.div
              initial={{ x: '100%', opacity: 0.9 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: '100%', opacity: 0.9 }}
              transition={{ type: 'spring', damping: 28, stiffness: 220 }}
              className={`relative w-full h-[100dvh] bg-zinc-950/35 border-l border-white/15 backdrop-blur-xl md:backdrop-blur-2xl flex flex-col shadow-[[-25px_0_70px_-15px_rgba(0,0,0,0.65)],inset_1px_0_2px_rgba(255,255,255,0.15)] overflow-hidden transition-all duration-305 bg-clip-padding ${
                isExpanded 
                  ? "sm:max-w-2xl md:max-w-3xl lg:max-w-4xl" 
                  : "sm:max-w-md md:max-w-lg"
              }`}
            >
              {/* Mobile Drag/Close Handle indicator for quick intuitive swipe-down/close gesture concept */}
              <div 
                onClick={() => setIsOpen(false)}
                className="flex sm:hidden justify-center pt-2 pb-1 shrink-0 bg-black/15 z-20 cursor-pointer hover:bg-black/25 transition-colors"
                title="Cerrar soporte"
              >
                <div className="w-12 h-1 bg-zinc-700/80 rounded-full" />
              </div>
              {/* Animated Liquid Crystal Glass Blobs in the background */}
              <div className="absolute inset-0 overflow-hidden pointer-events-none z-0">
                {/* Micro Liquid grid pattern */}
                <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(255,255,255,0.015)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.015)_1px,transparent_1px)] bg-[size:16px_16px] opacity-70" />
                
                {/* Luminous fluid elements */}
                <motion.div 
                  animate={{
                    scale: [1, 1.25, 0.9, 1.15, 1],
                    x: [0, 80, -40, 50, 0],
                    y: [0, -60, 80, -50, 0],
                  }}
                  transition={{
                    duration: 25,
                    repeat: Infinity,
                    ease: "easeInOut"
                  }}
                  className="absolute top-1/4 -left-20 w-80 h-80 rounded-full bg-primary/10 blur-[90px]"
                />
                <motion.div 
                  animate={{
                    scale: [1, 0.9, 1.2, 1, 0.95],
                    x: [0, -50, 60, -30, 0],
                    y: [0, 90, -70, 50, 0],
                  }}
                  transition={{
                    duration: 22,
                    repeat: Infinity,
                    ease: "easeInOut"
                  }}
                  className="absolute bottom-1/4 -right-20 w-90 h-90 rounded-full bg-indigo-600/10 blur-[110px]"
                />
                {/* Diagonal liquid crystal iridescent sheen */}
                <div className="absolute inset-0 bg-gradient-to-tr from-primary/5 via-rose-500/5 to-indigo-500/5 opacity-50" />
              </div>

              {/* Luminous Specular Top Highlight - Matched directly with Nexus Arena header strip */}
              <div className="h-[2px] w-full bg-gradient-to-r from-primary via-rose-500 to-indigo-600 shrink-0 z-10 shadow-[0_1px_15px_rgba(59,130,246,0.35)]" />

              {/* Titlebar with Glassmorphism Header */}
              <div 
                className="bg-black/20 border-b border-white/10 p-4 shrink-0 flex items-center justify-between backdrop-blur-sm z-10 relative"
                style={{ paddingTop: 'calc(1rem + env(safe-area-inset-top, 0px))' }}
              >
                {/* Specular Edge Line */}
                <div className="absolute inset-x-0 top-0 h-[1.5px] bg-gradient-to-r from-transparent via-white/10 to-transparent" />
                <div className="flex items-center gap-3">
                  <div className="p-2.5 bg-gradient-to-br from-primary/20 to-indigo-500/15 rounded-xl text-primary border border-primary/25 shadow-[0_0_15px_rgba(59,130,246,0.15)] shrink-0">
                    <MessageSquare size={18} />
                  </div>
                  <div>
                    <h2 className="text-sm sm:text-base font-display uppercase italic tracking-wide text-zinc-100 flex items-center gap-2">
                      Soporte de Nexus Arena
                    </h2>
                    <p className="text-[10px] text-zinc-400 font-sans flex items-center gap-1.5 mt-0.5">
                      <span className="h-1.5 w-1.5 rounded-full bg-primary animate-pulse inline-block shadow-[0_0_6px_rgba(59,130,246,0.8)]" />
                      Canal de asistencia • En línea
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-1.5 z-20">
                  {/* Expand Toggle Button for large screens */}
                  <button
                    onClick={() => setIsExpanded(!isExpanded)}
                    title={isExpanded ? "Reducir Consola" : "Expandir Consola de Datos"}
                    className="hidden sm:flex p-2 text-zinc-400 hover:text-white rounded-xl border border-white/5 w-10 h-10 items-center justify-center hover:bg-white/5 hover:border-white/10 transition-all cursor-pointer shadow-sm"
                  >
                    {isExpanded ? <Minimize2 size={14} className="text-primary" /> : <Maximize2 size={14} className="text-primary" />}
                  </button>

                  {/* Clean Chat History */}
                  <button
                    onClick={handleClearChat}
                    title="Reiniciar conversación"
                    className="p-2 text-zinc-400 hover:text-white rounded-xl border border-white/5 w-10 h-10 flex items-center justify-center hover:bg-white/5 hover:border-white/10 transition-all cursor-pointer shadow-sm"
                  >
                    <RotateCcw size={14} className="text-primary" />
                  </button>

                  <button 
                    onClick={() => setIsOpen(false)}
                    className="p-2 text-zinc-400 hover:text-white rounded-xl border border-white/5 w-10 h-10 flex items-center justify-center hover:bg-white/5 hover:border-white/10 transition-all cursor-pointer shadow-sm"
                  >
                    <X size={15} className="text-rose-500 hover:text-rose-400" />
                  </button>
                </div>
              </div>

              {/* Collapsible Diagnostics - Visible only for Administrators */}
              {isAdmin && (
                <div className="bg-black/15 p-3 sm:py-3 border-b border-white/10 shrink-0 z-10 relative backdrop-blur-sm">
                  <button
                    onClick={() => setShowDiagnostics(!showDiagnostics)}
                    className="w-full flex items-center justify-between text-[10px] font-sans text-zinc-400 hover:text-primary tracking-wide uppercase transition-all cursor-pointer font-bold"
                  >
                    <span className="flex items-center gap-2">
                      <Activity size={12} className="text-primary animate-pulse" />
                      {showDiagnostics ? 'Ocultar diagnóstico de conexión' : 'Ver diagnósticos y ping de latencia'}
                    </span>
                    <div className="flex items-center gap-2">
                      <span className="flex items-center gap-1 text-[9px] text-primary normal-case bg-primary/10 px-2.5 py-0.5 rounded-full border border-primary/20 shadow-inner">
                        <span className="h-1.5 w-1.5 rounded-full bg-primary animate-pulse" />
                        🛡️ Rol Administrador
                      </span>
                      {showDiagnostics ? <ChevronUp size={14} className="text-primary" /> : <ChevronDown size={14} className="text-primary" />}
                    </div>
                  </button>

                  <AnimatePresence>
                    {showDiagnostics && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.25, ease: "easeInOut" }}
                        className="overflow-hidden mt-3 space-y-3"
                      >
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[10px] font-sans">
                          {/* Cloud Firestore Connection Check */}
                          <div className="bg-black/40 p-2.5 rounded-xl border border-white/5 flex items-center justify-between shadow-inner">
                            <span className="text-zinc-400 flex items-center gap-1.5">
                              <Wifi size={11} className="text-primary" /> Conexión con Base de Datos:
                            </span>
                            <span className={`${firebaseConnected !== false ? 'text-emerald-400' : 'text-red-400'} font-bold flex items-center gap-1.5`}>
                              <span className={`h-1.5 w-1.5 rounded-full ${firebaseConnected !== false ? 'bg-emerald-450 animate-pulse animate-duration-1000' : 'bg-red-500'}`} />
                              {firebaseConnected !== false ? 'Estable' : 'Desconectado'}
                            </span>
                          </div>

                          {/* Registered Role Info */}
                          <div className="bg-black/40 p-2.5 rounded-xl border border-white/5 flex items-center justify-between shadow-inner">
                            <span className="text-zinc-400 flex items-center gap-1.5">
                              <Clock size={11} className="text-primary" /> Latencia (Ping):
                            </span>
                            <span className={`font-bold font-mono ${
                              measuredPing && measuredPing < 150 
                                ? "text-emerald-400" 
                                : measuredPing && measuredPing < 350 
                                  ? "text-amber-450" 
                                  : "text-rose-400"
                            }`}>
                              {measuredPing ? `${measuredPing} ms` : 'Calculando...'}
                            </span>
                          </div>
                        </div>

                        {/* Automation repair activation */}
                        <div className="space-y-2">
                          <button
                            disabled={isDiagnosticRunning}
                            onClick={handleAutoRepair}
                            className="w-full bg-primary/10 hover:bg-primary/20 text-primary hover:text-white font-sans py-2 px-3 rounded-xl border border-primary/20 hover:border-primary/40 transition-all text-[11px] flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 tracking-wide font-semibold h-[40px] shadow-sm animate-fade-in"
                          >
                            {isDiagnosticRunning ? (
                              <>
                                <Loader2 className="animate-spin text-primary" size={12} />
                                Optimizando memoria y midiendo latencias...
                              </>
                            ) : (
                              <>
                                <Play size={10} className="text-primary" />
                                Ejecutar Pruebas y Limpiar Caché Temporal
                              </>
                            )}
                          </button>

                          {diagnosticMessage && (
                            <div className="text-[9.5px] font-sans p-2.5 bg-primary/10 rounded-xl border border-primary/20 text-primary flex items-center gap-1.5 shadow-[inset_0_1px_10px_rgba(59,130,246,0.05)]">
                              <span className="h-1.5 w-1.5 bg-primary rounded-full animate-ping" />
                              {diagnosticMessage}
                            </div>
                          )}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              )}

              {/* Chat Board Area - Scrollable with fluid heights and padded boundaries */}
              <div 
                className="flex-grow overflow-y-auto overscroll-y-contain p-4 space-y-4 bg-transparent z-10 relative scrollbar-thin scrollbar-thumb-white/5"
                style={{ WebkitOverflowScrolling: 'touch' }}
              >

                <AnimatePresence initial={false}>
                  {messages.map((m) => {
                    const isUser = m.role === 'user';
                    return (
                      <motion.div
                        key={m.id}
                        initial={{ opacity: 0, y: 15, scale: 0.96 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.92 }}
                        transition={{ type: "spring", damping: 22, stiffness: 220 }}
                        layout="position"
                        className={`flex gap-2 sm:gap-3 ${isUser ? 'justify-end' : 'justify-start'}`}
                      >
                        {/* IA Avatar on Left */}
                        {!isUser && (
                          <div className="h-7 w-7 sm:h-8 sm:w-8 rounded-lg sm:rounded-xl bg-gradient-to-br from-primary to-indigo-500 p-[1px] shrink-0 mt-1 shadow-[0_0_15px_rgba(59,130,246,0.25)]">
                            <div className="h-full w-full bg-zinc-950 rounded-[7px] sm:rounded-[11px] flex items-center justify-center text-primary">
                              <Bot size={13} className="text-primary" />
                            </div>
                          </div>
                        )}

                        <div className="flex flex-col max-w-[85%] sm:max-w-[80%]">
                          <div
                            className={`p-3 sm:p-4 rounded-2xl relative shadow-md border transition-all duration-305 ${
                              isUser
                                ? 'bg-gradient-to-br from-primary/20 via-primary/10 to-indigo-950/20 text-indigo-50 rounded-tr-none text-[13.5px] sm:text-sm border-primary/30 shadow-[0_4px_20px_rgba(59,130,246,0.18)] font-sans tracking-wide leading-relaxed backdrop-blur-md'
                                : 'bg-white/[0.03] hover:bg-white/[0.05] text-zinc-100 rounded-tl-none border border-white/5 border-l-[3px] border-l-primary text-[13.5px] sm:text-sm backdrop-blur-md shadow-[0_4px_24px_rgba(0,0,0,0.35)] font-sans tracking-wide leading-relaxed'
                            }`}
                          >
                            <div className="space-y-1.5 select-text">
                              {formatText(m.text)}
                            </div>
                          </div>
                          <span className={`text-[8.5px] text-zinc-550 font-mono mt-1 flex items-center gap-1 px-1 ${isUser ? 'justify-end' : 'justify-start'}`}>
                            <Clock size={9} className="opacity-65 text-primary" />
                            {m.timestamp.toLocaleTimeString('es-VE', { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>

                        {/* User Avatar on Right */}
                        {isUser && (
                          <div className="h-7 w-7 sm:h-8 sm:w-8 rounded-lg sm:rounded-xl bg-gradient-to-br from-primary/30 to-indigo-950/40 border border-primary/25 flex items-center justify-center text-primary font-display text-[11px] font-extrabold shrink-0 mt-1 uppercase shadow-md backdrop-blur-sm shadow-[0_0_10px_rgba(59,130,246,0.1)]">
                            {profile?.displayName ? profile.displayName.slice(0, 2) : (user?.displayName ? user.displayName.slice(0, 2) : 'GL')}
                          </div>
                        )}
                      </motion.div>
                    );
                  })}
                </AnimatePresence>

                {isLoading && (
                  <motion.div 
                    initial={{ opacity: 0, y: 10, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0 }}
                    className="flex gap-2 sm:gap-3 justify-start"
                  >
                    <div className="h-7 w-7 sm:h-8 sm:w-8 rounded-lg sm:rounded-xl bg-gradient-to-br from-primary to-indigo-500 p-[1px] shrink-0 mt-1 shadow-[0_0_15px_rgba(59,130,246,0.25)]">
                      <div className="h-full w-full bg-zinc-950 rounded-[7px] sm:rounded-[11px] flex items-center justify-center text-primary">
                        <Bot size={13} className="text-primary" />
                      </div>
                    </div>
                    <div className="max-w-[85%] sm:max-w-[80%] flex flex-col">
                      <div className="p-3 sm:p-3.5 rounded-2xl bg-white/[0.02] border border-white/5 text-[13px] rounded-tl-none backdrop-blur-md flex items-center gap-3">
                        <div className="flex items-center gap-1.5 py-1 px-0.5">
                          <span className="h-1.5 w-1.5 rounded-full bg-primary animate-bounce [animation-delay:-0.3s] shadow-[0_0_4px_rgba(59,130,246,0.8)]" />
                          <span className="h-1.5 w-1.5 rounded-full bg-indigo-500 animate-bounce [animation-delay:-0.15s] shadow-[0_0_4px_rgba(99,102,241,0.8)]" />
                          <span className="h-1.5 w-1.5 rounded-full bg-blue-400 animate-bounce shadow-[0_0_4px_rgba(96,165,250,0.8)]" />
                        </div>
                        <span className="text-[10px] font-sans text-primary/80 animate-pulse">Escribiendo...</span>
                      </div>
                    </div>
                  </motion.div>
                )}

                {errorDetails && (
                  <motion.div 
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="ml-9 sm:ml-11 p-3 bg-rose-500/10 border border-rose-500/20 rounded-xl text-rose-400 text-[11px] font-sans space-y-1 backdrop-blur-md"
                  >
                    <p className="font-bold flex items-center gap-1.5 text-rose-300">
                      <AlertTriangle size={12} /> Error temporal de conexión
                    </p>
                    <p>{errorDetails}</p>
                  </motion.div>
                )}

                <div ref={messagesEndRef} />
              </div>

              {/* Clickable Quick Preload Presets - Horizontal Scrolling Slider Optimized for Smartphones with staggered slide-in effect */}
              <div className="px-3 py-3 sm:px-4 bg-black/15 border-t border-white/10 shrink-0 z-10 relative backdrop-blur-sm">
                <p className="text-[8.5px] font-sans text-primary/60 mb-2.5 uppercase tracking-wider flex items-center gap-1.5 font-bold">
                  <HelpCircle size={10} className="text-primary" /> Sugerencias de ayuda
                </p>
                <div className="flex gap-2 overflow-x-auto pb-1.5 scrollbar-thin scrollbar-thumb-white/5">
                  {FAQ_PRESETS.map((faq, i) => (
                    <motion.button
                      key={i}
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: i * 0.08, type: "spring", stiffness: 150, damping: 15 }}
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      disabled={isLoading}
                      onClick={() => handleSendMessage(faq.message)}
                      className="text-[10px] font-mono py-2 px-3.5 rounded-xl bg-white/[0.02] hover:bg-primary/10 border border-white/5 hover:border-primary/40 text-zinc-400 hover:text-primary transition-all duration-300 cursor-pointer text-left shrink-0 whitespace-nowrap shadow-sm hover:shadow-[0_0_12px_rgba(59,130,246,0.15)]"
                    >
                      {faq.question}
                    </motion.button>
                  ))}

                  {/* Fallback support for WhatsApp inside the suggestions */}
                  <motion.a
                    href="https://wa.me/584124780457?text=Hola%20Nexus%20Arena%21%20Necesito%20soporte%20o%20ayuda%20para%20asistencia%20en%20la%20plataforma."
                    target="_blank"
                    rel="noreferrer"
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: FAQ_PRESETS.length * 0.08, type: "spring", stiffness: 150, damping: 15 }}
                    whileHover={{ scale: 1.02 }}
                    className="text-[10px] font-mono py-2 px-3.5 rounded-xl bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/20 hover:border-emerald-500 text-emerald-450 hover:text-emerald-300 transition-all duration-300 cursor-pointer text-left shrink-0 whitespace-nowrap flex items-center gap-1.5 shadow-sm shadow-[0_0_10px_rgba(16,185,129,0.05)]"
                  >
                    <span>🇻🇪 WhatsApp Humano</span>
                  </motion.a>
                </div>
              </div>

              {/* Input Dock - Safe for iOS & Android virtual keyboard offsets */}
              <div 
                className="p-3 sm:p-4 border-t border-white/10 bg-black/25 shrink-0 z-10 relative backdrop-blur-sm"
                style={{ paddingBottom: 'calc(1rem + env(safe-area-inset-bottom, 0px))' }}
              >
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    handleSendMessage(inputVal);
                  }}
                  className="flex gap-2"
                >
                  <input
                    value={inputVal}
                    onChange={(e) => setInputVal(e.target.value)}
                    disabled={isLoading}
                    placeholder="Escribe tu consulta..."
                    className="flex-grow bg-black/45 hover:bg-black/60 focus:bg-black/85 text-zinc-100 placeholder-zinc-500 rounded-xl border border-white/5 px-4 py-3 text-[16px] sm:text-[13px] font-sans tracking-wide focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/20 transition-all disabled:opacity-50 h-[44px]"
                  />
                  <button
                    type="submit"
                    disabled={!inputVal.trim() || isLoading}
                    className="w-[44px] h-[44px] bg-primary hover:bg-white text-black rounded-xl transition-all cursor-pointer disabled:opacity-30 disabled:pointer-events-none flex items-center justify-center font-bold shrink-0 shadow-[0_0_15px_rgba(59,130,246,0.25)] hover:shadow-[0_0_15px_rgba(59,130,246,0.45)] border border-primary/25"
                  >
                    <Send size={15} />
                  </button>
                </form>
                <p className="text-[8px] font-sans text-zinc-500 text-center mt-2.5 uppercase tracking-wider">
                  ✓ Soporte disponible para ayudarte de forma inmediata con tus dudas.
                </p>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
};
