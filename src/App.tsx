import React, { useState, useEffect } from 'react';
import { auth } from './firebase';
import { onAuthStateChanged, User } from 'firebase/auth';
import Layout from './components/Layout';
import ErrorBoundary from './components/ErrorBoundary';

// Screens
import Dashboard from './screens/Dashboard';
import UploadMaterial from './screens/UploadMaterial';
import QuizEvaluation from './screens/QuizEvaluation';
import WeakConceptAnalysis from './screens/WeakConceptAnalysis';
import AITutorChat from './screens/AITutorChat';
import ProfileProgress from './screens/ProfileProgress';
import Login from './screens/Login';
import Register from './screens/Register';

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [authMode, setAuthMode] = useState<'login' | 'register'>('login');

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setUser(user);
      setLoading(false);
    });
    return unsubscribe;
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#F8F9FA]">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-sm font-bold text-gray-400 uppercase tracking-widest">Initializing AI System</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <ErrorBoundary>
        {authMode === 'login' ? (
          <Login onToggle={() => setAuthMode('register')} />
        ) : (
          <Register onToggle={() => setAuthMode('login')} />
        )}
      </ErrorBoundary>
    );
  }

  const renderContent = () => {
    switch (activeTab) {
      case 'dashboard': return <Dashboard />;
      case 'upload': return <UploadMaterial />;
      case 'quiz': return <QuizEvaluation />;
      case 'analysis': return <WeakConceptAnalysis />;
      case 'tutor': return <AITutorChat />;
      case 'profile': return <ProfileProgress />;
      default: return <Dashboard />;
    }
  };

  return (
    <ErrorBoundary>
      <Layout activeTab={activeTab} setActiveTab={setActiveTab}>
        {renderContent()}
      </Layout>
    </ErrorBoundary>
  );
}
