import React from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { auth } from '../lib/firebase';
import { Trophy, User, MessageSquare, Bell, LogOut, Shield, Menu, X, Zap, Youtube, Radio, ChevronRight, Users, Swords } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../lib/utils';
import NotificationsBell from './NotificationsBell';
import ThemeToggle from './ThemeToggle';
import RealTimeNotifications from './RealTimeNotifications';
import ProfileDropdown from './ProfileDropdown';


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
            <NavLink to="/leagues" icon={Swords}>Ligas</NavLink>
            <NavLink to="/clans" icon={Users}>Clanes</NavLink>
            <NavLink to="/live" icon={Radio} className="text-red-500 animate-pulse font-bold">LIVE</NavLink>
            <NavLink to="/leaderboard" icon={Shield}>Clasificación</NavLink>
            {user ? (
              <>
                <NotificationsBell />
                {isAdmin && <NavLink to="/forum" icon={MessageSquare}>Foro</NavLink>}
                <ProfileDropdown user={user} profile={profile} isAdmin={isAdmin} handleLogout={handleLogout} />
              </>
            ) : (
              <motion.button 
                onClick={() => navigate('/login')}
                whileHover={{ scale: 1.05, skewX: -10 }}
                whileTap={{ scale: 0.95 }}
                transition={{ type: "spring", stiffness: 450, damping: 15 }}
                className="bg-primary text-black px-6 py-2 font-display text-sm uppercase skew-x-[-10deg] hover:bg-white hover:shadow-[0_0_15px_rgba(59,130,246,0.3)] transition-all cursor-pointer font-bold"
              >
                Ingresar
              </motion.button>
            )}
          </div>

          {/* Mobile Nav Actions (Top) */}
          <div className="flex items-center gap-2 md:hidden">
            <ThemeToggle />
            {user && <NotificationsBell />}
            {user && (
              <ProfileDropdown user={user} profile={profile} isAdmin={isAdmin} handleLogout={handleLogout} />
            )}
            {!user && (
              <button onClick={() => navigate('/login')} className="text-primary p-2">
                <User size={20} />
              </button>
            )}
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="flex-grow max-w-7xl mx-auto w-full px-4 py-8 pb-24 md:pb-8">
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

      {/* Mobile Bottom Navigation */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-[#09090b]/90 backdrop-blur-md border-t border-zinc-800 pb-safe">
        <div className="flex items-center justify-around h-16 px-2">
          <Link to="/" className={cn("flex flex-col items-center justify-center w-full h-full space-y-1 transition-colors", location.pathname === '/' ? "text-primary" : "text-zinc-500 hover:text-zinc-300")}>
            <Trophy size={20} />
            <span className="text-[10px] font-medium">Torneos</span>
          </Link>
          <Link to="/leagues" className={cn("flex flex-col items-center justify-center w-full h-full space-y-1 transition-colors", location.pathname === '/leagues' ? "text-primary" : "text-zinc-500 hover:text-zinc-300")}>
            <Swords size={20} />
            <span className="text-[10px] font-medium">Ligas</span>
          </Link>
          <Link to="/live" className={cn("flex flex-col items-center justify-center w-full h-full space-y-1 transition-colors", location.pathname === '/live' ? "text-red-500 font-bold" : "text-zinc-500 hover:text-red-400")}>
            <Radio size={20} className={location.pathname === '/live' ? "animate-pulse" : ""} />
            <span className="text-[10px] font-medium">LIVE</span>
          </Link>
          <Link to="/leaderboard" className={cn("flex flex-col items-center justify-center w-full h-full space-y-1 transition-colors", location.pathname === '/leaderboard' ? "text-primary" : "text-zinc-500 hover:text-zinc-300")}>
            <Shield size={20} />
            <span className="text-[10px] font-medium">Clasif</span>
          </Link>
          {isAdmin && (
            <Link to="/forum" className={cn("flex flex-col items-center justify-center w-full h-full space-y-1 transition-colors", location.pathname === '/forum' ? "text-primary" : "text-zinc-500 hover:text-zinc-300")}>
              <MessageSquare size={20} />
              <span className="text-[10px] font-medium">Foro</span>
            </Link>
          )}
        </div>
      </div>

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
