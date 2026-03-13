import React, { useState, useEffect } from 'react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  LineChart,
  Line,
  Cell,
  PieChart,
  Pie
} from 'recharts';
import { 
  Trophy, 
  Flame, 
  CheckCircle2, 
  AlertCircle,
  ArrowUpRight,
  Lightbulb
} from 'lucide-react';
import { db, auth } from '../firebase';
import { collection, query, where, getDocs, orderBy, limit } from 'firebase/firestore';
import { QuizResult, TopicAnalysis, UserActivity } from '../types';
import { getLearningInsights } from '../services/gemini';

export default function Dashboard() {
  const [results, setResults] = useState<QuizResult[]>([]);
  const [analysis, setAnalysis] = useState<TopicAnalysis[]>([]);
  const [insights, setInsights] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      if (!auth.currentUser) return;
      
      try {
        const resultsQuery = query(
          collection(db, 'quiz_results'),
          where('userId', '==', auth.currentUser.uid),
          orderBy('timestamp', 'desc'),
          limit(10)
        );
        const resultsSnap = await getDocs(resultsQuery);
        const resultsData = resultsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() } as QuizResult));
        setResults(resultsData);

        const analysisQuery = query(
          collection(db, 'topic_analysis'),
          where('userId', '==', auth.currentUser.uid)
        );
        const analysisSnap = await getDocs(analysisQuery);
        const analysisData = analysisSnap.docs.map(doc => ({ id: doc.id, ...doc.data() } as TopicAnalysis));
        setAnalysis(analysisData);

        // Fetch AI Insights
        if (resultsData.length > 0) {
          const aiInsights = await getLearningInsights({
            recentScores: resultsData.map(r => r.score),
            topicMastery: analysisData.map(a => ({ topic: a.topic, level: a.masteryLevel }))
          });
          setInsights(aiInsights.insights);
        }
      } catch (error) {
        console.error("Error fetching dashboard data:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const avgScore = results.length > 0 
    ? Math.round(results.reduce((acc, r) => acc + (r.score / r.totalQuestions) * 100, 0) / results.length)
    : 0;

  const weakTopics = analysis.filter(a => a.masteryLevel === 'weak').length;
  const strongTopics = analysis.filter(a => a.masteryLevel === 'strong').length;

  if (loading) return <div className="flex items-center justify-center h-64">Loading dashboard...</div>;

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <header>
        <h1 className="text-3xl font-bold tracking-tight mb-2">Welcome back, {auth.currentUser?.displayName?.split(' ')[0] || 'Student'}!</h1>
        <p className="text-gray-500">Here's your learning progress for this month.</p>
      </header>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard 
          title="Exam Readiness" 
          value={`${avgScore}%`} 
          icon={<Trophy className="text-emerald-500" />}
          trend="+5% from last week"
        />
        <StatCard 
          title="Study Streak" 
          value="5 Days" 
          icon={<Flame className="text-orange-500" />}
          trend="Keep it up!"
        />
        <StatCard 
          title="Strong Topics" 
          value={strongTopics.toString()} 
          icon={<CheckCircle2 className="text-blue-500" />}
          trend="Mastered"
        />
        <StatCard 
          title="Weak Topics" 
          value={weakTopics.toString()} 
          icon={<AlertCircle className="text-red-500" />}
          trend="Needs focus"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Progress Chart */}
        <div className="lg:col-span-2 bg-white p-6 rounded-2xl border border-black/5 shadow-sm">
          <h3 className="font-bold mb-6 flex items-center gap-2">
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={results.slice().reverse()}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                <XAxis 
                  dataKey="timestamp" 
                  tickFormatter={(val) => new Date(val).toLocaleDateString([], { month: 'short', day: 'numeric' })}
                  axisLine={false}
                  tickLine={false}
                  tick={{ fontSize: 12, fill: '#9CA3AF' }}
                />
                <YAxis 
                  axisLine={false}
                  tickLine={false}
                  tick={{ fontSize: 12, fill: '#9CA3AF' }}
                />
                <Tooltip 
                  contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                />
                <Line 
                  type="monotone" 
                  dataKey="score" 
                  stroke="#10B981" 
                  strokeWidth={3} 
                  dot={{ r: 4, fill: '#10B981', strokeWidth: 2, stroke: '#fff' }}
                  activeDot={{ r: 6, strokeWidth: 0 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </h3>
          <div className="flex items-center justify-between mt-4">
            <span className="text-sm font-medium text-gray-500">Quiz Performance History</span>
            <button className="text-emerald-600 text-sm font-semibold flex items-center gap-1">
              View all <ArrowUpRight size={14} />
            </button>
          </div>
        </div>

        {/* AI Insights */}
        <div className="bg-emerald-900 text-white p-6 rounded-2xl shadow-lg relative overflow-hidden">
          <div className="relative z-10">
            <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center mb-4">
              <Lightbulb size={20} />
            </div>
            <h3 className="text-xl font-bold mb-4">AI Learning Insights</h3>
            <div className="space-y-4">
              {insights.length > 0 ? insights.map((insight, i) => (
                <div key={i} className="flex gap-3">
                  <div className="mt-1.5 w-1.5 h-1.5 rounded-full bg-emerald-400 shrink-0" />
                  <p className="text-emerald-50 text-sm leading-relaxed">{insight}</p>
                </div>
              )) : (
                <p className="text-emerald-50 text-sm">Take a quiz to generate personalized insights!</p>
              )}
            </div>
          </div>
          {/* Decorative background element */}
          <div className="absolute -bottom-10 -right-10 w-40 h-40 bg-emerald-800 rounded-full blur-3xl opacity-50" />
        </div>
      </div>
    </div>
  );
}

function StatCard({ title, value, icon, trend }: { title: string, value: string, icon: React.ReactNode, trend: string }) {
  return (
    <div className="bg-white p-6 rounded-2xl border border-black/5 shadow-sm hover:shadow-md transition-shadow duration-200">
      <div className="flex justify-between items-start mb-4">
        <div className="p-2 bg-gray-50 rounded-xl">{icon}</div>
      </div>
      <div>
        <h4 className="text-gray-500 text-sm font-medium mb-1">{title}</h4>
        <div className="text-2xl font-bold mb-1">{value}</div>
        <p className="text-xs text-emerald-600 font-medium">{trend}</p>
      </div>
    </div>
  );
}
