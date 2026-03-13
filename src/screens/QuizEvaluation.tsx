import React, { useState, useEffect } from 'react';
import { 
  BookOpen, 
  CheckCircle2, 
  XCircle, 
  ChevronRight, 
  Loader2,
  Trophy,
  ArrowLeft
} from 'lucide-react';
import { db, auth } from '../firebase';
import { collection, query, where, getDocs, addDoc, serverTimestamp, doc, updateDoc, setDoc } from 'firebase/firestore';
import { StudyMaterial, QuizQuestion } from '../types';
import { generateQuiz } from '../services/gemini';

export default function QuizEvaluation() {
  const [materials, setMaterials] = useState<StudyMaterial[]>([]);
  const [selectedMaterial, setSelectedMaterial] = useState<StudyMaterial | null>(null);
  const [quiz, setQuiz] = useState<QuizQuestion[]>([]);
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [answers, setAnswers] = useState<number[]>([]);
  const [loading, setLoading] = useState(false);
  const [showResults, setShowResults] = useState(false);

  useEffect(() => {
    const fetchMaterials = async () => {
      if (!auth.currentUser) return;
      const q = query(collection(db, 'study_materials'), where('userId', '==', auth.currentUser.uid));
      const snap = await getDocs(q);
      setMaterials(snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as StudyMaterial)));
    };
    fetchMaterials();
  }, []);

  const startQuiz = async (material: StudyMaterial) => {
    setLoading(true);
    setSelectedMaterial(material);
    try {
      const questions = await generateQuiz(material.content);
      setQuiz(questions);
      setAnswers([]);
      setCurrentQuestion(0);
      setShowResults(false);
    } catch (error) {
      console.error(error);
      alert("Failed to generate quiz.");
    } finally {
      setLoading(false);
    }
  };

  const handleAnswer = (index: number) => {
    const newAnswers = [...answers];
    newAnswers[currentQuestion] = index;
    setAnswers(newAnswers);
  };

  const nextQuestion = () => {
    if (currentQuestion < quiz.length - 1) {
      setCurrentQuestion(currentQuestion + 1);
    } else {
      finishQuiz();
    }
  };

  const finishQuiz = async () => {
    const score = answers.reduce((acc, ans, i) => acc + (ans === quiz[i].correctAnswer ? 1 : 0), 0);
    setShowResults(true);

    // Save results
    try {
      await addDoc(collection(db, 'quiz_results'), {
        userId: auth.currentUser?.uid,
        materialId: selectedMaterial?.id,
        score,
        totalQuestions: quiz.length,
        timestamp: serverTimestamp(),
        answers: quiz.map((q, i) => ({
          questionIndex: i,
          selectedAnswer: answers[i],
          isCorrect: answers[i] === q.correctAnswer
        }))
      });

      // Update topic analysis
      const topicPerformance: Record<string, { correct: number, total: number }> = {};
      quiz.forEach((q, i) => {
        if (!topicPerformance[q.topic]) topicPerformance[q.topic] = { correct: 0, total: 0 };
        topicPerformance[q.topic].total++;
        if (answers[i] === q.correctAnswer) topicPerformance[q.topic].correct++;
      });

      for (const [topic, perf] of Object.entries(topicPerformance)) {
        const mastery = perf.correct / perf.total > 0.8 ? 'strong' : perf.correct / perf.total > 0.5 ? 'medium' : 'weak';
        // Simplified: in a real app, we'd find the existing doc and update or create
        await addDoc(collection(db, 'topic_analysis'), {
          userId: auth.currentUser?.uid,
          topic,
          masteryLevel: mastery,
          lastUpdated: serverTimestamp()
        });
      }
    } catch (error) {
      console.error(error);
    }
  };

  if (loading) return (
    <div className="flex flex-col items-center justify-center h-96">
      <Loader2 className="animate-spin text-emerald-500 mb-4" size={48} />
      <h2 className="text-xl font-bold">Generating AI Quiz...</h2>
      <p className="text-gray-500">Crafting questions based on your material.</p>
    </div>
  );

  if (showResults) {
    const score = answers.reduce((acc, ans, i) => acc + (ans === quiz[i].correctAnswer ? 1 : 0), 0);
    return (
      <div className="max-w-3xl mx-auto space-y-8 animate-in zoom-in-95 duration-500">
        <div className="bg-white p-10 rounded-3xl border border-black/5 shadow-xl text-center">
          <div className="w-20 h-20 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-6">
            <Trophy size={40} />
          </div>
          <h2 className="text-3xl font-bold mb-2">Quiz Completed!</h2>
          <p className="text-gray-500 mb-8">Great job! Here's how you performed.</p>
          
          <div className="text-6xl font-black text-emerald-600 mb-10">
            {score} <span className="text-2xl text-gray-300">/ {quiz.length}</span>
          </div>

          <button 
            onClick={() => setSelectedMaterial(null)}
            className="px-8 py-3 bg-black text-white rounded-2xl font-bold hover:bg-gray-800 transition-all"
          >
            Back to Materials
          </button>
        </div>

        <div className="space-y-4">
          <h3 className="font-bold text-xl px-2">Review Answers</h3>
          {quiz.map((q, i) => (
            <div key={i} className="bg-white p-6 rounded-2xl border border-black/5 shadow-sm">
              <div className="flex items-start gap-3 mb-4">
                {answers[i] === q.correctAnswer ? (
                  <CheckCircle2 className="text-emerald-500 shrink-0 mt-1" />
                ) : (
                  <XCircle className="text-red-500 shrink-0 mt-1" />
                )}
                <p className="font-bold">{q.question}</p>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2 mb-4">
                {q.options.map((opt, optIdx) => (
                  <div 
                    key={optIdx}
                    className={`px-4 py-2 rounded-xl text-sm ${
                      optIdx === q.correctAnswer 
                        ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' 
                        : optIdx === answers[i] 
                        ? 'bg-red-50 text-red-700 border border-red-200'
                        : 'bg-gray-50 text-gray-500'
                    }`}
                  >
                    {opt}
                  </div>
                ))}
              </div>
              <div className="bg-blue-50 p-4 rounded-xl text-xs text-blue-700 leading-relaxed">
                <span className="font-bold uppercase tracking-wider block mb-1">Explanation</span>
                {q.explanation}
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (selectedMaterial && quiz.length > 0) {
    const q = quiz[currentQuestion];
    return (
      <div className="max-w-3xl mx-auto animate-in slide-in-from-right-4 duration-500">
        <div className="flex items-center justify-between mb-8">
          <button onClick={() => setSelectedMaterial(null)} className="flex items-center gap-2 text-gray-500 hover:text-black">
            <ArrowLeft size={20} />
            <span>Exit Quiz</span>
          </button>
          <div className="px-4 py-1 bg-gray-100 rounded-full text-xs font-bold">
            Question {currentQuestion + 1} of {quiz.length}
          </div>
        </div>

        <div className="bg-white p-8 md:p-12 rounded-3xl border border-black/5 shadow-sm mb-8">
          <span className="text-xs font-bold text-emerald-600 uppercase tracking-widest mb-4 block">{q.topic}</span>
          <h2 className="text-2xl font-bold mb-10 leading-snug">{q.question}</h2>
          
          <div className="space-y-3">
            {q.options.map((opt, i) => (
              <button
                key={i}
                onClick={() => handleAnswer(i)}
                className={`w-full text-left px-6 py-4 rounded-2xl border-2 transition-all duration-200 ${
                  answers[currentQuestion] === i 
                    ? 'border-emerald-500 bg-emerald-50 text-emerald-700' 
                    : 'border-gray-100 hover:border-emerald-200 hover:bg-gray-50'
                }`}
              >
                <div className="flex items-center gap-4">
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold ${
                    answers[currentQuestion] === i ? 'bg-emerald-500 text-white' : 'bg-gray-100 text-gray-400'
                  }`}>
                    {String.fromCharCode(65 + i)}
                  </div>
                  <span className="font-medium">{opt}</span>
                </div>
              </button>
            ))}
          </div>
        </div>

        <button
          onClick={nextQuestion}
          disabled={answers[currentQuestion] === undefined}
          className="w-full py-4 bg-black text-white rounded-2xl font-bold flex items-center justify-center gap-2 hover:bg-gray-800 transition-all disabled:opacity-50"
        >
          {currentQuestion === quiz.length - 1 ? 'Finish Quiz' : 'Next Question'}
          <ChevronRight size={20} />
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <header>
        <h1 className="text-3xl font-bold tracking-tight mb-2">Quiz & Evaluation</h1>
        <p className="text-gray-500">Select a study material to start an AI-generated quiz.</p>
      </header>

      {materials.length === 0 ? (
        <div className="bg-white p-12 rounded-3xl border border-black/5 text-center">
          <div className="w-16 h-16 bg-gray-100 text-gray-300 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <BookOpen size={32} />
          </div>
          <h3 className="text-lg font-bold mb-2">No materials found</h3>
          <p className="text-gray-500 mb-6">Upload some study material first to generate quizzes.</p>
          <button className="px-6 py-2 bg-emerald-500 text-white rounded-xl font-bold">Go to Upload</button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {materials.map((m) => (
            <div key={m.id} className="bg-white p-6 rounded-2xl border border-black/5 shadow-sm hover:shadow-md transition-all group">
              <div className="w-10 h-10 bg-emerald-50 text-emerald-600 rounded-xl flex items-center justify-center mb-4">
                <BookOpen size={20} />
              </div>
              <h3 className="font-bold mb-2 line-clamp-1">{m.title}</h3>
              <p className="text-xs text-gray-400 mb-6">{m.extractedTopics.length} topics identified</p>
              <button 
                onClick={() => startQuiz(m)}
                className="w-full py-2 bg-gray-50 text-gray-900 rounded-xl font-bold text-sm group-hover:bg-emerald-500 group-hover:text-white transition-all"
              >
                Start Quiz
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
