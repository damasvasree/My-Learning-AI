import React, { useState, useEffect } from 'react';
import { 
  BrainCircuit, 
  CheckCircle2, 
  AlertCircle, 
  Clock,
  Calendar,
  ChevronRight,
  Sparkles
} from 'lucide-react';
import { db, auth } from '../firebase';
import { collection, query, where, getDocs, orderBy, limit, addDoc, serverTimestamp } from 'firebase/firestore';
import { TopicAnalysis, StudyPlan } from '../types';
import { generateStudyPlan } from '../services/gemini';

export default function WeakConceptAnalysis() {
  const [analysis, setAnalysis] = useState<TopicAnalysis[]>([]);
  const [studyPlan, setStudyPlan] = useState<StudyPlan | null>(null);
  const [loading, setLoading] = useState(true);
  const [generatingPlan, setGeneratingPlan] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      if (!auth.currentUser) return;
      try {
        const analysisQuery = query(
          collection(db, 'topic_analysis'),
          where('userId', '==', auth.currentUser.uid)
        );
        const analysisSnap = await getDocs(analysisQuery);
        setAnalysis(analysisSnap.docs.map(doc => ({ id: doc.id, ...doc.data() } as TopicAnalysis)));

        const planQuery = query(
          collection(db, 'study_plans'),
          where('userId', '==', auth.currentUser.uid),
          orderBy('createdAt', 'desc'),
          limit(1)
        );
        const planSnap = await getDocs(planQuery);
        if (!planSnap.empty) {
          setStudyPlan({ id: planSnap.docs[0].id, ...planSnap.docs[0].data() } as StudyPlan);
        }
      } catch (error) {
        console.error(error);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const handleGeneratePlan = async () => {
    setGeneratingPlan(true);
    try {
      const weakTopics = analysis.filter(a => a.masteryLevel === 'weak').map(a => a.topic);
      const plan = await generateStudyPlan(weakTopics);
      
      const planDoc = {
        userId: auth.currentUser?.uid,
        planDate: new Date().toISOString().split('T')[0],
        tasks: plan.tasks,
        createdAt: serverTimestamp()
      };

      const docRef = await addDoc(collection(db, 'study_plans'), planDoc);
      setStudyPlan({ id: docRef.id, ...planDoc, createdAt: new Date().toISOString() } as StudyPlan);
    } catch (error) {
      console.error(error);
    } finally {
      setGeneratingPlan(false);
    }
  };

  if (loading) return <div className="flex items-center justify-center h-64">Analyzing concepts...</div>;

  const strong = analysis.filter(a => a.masteryLevel === 'strong');
  const medium = analysis.filter(a => a.masteryLevel === 'medium');
  const weak = analysis.filter(a => a.masteryLevel === 'weak');

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <header>
        <h1 className="text-3xl font-bold tracking-tight mb-2">Weak Concept Analysis</h1>
        <p className="text-gray-500">AI-driven insights into your knowledge gaps and adaptive study plans.</p>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Mastery Breakdown */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white p-6 rounded-2xl border border-black/5 shadow-sm">
            <h3 className="font-bold mb-6 flex items-center gap-2">
              <BrainCircuit className="text-emerald-500" size={20} />
              Topic Mastery Engine
            </h3>
            
            <div className="space-y-8">
              <MasterySection title="Strong Concepts" topics={strong} color="text-emerald-600" bgColor="bg-emerald-50" icon={<CheckCircle2 size={16} />} />
              <MasterySection title="Developing Concepts" topics={medium} color="text-orange-600" bgColor="bg-orange-50" icon={<Clock size={16} />} />
              <MasterySection title="Weak Concepts" topics={weak} color="text-red-600" bgColor="bg-red-50" icon={<AlertCircle size={16} />} />
            </div>
          </div>
        </div>

        {/* Adaptive Study Plan */}
        <div className="space-y-6">
          <div className="bg-black text-white p-6 rounded-3xl shadow-xl relative overflow-hidden">
            <div className="relative z-10">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-bold flex items-center gap-2">
                  <Calendar size={20} className="text-emerald-400" />
                  Today's Study Plan
                </h3>
                <Sparkles size={20} className="text-emerald-400 animate-pulse" />
              </div>

              {studyPlan ? (
                <div className="space-y-4">
                  {studyPlan.tasks.map((task, i) => (
                    <div key={i} className="flex gap-3 group cursor-pointer">
                      <div className="mt-1 w-5 h-5 rounded-full border border-white/20 flex items-center justify-center group-hover:border-emerald-400 transition-colors">
                        <div className="w-2 h-2 rounded-full bg-emerald-400 opacity-0 group-hover:opacity-100" />
                      </div>
                      <p className="text-sm text-gray-300 group-hover:text-white transition-colors">{task}</p>
                    </div>
                  ))}
                  <button 
                    onClick={handleGeneratePlan}
                    disabled={generatingPlan}
                    className="w-full mt-6 py-3 bg-emerald-500 text-white rounded-xl font-bold text-sm hover:bg-emerald-400 transition-all disabled:opacity-50"
                  >
                    {generatingPlan ? 'Generating...' : 'Refresh Plan'}
                  </button>
                </div>
              ) : (
                <div className="text-center py-6">
                  <p className="text-gray-400 text-sm mb-6">No study plan generated yet. Let AI create one based on your weak topics.</p>
                  <button 
                    onClick={handleGeneratePlan}
                    disabled={generatingPlan}
                    className="w-full py-3 bg-emerald-500 text-white rounded-xl font-bold text-sm hover:bg-emerald-400 transition-all disabled:opacity-50"
                  >
                    {generatingPlan ? 'Generating...' : 'Generate Plan'}
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function MasterySection({ title, topics, color, bgColor, icon }: { title: string, topics: TopicAnalysis[], color: string, bgColor: string, icon: React.ReactNode }) {
  return (
    <div>
      <h4 className={`text-xs font-bold uppercase tracking-widest mb-4 ${color}`}>{title}</h4>
      {topics.length > 0 ? (
        <div className="flex flex-wrap gap-2">
          {topics.map((t) => (
            <div key={t.id} className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-sm font-medium ${bgColor} ${color}`}>
              {icon}
              {t.topic}
            </div>
          ))}
        </div>
      ) : (
        <p className="text-xs text-gray-400 italic">No topics in this category yet.</p>
      )}
    </div>
  );
}
