import React, { useState, useEffect, useRef } from 'react';
import { Copy, ArrowLeft, Clock, Plus, Trash2, Eye, EyeOff, Share } from 'lucide-react';
import { ArticleInput } from './ArticleInput';
import { formatTime, ContentStyle } from '../types';

interface ReaderViewProps {
  content: string;
  duration: number;
  initialInput: string;
  initialStyle: ContentStyle;
  imageUrl?: string | null;
  onBack: () => void;
  onReconfigure: (currentInput: string, style: ContentStyle) => void;
}

interface SelectionPopup {
    top: number;
    left: number;
    text: string;
}

export const ReaderView: React.FC<ReaderViewProps> = ({ 
    content, 
    duration, 
    initialInput,
    initialStyle,
    imageUrl,
    onBack, 
    onReconfigure 
}) => {
  const [copied, setCopied] = useState(false);
  const [isSharing, setIsSharing] = useState(false);
  
  // Timer State
  const [timeLeft, setTimeLeft] = useState(duration);
  const [isTimerVisible, setIsTimerVisible] = useState(true);
  
  // Input State for Bottom Bar
  const [localInput, setLocalInput] = useState(initialInput);
  const [localStyle, setLocalStyle] = useState<ContentStyle>(initialStyle);

  // Notes State
  const [notes, setNotes] = useState<string[]>([]);
  const [selectionPopup, setSelectionPopup] = useState<SelectionPopup | null>(null);
  const contentRef = useRef<HTMLDivElement>(null);

  // Countdown Logic
  useEffect(() => {
    // Reset timer if duration changes
    setTimeLeft(duration);
    
    const interval = setInterval(() => {
        setTimeLeft((prev) => {
            if (prev <= 0) return 0;
            return prev - 1;
        });
    }, 1000);
    return () => clearInterval(interval);
  }, [duration]);

  // Handle Text Selection
  const handleMouseUp = () => {
    const selection = window.getSelection();
    if (!selection || selection.isCollapsed) {
        setSelectionPopup(null);
        return;
    }

    const text = selection.toString().trim();
    if (!text) return;

    const range = selection.getRangeAt(0);
    const rect = range.getBoundingClientRect();
    
    // We need to position relative to the viewport or a fixed container
    setSelectionPopup({
        top: rect.top + window.scrollY - 50, // Position above selection
        left: rect.left + rect.width / 2,
        text: text
    });
  };

  const addNote = () => {
    if (selectionPopup) {
        setNotes((prev) => [...prev, selectionPopup.text]);
        setSelectionPopup(null);
        // Clear selection visual
        window.getSelection()?.removeAllRanges();
    }
  };

  const removeNote = (index: number) => {
    setNotes(prev => prev.filter((_, i) => i !== index));
  };

  // Determine Bottom Bar Mode
  // If input matches the original content, we show Clock (Tune mode)
  // If input is different, we show Arrow (Submit mode) -> which effectively re-tunes for new content
  const isInputDirty = localInput.trim() !== initialInput.trim();

  const renderContent = (text: string) => {
    return text.split('\n').map((line, index) => {
      const trimmed = line.trim();
      if (!trimmed) return <div key={index} className="h-4" />;

      if (trimmed.startsWith('# ')) {
        return (
          <h1 key={index} className="text-4xl md:text-5xl font-display font-bold text-[#1F2937] dark:text-white mt-10 mb-8 leading-none tracking-tight pb-6 border-b border-gray-100 dark:border-slate-800">
            {trimmed.replace('# ', '')}
          </h1>
        );
      }
      if (trimmed.startsWith('## ')) {
        return (
          <h2 key={index} className="text-2xl md:text-3xl font-display font-bold text-gray-900 dark:text-slate-100 mt-12 mb-6 tracking-tight relative pl-4 border-l-4 border-indigo-100 dark:border-indigo-900">
            {trimmed.replace('## ', '')}
          </h2>
        );
      }
      if (trimmed.startsWith('### ')) {
        return (
          <h3 key={index} className="text-xl font-display font-bold text-[#1F2937] dark:text-slate-200 mt-8 mb-3 uppercase tracking-wide text-sm opacity-80">
            {trimmed.replace('### ', '')}
          </h3>
        );
      }
      if (trimmed.startsWith('> ')) {
        return (
           <blockquote key={index} className="border-l-4 border-[#1F2937] dark:border-slate-500 pl-6 py-2 my-8 italic text-xl text-gray-600 dark:text-slate-300 font-display bg-gray-50/50 dark:bg-slate-800/50 rounded-r-lg">
             {trimmed.replace('> ', '')}
           </blockquote>
        );
      }
      if (trimmed.startsWith('- ') || trimmed.startsWith('* ')) {
        return (
          <li key={index} className="ml-4 list-disc text-gray-800 dark:text-slate-300 mb-3 pl-2 font-display leading-7 marker:text-[#1F2937] dark:marker:text-slate-400">
            {trimmed.replace(/^[-*] /, '')}
          </li>
        );
      }
      return (
        <p key={index} className="text-lg leading-8 text-gray-700 dark:text-slate-300 mb-5 font-display">
          {trimmed.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>').split(/<strong>(.*?)<\/strong>/g).map((part, i) => 
             i % 2 === 1 ? <strong key={i} className="font-bold text-gray-900 dark:text-white">{part}</strong> : part
          )}
        </p>
      );
    });
  };

  const handleCopyFull = () => {
    navigator.clipboard.writeText(content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleShare = async () => {
    const shareData = {
      title: 'Attention Zoomer Summary',
      text: content,
    };

    if (navigator.share && navigator.canShare && navigator.canShare(shareData)) {
      try {
        await navigator.share(shareData);
      } catch (err) {
        console.debug("Share cancelled or failed", err);
      }
    } else {
      try {
        await navigator.clipboard.writeText(content);
        setIsSharing(true);
        setTimeout(() => setIsSharing(false), 2000);
      } catch (err) {
        console.error("Clipboard failed", err);
      }
    }
  };

  const wordCount = content.split(/\s+/).length;

  return (
    <div className="w-full h-full pb-32">
      
      {/* Floating Selection Tooltip */}
      {selectionPopup && (
        <div 
            className="absolute z-50 animate-in zoom-in-95 duration-200"
            style={{ top: selectionPopup.top, left: selectionPopup.left, transform: 'translateX(-50%)' }}
        >
            <button 
                onClick={addNote}
                className="bg-[#1F2937] dark:bg-slate-100 text-white dark:text-slate-900 px-4 py-2 rounded-full shadow-lg font-bold text-sm flex items-center gap-2 hover:bg-black dark:hover:bg-white transition-colors"
            >
                <Plus className="w-4 h-4" />
                Add to notepad
            </button>
            <div className="w-0 h-0 border-l-[6px] border-l-transparent border-r-[6px] border-r-transparent border-t-[6px] border-t-[#1F2937] dark:border-t-slate-100 absolute left-1/2 -translate-x-1/2 -bottom-1.5"></div>
        </div>
      )}

      {/* Top Controls: Back & Timer & Share */}
      <div className="fixed top-0 left-0 right-0 z-40 px-4 md:px-8 py-4 pointer-events-none flex justify-between items-start max-w-[1400px] mx-auto">
        <button 
          onClick={onBack}
          className="pointer-events-auto bg-white/80 dark:bg-slate-900/80 backdrop-blur-md px-4 py-2 rounded-full shadow-sm border border-gray-100 dark:border-slate-800 group flex items-center gap-2 text-gray-500 dark:text-slate-400 hover:text-[#1F2937] dark:hover:text-white transition-all hover:scale-105 font-bold text-sm"
        >
          <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
          Back
        </button>

        {/* Right Controls: Timer & Share */}
        <div className="flex items-center gap-3 pointer-events-auto">
             {/* Timer Display */}
             <div className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-md p-2 rounded-full shadow-sm border border-gray-100 dark:border-slate-800 flex items-center transition-all hover:shadow-md">
                 
                 {/* Eye Toggle */}
                 <button 
                    onClick={() => setIsTimerVisible(!isTimerVisible)}
                    className="w-8 h-8 flex items-center justify-center text-gray-400 dark:text-slate-500 hover:text-gray-600 dark:hover:text-slate-300 transition-colors rounded-full hover:bg-gray-50 dark:hover:bg-slate-800"
                    title={isTimerVisible ? "Hide Timer" : "Show Timer"}
                 >
                    {isTimerVisible ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                 </button>

                 {/* Time */}
                 <div className={`overflow-hidden transition-all duration-500 ease-[cubic-bezier(0.4,0,0.2,1)] flex items-center ${isTimerVisible ? 'max-w-[80px] opacity-100 pr-4' : 'max-w-0 opacity-0 pr-0'}`}>
                    <span className={`font-display font-bold text-lg tabular-nums whitespace-nowrap pl-2 ${timeLeft < 30 ? 'text-red-500 dark:text-red-400' : 'text-[#1F2937] dark:text-white'}`}>
                        {formatTime(timeLeft)}
                    </span>
                 </div>
             </div>

             {/* Share Button */}
             <button 
               onClick={handleShare}
               className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-md px-4 py-2 rounded-full shadow-sm border border-gray-100 dark:border-slate-800 group flex items-center gap-2 text-gray-500 dark:text-slate-400 hover:text-[#1F2937] dark:hover:text-white transition-all hover:scale-105 font-bold text-sm h-[48px] md:h-auto"
               aria-label="Share content"
             >
               <Share className="w-4 h-4 group-hover:scale-110 transition-transform" />
               <span className="hidden md:inline">{isSharing ? 'Copied!' : 'Share'}</span>
               <span className="md:hidden">{isSharing ? '!' : ''}</span>
             </button>
        </div>
      </div>

      <div className="flex flex-col lg:flex-row gap-8 max-w-[1400px] mx-auto pt-24 md:pt-16">
          
          {/* Main Article Column */}
          <div className="flex-grow lg:w-2/3">
             <div 
                ref={contentRef}
                onMouseUp={handleMouseUp}
                className="bg-white dark:bg-slate-900 rounded-3xl shadow-xl shadow-gray-200/50 dark:shadow-slate-950/50 border border-white dark:border-slate-800 relative overflow-hidden w-full selection:bg-purple-100 dark:selection:bg-purple-900 selection:text-purple-900 dark:selection:text-purple-100 transition-colors"
            >
                {/* Generated Cover Image */}
                {imageUrl && (
                    <div className="w-full h-64 md:h-80 overflow-hidden relative">
                        <img 
                            src={imageUrl} 
                            alt="Article Cover" 
                            className="w-full h-full object-cover animate-in fade-in duration-1000"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-white dark:from-slate-900 to-transparent opacity-80"></div>
                    </div>
                )}

                <div className={`px-8 md:px-12 lg:px-16 pb-12 ${imageUrl ? 'pt-6' : 'pt-12'}`}>
                    {/* Header Decoration */}
                    <div className="w-full flex justify-between items-center mb-10 opacity-40 border-b border-gray-100 dark:border-slate-800 pb-4 text-[#1F2937] dark:text-slate-400">
                        <span className="text-xs font-bold tracking-widest uppercase">Generated Output</span>
                        <span className="text-xs font-bold tracking-widest uppercase">{wordCount} words</span>
                    </div>

                    <article className="prose prose-stone dark:prose-invert prose-lg md:prose-xl max-w-none prose-p:font-display prose-headings:font-display prose-strong:font-bold prose-li:marker:text-gray-300">
                        {renderContent(content)}
                    </article>

                    {/* Footer Decoration */}
                    <div className="mt-20 pt-10 flex justify-center text-[#1F2937] dark:text-slate-500 opacity-20 border-t border-gray-100 dark:border-slate-800">
                        <div className="w-12 h-1.5 rounded-full bg-current"></div>
                    </div>
                </div>
            </div>
          </div>

          {/* Sidebar: Notepad */}
          <div className="lg:w-1/3 space-y-6">
              
              {/* Note List */}
              <div className="bg-[#F3F4F6] dark:bg-slate-900/50 rounded-3xl p-6 lg:sticky lg:top-24 border border-transparent dark:border-slate-800/50">
                  <div className="flex items-center justify-between mb-6">
                      <h3 className="font-display font-bold text-[#1F2937] dark:text-slate-200 text-lg flex items-center gap-2">
                          Notepad
                          <span className="bg-gray-200 dark:bg-slate-800 text-gray-500 dark:text-slate-400 text-xs px-2 py-0.5 rounded-full">{notes.length}</span>
                      </h3>
                      <button 
                        onClick={handleCopyFull}
                        className="text-xs font-bold text-gray-400 dark:text-slate-500 hover:text-gray-900 dark:hover:text-slate-200 uppercase tracking-wider transition-colors flex items-center gap-1"
                      >
                        <Copy className="w-3 h-3" />
                        {copied ? 'Copied Full' : 'Copy Full'}
                      </button>
                  </div>

                  {notes.length === 0 ? (
                      <div className="border-2 border-dashed border-gray-200 dark:border-slate-700 rounded-2xl p-8 text-center">
                          <p className="text-gray-400 dark:text-slate-500 font-bold text-sm">Select text in the article to add notes here.</p>
                      </div>
                  ) : (
                      <div className="space-y-4 max-h-[calc(100vh-300px)] overflow-y-auto pr-2 custom-scrollbar">
                          {notes.map((note, idx) => (
                              <div key={idx} className="bg-white dark:bg-slate-800 p-4 rounded-xl shadow-sm border border-gray-100 dark:border-slate-700 group relative animate-in slide-in-from-right-4 duration-300">
                                  <p className="text-gray-700 dark:text-slate-300 text-sm leading-relaxed font-display pr-6">"{note}"</p>
                                  
                                  <div className="absolute top-2 right-2 flex flex-col gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                      <button 
                                        onClick={() => removeNote(idx)}
                                        className="p-1 hover:bg-red-50 dark:hover:bg-red-900/20 text-gray-300 hover:text-red-500 rounded"
                                      >
                                          <Trash2 className="w-3.5 h-3.5" />
                                      </button>
                                      <button 
                                        onClick={() => navigator.clipboard.writeText(note)}
                                        className="p-1 hover:bg-gray-50 dark:hover:bg-slate-700 text-gray-300 hover:text-gray-600 dark:hover:text-slate-200 rounded"
                                      >
                                          <Copy className="w-3.5 h-3.5" />
                                      </button>
                                  </div>
                              </div>
                          ))}
                      </div>
                  )}
              </div>
          </div>
      </div>

      {/* Persistent Bottom Bar */}
      <div className="fixed bottom-0 left-0 right-0 p-4 md:p-6 z-30 pointer-events-none">
          <div className="max-w-3xl mx-auto pointer-events-auto">
             <ArticleInput 
                value={localInput}
                onChange={setLocalInput}
                style={localStyle}
                onStyleChange={setLocalStyle}
                onSubmit={() => onReconfigure(localInput, localStyle)}
                mode={isInputDirty ? 'submit' : 'tune'}
                compact={true}
                placeholder="Paste new link to change topic, or click clock to adjust time..."
             />
          </div>
      </div>

    </div>
  );
};