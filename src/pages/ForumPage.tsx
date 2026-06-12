import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Settings, Info, Heart, MessageCircle, Share2, Image as ImageIcon, Send, User } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { Navigate } from 'react-router-dom';

interface UserProfile {
  name: string;
  handle: string;
  avatar: string;
}

interface Comment {
  id: number;
  user: UserProfile;
  content: string;
  time: string;
}

interface Post {
  id: number;
  user: UserProfile;
  content: string;
  image?: string;
  likes: number;
  comments: number;
  commentList: Comment[];
  shares: number;
  time: string;
  isLiked: boolean;
}

const mockPosts: Post[] = [
  {
    id: 1,
    user: {
      name: 'Nexus Arena',
      handle: '@nexusarena',
      avatar: 'https://images.unsplash.com/photo-1542751371-adc38448a05e?auto=format&fit=crop&q=80',
    },
    content: '¡Bienvenidos al nuevo espacio para la comunidad! Muy pronto abriremos los torneos oficiales de la liga de verano. ¿Qué juego les gustaría ver primero? 🎮🔥',
    image: 'https://images.unsplash.com/photo-1542751371-adc38448a05e?auto=format&fit=crop&q=80',
    likes: 124,
    comments: 1,
    commentList: [
      {
        id: 101,
        user: {
          name: 'Alex Gamer',
          handle: '@alexg',
          avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=alex',
        },
        content: '¡Definitivamente Valorant!',
        time: '1h'
      }
    ],
    shares: 12,
    time: '2h',
    isLiked: false,
  },
  {
    id: 2,
    user: {
      name: 'Alex Gamer',
      handle: '@alexg',
      avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=alex',
    },
    content: 'Buscando duo para el próximo torneo de Warzone, si tienes +1.5KD envíame un mensaje directo. 🫡',
    likes: 15,
    comments: 0,
    commentList: [],
    shares: 2,
    time: '5h',
    isLiked: true,
  },
  {
    id: 3,
    user: {
      name: 'Lila Esports',
      handle: '@lilagg',
      avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=lila',
    },
    content: '¡La gran final del Free Fire Pro League de ayer estuvo increíble! GG a los ganadores.',
    likes: 89,
    comments: 0,
    commentList: [],
    shares: 5,
    time: '12h',
    isLiked: false,
  }
];

