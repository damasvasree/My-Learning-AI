import React, { useState } from 'react';
import { useDropzone } from 'react-dropzone';
import { 
  FileUp, 
  Link as LinkIcon, 
  FileText, 
  CheckCircle2, 
  Loader2,
  Youtube
} from 'lucide-react';
import { db, auth, storage } from '../firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { analyzeMaterial } from '../services/gemini';

export default function UploadMaterial() {
  const [uploading, setUploading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [ytLink, setYtLink] = useState('');
  const [extractedData, setExtractedData] = useState<any>(null);

  const onDrop = async (acceptedFiles: File[]) => {
    if (acceptedFiles.length === 0) return;
    
    setUploading(true);
    setSuccess(false);
    
    try {
      const file = acceptedFiles[0];
      const storageRef = ref(storage, `materials/${auth.currentUser?.uid}/${Date.now()}_${file.name}`);
      
      // In a real app, we'd upload to storage. For this demo, we'll read text content.
      const text = await file.text();
      
      // Analyze with Gemini
      const analysis = await analyzeMaterial(text);
      setExtractedData(analysis);

      // Store in Firestore
      await addDoc(collection(db, 'study_materials'), {
        userId: auth.currentUser?.uid,
        title: file.name,
        type: file.name.endsWith('.pdf') ? 'pdf' : 'text',
        content: text,
        extractedTopics: analysis.topics,
        summary: analysis.summary,
        createdAt: serverTimestamp()
      });

      setSuccess(true);
    } catch (error) {
      console.error("Upload error:", error);
      alert("Failed to process material. Please try again.");
    } finally {
      setUploading(false);
    }
  };

  const { getRootProps, getInputProps, isDragActive } = useDropzone({ 
    onDrop,
    accept: {
      'application/pdf': ['.pdf'],
      'text/plain': ['.txt'],
      'application/vnd.ms-powerpoint': ['.ppt', '.pptx']
    },
    multiple: false
  } as any);

  const handleYtSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!ytLink) return;
    
    setUploading(true);
    try {
      // Mocking YouTube analysis for demo
      const analysis = await analyzeMaterial(`YouTube Lecture: ${ytLink}`);
      setExtractedData(analysis);

      await addDoc(collection(db, 'study_materials'), {
        userId: auth.currentUser?.uid,
        title: "YouTube Lecture",
        type: 'youtube',
        content: ytLink,
        extractedTopics: analysis.topics,
        summary: analysis.summary,
        createdAt: serverTimestamp()
      });
      setSuccess(true);
      setYtLink('');
    } catch (error) {
      console.error(error);
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8 animate-in slide-in-from-bottom-4 duration-500">
      <header>
        <h1 className="text-3xl font-bold tracking-tight mb-2">Upload Study Material</h1>
        <p className="text-gray-500">Add PDFs, notes, or lecture links. AI will extract key concepts automatically.</p>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* File Dropzone */}
        <div className="space-y-4">
          <div 
            {...getRootProps()} 
            className={`
              border-2 border-dashed rounded-2xl p-10 flex flex-col items-center justify-center transition-all cursor-pointer
              ${isDragActive ? 'border-emerald-500 bg-emerald-50' : 'border-gray-200 hover:border-emerald-400 hover:bg-gray-50'}
              ${uploading ? 'opacity-50 pointer-events-none' : ''}
            `}
          >
            <input {...getInputProps()} />
            <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-2xl flex items-center justify-center mb-4">
              {uploading ? <Loader2 className="animate-spin" size={32} /> : <FileUp size={32} />}
            </div>
            <p className="text-center font-medium">
              {isDragActive ? "Drop the file here" : "Drag & drop files here, or click to select"}
            </p>
            <p className="text-xs text-gray-400 mt-2">PDF, PPT, or TXT (Max 10MB)</p>
          </div>

          {/* YouTube Link */}
          <div className="bg-white p-6 rounded-2xl border border-black/5 shadow-sm">
            <h3 className="font-bold mb-4 flex items-center gap-2">
              <Youtube className="text-red-500" size={20} />
              YouTube Lecture Link
            </h3>
            <form onSubmit={handleYtSubmit} className="flex gap-2">
              <input 
                type="url" 
                placeholder="https://youtube.com/watch?v=..." 
                className="flex-1 px-4 py-2 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                value={ytLink}
                onChange={(e) => setYtLink(e.target.value)}
              />
              <button 
                type="submit"
                disabled={uploading}
                className="px-4 py-2 bg-black text-white rounded-xl font-medium hover:bg-gray-800 transition-colors disabled:opacity-50"
              >
                Add
              </button>
            </form>
          </div>
        </div>

        {/* Results / Status */}
        <div className="space-y-6">
          {uploading && (
            <div className="bg-white p-8 rounded-2xl border border-black/5 shadow-sm flex flex-col items-center justify-center text-center">
              <Loader2 className="animate-spin text-emerald-500 mb-4" size={40} />
              <h3 className="font-bold text-lg">AI is analyzing...</h3>
              <p className="text-gray-500 text-sm mt-2">Extracting topics, concepts, and generating summary.</p>
            </div>
          )}

          {success && extractedData && (
            <div className="bg-white p-6 rounded-2xl border border-emerald-100 shadow-sm animate-in zoom-in-95 duration-300">
              <div className="flex items-center gap-2 text-emerald-600 font-bold mb-4">
                <CheckCircle2 size={20} />
                Analysis Complete
              </div>
              
              <div className="space-y-4">
                <div>
                  <h4 className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-2">Extracted Topics</h4>
                  <div className="flex flex-wrap gap-2">
                    {extractedData.topics.map((topic: string, i: number) => (
                      <span key={i} className="px-3 py-1 bg-emerald-50 text-emerald-700 rounded-full text-xs font-medium">
                        {topic}
                      </span>
                    ))}
                  </div>
                </div>

                <div>
                  <h4 className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-2">Summary</h4>
                  <p className="text-sm text-gray-600 leading-relaxed">
                    {extractedData.summary}
                  </p>
                </div>
              </div>
            </div>
          )}

          {!uploading && !success && (
            <div className="bg-gray-50 p-8 rounded-2xl border border-black/5 flex flex-col items-center justify-center text-center text-gray-400">
              <FileText size={40} className="mb-4 opacity-20" />
              <p className="text-sm">Upload material to see AI analysis results here.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
