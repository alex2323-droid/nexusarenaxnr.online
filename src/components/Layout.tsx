import React from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { signInWithGoogle } from '../lib/firebase';
import { auth } from '../lib/firebase';
import { Trophy, User, MessageSquare, Bell, LogOut, Shield, Menu, X, Zap, Youtube, Radio, ChevronRight } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../lib/utils';
import NotificationsBell from './NotificationsBell';
import ThemeToggle from './ThemeToggle';
import RealTimeNotifications from './RealTimeNotifications';
import { AISupportConsole } from './AISupportConsole';

const Layout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, profile, isAdmin } = useAuth();
  const [isMenuOpen, setIsMenuOpen] = React.useState(false);
  const [isNavigating, setIsNavigating] = React.useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  React.useEffect(() => {
    setIsNavigating(true);
    const timeout = setTimeout(() => {
      setIsNavigating(false);
    }, 450);
    return () => clearTimeout(timeout);
  }, [location.pathname]);

  const handleLogin = async () => {
    try {
      await signInWithGoogle();
    } catch (error) {
      console.error(error);
    }
  };

  const handleLogout = async () => {
    await auth.signOut();
    navigate('/');
  };

  const NavLink = ({ to, icon: Icon, children: label, className }: any) => (
    <motion.div
      whileHover={{ scale: 1.05, y: -1 }}
      whileTap={{ scale: 0.96 }}
      transition={{ type: "spring", stiffness: 400, damping: 15 }}
    >
      <Link 
        to={to} 
        className={cn(
          "flex items-center gap-2 px-4 py-2 text-sm font-medium transition-all hover:text-primary",
          className
        )}
        onClick={() => setIsMenuOpen(false)}
      >
        <Icon size={18} />
        <span>{label}</span>
      </Link>
    </motion.div>
  );

  const MobileNavLink = ({ to, icon: Icon, children: label, className, active }: any) => (
    <motion.div
      variants={{
        hidden: { opacity: 0, x: 20 },
        show: { opacity: 1, x: 0 }
      }}
      whileHover={{ scale: 1.02, x: 4 }}
      whileTap={{ scale: 0.98 }}
      className="w-full"
    >
      <Link 
        to={to} 
        className={cn(
          "flex items-center justify-between w-full h-12 px-4 rounded-xl text-sm font-semibold border transition-all duration-300",
          active 
            ? "bg-primary/10 border-primary/30 text-primary shadow-[0_0_15px_rgba(244,63,94,0.08)]" 
            : "bg-zinc-900/40 hover:bg-zinc-900/80 border-transparent hover:border-zinc-800 text-zinc-300 hover:text-white",
          className
        )}
        onClick={() => setIsMenuOpen(false)}
      >
        <div className="flex items-center gap-3">
          <Icon size={18} className={active ? "text-primary" : "text-zinc-400"} />
          <span>{label}</span>
        </div>
        <ChevronRight size={14} className={active ? "text-primary animate-pulse" : "text-zinc-650"} />
      </Link>
    </motion.div>
  );

  return (
    <div className="min-h-screen flex flex-col relative">
      <RealTimeNotifications />
      <AISupportConsole />
      {/* Global Navigation Progress Bar */}
      <AnimatePresence>
        {isNavigating && (
          <motion.div 
            initial={{ width: "0%", opacity: 1 }}
            animate={{ width: "100%", opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.45, ease: "circIn" }}
            className="fixed top-0 left-0 h-[3px] bg-primary z-[9999] shadow-[0_0_15px_rgba(var(--color-primary),0.6)]"
          />
        )}
      </AnimatePresence>

      {/* Navbar */}
      <nav className="sticky top-0 z-50 border-b border-white/10 bg-black/80 backdrop-blur-md dark:bg-black/80 light:bg-white/80 transition-colors">
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2">
            <div className="relative w-10 h-10 flex items-center justify-center">
              <img 
                src="/logo.png" 
                alt="Nexus Arena Logo" 
                className="w-full h-full object-contain z-10" 
                onError={(e) => {
                  e.currentTarget.style.display = 'none';
                  const fallback = e.currentTarget.nextElementSibling;
                  if (fallback) fallback.classList.remove('hidden');
                }} 
              />
              <Trophy className="text-primary hidden absolute inset-0 m-auto" size={28} />
              
              {/* Firestore Live Indicator */}
              <div className="absolute -top-1 -right-1 z-20 flex" title="Nexus Cloud Sync Active">
                <span className="relative flex h-3 w-3">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-3 w-3 bg-primary"></span>
                </span>
              </div>
            </div>
            <div className="flex flex-col -gap-1">
              <span className="font-display text-2xl tracking-tighter uppercase italic leading-none">Nexus Arena</span>
              <span className="text-[8px] font-black uppercase tracking-[0.3em] text-primary flex items-center gap-1">
                <div className="w-1 h-1 bg-primary rounded-full animate-pulse" />
                Live Cloud Sync
              </span>
            </div>
          </Link>

          {/* Desktop Nav */}
          <div className="hidden md:flex items-center gap-4">
            <ThemeToggle />
            <NavLink to="/" icon={Trophy}>Torneos</NavLink>
            <NavLink to="/live" icon={Radio} className="text-red-500 animate-pulse font-bold">LIVE</NavLink>
            <NavLink to="/leaderboard" icon={Shield}>Clasificación</NavLink>
            {user ? (
              <>
                <NotificationsBell />
                <NavLink to="/profile" icon={User}>Perfil</NavLink>
                {isAdmin && <NavLink to="/admin" icon={Shield}>Admin</NavLink>}
                <motion.button 
                  onClick={handleLogout}
                  whileHover={{ scale: 1.05, y: -1 }}
                  whileTap={{ scale: 0.95 }}
                  transition={{ type: "spring", stiffness: 450, damping: 15 }}
                  className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-red-500 hover:text-red-450 transition-colors cursor-pointer"
                >
                  <LogOut size={18} />
                  <span>Salir</span>
                </motion.button>
              </>
            ) : (
              <motion.button 
                onClick={handleLogin}
                whileHover={{ scale: 1.05, skewX: -10 }}
                whileTap={{ scale: 0.95 }}
                transition={{ type: "spring", stiffness: 450, damping: 15 }}
                className="bg-primary text-black px-6 py-2 font-display text-sm uppercase skew-x-[-10deg] hover:bg-white hover:shadow-[0_0_15px_rgba(59,130,246,0.3)] transition-all cursor-pointer font-bold"
              >
                Ingresar
              </motion.button>
            )}
          </div>

          {/* Mobile Menu Toggle */}
          <div className="flex items-center gap-2 md:hidden">
            <ThemeToggle />
            <motion.button 
              id="mobile-menu-toggle"
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.9 }}
              className="w-11 h-11 flex items-center justify-center rounded-xl bg-zinc-900/50 hover:bg-zinc-900 border border-zinc-800/60 hover:border-zinc-700/80 text-zinc-100 transition-all duration-200 cursor-pointer shadow-sm relative overflow-hidden z-[51]"
            >
              <AnimatePresence mode="wait">
                <motion.div
                  key={isMenuOpen ? "open" : "closed"}
                  initial={{ opacity: 0, rotate: -90, scale: 0.8 }}
                  animate={{ opacity: 1, rotate: 0, scale: 1 }}
                  exit={{ opacity: 0, rotate: 90, scale: 0.8 }}
                  transition={{ duration: 0.2 }}
                  className="absolute"
                >
                  {isMenuOpen ? <X size={22} className="text-primary" /> : <Menu size={22} />}
                </motion.div>
              </AnimatePresence>
            </motion.button>
          </div>
        </div>
      </nav>

      {/* Mobile Nav Backdrop Screen Blur */}
      <AnimatePresence>
        {isMenuOpen && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 0.65 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
            onClick={() => setIsMenuOpen(false)}
            className="md:hidden fixed inset-0 z-40 bg-black/90 backdrop-blur-sm"
          />
        )}
      </AnimatePresence>

      {/* Mobile Nav Drawer Side Sheet */}
      <AnimatePresence>
        {isMenuOpen && (
          <motion.div 
            initial={{ x: "-100%" }}
            animate={{ x: 0 }}
            exit={{ x: "-100%" }}
            transition={{ type: "spring", damping: 28, stiffness: 240 }}
            className="md:hidden fixed top-0 left-0 bottom-0 w-[290px] h-screen z-[45] bg-[#09090b] border-r border-zinc-900 p-6 pt-24 flex flex-col justify-between shadow-2xl"
          >
            {/* Top decorative gradient bar in the drawer */}
            <div className="absolute top-0 left-0 w-full h-[3px] bg-gradient-to-r from-primary via-rose-500 to-indigo-600" />
            
            <div className="flex flex-col gap-6">
              {/* Header inside drawer */}
              <div className="flex flex-col pb-4 border-b border-zinc-855">
                <span className="text-[10px] font-mono text-zinc-500 uppercase tracking-widest flex items-center gap-1.5">
                  <Zap size={10} className="text-primary animate-pulse" /> ARENA NAVEGACIÓN
                </span>
              </div>

              {/* Navigation Links Area */}
              <motion.div 
                variants={{
                  show: {
                    transition: { staggerChildren: 0.05, delayChildren: 0.05 }
                  }
                }}
                initial="hidden"
                animate="show"
                className="flex flex-col gap-2.5"
              >
                <MobileNavLink to="/" icon={Trophy} active={location.pathname === '/'}>Torneos</MobileNavLink>
                <MobileNavLink to="/live" icon={Radio} active={location.pathname === '/live'} className="text-red-500 font-bold">LIVE</MobileNavLink>
                <MobileNavLink to="/leaderboard" icon={Shield} active={location.pathname === '/leaderboard'}>Clasificación</MobileNavLink>
                
                {user && (
                  <>
                    <MobileNavLink to="/profile" icon={User} active={location.pathname === '/profile'}>Perfil</MobileNavLink>
                    {isAdmin && <MobileNavLink to="/admin" icon={Shield} active={location.pathname === '/admin'}>Admin</MobileNavLink>}
                  </>
                )}
              </motion.div>
            </div>

            {/* Bottom Actions card inside Mobile Drawer */}
            <div className="mt-auto pt-5 border-t border-zinc-855 flex flex-col gap-4">
              {user ? (
                <div className="space-y-4">
                  {/* Premium Mobile User Card */}
                  <div className="p-3 rounded-xl bg-zinc-900/40 border border-zinc-800 flex items-center gap-3">
                    <div className="h-9 w-9 rounded-lg bg-gradient-to-br from-primary via-rose-500 to-indigo-600 p-[1px] shrink-0">
                      <div className="h-full w-full bg-zinc-950 rounded-[7px] flex items-center justify-center text-primary font-display text-xs font-bold uppercase">
                        {profile?.displayName ? profile.displayName.slice(0, 2) : (user?.displayName ? user.displayName.slice(0, 2) : 'GL')}
                      </div>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-bold text-zinc-200 truncate">
                        {profile?.displayName || user?.displayName || 'Gamer'}
                      </p>
                      <p className="text-[10px] text-zinc-500 truncate font-mono">
                        {user.email || ''}
                      </p>
                    </div>
                  </div>

                  <motion.button 
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => {
                      handleLogout();
                      setIsMenuOpen(false);
                    }} 
                    className="w-full h-11 flex items-center justify-center gap-2 text-xs font-mono font-bold text-red-500 hover:text-red-450 bg-red-500/5 hover:bg-red-500/10 border border-red-500/10 hover:border-red-500/20 rounded-xl transition-all duration-300 cursor-pointer"
                  >
                    <LogOut size={14} /> SALIR DE LA ARENA
                  </motion.button>
                </div>
              ) : (
                <motion.button 
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => {
                    handleLogin();
                    setIsMenuOpen(false);
                  }}
                  className="w-full py-3 px-6 bg-gradient-to-r from-primary to-rose-500 text-black font-display text-xs font-black uppercase tracking-wider skew-x-[-10deg] hover:from-white hover:to-white transition-all shadow-[0_4px_15px_rgba(244,63,94,0.25)] flex items-center justify-center gap-2 cursor-pointer"
                >
                  <User size={14} className="skew-x-[10deg]" />
                  <span className="skew-x-[10deg]">INGRESAR</span>
                </motion.button>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <main className="flex-grow max-w-7xl mx-auto w-full px-4 py-8">
        <AnimatePresence mode="wait">
          <motion.div
            key={location.pathname}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.3, ease: "easeOut" }}
          >
            {children}
          </motion.div>
        </AnimatePresence>
      </main>

      {/* Footer */}
      <footer className="border-t border-white/10 py-8 bg-surface">
        <div className="max-w-7xl mx-auto px-4 flex flex-col md:flex-row items-center justify-between gap-4 text-sm text-gray-400">
          <p>© 2024 Nexus Arena - Comunidad Gamer Venezuela 🇻🇪</p>
          <div className="flex flex-col md:flex-row items-center gap-6">
            <motion.a 
              href="https://youtube.com/@nexusarena-v6u?si=22-HWUtDl6deAVDc" 
              target="_blank" 
              rel="noreferrer"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="flex items-center gap-2 text-red-500 hover:text-white transition-colors font-bold uppercase tracking-widest text-[10px]"
            >
              <Youtube size={16} /> Ver en YouTube
            </motion.a>
            <motion.a 
              href="https://discord.gg/hRtF3YVQ7" 
              target="_blank" 
              rel="noreferrer"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="flex items-center gap-2 text-primary hover:text-white transition-colors font-bold uppercase tracking-widest text-[10px]"
            >
              <MessageSquare size={16} /> Comunidad Discord
            </motion.a>
            <span>Soporte Venezuela</span>
            <span>Reglas Locales</span>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Layout;
