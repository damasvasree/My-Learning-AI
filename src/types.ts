export interface UserProfile {
  uid: string;
  fullName: string;
  email: string;
  educationLevel: 'school' | 'college' | 'professional';
  createdAt: string;
}

export interface StudyMaterial {
  id: string;
  userId: string;
  title: string;
  type: 'pdf' | 'ppt' | 'text' | 'youtube';
  content: string;
  extractedTopics: string[];
  summary: string;
  createdAt: string;
}

export interface QuizQuestion {
  question: string;
  options: string[];
  correctAnswer: number;
  explanation: string;
  topic: string;
}

export interface QuizResult {
  id: string;
  userId: string;
  materialId: string;
  score: number;
  totalQuestions: number;
  answers: { questionIndex: number; selectedAnswer: number; isCorrect: boolean }[];
  timestamp: string;
}

export interface TopicAnalysis {
  id: string;
  userId: string;
  topic: string;
  masteryLevel: 'strong' | 'medium' | 'weak';
  lastUpdated: string;
}

export interface StudyPlan {
  id: string;
  userId: string;
  planDate: string;
  tasks: string[];
  createdAt: string;
}

export interface UserActivity {
  id: string;
  userId: string;
  date: string;
  activityType: string;
  quizScore?: number;
}