const ForumPage: React.FC = () => {
  const { user, profile, isAdmin } = useAuth();
  const [posts, setPosts] = useState<Post[]>(mockPosts);
  const [newPost, setNewPost] = useState('');
  const [expandedComments, setExpandedComments] = useState<Record<number, boolean>>({});
  const [commentInputs, setCommentInputs] = useState<Record<number, string>>({});

  if (!isAdmin) {
    return <Navigate to="/" replace />;
  }

  const currentUserProfile: UserProfile = isAdmin ? {
    name: 'Nexus Arena',
    handle: '@nexusarena',
    avatar: 'https://images.unsplash.com/photo-1542751371-adc38448a05e?auto=format&fit=crop&q=80',
  } : {
    name: profile?.displayName || user?.displayName || 'Usuario',
    handle: `@${profile?.gameNick || 'jugador'}`,
    avatar: profile?.photoURL || user?.photoURL || `https://api.dicebear.com/7.x/avataaars/svg?seed=${user?.uid || 'new'}`,
  };

  const handlePost = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPost.trim()) return;

    const post: Post = {
      id: Date.now(),
      user: currentUserProfile,
      content: newPost,
      likes: 0,
      comments: 0,
      commentList: [],
      shares: 0,
      time: 'Justo ahora',
      isLiked: false,
    };

    setPosts([post, ...posts]);
    setNewPost('');
  };

  const handleComment = (postId: number, e: React.FormEvent) => {
    e.preventDefault();
    const commentText = commentInputs[postId];
    if (!commentText || !commentText.trim()) return;

    const newComment: Comment = {
      id: Date.now(),
      user: currentUserProfile,
      content: commentText,
      time: 'Justo ahora'
    };

    setPosts(posts.map(p => {
      if (p.id === postId) {
        return {
          ...p,
          comments: p.comments + 1,
          commentList: [...p.commentList, newComment]
        };
      }
      return p;
    }));

    setCommentInputs({ ...commentInputs, [postId]: '' });
  };

  const toggleComments = (postId: number) => {
    setExpandedComments(prev => ({
      ...prev,
      [postId]: !prev[postId]
    }));
  };

  const toggleLike = (id: number) => {
    setPosts(posts.map(p => {
      if (p.id === id) {
        return {
          ...p,
          isLiked: !p.isLiked,
          likes: p.isLiked ? p.likes - 1 : p.likes + 1
        };
      }
      return p;
    }));
  };

  return (
    <div className="max-w-5xl mx-auto sm:px-6 lg:px-8 py-2 sm:py-8 relative min-h-screen pb-24 sm:pb-8">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-primary/5 via-background to-background pointer-events-none -z-10" />

      {/* Admin Warning Notice */}
      <div className="bg-primary/5 border border-primary/20 p-4 mx-4 sm:mx-0 rounded-xl text-center mb-4 sm:mb-6 bg-black/40 backdrop-blur-md">
        <p className="text-gray-400 font-mono text-xs sm:text-sm flex flex-col sm:flex-row items-center justify-center gap-2">
          <Info size={16} className="text-yellow-500" />
          Modo Administrador: El foro tipo red social está en construcción y solo es visible para admins.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-0 sm:gap-6">
        
        {/* Left Sidebar (Desktop) */}
        <div className="hidden md:block col-span-1 space-y-6 sticky top-24 h-max">
          <div className="bg-zinc-900/40 border border-zinc-800/50 rounded-xl p-4">
             <div className="flex flex-col items-center text-center">
               <img 
                 src={currentUserProfile.avatar} 
                 alt="Profile" 
                 className="w-16 h-16 rounded-full border-2 border-primary mb-3 bg-zinc-800 object-cover"
               />
               <h3 className="font-bold text-white">{currentUserProfile.name}</h3>
               <p className="text-sm text-gray-500 font-mono">{currentUserProfile.handle}</p>
             </div>
             <div className="mt-6 space-y-3 pt-6 border-t border-zinc-800/50">
               <div className="flex justify-between text-sm">
                 <span className="text-gray-400">Seguidores</span>
                 <span className="text-white font-bold">128</span>
               </div>
               <div className="flex justify-between text-sm">
                 <span className="text-gray-400">Siguiendo</span>
                 <span className="text-white font-bold">45</span>
               </div>
             </div>
          </div>
          
          <div className="bg-zinc-900/40 border border-zinc-800/50 rounded-xl p-4">
            <h3 className="font-bold text-white mb-4 font-display uppercase italic">Tendencias</h3>
            <div className="space-y-4">
              <div className="cursor-pointer group">
                <p className="text-xs text-gray-500 font-mono">1 • Torneos</p>
                <p className="font-bold text-gray-300 group-hover:text-primary transition-colors">#FreeFireLeague</p>
                <p className="text-xs text-gray-500">1,204 posts</p>
              </div>
              <div className="cursor-pointer group">
                <p className="text-xs text-gray-500 font-mono">2 • Comunidad</p>
                <p className="font-bold text-gray-300 group-hover:text-primary transition-colors">BuscandoDuo</p>
                <p className="text-xs text-gray-500">842 posts</p>
              </div>
            </div>
          </div>
        </div>

        {/* Mobile Trends (Visible only on smartphones) */}
        <div className="md:hidden border-b border-zinc-800/80 pb-4 mb-2 px-4 shadow-sm bg-background/50 backdrop-blur-sm z-10 sticky top-0 pt-4">
          <h3 className="font-bold text-white text-sm mb-3 font-display uppercase italic px-1">Tendencias</h3>
          <div className="flex gap-3 overflow-x-auto no-scrollbar scroll-smooth snap-x pb-2">
            <div className="bg-zinc-900/80 rounded-lg p-3 min-w-[160px] flex-shrink-0 border border-zinc-800 snap-center shadow-lg">
              <p className="text-[10px] text-gray-500 font-mono">1 • Torneos</p>
              <p className="font-bold text-gray-200 text-sm mt-0.5">#FreeFireLeague</p>
              <p className="text-[10px] text-gray-500 mt-1">1,204 posts</p>
            </div>
            <div className="bg-zinc-900/80 rounded-lg p-3 min-w-[160px] flex-shrink-0 border border-zinc-800 snap-center shadow-lg">
              <p className="text-[10px] text-gray-500 font-mono">2 • Comunidad</p>
              <p className="font-bold text-gray-200 text-sm mt-0.5">BuscandoDuo</p>
              <p className="text-[10px] text-gray-500 mt-1">842 posts</p>
            </div>
            <div className="bg-zinc-900/80 rounded-lg p-3 min-w-[160px] flex-shrink-0 border border-zinc-800 snap-center shadow-lg">
              <p className="text-[10px] text-gray-500 font-mono">3 • Random</p>
              <p className="font-bold text-gray-200 text-sm mt-0.5">MejoresClips</p>
              <p className="text-[10px] text-gray-500 mt-1">531 posts</p>
            </div>
          </div>
        </div>

        {/* Main Feed */}
        <div className="col-span-1 md:col-span-3 lg:border-l lg:border-zinc-800/50 lg:pl-6 space-y-0 sm:space-y-6 min-h-screen">
          
          {/* Create Post Input */}
          <div className="bg-zinc-900/40 sm:bg-zinc-900/60 border-b sm:border border-zinc-800/80 sm:rounded-xl p-4 sm:shadow-xl backdrop-blur-sm">
            <div className="flex gap-3 sm:gap-4">
               <img 
                 src={currentUserProfile.avatar} 
                 alt="User account" 
                 className="w-10 h-10 rounded-full bg-zinc-800 shrink-0 object-cover"
               />
               <form onSubmit={handlePost} className="flex-1">
                 <textarea 
                   placeholder="¿Qué está pasando en la arena?"
                   className="w-full bg-transparent text-white placeholder-gray-500 resize-none outline-none text-base sm:text-lg min-h-[60px] sm:min-h-[80px]"
                   value={newPost}
                   onChange={(e) => setNewPost(e.target.value)}
                 />
                 <div className="flex items-center justify-between mt-2 pt-3 border-t border-zinc-800/80">
                   <div className="flex gap-2">
                     <button type="button" className="p-2 text-primary hover:bg-primary/10 rounded-full transition-colors">
                       <ImageIcon size={20} />
                     </button>
                   </div>
                   <button 
                     type="submit"
                     disabled={!newPost.trim()}
                     className="bg-primary text-black font-bold px-4 py-1.5 sm:px-5 sm:py-2 rounded-full hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 text-sm sm:text-base shadow-lg shadow-primary/20"
                   >
                     Publicar
                     <Send size={14} className="sm:w-4 sm:h-4" />
                   </button>
                 </div>
               </form>
            </div>
          </div>

          {/* Posts Feed */}
          <div className="space-y-0 sm:space-y-4">
            <AnimatePresence>
              {posts.map((post) => (
                <motion.div 
                  key={post.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-zinc-900/20 sm:bg-zinc-900/40 border-b border-zinc-800/60 sm:border sm:rounded-xl p-4 sm:p-5 hover:bg-zinc-900/60 transition-colors"
                >
                  <div className="flex gap-3 sm:gap-4">
                    <img 
                      src={post.user.avatar} 
                      alt={post.user.name} 
                      className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-zinc-800 object-cover"
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-baseline flex-wrap gap-1 sm:gap-2">
                        <h4 className="font-bold text-white truncate">{post.user.name}</h4>
                        <span className="text-gray-500 text-sm truncate">{post.user.handle}</span>
                        <span className="text-gray-600 text-sm">·</span>
                        <span className="text-gray-500 text-sm">{post.time}</span>
                      </div>
                      
                      <p className="text-gray-200 mt-2 text-[15px] sm:text-base leading-relaxed break-words whitespace-pre-wrap">
                        {post.content}
                      </p>

                      {post.image && (
                        <div className="mt-3 rounded-xl overflow-hidden border border-zinc-800 max-h-80">
                          <img src={post.image} alt="Post content" className="w-full h-full object-cover" />
                        </div>
                      )}

                      <div className="flex items-center justify-between mt-4 max-w-md pr-4">
                        <button 
                          onClick={() => toggleComments(post.id)}
                          className="flex items-center gap-2 text-gray-500 hover:text-primary transition-colors group"
                        >
                          <div className="p-2 rounded-full group-hover:bg-primary/10 transition-colors">
                            <MessageCircle size={18} />
                          </div>
                          <span className="text-sm">{post.comments}</span>
                        </button>
                        
                        <button className="flex items-center gap-2 text-gray-500 hover:text-green-500 transition-colors group">
                          <div className="p-2 rounded-full group-hover:bg-green-500/10 transition-colors">
                            <Share2 size={18} />
                          </div>
                          <span className="text-sm">{post.shares}</span>
                        </button>

                        <button 
                          onClick={() => toggleLike(post.id)}
                          className={`flex items-center gap-2 transition-colors group ${post.isLiked ? 'text-red-500' : 'text-gray-500 hover:text-red-500'}`}
                        >
                          <div className={`p-2 rounded-full group-hover:bg-red-500/10 transition-colors`}>
                            <Heart size={18} className={post.isLiked ? 'fill-current' : ''} />
                          </div>
                          <span className="text-sm">{post.likes}</span>
                        </button>
                      </div>

                      {/* Comments Section */}
                      {expandedComments[post.id] && (
                        <motion.div 
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: 'auto' }}
                          className="mt-4 pt-4 border-t border-zinc-800/80 space-y-4"
                        >
                          {/* Existing Comments */}
                          <div className="space-y-4">
                            {post.commentList.map(comment => (
                              <div key={comment.id} className="flex gap-3">
                                <img 
                                  src={comment.user.avatar} 
                                  alt={comment.user.name} 
                                  className="w-8 h-8 rounded-full bg-zinc-800 object-cover"
                                />
                                <div className="flex-1 bg-zinc-800/30 rounded-xl p-3">
                                  <div className="flex items-baseline gap-2">
                                    <span className="font-bold text-white text-sm">{comment.user.name}</span>
                                    <span className="text-gray-500 text-xs">{comment.user.handle}</span>
                                    <span className="text-gray-600 text-xs">· {comment.time}</span>
                                  </div>
                                  <p className="text-gray-300 text-sm mt-1">{comment.content}</p>
                                </div>
                              </div>
                            ))}
                          </div>

                          {/* Add Comment */}
                          <div className="flex gap-3 mt-4">
                            <img 
                              src={currentUserProfile.avatar} 
                              alt="Current User" 
                              className="w-8 h-8 rounded-full bg-zinc-800 shrink-0 object-cover"
                            />
                            <form 
                              onSubmit={(e) => handleComment(post.id, e)}
                              className="flex-1 flex gap-2"
                            >
                              <input 
                                type="text"
                                placeholder="Escribe una respuesta..."
                                className="flex-1 bg-zinc-800/50 text-white placeholder-gray-500 rounded-full px-4 py-2 text-sm outline-none focus:bg-zinc-800 transition-colors"
                                value={commentInputs[post.id] || ''}
                                onChange={(e) => setCommentInputs({
                                  ...commentInputs,
                                  [post.id]: e.target.value
                                })}
                              />
                              <button 
                                type="submit"
                                disabled={!(commentInputs[post.id] || '').trim()}
                                className="p-2 text-primary hover:bg-primary/10 rounded-full disabled:opacity-50 transition-colors flex items-center justify-center shrink-0"
                              >
                                <Send size={16} />
                              </button>
                            </form>
                          </div>
                        </motion.div>
                      )}
                    </div>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
            
            {posts.length === 0 && (
              <div className="text-center py-10">
                <p className="text-gray-500 font-mono">No hay publicaciones aún. ¡Sé el primero!</p>
              </div>
            )}
          </div>
          
        </div>
      </div>
    </div>
  );
};

export default ForumPage;
