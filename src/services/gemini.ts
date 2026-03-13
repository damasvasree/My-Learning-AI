import { GoogleGenAI, Type } from "@google/genai";
import { QuizQuestion } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || "" });

export const analyzeMaterial = async (content: string) => {
  const model = "gemini-3-flash-preview";
  const response = await ai.models.generateContent({
    model,
    contents: `Analyze the following study material and extract key topics, important concepts, definitions, and a summary. Return as JSON.
    Material: ${content}`,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          topics: { type: Type.ARRAY, items: { type: Type.STRING } },
          summary: { type: Type.STRING },
          concepts: { type: Type.ARRAY, items: { type: Type.STRING } }
        },
        required: ["topics", "summary"]
      }
    }
  });
  return JSON.parse(response.text);
};

export const generateQuiz = async (content: string): Promise<QuizQuestion[]> => {
  const model = "gemini-3-flash-preview";
  const response = await ai.models.generateContent({
    model,
    contents: `Generate 10 multiple-choice questions based on the following material. Each question should have 4 options, a correct answer index (0-3), an explanation, and a topic name.
    Material: ${content}`,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            question: { type: Type.STRING },
            options: { type: Type.ARRAY, items: { type: Type.STRING } },
            correctAnswer: { type: Type.INTEGER },
            explanation: { type: Type.STRING },
            topic: { type: Type.STRING }
          },
          required: ["question", "options", "correctAnswer", "explanation", "topic"]
        }
      }
    }
  });
  return JSON.parse(response.text);
};

export const getTutorResponse = async (
  message: string, 
  history: { role: string, parts: { text: string }[] }[],
  context: string
) => {
  const model = "gemini-3-flash-preview";
  const chat = ai.chats.create({
    model,
    config: {
      systemInstruction: `You are an AI tutor helping a student. Context: ${context}. Focus on topics the student struggles with. Explain step-by-step and ask follow-up questions.`,
    },
    history: history
  });
  const response = await chat.sendMessage({ message });
  return response.text;
};

export const generateStudyPlan = async (weakTopics: string[]) => {
  const model = "gemini-3-flash-preview";
  const response = await ai.models.generateContent({
    model,
    contents: `Generate a daily study plan for a student who is weak in these topics: ${weakTopics.join(", ")}. Provide 3-5 specific tasks.`,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          tasks: { type: Type.ARRAY, items: { type: Type.STRING } }
        },
        required: ["tasks"]
      }
    }
  });
  return JSON.parse(response.text);
};

export const getLearningInsights = async (stats: any) => {
  const model = "gemini-3-flash-preview";
  const response = await ai.models.generateContent({
    model,
    contents: `Based on these learning statistics: ${JSON.stringify(stats)}, provide 2-3 encouraging and actionable AI learning insights.`,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          insights: { type: Type.ARRAY, items: { type: Type.STRING } }
        },
        required: ["insights"]
      }
    }
  });
  return JSON.parse(response.text);
};
