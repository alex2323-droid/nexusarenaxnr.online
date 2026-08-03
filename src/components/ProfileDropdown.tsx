import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { User, Settings, Shield, Headset, LogOut, ChevronDown, Mail, MessageCircle } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';

interface ProfileDropdownProps {
  user: any;
  profile: any;
  isAdmin: boolean;
  handleLogout: () => void;
}

const ProfileDropdown: React.FC<ProfileDropdownProps> = ({ user, profile, isAdmin, handleLogout }) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const closeMenu = () => setIsOpen(false);

  return (
    <div className="relative" ref={dropdownRef}>
      <button 
        onClick={() => setIsOpen(!isOpen)} 
        className="flex items-center gap-2 px-2 py-1.5 md:px-3 md:py-2 rounded-xl hover:bg-white/5 transition-colors focus:outline-none"
      >
        <img 
          src={profile?.photoURL || user?.photoURL || `https://api.dicebear.com/7.x/avataaars/svg?seed=${user?.uid}`} 
          className="w-8 h-8 rounded-full bg-zinc-800 border border-white/10 object-cover"
          alt="Avatar"
        />
        <div className="hidden md:flex flex-col items-start -gap-1">
            <span className="text-sm font-bold truncate max-w-[120px] leading-tight">{profile?.displayName || user?.displayName || 'Usuario'}</span>
            <span className="text-[10px] text-gray-400 font-mono leading-tight">{isAdmin ? 'Admin' : 'Jugador'}</span>
        </div>
        <ChevronDown size={16} className={`hidden md:block transition-transform duration-300 ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div 
            initial={{ opacity: 0, y: 10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.95 }}
            transition={{ duration: 0.2 }}
            className="absolute right-0 top-full mt-2 w-64 bg-zinc-950 border border-white/10 rounded-2xl shadow-2xl overflow-hidden z-[100]"
          >
            <div className="p-4 border-b border-white/5 bg-white/5">
                <p className="text-sm font-bold truncate">{profile?.displayName || user?.displayName || 'Usuario'}</p>
                <p className="text-xs text-gray-400 truncate">{user?.email}</p>
            </div>

            <div className="py-2">
              <Link 
                to="/profile" 
                onClick={closeMenu}
                className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-gray-300 hover:text-white hover:bg-white/5 transition-colors"
              >
                <User size={18} className="text-primary" />
                <span>Perfil</span>
              </Link>
              
              <Link 
                to="/profile?tab=config" 
                onClick={closeMenu}
                className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-gray-300 hover:text-white hover:bg-white/5 transition-colors"
              >
                <Settings size={18} className="text-gray-400" />
                <span>Configuración</span>
              </Link>

              {isAdmin && (
                <Link 
                  to="/admin" 
                  onClick={closeMenu}
                  className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-gray-300 hover:text-white hover:bg-white/5 transition-colors"
                >
                  <Shield size={18} className="text-amber-500" />
                  <span>Administración</span>
                </Link>
              )}

              {/* Customer Support Section */}
              <div className="px-4 py-2.5 mt-2 border-t border-white/5">
                <div className="flex items-center gap-2 mb-2">
                    <Headset size={16} className="text-blue-400" />
                    <span className="text-xs font-bold text-gray-400 uppercase tracking-widest">Atención al Cliente</span>
                </div>
                <div className="space-y-2">
                    <a href="mailto:soporte@nexusarena.com" className="flex items-center gap-2 text-sm text-gray-300 hover:text-white transition-colors group">
                        <div className="w-6 h-6 rounded-lg bg-white/5 flex items-center justify-center group-hover:bg-blue-500/20 transition-colors">
                            <Mail size={14} className="text-gray-400 group-hover:text-blue-400" />
                        </div>
                        <span>soporte@nexusarena.com</span>
                    </a>
                    <a href="https://wa.me/580000000000" target="_blank" rel="noreferrer" className="flex items-center gap-2 text-sm text-gray-300 hover:text-white transition-colors group">
                        <div className="w-6 h-6 rounded-lg bg-white/5 flex items-center justify-center group-hover:bg-green-500/20 transition-colors">
                            <MessageCircle size={14} className="text-gray-400 group-hover:text-green-400" />
                        </div>
                        <span>WhatsApp (Soporte)</span>
                    </a>
                </div>
              </div>

              <div className="h-px bg-white/5 my-2"></div>

              <button 
                onClick={() => { closeMenu(); handleLogout(); }}
                className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-red-400 hover:text-red-300 hover:bg-red-500/10 transition-colors"
              >
                <LogOut size={18} />
                <span>Cerrar Sesión</span>
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default ProfileDropdown;
