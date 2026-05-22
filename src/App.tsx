import React from 'react';
import { HashRouter as Router, Routes, Route } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { ThemeProvider } from './contexts/ThemeContext';
import Layout from './components/Layout';
import HomePage from './pages/HomePage';
import LivePage from './pages/LivePage';
import TournamentPage from './pages/TournamentPage';
import ProfilePage from './pages/ProfilePage';
import AdminPage from './pages/AdminPage';
import LeaderboardPage from './pages/LeaderboardPage';
import ProtectedRoute from './components/ProtectedRoute';
import LoginPage from './components/LoginPage';
import { Toaster } from 'react-hot-toast';
import { Trophy } from 'lucide-react';
import { motion } from 'motion/react';

const RootApp = () => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center flex-col gap-4">
        <div className="relative w-16 h-16 flex items-center justify-center">
          <Trophy className="text-primary z-10" size={32} />
          <motion.div
            animate={{ scale: [1, 1.2, 1], opacity: [0.5, 1, 0.5] }}
            transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
            className="absolute inset-0 bg-primary/30 rounded-full blur-xl"
          />
        </div>
        <div className="flex items-center gap-2 text-primary font-mono text-[10px] uppercase tracking-widest font-bold">
          <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
          Conectando
        </div>
      </div>
    );
  }

  if (!user) {
    return <LoginPage />;
  }

  return (
    <Layout>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/live" element={<LivePage />} />
        <Route path="/tournament/:id" element={<TournamentPage />} />
        <Route 
          path="/profile" 
          element={
            <ProtectedRoute>
              <ProfilePage />
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/admin" 
          element={
            <ProtectedRoute requireAdmin>
              <AdminPage />
            </ProtectedRoute>
          } 
        />
        <Route path="/leaderboard" element={<LeaderboardPage />} />
      </Routes>
    </Layout>
  );
};

export default function App() {
  return (
    <Router>
      <ThemeProvider>
        <AuthProvider>
          <Toaster 
            position="bottom-right"
            toastOptions={{
              className: 'glass text-white border border-white/10 text-sm',
              duration: 5000,
              style: {
                background: 'rgba(0, 0, 0, 0.8)',
                color: '#fff',
                backdropFilter: 'blur(8px)',
              },
            }}
          />
          <RootApp />
        </AuthProvider>
      </ThemeProvider>
    </Router>
  );
}
