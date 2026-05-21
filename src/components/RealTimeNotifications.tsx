import React, { useEffect, useRef } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { userService } from '../services/db';
import toast from 'react-hot-toast';
import { Bell, Shield, UserPlus, CreditCard, Gift } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const RealTimeNotifications: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const lastNotificationIds = useRef<Set<string>>(new Set());
  const isFirstLoad = useRef(true);

  useEffect(() => {
    if (user) {
      const unsubscribe = userService.listenNotifications(user.uid, (notifications) => {
        const currentIds = new Set(notifications.map(n => n.id));
        
        // Find new unread notifications
        if (!isFirstLoad.current) {
          notifications.forEach(n => {
            if (!n.read && !lastNotificationIds.current.has(n.id)) {
              // Trigger toast
              showNotificationToast(n);
            }
          });
        } else {
          isFirstLoad.current = false;
        }

        lastNotificationIds.current = currentIds;
      });

      return () => {
        unsubscribe();
        isFirstLoad.current = true;
        lastNotificationIds.current = new Set();
      };
    }
  }, [user]);

  const showNotificationToast = (n: any) => {
    const Icon = getIcon(n.type);
    
    toast.custom((t) => (
      <div
        className={`${
          t.visible ? 'animate-enter' : 'animate-leave'
        } max-w-md w-full glass border border-white/10 shadow-2xl rounded-2xl pointer-events-auto flex ring-1 ring-black ring-opacity-5 overflow-hidden transition-all hover:border-primary/50`}
        onClick={() => {
          toast.dismiss(t.id);
          // Optional: navigate to link if exists
          if (n.link) navigate(n.link);
        }}
      >
        <div className="flex-1 w-0 p-4">
          <div className="flex items-start">
            <div className="flex-shrink-0 pt-0.5">
              <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center text-primary border border-primary/20">
                <Icon size={20} />
              </div>
            </div>
            <div className="ml-3 flex-1">
              <p className="text-sm font-bold text-white uppercase tracking-tight">
                {n.title || 'Nueva Notificación'}
              </p>
              <p className="mt-1 text-xs text-gray-400 line-clamp-2">
                {n.content}
              </p>
            </div>
          </div>
        </div>
        <div className="flex border-l border-white/10">
          <button
            onClick={(e) => {
              e.stopPropagation();
              toast.dismiss(t.id);
            }}
            className="w-full border border-transparent rounded-none rounded-r-lg p-4 flex items-center justify-center text-xs font-bold text-gray-500 hover:text-white transition-colors"
          >
            Cerrar
          </button>
        </div>
      </div>
    ), {
      duration: 6000,
      position: 'top-right'
    });
  };

  const getIcon = (type: string) => {
    switch (type) {
      case 'friend_request':
      case 'friend_accepted':
        return UserPlus;
      case 'payment_approved':
      case 'payment_pending':
        return CreditCard;
      case 'registration_success':
      case 'registration':
        return Gift;
      case 'tournament_reward':
        return Shield;
      default:
        return Bell;
    }
  };

  return null;
};

export default RealTimeNotifications;
