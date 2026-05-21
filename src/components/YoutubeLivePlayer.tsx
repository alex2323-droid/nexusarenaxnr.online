import React from 'react';
import { cn } from '../lib/utils';
import { Youtube, Radio, ExternalLink } from 'lucide-react';

interface YoutubeLivePlayerProps {
  channelId?: string;
  videoId?: string;
  className?: string;
}

const YoutubeLivePlayer: React.FC<YoutubeLivePlayerProps> = ({ 
  channelId = "UC5m_S5qHUXW9q1IeK9r_Lyg", // Placeholder channel ID for Nexus Arena
  videoId, 
  className 
}) => {
  // If videoId is provided, we embed that specific video (useful for recorded finals)
  // If only channelId is provided/defaulted, we try the live_stream embed
  const embedUrl = videoId 
    ? `https://www.youtube.com/embed/${videoId}?autoplay=1` 
    : `https://www.youtube.com/embed/live_stream?channel=${channelId}`;

  return (
    <div className={cn("relative w-full aspect-video rounded-3xl overflow-hidden border border-white/10 bg-black group shadow-2xl", className)}>
      <iframe 
        width="100%" 
        height="100%" 
        src={embedUrl}
        title="Nexus Arena Live" 
        frameBorder="0" 
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" 
        allowFullScreen
        className="absolute inset-0"
      ></iframe>
      
      {/* Visual Accents */}
      <div className="absolute top-4 left-4 z-10 flex items-center gap-2 pointer-events-none">
        <div className="bg-red-600 text-white px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest flex items-center gap-1.5 shadow-lg">
          <Radio size={12} className="animate-pulse" />
          Live
        </div>
      </div>

      <a 
        href={`https://youtube.com/@nexusarena-v6u`}
        target="_blank"
        rel="noreferrer"
        className="absolute bottom-4 right-4 z-10 bg-black/60 backdrop-blur-md text-white/80 p-2 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest border border-white/10 hover:text-primary"
      >
        <Youtube size={14} /> Abrir en YouTube <ExternalLink size={12} />
      </a>
    </div>
  );
};

export default YoutubeLivePlayer;
