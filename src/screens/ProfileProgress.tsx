import React, { useState, useEffect } from 'react';
import { 
  User, 
  Mail, 
  GraduationCap, 
  Calendar, 
  Trophy, 
  Target, 
  TrendingUp,
  Award
} from 'lucide-react';
import { db, auth } from '../firebase';
import { collection, query, where, getDocs, doc, getDoc } from 'firebase/firestore';
import { UserProfile, QuizResult, TopicAnalysis } from '../types';

export default function ProfileProgress() {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [results, setResults] = useState<QuizResult[]>([]);
  const [analysis, setAnalysis] = useState<TopicAnalysis[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      if (!auth.currentUser) return;
      try {
        const userDoc = await getDoc(doc(db, 'users', auth.currentUser.uid));
        if (userDoc.exists()) setProfile(userDoc.data() as UserProfile);

        const resultsSnap = await getDocs(query(collection(db, 'quiz_results'), where('userId', '==', auth.currentUser.uid)));
        setResults(resultsSnap.docs.map(d => d.data() as QuizResult));

        const analysisSnap = await getDocs(query(collection(db, 'topic_analysis'), where('userId', '==', auth.currentUser.uid)));
        setAnalysis(analysisSnap.docs.map(d => d.data() as TopicAnalysis));
      } catch (error) {
        console.error(error);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  if (loading) return <div className="flex items-center justify-center h-64">Loading profile...</div>;

  const totalQuizzes = results.length;
  const avgScore = totalQuizzes > 0 
    ? Math.round(results.reduce((acc, r) => acc + (r.score / r.totalQuestions) * 100, 0) / totalQuizzes)
    : 0;
  
  const strongTopics = analysis.filter(a => a.masteryLevel === 'strong').length;

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <header>
        <h1 className="text-3xl font-bold tracking-tight mb-2">Profile & Learning Progress</h1>
        <p className="text-gray-500">Manage your account and view your long-term academic growth.</p>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Profile Card */}
        <div className="bg-white p-8 rounded-3xl border border-black/5 shadow-sm space-y-6">
          <div className="flex flex-col items-center text-center">
            <div className="w-24 h-24 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mb-4 border-4 border-white shadow-lg">
              <User size={48} />
            </div>
            <h2 className="text-2xl font-bold">{profile?.fullName || 'Student'}</h2>
            <p className="text-gray-500 text-sm">{profile?.email}</p>
          </div>

          <div className="space-y-4 pt-6 border-t border-gray-50">
            <ProfileItem icon={<Mail size={18} />} label="Email" value={profile?.email || ''} />
            <ProfileItem icon={<GraduationCap size={18} />} label="Education" value={profile?.educationLevel || ''} />
            <ProfileItem icon={<Calendar size={18} />} label="Joined" value={profile ? new Date(profile.createdAt).toLocaleDateString() : ''} />
          </div>

          <button className="w-full py-3 bg-gray-50 text-gray-900 rounded-2xl font-bold text-sm hover:bg-gray-100 transition-all">
            Edit Profile
          </button>
        </div>

        {/* Statistics Grid */}
        <div className="lg:col-span-2 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <ProgressStat 
              title="Total Quizzes" 
              value={totalQuizzes.toString()} 
              icon={<Trophy className="text-orange-500" />} 
              description="Quizzes completed"
            />
            <ProgressStat 
              title="Average Score" 
              value={`${avgScore}%`} 
              icon={<TrendingUp className="text-emerald-500" />} 
              description="Overall performance"
            />
            <ProgressStat 
              title="Strong Topics" 
              value={strongTopics.toString()} 
              icon={<Award className="text-blue-500" />} 
              description="Mastered concepts"
            />
            <ProgressStat 
              title="Readiness Score" 
              value={`${avgScore}%`} 
              icon={<Target className="text-red-500" />} 
              description="Exam preparedness"
            />
          </div>

          {/* Achievement Badges (Visual Only) */}
          <div className="bg-white p-6 rounded-3xl border border-black/5 shadow-sm">
            <h3 className="font-bold mb-6">Learning Achievements</h3>
            <div className="flex flex-wrap gap-4">
              <Badge icon="🔥" label="5 Day Streak" />
              <Badge icon="🧠" label="Concept Master" />
              <Badge icon="⚡" label="Fast Learner" />
              <Badge icon="📚" label="Library Builder" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function ProfileItem({ icon, label, value }: { icon: React.ReactNode, label: string, value: string }) {
  return (
    <div className="flex items-center gap-3">
      <div className="text-gray-400">{icon}</div>
      <div className="flex-1">
        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider leading-none mb-1">{label}</p>
        <p className="text-sm font-medium text-gray-700 capitalize">{value}</p>
      </div>
    </div>
  );
}

function ProgressStat({ title, value, icon, description }: { title: string, value: string, icon: React.ReactNode, description: string }) {
  return (
    <div className="bg-white p-6 rounded-3xl border border-black/5 shadow-sm flex items-center gap-4">
      <div className="w-12 h-12 bg-gray-50 rounded-2xl flex items-center justify-center shrink-0">
        {icon}
      </div>
      <div>
        <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">{title}</h4>
        <div className="text-xl font-bold">{value}</div>
        <p className="text-[10px] text-gray-500">{description}</p>
      </div>
    </div>
  );
}

function Badge({ icon, label }: { icon: string, label: string }) {
  return (
    <div className="flex flex-col items-center gap-2">
      <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center text-2xl shadow-inner border border-white">
        {icon}
      </div>
      <span className="text-[10px] font-bold text-gray-500 uppercase tracking-tight">{label}</span>
    </div>
  );
}
