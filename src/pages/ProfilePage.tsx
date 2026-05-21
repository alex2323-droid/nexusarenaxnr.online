import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { userService, friendService } from '../services/db';
import axios from 'axios';
import { User, Edit3, Save, Camera, Gamepad2, Trophy, BarChart3, X, MessageSquare, Shield, Target, Zap, Star, Layout, Hash, Medal, Award, Crown, Eye, EyeOff, Swords, Lock, UserPlus, UserCheck, UserX, Search, Check, Clock } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../lib/utils';

const ProfilePage: React.FC = () => {
  const { user, profile, isAdmin } = useAuth();
  const [isEditing, setIsEditing] = React.useState(false);
  const [activeTab, setActiveTab] = React.useState<'profile' | 'friends'>('profile');
  const [friends, setFriends] = React.useState<any[]>([]);
  const [incomingRequests, setIncomingRequests] = React.useState<any[]>([]);
  const [searchTerm, setSearchTerm] = React.useState('');
  const [searchResults, setSearchResults] = React.useState<any[]>([]);
  const [isSearching, setIsSearching] = React.useState(false);
  
  const [formData, setFormData] = React.useState({
    displayName: profile?.displayName || '',
    bio: profile?.bio || '',
    platform: profile?.platform || 'PC',
    gameId: profile?.gameId || '',
    gameNick: profile?.gameNick || '',
    photoURL: profile?.photoURL || user?.photoURL || '',
  });

  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      alert('Por favor selecciona una imagen válida.');
      return;
    }

    // Max 5MB raw file
    if (file.size > 5 * 1024 * 1024) {
      alert('La imagen es demasiado grande (máximo 5MB).');
      return;
    }

    setIsUploading(true);
    try {
      const base64 = await compressImage(file);
      setFormData(prev => ({ ...prev, photoURL: base64 }));
      
      // If not editing, save immediately? No, let's just update the form and the user can save if they want.
      // But usually, photo change is immediate. Let's make it immediate for better UX.
      if (!isEditing && user) {
        await userService.updateProfile(user.uid, { photoURL: base64 });
      }
    } catch (error) {
      console.error('Error processing image:', error);
      alert('Error al procesar la imagen.');
    } finally {
      setIsUploading(false);
    }
  };

  const compressImage = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = (event) => {
        const img = new Image();
        img.src = event.target?.result as string;
        img.onload = () => {
          const canvas = document.createElement('canvas');
          const MAX_WIDTH = 400;
          const MAX_HEIGHT = 400;
          let width = img.width;
          let height = img.height;

          if (width > height) {
            if (width > MAX_WIDTH) {
              height *= MAX_WIDTH / width;
              width = MAX_WIDTH;
            }
          } else {
            if (height > MAX_HEIGHT) {
              width *= MAX_HEIGHT / height;
              height = MAX_HEIGHT;
            }
          }

          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          ctx?.drawImage(img, 0, 0, width, height);
          
          // Quality 0.7 to keep it small enough for Firestore
          const dataUrl = canvas.toDataURL('image/jpeg', 0.7);
          resolve(dataUrl);
        };
        img.onerror = reject;
      };
      reader.onerror = reject;
    });
  };

  const triggerFileSelect = () => {
    fileInputRef.current?.click();
  };

  const AVATAR_OPTIONS = [
    `https://api.dicebear.com/7.x/pixel-art/svg?seed=ProGamer`,
    `https://api.dicebear.com/7.x/pixel-art/svg?seed=Shadow`,
    `https://api.dicebear.com/7.x/pixel-art/svg?seed=Cyber`,
    `https://api.dicebear.com/7.x/pixel-art/svg?seed=Ninja`,
    `https://api.dicebear.com/7.x/pixel-art/svg?seed=Dragon`,
    `https://api.dicebear.com/7.x/pixel-art/svg?seed=Phoenix`,
    `https://api.dicebear.com/7.x/pixel-art/svg?seed=Ghost`,
    `https://api.dicebear.com/7.x/pixel-art/svg?seed=Zenith`,
    `https://api.dicebear.com/7.x/bottts/svg?seed=Droid1`,
    `https://api.dicebear.com/7.x/bottts/svg?seed=Robo2`,
    `https://api.dicebear.com/7.x/avataaars/svg?seed=Player1`,
    `https://api.dicebear.com/7.x/avataaars/svg?seed=Player2`,
  ];

  React.useEffect(() => {
    if (!user) return;

    const unsubFriends = friendService.listenFriends(user.uid, setFriends);
    const unsubRequests = friendService.listenIncomingRequests(user.uid, setIncomingRequests);

    return () => {
      unsubFriends();
      unsubRequests();
    };
  }, [user]);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchTerm.trim()) return;
    setIsSearching(true);
    try {
      const results = await userService.searchUsers(searchTerm);
      // Filter out current user and already friends
      const filtered = results.filter(u => u.id !== user?.uid);
      setSearchResults(filtered);
    } catch (error) {
      console.error('Error searching:', error);
    } finally {
      setIsSearching(false);
    }
  };

  const handleSendRequest = async (targetUser: any) => {
    if (!user || !profile) return;
    try {
      await friendService.sendRequest(
        { uid: user.uid, displayName: profile.displayName || user.displayName, photoURL: user.photoURL },
        targetUser
      );
      alert('Solicitud enviada');
    } catch (error: any) {
      alert(error.message);
    }
  };

  const handleAcceptRequest = async (request: any) => {
    if (!user || !profile) return;
    try {
      await friendService.acceptRequest(request, { 
        uid: user.uid, 
        displayName: profile.displayName || user.displayName, 
        photoURL: user.photoURL 
      });
    } catch (error: any) {
      alert(error.message);
    }
  };

  const handleDeclineRequest = async (requestId: string) => {
    try {
      await friendService.declineRequest(requestId);
    } catch (error: any) {
      alert(error.message);
    }
  };

  React.useEffect(() => {
    if (profile && !isEditing) {
      setFormData({
        displayName: profile.displayName || '',
        bio: profile.bio || '',
        platform: profile.platform || 'PC',
        gameId: profile.gameId || '',
        gameNick: profile.gameNick || '',
        photoURL: profile.photoURL || user?.photoURL || '',
      });
    }
  }, [profile, isEditing, user]);

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    try {
      await userService.updateProfile(user.uid, formData);
      setIsEditing(false);
    } catch (error) {
      alert('Error al actualizar');
    }
  };

  if (!user) return (
    <div className="min-h-[60vh] flex flex-col items-center justify-center space-y-6">
      <div className="p-6 bg-primary/10 rounded-full border border-primary/20 animate-pulse">
        <User size={48} className="text-primary" />
      </div>
      <h2 className="text-2xl font-display uppercase italic tracking-tighter text-center">
        Debes iniciar sesión <br />
        <span className="text-primary">para ver tu perfil</span>
      </h2>
    </div>
  );

  const wins = profile?.stats?.wins || 0;
  const tourneys = profile?.stats?.tournaments || 0;
  const level = Math.floor(wins / 5) + 1;
  const xpProgress = (wins % 5) * 20;

  const ALL_BADGES = [
    { id: 'first_win', name: 'Primer Triunfo', description: 'Gana 1 torneo', icon: Medal, color: 'text-blue-400', condition: wins >= 1 },
    { id: 'veteran', name: 'Veterano', description: 'Participa en 5 torneos', icon: Award, color: 'text-purple-400', condition: tourneys >= 5 },
    { id: 'legend', name: 'Leyenda', description: 'Gana 10 torneos', icon: Crown, color: 'text-yellow-400', condition: wins >= 10 },
    { id: 'early_adopter', name: 'Pionero', description: 'Usuario de la primera ola', icon: Zap, color: 'text-cyan-400', condition: true }, // For simplicity, all current users are pioneers
    { id: 'social_star', name: 'Estrella Social', description: 'Escribe en el chat frecuentemente', icon: MessageSquare, color: 'text-pink-400', condition: true },
    { id: 'pro_player', name: 'Pro Gamer', description: 'Alcanza el nivel 10', icon: Star, color: 'text-primary', condition: level >= 10 },
  ];

  const earnedBadges = ALL_BADGES.filter(b => b.condition);
  const pinnedBadges = profile?.pinnedBadges || [];

  const handleTogglePin = async (badgeId: string) => {
    if (!user) return;
    let newPinned = [...pinnedBadges];
    if (newPinned.includes(badgeId)) {
      newPinned = newPinned.filter(id => id !== badgeId);
    } else {
      if (newPinned.length >= 3) {
        alert('Solo puedes destacar hasta 3 insignias.');
        return;
      }
      newPinned.push(badgeId);
    }
    try {
      await userService.updateProfile(user.uid, { pinnedBadges: newPinned });
    } catch (error) {
      console.error('Error updating pins:', error);
    }
  };

  return (
    <div className="max-w-6xl mx-auto space-y-12 pb-20">
      {/* Header Banner */}
      <div className="relative group">
        <div className="relative h-64 md:h-80 bg-zinc-900 rounded-[2.5rem] border border-white/10 overflow-hidden">
          {/* Animated Background effects */}
          <div className="absolute inset-0 bg-gradient-to-br from-primary/20 via-transparent to-indigo-500/20" />
          <div className="absolute top-0 right-0 w-96 h-96 bg-primary/10 rounded-full -mr-48 -mt-48 blur-[100px] animate-pulse" />
          <div className="absolute bottom-0 left-0 w-96 h-96 bg-indigo-500/10 rounded-full -ml-48 -mb-48 blur-[100px]" />
          
          <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-20" />
          
          <div className="absolute -bottom-1 left-0 w-full h-32 bg-gradient-to-t from-black to-transparent" />
        </div>

        {/* Profile Info Overlay */}
        <div className="absolute -bottom-12 md:-bottom-8 left-0 w-full px-4 md:px-12 flex flex-col md:flex-row items-center md:items-end gap-4 md:gap-8">
          <motion.div 
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="w-28 h-28 md:w-44 md:h-44 rounded-[2rem] md:rounded-[2.5rem] overflow-hidden border-4 md:border-8 border-black bg-zinc-900 shadow-2xl relative group/avatar flex-shrink-0 cursor-pointer"
            onClick={triggerFileSelect}
          >
            {isUploading ? (
              <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
              </div>
            ) : (
              <img 
                src={formData.photoURL || user.photoURL || `https://api.dicebear.com/7.x/avataaars/svg?seed=${user.uid}`} 
                alt="Avatar" 
                className="w-full h-full object-cover transition-transform duration-500 group-hover/avatar:scale-110" 
              />
            )}
            <div className="absolute inset-0 bg-black/60 flex items-center justify-center opacity-0 group-hover/avatar:opacity-100 transition-opacity">
              <Camera size={24} className="text-primary" />
            </div>
            
            {/* Level Badge */}
            <div className="absolute -top-1 -right-1 bg-primary text-black w-8 h-8 md:w-12 md:h-12 rounded-xl md:rounded-2xl flex flex-col items-center justify-center shadow-lg transform rotate-12 group-hover/avatar:rotate-0 transition-transform z-10">
               <span className="text-[8px] md:text-[10px] font-black uppercase tracking-tighter leading-none">LVL</span>
               <span className="text-base md:text-xl font-display font-bold leading-none">{level}</span>
            </div>
          </motion.div>

          <div className="flex-grow pb-0 md:pb-4 text-center md:text-left space-y-3 w-full">
            <div className="flex flex-col md:flex-row items-center md:items-end gap-2 md:gap-3">
              <h1 className="text-3xl md:text-6xl font-display uppercase italic tracking-tighter text-white drop-shadow-lg truncate max-w-full px-2 md:px-0">
                {profile?.displayName || user.displayName}
              </h1>
              {isAdmin && (
                <div className="flex items-center gap-2 px-3 py-1 bg-red-500/10 text-red-500 rounded-full text-[8px] md:text-[10px] font-black uppercase tracking-[0.2em] border border-red-500/20 mb-1 md:mb-2 whitespace-nowrap">
                  <Shield size={10} /> PRO ADMIN
                </div>
              )}
            </div>
            
            <div className="flex flex-wrap items-center justify-center md:justify-start gap-2 md:gap-4 text-gray-400">
               <div className="flex items-center gap-1.5 text-[9px] md:text-xs font-bold uppercase tracking-widest bg-white/5 px-2.5 py-1 md:px-3 md:py-1.5 rounded-lg md:rounded-xl border border-white/5">
                 <Trophy size={12} className="text-primary" />
                 <span>Wins: {profile?.stats?.wins || 0}</span>
               </div>
               <div className="flex items-center gap-1.5 text-[9px] md:text-xs font-bold uppercase tracking-widest bg-white/5 px-2.5 py-1 md:px-3 md:py-1.5 rounded-lg md:rounded-xl border border-white/5">
                 <Hash size={12} className="text-primary" />
                 <span>ID: {profile?.gameId || 'SIN ID'}</span>
               </div>
               <div className="flex items-center gap-1.5 text-[9px] md:text-xs font-bold uppercase tracking-widest bg-white/5 px-2.5 py-1 md:px-3 md:py-1.5 rounded-lg md:rounded-xl border border-white/5">
                 <Gamepad2 size={12} className="text-primary" />
                 <span>{profile?.gameNick || 'NICKNAME'}</span>
               </div>
               <div className="flex items-center gap-1.5 text-[9px] md:text-xs font-bold uppercase tracking-widest bg-white/5 px-2.5 py-1 md:px-3 md:py-1.5 rounded-lg md:rounded-xl border border-white/5">
                 <Target size={12} className="text-primary" />
                 <span>{profile?.platform || 'Aspirante'}</span>
                </div>
            </div>

            {/* Pinned Badges in Header */}
            {pinnedBadges.length > 0 && (
              <div className="flex items-center justify-center md:justify-start gap-2 pt-1 md:pt-2">
                {pinnedBadges.map(badgeId => {
                  const badge = ALL_BADGES.find(b => b.id === badgeId);
                  if (!badge) return null;
                  return (
                    <motion.div 
                      key={badgeId}
                      layoutId={`pinned-${badgeId}`}
                      className={cn("p-1.5 rounded-lg bg-white/5 border border-white/10", badge.color)}
                      title={badge.name}
                    >
                      <badge.icon size={14} className="md:w-4 md:h-4" />
                    </motion.div>
                  );
                })}
              </div>
            )}
          </div>
          
          <div className="hidden lg:flex flex-col items-end pb-4 gap-2 min-w-[200px]">
             <div className="flex items-center gap-2 text-xs font-black uppercase tracking-widest text-gray-500">
               <Star size={14} className="text-primary animate-pulse" /> PROGRESO DE NIVEL
             </div>
             <div className="w-full bg-white/5 h-3 rounded-full overflow-hidden border border-white/10 p-0.5">
                <motion.div 
                  initial={{ width: 0 }}
                  animate={{ width: `${xpProgress}%` }}
                  className="h-full bg-gradient-to-r from-primary to-indigo-500 rounded-full"
                />
             </div>
             <p className="text-[10px] font-bold text-primary/60 uppercase tracking-widest">{wins % 5} / 5 Victorias para lvl {level + 1}</p>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center justify-center gap-2 md:gap-4 mt-16 md:mt-8">
        <button 
          onClick={() => setActiveTab('profile')}
          className={cn(
            "px-6 md:px-8 py-2.5 md:py-3 rounded-xl md:rounded-2xl font-display uppercase italic tracking-[0.1em] md:tracking-[0.2em] transition-all border text-xs md:text-base",
            activeTab === 'profile' 
              ? "bg-primary text-black border-primary scale-105 shadow-[0_0_20px_rgba(var(--primary-rgb),0.3)]" 
              : "bg-white/5 text-gray-500 border-white/10 hover:bg-white/10"
          )}
        >
          Perfil
        </button>
        <button 
          onClick={() => setActiveTab('friends')}
          className={cn(
            "px-6 md:px-8 py-2.5 md:py-3 rounded-xl md:rounded-2xl font-display uppercase italic tracking-[0.1em] md:tracking-[0.2em] transition-all border text-xs md:text-base",
            activeTab === 'friends' 
              ? "bg-primary text-black border-primary scale-105 shadow-[0_0_20px_rgba(var(--primary-rgb),0.3)]" 
              : "bg-white/5 text-gray-500 border-white/10 hover:bg-white/10"
          )}
        >
          Amigos {incomingRequests.length > 0 && <span className="ml-1 bg-red-500 text-white text-[9px] px-1.5 py-0.5 rounded-full">{incomingRequests.length}</span>}
        </button>
      </div>

      <AnimatePresence mode="wait">
        {activeTab === 'profile' ? (
          <motion.div 
            key="profile-tab"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="grid grid-cols-1 lg:grid-cols-12 gap-6 md:gap-8 pt-8 md:pt-12"
          >
            {/* Left Column: Stats & Integrations */}
            <div className="lg:col-span-4 space-y-8">
              {/* Stats Card */}
          <motion.div 
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="bg-zinc-900/40 backdrop-blur-3xl border border-white/10 rounded-[2rem] p-8 space-y-8"
          >
             <div className="flex items-center justify-between">
                <h3 className="text-sm uppercase font-black tracking-[0.2em] text-gray-500">Hoja de Personaje</h3>
                <BarChart3 size={20} className="text-primary" />
             </div>

             <div className="grid grid-cols-2 gap-4">
                <div className="relative group overflow-hidden bg-white/5 p-6 rounded-2xl border border-white/5 hover:border-primary/30 transition-all">
                  <div className="absolute top-0 right-0 w-16 h-16 bg-primary/5 rounded-full -mr-8 -mt-8 blur-xl group-hover:bg-primary/20 transition-colors" />
                  <p className="text-3xl font-display italic text-primary">{wins}</p>
                  <p className="text-[10px] uppercase font-bold text-gray-500 tracking-widest mt-1">Victorias Totales</p>
                </div>
                <div className="relative group overflow-hidden bg-white/5 p-6 rounded-2xl border border-white/5 hover:border-indigo-500/30 transition-all">
                  <div className="absolute top-0 right-0 w-16 h-16 bg-indigo-500/5 rounded-full -mr-8 -mt-8 blur-xl group-hover:bg-indigo-500/20 transition-colors" />
                  <p className="text-3xl font-display italic text-indigo-400">{tourneys}</p>
                  <p className="text-[10px] uppercase font-bold text-gray-500 tracking-widest mt-1">Torneos Jugados</p>
                </div>
             </div>

             <div className="space-y-4">
                <div className="flex items-center justify-between text-xs font-bold uppercase tracking-widest text-gray-500 mb-2">
                   <span>Skills</span>
                   <span>Rating</span>
                </div>
                {[
                  { label: 'Combat Readiness', val: 85, color: 'bg-primary' },
                  { label: 'Team Coordination', val: 70, color: 'bg-indigo-500' },
                  { label: 'Victory Consistency', val: Math.min(wins * 10, 100), color: 'bg-yellow-500' }
                ].map((skill, i) => (
                  <div key={i} className="space-y-2">
                     <div className="flex justify-between text-[10px] font-black uppercase text-gray-400">
                        <span>{skill.label}</span>
                        <span>{skill.val}%</span>
                     </div>
                     <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
                        <motion.div 
                          initial={{ width: 0 }}
                          animate={{ width: `${skill.val}%` }}
                          transition={{ delay: i * 0.1 }}
                          className={cn("h-full rounded-full", skill.color)}
                        />
                     </div>
                  </div>
                ))}
             </div>
          </motion.div>
        </div>

        {/* Right Column: Bio & Settings */}
        <div className="lg:col-span-8 space-y-8">
           <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-zinc-900/40 backdrop-blur-3xl border border-white/10 rounded-[2rem] p-8 md:p-12 space-y-10 relative overflow-hidden"
          >
            <div className="flex items-center justify-between relative z-10">
              <div className="space-y-1">
                <h2 className="text-3xl font-display uppercase italic tracking-tighter flex items-center gap-3">
                  <User className="text-primary" /> Perfil de Jugador
                </h2>
                <p className="text-[10px] font-bold text-gray-500 uppercase tracking-[0.3em]">Gestión de Identidad Digital</p>
              </div>
              <button 
                onClick={() => setIsEditing(!isEditing)}
                className={cn(
                  "p-3 rounded-2xl transition-all hover:scale-110",
                  isEditing ? "bg-red-500/10 text-red-500 border border-red-500/20" : "bg-primary/10 text-primary border border-primary/20"
                )}
              >
                {isEditing ? <X size={24} /> : <Edit3 size={24} />}
              </button>
            </div>

            <AnimatePresence mode="wait">
              {isEditing ? (
                <motion.form 
                  key="editing"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  onSubmit={handleUpdate} 
                  className="space-y-8 relative z-10"
                >
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <label className="text-xs font-black uppercase tracking-[0.2em] text-gray-500 flex items-center gap-2">
                        <User size={14} /> Nombre Público
                      </label>
                      <input 
                        type="text" 
                        placeholder="Tu alias de batalla"
                        className="w-full bg-white/5 border border-white/10 rounded-2xl p-4 outline-none focus:border-primary transition-all text-sm font-bold"
                        value={formData.displayName}
                        onChange={e => setFormData({...formData, displayName: e.target.value})}
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs font-black uppercase tracking-[0.2em] text-gray-500 flex items-center gap-2">
                        <Gamepad2 size={14} /> Plataforma Principal
                      </label>
                      <div className="relative">
                        <select 
                          className="w-full bg-white/5 border border-white/10 rounded-2xl p-4 outline-none focus:border-primary transition-all appearance-none text-sm font-bold"
                          value={formData.platform}
                          onChange={e => setFormData({...formData, platform: e.target.value})}
                        >
                          <option value="PC">🖥️ PC / Master Race</option>
                          <option value="PS5/PS4">🎮 PlayStation</option>
                          <option value="Xbox">🎮 Xbox</option>
                          <option value="Mobile">📱 Móvil / Tablet</option>
                        </select>
                        <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-gray-500">
                          <Layout size={16} />
                        </div>
                      </div>
                    </div>
                    <div className="md:col-span-2 space-y-6">
                      <div className="p-6 bg-white/5 border border-white/10 rounded-3xl space-y-6">
                        <div className="flex items-center gap-2">
                          <Shield className="text-primary" size={18} />
                          <h4 className="text-xs font-black uppercase tracking-[0.2em] text-gray-400">Información de Juego</h4>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                          <div className="space-y-3">
                            <label className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-500 flex items-center gap-2">
                              <Hash size={14} /> ID del Jugador
                            </label>
                            <input 
                              type="text" 
                              placeholder="Ingresa tu ID de juego"
                              className="w-full bg-black/20 border border-white/10 rounded-2xl p-4 outline-none transition-all text-sm font-mono tracking-widest focus:border-primary"
                              value={formData.gameId}
                              onChange={e => setFormData({...formData, gameId: e.target.value})}
                            />
                          </div>

                          <div className="space-y-3">
                            <label className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-500 flex items-center gap-2">
                              <Gamepad2 size={14} /> Nickname en el Juego
                            </label>
                            <div className="relative">
                              <input 
                                type="text" 
                                placeholder="Tu nombre público"
                                className="w-full bg-black/20 border border-white/10 rounded-2xl p-4 outline-none transition-all text-sm font-bold focus:border-primary"
                                value={formData.gameNick}
                                onChange={e => setFormData({...formData, gameNick: e.target.value})}
                              />
                              <div className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-600">
                                <Target size={16} />
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-black uppercase tracking-[0.2em] text-gray-500 flex items-center gap-2">
                        <Camera size={14} /> Selecciona tu Logo / Avatar
                      </label>
                      <button 
                        type="button"
                        onClick={triggerFileSelect}
                        className="text-[10px] font-black uppercase tracking-widest text-primary hover:text-white transition-colors flex items-center gap-1.5"
                      >
                         <Camera size={12} /> Subir desde Galería
                      </button>
                    </div>

                    <input 
                      type="file" 
                      ref={fileInputRef} 
                      onChange={handleFileChange} 
                      className="hidden" 
                      accept="image/*"
                    />

                    <div className="grid grid-cols-4 sm:grid-cols-6 gap-3">
                       <button
                         type="button"
                         onClick={triggerFileSelect}
                         className={cn(
                           "aspect-square rounded-2xl border-2 flex flex-col items-center justify-center gap-2 transition-all hover:scale-110 bg-white/5",
                           "border-white/5 hover:border-primary/50 text-gray-500 hover:text-primary"
                         )}
                       >
                         {isUploading ? (
                           <div className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                         ) : (
                           <Camera size={24} />
                         )}
                         <span className="text-[8px] font-black uppercase">Subir</span>
                       </button>
                       {AVATAR_OPTIONS.map((avatar, i) => (
                         <button
                           key={i}
                           type="button"
                           onClick={() => setFormData({...formData, photoURL: avatar})}
                           className={cn(
                             "aspect-square rounded-2xl border-2 overflow-hidden transition-all hover:scale-110",
                             formData.photoURL === avatar ? "border-primary shadow-[0_0_15px_rgba(var(--primary-rgb),0.5)]" : "border-white/5 hover:border-white/20"
                           )}
                         >
                           <img src={avatar} alt="" className="w-full h-full object-cover" />
                         </button>
                       ))}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs font-black uppercase tracking-[0.2em] text-gray-500 flex items-center gap-2">
                      <MessageSquare size={14} /> Biografía / Acerca de mí
                    </label>
                    <textarea 
                      placeholder="Cuéntanos tu historia en los videojuegos..."
                      className="w-full bg-white/5 border border-white/10 rounded-2xl p-4 outline-none focus:border-primary transition-all h-40 text-sm leading-relaxed"
                      value={formData.bio}
                      onChange={e => setFormData({...formData, bio: e.target.value})}
                    />
                  </div>

                  <button 
                    type="submit" 
                    className="group relative w-full py-6 bg-primary text-black font-display uppercase italic tracking-[0.3em] text-xl skew-x-[-15deg] overflow-hidden transition-all hover:bg-white active:scale-95"
                  >
                    <span className="relative z-10 flex items-center justify-center gap-3">
                      <Save size={24} /> Sincronizar Cambios
                    </span>
                    <div className="absolute inset-0 bg-white translate-y-full group-hover:translate-y-0 transition-transform duration-300" />
                  </button>
                </motion.form>
              ) : (
                <motion.div 
                  key="view"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  className="space-y-10 relative z-10"
                >
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                     <div className="p-6 bg-white/5 rounded-2xl border border-white/5 space-y-2">
                        <p className="text-[10px] font-black uppercase tracking-widest text-primary">Status</p>
                        <div className="flex items-center gap-2">
                           <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse shadow-[0_0_8px_rgba(34,197,94,0.5)]" />
                           <p className="font-display uppercase text-lg italic tracking-tight">Activo</p>
                        </div>
                     </div>
                     <div className="p-6 bg-white/5 rounded-2xl border border-white/5 space-y-2">
                        <p className="text-[10px] font-black uppercase tracking-widest text-indigo-400">Clase</p>
                        <p className="font-display uppercase text-lg italic tracking-tight">{level > 10 ? 'Elite Challenger' : 'Rising Star'}</p>
                     </div>
                     <div className="p-6 bg-white/5 rounded-2xl border border-white/5 space-y-2">
                        <p className="text-[10px] font-black uppercase tracking-widest text-yellow-500">Rango</p>
                        <div className="flex items-center gap-2">
                           <Trophy size={18} className="text-yellow-500" />
                           <p className="font-display uppercase text-lg italic tracking-tight">Bronze I</p>
                        </div>
                     </div>
                  </div>

                  <div className="space-y-4">
                    <div className="flex items-center gap-3">
                       <div className="p-2 bg-primary/10 rounded-lg">
                          <Star size={18} className="text-primary" />
                       </div>
                       <p className="text-sm font-black uppercase tracking-widest text-gray-500">Misión / Bio de Jugador</p>
                    </div>
                    <div className="relative">
                      <div className="absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-b from-primary to-transparent rounded-full shadow-[0_0_10px_rgba(var(--primary-rgb),0.5)]" />
                      <p className="text-lg text-gray-300 leading-relaxed italic pl-8 py-2 font-medium">
                        {profile?.bio || "Este jugador prefiere que sus habilidades hablen por él. No hay biografía registrada."}
                      </p>
                    </div>
                  </div>
                  
                  <div className="pt-6 border-t border-white/5 flex flex-wrap gap-3">
                     {[
                       { icon: Zap, label: 'Fast Reaction' },
                       { icon: Trophy, label: 'Competitive' },
                       { icon: Layout, label: 'Strategist' }
                     ].map((tag, i) => (
                       <div key={i} className="flex items-center gap-2 bg-white/5 px-4 py-2 rounded-xl border border-white/5 hover:border-primary/20 transition-colors group">
                          <tag.icon size={14} className="text-gray-500 group-hover:text-primary transition-colors" />
                          <span className="text-[10px] font-black uppercase tracking-widest text-gray-500 group-hover:text-white transition-colors">{tag.label}</span>
                       </div>
                     ))}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
            
            {/* Decorative background logo */}
            <div className="absolute -right-20 -bottom-20 opacity-5 pointer-events-none rotate-12">
               <Gamepad2 size={400} />
            </div>
          </motion.div>

          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="flex items-center justify-between p-6 bg-yellow-500/5 border border-yellow-500/10 rounded-3xl"
          >
             <div className="flex items-center gap-4">
                <div className="p-3 bg-yellow-500/10 rounded-2xl">
                   <Star size={24} className="text-yellow-500" />
                </div>
                <div>
                  <p className="text-[10px] font-black uppercase tracking-widest text-yellow-500/60">Sistema de Logros</p>
                  <p className="text-sm font-bold text-gray-400">Pronto podrás desbloquear medallas exclusivas por tus victorias.</p>
                </div>
             </div>
             <button className="hidden md:block px-6 py-2 bg-white/5 hover:bg-white/10 rounded-xl text-[10px] font-black uppercase tracking-widest transition-colors">
                Ver Road Map
             </button>
          </motion.div>

          {/* New Achievements Section */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-zinc-900/40 backdrop-blur-3xl border border-white/10 rounded-[2rem] p-8 space-y-8"
          >
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <h3 className="text-2xl font-display uppercase italic tracking-tighter flex items-center gap-3">
                  <Medal className="text-primary" /> Insignias y Logros
                </h3>
                <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Recompensas por tu Honor en Batalla</p>
              </div>
              <div className="text-right">
                <span className="text-2xl font-display text-white">{earnedBadges.length}</span>
                <span className="text-gray-500 text-[10px] uppercase font-black tracking-widest ml-2">Obtenidas</span>
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
              {ALL_BADGES.map((badge) => {
                const isEarned = badge.condition;
                const isPinned = pinnedBadges.includes(badge.id);

                return (
                  <motion.div
                    key={badge.id}
                    whileHover={isEarned ? { scale: 1.05, y: -5 } : {}}
                    className={cn(
                      "relative flex flex-col items-center p-4 rounded-2xl border transition-all text-center space-y-3",
                      isEarned 
                        ? "bg-white/5 border-white/10 hover:border-primary/50 cursor-help" 
                        : "bg-black/20 border-white/5 opacity-40 grayscale"
                    )}
                  >
                    <div className={cn(
                      "w-12 h-12 rounded-full flex items-center justify-center border-2",
                      isEarned ? badge.color + " border-current/20 bg-current/10" : "text-gray-600 border-gray-800 bg-gray-900"
                    )}>
                      <badge.icon size={24} />
                    </div>
                    
                    <div>
                      <h4 className="text-[10px] font-black uppercase tracking-tighter text-white">{badge.name}</h4>
                      <p className="text-[8px] text-gray-500 uppercase leading-tight mt-1">{badge.description}</p>
                    </div>

                    {isEarned && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleTogglePin(badge.id);
                        }}
                        className={cn(
                          "absolute top-2 right-2 p-1 rounded-md transition-all",
                          isPinned ? "text-primary bg-primary/10" : "text-gray-600 hover:text-white"
                        )}
                      >
                        {isPinned ? <Eye size={12} /> : <EyeOff size={12} />}
                      </button>
                    )}

                    {!isEarned && (
                      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                        <Lock size={16} className="text-white/10" />
                      </div>
                    )}
                  </motion.div>
                );
              })}
            </div>

            <p className="text-[10px] text-gray-500 italic text-center">
              * Puedes destacar hasta 3 insignias en la cabecera de tu perfil usando el icono de ojo.
            </p>
          </motion.div>
        </div>
      </motion.div>
    ) : (
      <motion.div 
        key="friends-tab"
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="grid grid-cols-1 lg:grid-cols-12 gap-8 pt-12"
      >
        {/* Friends Sidebar: Requests & Search */}
        <div className="lg:col-span-4 space-y-8">
          {/* Search Users */}
          <div className="bg-zinc-900/40 backdrop-blur-3xl border border-white/10 rounded-[2rem] p-6 space-y-6">
            <div className="flex items-center gap-3">
              <Search className="text-primary" size={20} />
              <h3 className="text-sm font-black uppercase tracking-[0.2em] text-gray-500">Buscar Jugadores</h3>
            </div>

            <form onSubmit={handleSearch} className="relative">
              <input 
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Escribe un nombre..."
                className="w-full bg-white/5 border border-white/10 rounded-2xl p-4 pr-12 outline-none focus:border-primary transition-all text-sm font-bold"
              />
              <button 
                type="submit"
                className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500 hover:text-primary transition-colors"
              >
                <Search size={18} />
              </button>
            </form>

            <div className="space-y-4 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
              {isSearching ? (
                <div className="text-center py-8">
                  <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto" />
                </div>
              ) : searchResults.length > 0 ? (
                searchResults.map(result => (
                  <div key={result.id} className="flex items-center justify-between p-3 bg-white/5 rounded-2xl border border-white/5 group">
                    <div className="flex items-center gap-3">
                      <img src={result.photoURL || `https://api.dicebear.com/7.x/avataaars/svg?seed=${result.id}`} alt="" className="w-10 h-10 rounded-xl" />
                      <div>
                        <p className="text-xs font-black uppercase tracking-tight">{result.displayName}</p>
                        <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest">Wins: {result.stats?.wins || 0}</p>
                      </div>
                    </div>
                    <button 
                      onClick={() => handleSendRequest(result)}
                      className="p-2 bg-primary/10 text-primary rounded-xl opacity-0 group-hover:opacity-100 transition-opacity hover:bg-primary hover:text-black"
                      title="Enviar Solicitud"
                    >
                      <UserPlus size={16} />
                    </button>
                  </div>
                ))
              ) : searchTerm && (
                <p className="text-center text-[10px] text-gray-500 py-4 uppercase font-bold tracking-widest italic">No se encontraron resultados</p>
              )}
            </div>
          </div>

          {/* Incoming Requests */}
          <div className="bg-zinc-900/40 backdrop-blur-3xl border border-white/10 rounded-[2rem] p-6 space-y-6">
            <div className="flex items-center gap-3">
              <UserCheck className="text-primary" size={20} />
              <h3 className="text-sm font-black uppercase tracking-[0.2em] text-gray-500">Solicitudes Entrantes</h3>
            </div>

            <div className="space-y-4">
              {incomingRequests.length > 0 ? (
                incomingRequests.map(req => (
                  <div key={req.id} className="p-4 bg-white/5 rounded-2xl border border-white/5 space-y-4">
                    <div className="flex items-center gap-3">
                      <img src={req.fromPhotoURL || `https://api.dicebear.com/7.x/avataaars/svg?seed=${req.fromId}`} alt="" className="w-10 h-10 rounded-xl" />
                      <div>
                        <p className="text-xs font-black uppercase tracking-tight">{req.fromName}</p>
                        <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest flex items-center gap-1">
                          <Clock size={10} /> {new Date(req.createdAt?.toDate()).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <button 
                        onClick={() => handleAcceptRequest(req)}
                        className="bg-primary py-2 rounded-xl text-black text-[10px] font-black uppercase tracking-widest hover:bg-white transition-colors flex items-center justify-center gap-2"
                      >
                        <Check size={14} /> Aceptar
                      </button>
                      <button 
                        onClick={() => handleDeclineRequest(req.id)}
                        className="bg-white/5 py-2 rounded-xl text-gray-500 text-[10px] font-black uppercase tracking-widest hover:bg-red-500/10 hover:text-red-500 transition-colors flex items-center justify-center gap-2"
                      >
                        <UserX size={14} /> Denegar
                      </button>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-8 opacity-20">
                  <UserCheck size={32} className="mx-auto mb-2" />
                  <p className="text-[10px] font-black uppercase tracking-widest">Sin solicitudes</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Friends Main View */}
        <div className="lg:col-span-8 space-y-8">
          <div className="bg-zinc-900/40 backdrop-blur-3xl border border-white/10 rounded-[2rem] p-8 min-h-[600px] flex flex-col">
            <div className="flex items-center justify-between mb-8">
              <div className="space-y-1">
                <h2 className="text-3xl font-display uppercase italic tracking-tighter flex items-center gap-3">
                  <Gamepad2 className="text-primary" /> Lista de Amigos
                </h2>
                <p className="text-[10px] font-bold text-gray-500 uppercase tracking-[0.3em]">Tu Red de Competidores</p>
              </div>
              <div className="px-4 py-2 bg-white/5 rounded-xl border border-white/10">
                <span className="text-sm font-bold text-primary">{friends.length}</span>
                <span className="text-[10px] font-black uppercase text-gray-500 tracking-widest ml-2">Total</span>
              </div>
            </div>

            {friends.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {friends.map(friend => (
                  <motion.div 
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    key={friend.id}
                    className="p-6 bg-white/5 rounded-[2rem] border border-white/5 hover:border-primary/20 transition-all flex items-center gap-5 group"
                  >
                     <div className="relative">
                       <img 
                        src={friend.photoURL || `https://api.dicebear.com/7.x/avataaars/svg?seed=${friend.uid}`} 
                        alt="" 
                        className="w-16 h-16 rounded-2xl group-hover:scale-105 transition-transform" 
                       />
                       <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-green-500 border-2 border-[#09090b] rounded-full" />
                     </div>
                     <div className="flex-grow">
                       <h4 className="text-lg font-display uppercase italic tracking-tight">{friend.displayName}</h4>
                       <div className="flex items-center gap-4 mt-1">
                         <div className="flex items-center gap-1 text-[10px] font-black uppercase text-primary">
                           <Trophy size={10} /> {friend.stats?.wins || 0} Victorias
                         </div>
                         <div className="flex items-center gap-1 text-[10px] font-bold text-gray-500 uppercase tracking-widest">
                           <Clock size={10} /> DESDE {new Date(friend.addedAt?.toDate()).toLocaleDateString()}
                         </div>
                       </div>
                     </div>
                     <button className="p-3 bg-white/5 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity hover:bg-white/10 text-gray-500 hover:text-white">
                       <MessageSquare size={18} />
                     </button>
                  </motion.div>
                ))}
              </div>
            ) : (
              <div className="flex-grow flex flex-col items-center justify-center space-y-6 opacity-20 py-20">
                <UserPlus size={64} />
                <div className="text-center space-y-2">
                   <p className="text-2xl font-display uppercase italic tracking-tighter">Tu lista está vacía</p>
                   <p className="text-[10px] font-black uppercase tracking-widest">Usa el buscador para encontrar camaradas de batalla</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </motion.div>
    )}
  </AnimatePresence>
</div>
  );
};

export default ProfilePage;
