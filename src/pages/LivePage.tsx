import React from 'react';
import { motion } from 'motion/react';
import { Youtube, ExternalLink, MessageCircle, PlayCircle, Radio } from 'lucide-react';

import YoutubeLivePlayer from '../components/YoutubeLivePlayer';

const LivePage: React.FC = () => {
  const channelUrl = "https://youtube.com/@nexusarena-v6u?si=22-HWUtDl6deAVDc";
  
  return (
    <div className="space-y-8 pb-20">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-red-500 font-bold uppercase tracking-widest text-xs mb-2">
            <Radio size={16} className="animate-pulse" />
            Nexus Arena Live
          </div>
          <h1 className="text-4xl md:text-5xl font-display uppercase italic tracking-tighter">
            Transmisión en <span className="text-red-600">Directo</span>
          </h1>
        </div>
        <a 
          href={channelUrl}
          target="_blank"
          rel="noreferrer"
          className="flex items-center gap-2 text-white/60 hover:text-red-500 transition-colors text-sm font-bold uppercase tracking-widest"
        >
          <Youtube size={20} /> Ver en YouTube <ExternalLink size={14} />
        </a>
      </div>

      {/* Video Section */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        <div className="lg:col-span-3 space-y-4">
          <YoutubeLivePlayer />

          <div className="glass p-6 rounded-3xl border border-white/10 flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-red-600 flex items-center justify-center">
                <Radio className="text-white" />
              </div>
              <div>
                <p className="font-bold text-lg">Nexus Arena Oficial</p>
                <p className="text-sm text-gray-500">Transmisión de torneos y eventos exclusivos</p>
              </div>
            </div>
            <div className="flex items-center gap-6">
              <div className="text-center">
                <p className="text-2xl font-display italic text-white">500+</p>
                <p className="text-[10px] uppercase font-bold text-gray-500">Viewers</p>
              </div>
            </div>
          </div>
        </div>

        {/* Sidebar / Chat Info */}
        <div className="space-y-6">
          <div className="glass p-6 rounded-3xl border border-white/10 h-[500px] flex flex-col">
            <h3 className="font-display uppercase italic text-xl mb-4 flex items-center gap-2">
              <MessageCircle className="text-primary" /> Chat de Comunidad
            </h3>
            <div className="flex-grow flex flex-col items-center justify-center text-center p-6 space-y-4 opacity-60">
              <div className="w-16 h-16 rounded-full bg-white/5 border border-dashed border-white/20 flex items-center justify-center">
                <Youtube size={32} className="text-red-500" />
              </div>
              <p className="text-sm italic">
                Únete al chat directamente desde YouTube para interactuar con otros guerreros.
              </p>
              <a 
                href={channelUrl}
                target="_blank"
                rel="noreferrer"
                className="bg-red-600 text-white px-6 py-2 rounded-xl text-xs font-bold uppercase tracking-widest hover:bg-white hover:text-red-600 transition-all"
              >
                Abrir Chat
              </a>
            </div>
          </div>

          <div className="bg-primary/10 border border-primary/20 rounded-2xl p-6">
            <h4 className="font-bold text-primary text-sm uppercase mb-2">Próximos Torneos</h4>
            <p className="text-xs text-text/70 mb-4">Sintoniza para ver las finales de Free Fire y Honor of Kings próximamente.</p>
            <div className="w-full h-1 bg-white/10 rounded-full overflow-hidden">
              <motion.div 
                className="h-full bg-primary"
                initial={{ width: 0 }}
                animate={{ width: "65%" }}
                transition={{ duration: 2, ease: "easeOut" }}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LivePage;
