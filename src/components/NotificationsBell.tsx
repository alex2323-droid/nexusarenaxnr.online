import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { userService } from '../services/db';
import { Bell, Check, Trash2, ExternalLink, Inbox } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../lib/utils';

const NotificationsBell: React.FC = () => {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<any[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    if (user) {
      const unsubscribe = userService.listenNotifications(user.uid, (data) => {
        setNotifications(data);
      });
      return unsubscribe;
    }
  }, [user]);

  const unreadCount = notifications.filter(n => !n.read).length;

  const handleNotificationClick = async (n: any) => {
    if (!n.read && user) {
      await userService.markNotificationAsRead(user.uid, n.id);
    }
    if (n.link) {
      navigate(n.link);
      setIsOpen(false);
    }
  };

  const handleMarkAsRead = async (e: React.MouseEvent, n: any) => {
    e.stopPropagation();
    if (user && !n.read) {
      await userService.markNotificationAsRead(user.uid, n.id);
    }
  };

  const handleMarkAllRead = async () => {
    if (user && unreadCount > 0) {
      await userService.markAllNotificationsAsRead(user.uid);
    }
  };

  return (
    <div className="relative">
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          "relative p-2 rounded-xl transition-all",
          isOpen ? "bg-white/10 text-primary" : "text-gray-400 hover:text-white hover:bg-white/5"
        )}
      >
        <Bell size={20} />
        {unreadCount > 0 && (
          <span className="absolute top-1 right-1 w-4 h-4 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center border-2 border-black animate-in fade-in zoom-in duration-300">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      <AnimatePresence>
        {isOpen && (
          <>
            <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)} />
            <motion.div 
              initial={{ opacity: 0, y: 10, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 10, scale: 0.95 }}
              className="absolute right-0 mt-3 w-80 md:w-96 glass border border-white/10 rounded-2xl z-50 overflow-hidden shadow-[0_20px_50px_rgba(0,0,0,0.5)]"
            >
              <div className="p-4 border-b border-white/10 flex items-center justify-between bg-white/5">
                <div className="flex items-center gap-2">
                  <Inbox size={14} className="text-primary" />
                  <span className="text-[10px] uppercase font-black tracking-widest text-white">Notificaciones</span>
                </div>
                {unreadCount > 0 && (
                  <button 
                    onClick={handleMarkAllRead}
                    className="text-[10px] text-primary hover:text-white uppercase font-bold transition-colors flex items-center gap-1"
                  >
                    Marcar todo como leído
                  </button>
                )}
              </div>
              
              <div className="max-h-[450px] overflow-y-auto divide-y divide-white/5 no-scrollbar">
                {notifications.length === 0 ? (
                  <div className="p-12 text-center space-y-3">
                    <div className="w-12 h-12 bg-white/5 rounded-full flex items-center justify-center mx-auto text-gray-600">
                      <Bell size={24} />
                    </div>
                    <p className="text-gray-500 text-sm italic">No tienes notificaciones por ahora</p>
                  </div>
                ) : (
                  notifications.map((n) => (
                    <div 
                      key={n.id} 
                      onClick={() => handleNotificationClick(n)}
                      className={cn(
                        "p-4 transition-all cursor-pointer group flex gap-3 relative",
                        !n.read ? "bg-primary/[0.03] hover:bg-primary/[0.07]" : "hover:bg-white/5"
                      )}
                    >
                      {!n.read && (
                        <div className="absolute left-0 top-0 bottom-0 w-1 bg-primary" />
                      )}
                      
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <p className={cn("text-xs font-bold uppercase tracking-tight", !n.read ? "text-primary" : "text-gray-400")}>
                            {n.title || 'Notificación'}
                          </p>
                          <span className="text-[9px] text-gray-600 font-medium whitespace-nowrap">
                            {n.createdAt?.toDate ? new Date(n.createdAt.toDate()).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}
                          </span>
                        </div>
                        <p className="text-sm text-gray-300 mt-1 leading-relaxed">
                          {n.content}
                        </p>
                        <div className="flex items-center justify-between mt-2">
                          <p className="text-[9px] text-gray-500 font-medium italic">
                            {n.createdAt?.toDate ? new Date(n.createdAt.toDate()).toLocaleDateString() : ''}
                          </p>
                          
                          <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                            {!n.read && (
                              <button 
                                onClick={(e) => handleMarkAsRead(e, n)}
                                className="p-1.5 hover:bg-primary/20 rounded-lg text-primary transition-colors"
                                title="Marcar como leído"
                              >
                                <Check size={12} />
                              </button>
                            )}
                            {n.link && (
                              <ExternalLink size={12} className="text-gray-500" />
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
              
              {notifications.length > 0 && (
                <div className="p-3 bg-white/5 border-t border-white/10 text-center">
                   <button 
                    onClick={() => setIsOpen(false)}
                    className="text-[10px] text-gray-500 hover:text-white uppercase font-bold transition-colors"
                   >
                     Cerrar panel
                   </button>
                </div>
              )}
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
};

export default NotificationsBell;
