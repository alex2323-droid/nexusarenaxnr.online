import React, { useState } from 'react';
import { Trophy, ChevronRight, Zap, Target, Loader2, Gamepad2, Shield, Mail, Lock, User as UserIcon } from 'lucide-react';
import { loginWithEmail, registerWithEmail, resetPassword } from '../lib/firebase';
import { updateProfile } from 'firebase/auth';
import { motion, AnimatePresence } from 'motion/react';
import { useNavigate } from 'react-router-dom';

export default function LoginPage() {
  const [isLoading, setIsLoading] = useState(false);
  const [isRegistering, setIsRegistering] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [username, setUsername] = useState('');
  const [resetStatus, setResetStatus] = useState<{type: 'success' | 'error', message: string} | null>(null);
  const navigate = useNavigate();

  const handleResetPassword = async () => {
    if (!email) {
      setResetStatus({ type: 'error', message: 'Por favor ingresa tu correo electrónico arriba para restablecer tu contraseña.' });
      return;
    }
    setIsLoading(true);
    setResetStatus(null);
    try {
      await resetPassword(email);
      setResetStatus({ 
        type: 'success', 
        message: '¡Enlace enviado! Revisa tu bandeja de entrada y tu carpeta de SPAM (el remitente será noreply@...).' 
      });
    } catch (error: any) {
      console.error(error?.message || error);
      setResetStatus({ type: 'error', message: 'Error al enviar el enlace. Verifica que el correo sea correcto.' });
    } finally {
      setIsLoading(false);
    }
  };

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      if (isRegistering) {
        const result = await registerWithEmail(email, password);
        if (result.user) {
          await updateProfile(result.user, {
            displayName: username
          });
        }
      } else {
        await loginWithEmail(email, password);
      }
      navigate('/');
    } catch (error: any) {
      console.error(error?.message || error);
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
            <div className="flex flex-col items-center mb-8 relative">
              <motion.div 
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: "spring", stiffness: 200, damping: 20, delay: 0.2 }}
                className="w-16 h-16 sm:w-20 sm:h-20 mb-4 bg-gradient-to-br from-primary via-rose-500 to-indigo-600 rounded-[1.5rem] p-[2px] relative skew-x-[0deg]"
              >
                <div className="absolute inset-0 bg-primary/30 blur-2xl rounded-full" />
                <div className="w-full h-full bg-zinc-950 rounded-[22px] flex items-center justify-center relative z-10 overflow-hidden">
                  <img src="/logo.png" alt="Nexus Arena" className="w-[70%] h-[70%] object-contain" onError={(e) => {
                    e.currentTarget.style.display = 'none';
                    e.currentTarget.parentElement?.querySelector('svg')?.classList.remove('hidden');
                  }} />
                  <Trophy className="text-white drop-shadow-[0_0_15px_rgba(59,130,246,0.8)] hidden" size={24} />
                </div>
              </motion.div>
              
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                className="text-center"
              >
                <h1 className="text-3xl sm:text-4xl tracking-tighter uppercase italic font-display text-white mb-2 leading-[0.8] drop-shadow-md">
                  Nexus <span className="text-primary tracking-tight">Arena</span>
                </h1>
                <p className="text-[9px] text-zinc-400 font-mono tracking-[0.2em] uppercase flex items-center justify-center gap-2 mt-4 ml-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse shadow-[0_0_10px_rgba(59,130,246,0.8)]" />
                  Plataforma Competitiva
                </p>
              </motion.div>
            </div>

            <form onSubmit={handleEmailAuth} className="space-y-4 mb-6">
              <AnimatePresence mode="popLayout">
                {isRegistering && (
                  <motion.div
                    initial={{ opacity: 0, height: 0, y: -10 }}
                    animate={{ opacity: 1, height: 'auto', y: 0 }}
                    exit={{ opacity: 0, height: 0, y: -10 }}
                    className="relative"
                  >
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <UserIcon size={18} className="text-zinc-500" />
                    </div>
                    <input
                      type="text"
                      placeholder="Nombre de Usuario"
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      required={isRegistering}
                      className="w-full bg-white/5 border border-white/10 rounded-xl py-3 pl-10 pr-4 text-white placeholder:text-zinc-500 focus:outline-none focus:border-primary/50 focus:bg-white/10 transition-all font-sans text-sm"
                    />
                  </motion.div>
                )}
              </AnimatePresence>

              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Mail size={18} className="text-zinc-500" />
                </div>
                <input
                  type="email"
                  placeholder="Correo Electrónico"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="w-full bg-white/5 border border-white/10 rounded-xl py-3 pl-10 pr-4 text-white placeholder:text-zinc-500 focus:outline-none focus:border-primary/50 focus:bg-white/10 transition-all font-sans text-sm"
                />
              </div>

              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Lock size={18} className="text-zinc-500" />
                </div>
                <input
                  type="password"
                  placeholder="Contraseña"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="w-full bg-white/5 border border-white/10 rounded-xl py-3 pl-10 pr-4 text-white placeholder:text-zinc-500 focus:outline-none focus:border-primary/50 focus:bg-white/10 transition-all font-sans text-sm"
                />
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full bg-primary text-white py-3.5 px-6 rounded-xl font-display text-sm uppercase italic font-bold tracking-wider flex items-center justify-center gap-2 transition-colors hover:bg-blue-600 shadow-[0_0_20px_rgba(59,130,246,0.3)] hover:shadow-[0_0_30px_rgba(59,130,246,0.5)] relative overflow-hidden group mt-2"
              >
                {isLoading ? (
                  <Loader2 className="animate-spin" size={20} />
                ) : (
                  <>
                    <span className="skew-x-[-10deg]">{isRegistering ? 'Crear Cuenta' : 'Iniciar Sesión'}</span>
                    <ChevronRight size={18} className="opacity-70 group-hover:translate-x-1 transition-transform" />
                  </>
                )}
              </button>
            </form>

            <AnimatePresence>
              {resetStatus && (
                <motion.div
                  initial={{ opacity: 0, height: 0, scale: 0.95 }}
                  animate={{ opacity: 1, height: 'auto', scale: 1 }}
                  exit={{ opacity: 0, height: 0, scale: 0.95 }}
                  className={`mb-6 p-4 rounded-xl border text-sm ${resetStatus.type === 'success' ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' : 'bg-red-500/10 border-red-500/20 text-red-400'}`}
                >
                  {resetStatus.message}
                </motion.div>
              )}
            </AnimatePresence>

              <div className="flex flex-col items-center gap-4">
                <button
                  type="button"
                  onClick={() => setIsRegistering(!isRegistering)}
                  className="text-xs text-zinc-400 hover:text-white transition-colors font-sans"
                >
                  {isRegistering ? '¿Ya tienes cuenta? Inicia sesión' : '¿No tienes cuenta? Regístrate'}
                </button>
                {!isRegistering && (
                  <button
                    type="button"
                    onClick={handleResetPassword}
                    className="text-xs text-primary hover:text-blue-400 transition-colors font-sans"
                  >
                    ¿Olvidaste tu contraseña o iniciaste con Google antes? Crea una aquí.
                  </button>
                )}
              </div>
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
