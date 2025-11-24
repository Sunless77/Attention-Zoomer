import React, { useState, useEffect, useRef } from 'react';
import { generateReadingContent, generateCoverImage } from './services/geminiService';
import { TimeSelector } from './components/TimeSelector';
import { ArticleInput } from './components/ArticleInput';
import { ReaderView } from './components/ReaderView';
import { StyleSelector } from './components/StyleSelector';
import { getTimeContext } from './constants';
import { ContentStyle } from './types';
import { X, Share, Check, Sun, Moon } from 'lucide-react';

function App() {
  const [inputText, setInputText] = useState('');
  // Default to 3 minutes (180s)
  const [duration, setDuration] = useState<number>(180);
  const [contentStyle, setContentStyle] = useState<ContentStyle>('default'); // Default style is now 'default' (none selected)
  
  const [generatedContent, setGeneratedContent] = useState<string | null>(null);
  const [generatedImage, setGeneratedImage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Tuner Modal State (for adjusting time on existing/new article)
  const [isTunerOpen, setIsTunerOpen] = useState(false);
  const [pendingInput, setPendingInput] = useState(''); // Text waiting to be processed

  // Share State for Homepage
  const [isSiteShared, setIsSiteShared] = useState(false);

  // Demo state with Ref for immediate animation cancellation in the loop
  const [isDemo, setIsDemo] = useState(true);
  const isDemoRef = useRef(true);

  // Theme State
  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    if (typeof window !== 'undefined' && window.matchMedia('(prefers-color-scheme: dark)').matches) {
      return 'dark';
    }
    return 'light';
  });

  // Apply Theme
  useEffect(() => {
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [theme]);

  const toggleTheme = () => {
    setTheme(prev => prev === 'light' ? 'dark' : 'light');
  };

  // Intro Animation Logic
  useEffect(() => {
    // Small delay before starting the animation
    const startDelay = setTimeout(() => {
        if (!isDemoRef.current) return;
        
        // Keyframes: Time (ms) -> Value (seconds)
        // Gentle "nudge" animation instead of full sweep
        const keyframes = [
            { t: 0, v: 180 },      // Start at 3m
            { t: 1000, v: 180 },   // Hold longer
            { t: 2500, v: 240 },   // Gentle slide up to 4m
            { t: 2800, v: 240 },   // Pause
            { t: 4000, v: 120 },   // Gentle slide down to 2m
            { t: 4300, v: 120 },   // Pause
            { t: 5500, v: 180 }    // Gentle return to center (3m)
        ];

        const startTime = Date.now();
        const durationMs = 5500;

        const animate = () => {
            // CRITICAL: Check ref, not state, to break closure and stop immediately
            if (!isDemoRef.current) return;
            
            const now = Date.now();
            const elapsed = now - startTime;

            if (elapsed >= durationMs) {
                setDuration(180);
                return; 
            }

            // Find current keyframe segment
            let currentSegmentIndex = 0;
            for (let i = 0; i < keyframes.length - 1; i++) {
                if (elapsed >= keyframes[i].t) currentSegmentIndex = i;
            }

            const startFrame = keyframes[currentSegmentIndex];
            const endFrame = keyframes[currentSegmentIndex + 1];
            
            // Interpolate
            const segmentDuration = endFrame.t - startFrame.t;
            const segmentElapsed = elapsed - startFrame.t;
            
            // Avoid division by zero for hold frames
            if (segmentDuration <= 0) {
                setDuration(endFrame.v);
                requestAnimationFrame(animate);
                return;
            }

            const rawProgress = Math.min(1, Math.max(0, segmentElapsed / segmentDuration));
            
            // Easing: Ease In Out Cubic for organic "heavy knob" feel
            const ease = rawProgress < 0.5 
                ? 4 * rawProgress * rawProgress * rawProgress 
                : 1 - Math.pow(-2 * rawProgress + 2, 3) / 2;
            
            const value = startFrame.v + (endFrame.v - startFrame.v) * ease;
            setDuration(Math.round(value));

            requestAnimationFrame(animate);
        };

        requestAnimationFrame(animate);

    }, 600);

    return () => clearTimeout(startDelay);
  }, []); // Only run once on mount

  const handleInteractionStart = () => {
    // Update both Ref (for loop) and State (for UI)
    if (isDemoRef.current) {
        isDemoRef.current = false;
        setIsDemo(false);
    }
  };

  const handleInitialGenerate = async () => {
    if (!inputText.trim()) {
      setError("Please input source text to proceed.");
      return;
    }
    await executeGeneration(inputText, duration, contentStyle);
  };

  const executeGeneration = async (text: string, time: number, style: ContentStyle) => {
    setLoading(true);
    setError(null);
    setGeneratedImage(null); // Reset image while loading
    handleInteractionStart(); 
    setIsTunerOpen(false); // Close modal if open

    try {
      // Run generation in parallel
      const contentPromise = generateReadingContent({
        article_content: text,
        reading_time_seconds: time,
        style: style
      });

      const imagePromise = generateCoverImage(text);

      const [content, imageUrl] = await Promise.all([contentPromise, imagePromise]);
      
      setGeneratedContent(content);
      setGeneratedImage(imageUrl);
      
      // Update the main state to reflect what we just generated
      setInputText(text);
      setContentStyle(style);
      setDuration(time); // Ensure time is synced if it came from a preset

    } catch (err) {
      setError(err instanceof Error ? err.message : "An unknown error occurred.");
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    setGeneratedContent(null);
    setGeneratedImage(null);
    setError(null);
    setInputText('');
  };

  const handleSiteShare = () => {
    navigator.clipboard.writeText(window.location.href);
    setIsSiteShared(true);
    setTimeout(() => setIsSiteShared(false), 2000);
  };

  // Called when user clicks the "Clock" or "Arrow" in the ReaderView bottom bar
  const openTunerForAdjustment = (currentInput: string, currentStyle: ContentStyle) => {
    setPendingInput(currentInput);
    setContentStyle(currentStyle); // Sync style from bottom bar to global state
    setIsTunerOpen(true);
  };

  const handleTunerSubmit = () => {
    executeGeneration(pendingInput, duration, contentStyle);
  };

  // Helper to render the top controls (Theme + Share)
  const renderControls = () => (
     <>
        {/* Theme Toggle */}
        <button
             onClick={toggleTheme}
             className="flex items-center justify-center w-8 h-8 bg-white/40 dark:bg-slate-800/40 hover:bg-white/80 dark:hover:bg-slate-800/80 backdrop-blur-md border border-white/40 dark:border-slate-700 rounded-full shadow-sm hover:shadow transition-all duration-200"
             title={theme === 'light' ? 'Switch to Dark Mode' : 'Switch to Light Mode'}
           >
              {theme === 'light' ? (
                <Moon className="w-3.5 h-3.5 text-gray-500" />
              ) : (
                <Sun className="w-3.5 h-3.5 text-yellow-200" />
              )}
           </button>

           {/* Share Button */}
           <button 
             onClick={handleSiteShare}
             className="flex items-center gap-2 px-3 py-1.5 bg-white/40 dark:bg-slate-800/40 hover:bg-white/80 dark:hover:bg-slate-800/80 backdrop-blur-md border border-white/40 dark:border-slate-700 rounded-full shadow-sm hover:shadow transition-all duration-200 group"
           >
             <span className={`text-[10px] font-bold uppercase tracking-widest transition-colors ${isSiteShared ? 'text-emerald-600 dark:text-emerald-400' : 'text-gray-500 dark:text-slate-400 group-hover:text-gray-800 dark:group-hover:text-slate-200'}`}>
                {isSiteShared ? 'Link Copied' : 'Share App'}
             </span>
             {isSiteShared ? (
                <Check className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
             ) : (
                <Share className="w-3.5 h-3.5 text-gray-400 dark:text-slate-500 group-hover:text-gray-800 dark:group-hover:text-slate-300 transition-colors" />
             )}
           </button>
     </>
  );

  return (
    <div className="min-h-screen flex flex-col selection:bg-[#1F2937] selection:text-white dark:selection:bg-white dark:selection:text-black overflow-x-hidden relative">
      
      {/* Vignette Overlay defined in global CSS */}
      <div className="fixed inset-0 vignette-overlay pointer-events-none z-0" />

      {/* Desktop Controls: Top Right (Hidden on Mobile) */}
      {!generatedContent && (
        <div className="hidden md:flex absolute top-6 right-6 z-50 items-center gap-3 animate-in fade-in duration-700">
           {renderControls()}
        </div>
      )}

      {/* Main Interface */}
      <main 
        className={`
          flex-grow flex flex-col items-center justify-center relative w-full mx-auto px-4 md:px-6 py-6 z-10 
          transition-[max-width] duration-700 ease-in-out
          ${generatedContent ? 'max-w-full' : 'max-w-lg'}
        `}
      >
        
        {generatedContent ? (
          <ReaderView 
            content={generatedContent} 
            duration={duration} 
            imageUrl={generatedImage}
            onBack={handleReset}
            initialInput={inputText}
            initialStyle={contentStyle}
            onReconfigure={openTunerForAdjustment}
          />
        ) : (
          <div className="w-full flex flex-col items-center animate-in fade-in zoom-in-95 duration-700 space-y-4">
            
            {/* Header */}
            <div className="text-center space-y-1 mb-6">
              <h1 className="text-3xl font-display font-black tracking-tighter text-[#1F2937] dark:text-white uppercase">
                Attention <span className="font-light">Zoomer</span>
              </h1>
              <p className="text-gray-400 dark:text-slate-500 font-bold text-xs tracking-[0.15em] uppercase">
                Decide the cost of your attention
              </p>
              
              {/* Mobile Controls: Centered below title (Hidden on Desktop) */}
              <div className="md:hidden flex items-center justify-center gap-3 pt-4 animate-in fade-in duration-700">
                  {renderControls()}
              </div>
            </div>

            {/* Error Display */}
            {error && (
              <div className="w-full px-4 py-3 bg-red-50 border border-red-100 text-red-900 font-medium text-sm shadow-sm rounded-lg text-center animate-in fade-in slide-in-from-top-2">
                {error}
              </div>
            )}

            {/* STEP 1: The Knob */}
            <div className="relative z-10 w-full flex justify-center py-2">
              <TimeSelector 
                seconds={duration} 
                onChange={(val) => {
                    setDuration(val);
                }} 
                disabled={loading}
                isDemo={isDemo}
                onInteractionStart={handleInteractionStart}
              />
            </div>
            
            {/* Dynamic Time Description */}
            <div className="relative z-0 -mt-2 mb-2 h-6 flex items-center justify-center">
                <span className="text-sm font-medium text-gray-500 dark:text-slate-400 italic animate-in fade-in duration-300 key={duration}">
                   ~ {getTimeContext(duration)}
                </span>
            </div>

            {/* STEP 2: The Source Text & Action */}
            <div className="w-full relative z-30">
               <ArticleInput 
                  value={inputText} 
                  onChange={(val) => {
                      setInputText(val);
                      handleInteractionStart();
                  }} 
                  style={contentStyle}
                  onStyleChange={setContentStyle}
                  onSubmit={handleInitialGenerate}
                  loading={loading}
                  disabled={loading}
                />
                 {loading && (
                    <div className="mt-6 text-center animate-pulse">
                        <p className="text-sm font-bold text-[#1F2937] dark:text-slate-200 uppercase tracking-widest">
                            Generating your attention...
                        </p>
                    </div>
                )}
            </div>

          </div>
        )}
      </main>

      {/* Tuner Modal Overlay (Used when re-adjusting from Reader View) */}
      {isTunerOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            {/* Backdrop with semi-transparent blur */}
            <div 
                className="absolute inset-0 bg-slate-200/40 dark:bg-slate-900/60 backdrop-blur-sm transition-opacity animate-in fade-in duration-300" 
                onClick={() => setIsTunerOpen(false)}
            />
            
            {/* Modal Content - Glassmorphism Style */}
            <div className="relative bg-white/40 dark:bg-slate-800/60 backdrop-blur-2xl rounded-3xl shadow-2xl p-8 md:p-12 flex flex-col items-center gap-6 border border-white/50 dark:border-slate-700 max-w-md w-full animate-in zoom-in-95 slide-in-from-bottom-4 duration-300">
                <button 
                    onClick={() => setIsTunerOpen(false)}
                    className="absolute top-4 right-4 text-gray-500 hover:text-gray-800 dark:text-slate-400 dark:hover:text-slate-200 transition-colors"
                >
                    <X className="w-6 h-6" />
                </button>

                <div className="text-center">
                    <h2 className="text-xl font-display font-bold text-[#1F2937] dark:text-white">Adjust Attention</h2>
                    <p className="text-gray-500 dark:text-slate-400 text-xs font-bold uppercase tracking-widest mt-1">Refine time & style</p>
                </div>

                <div className="flex flex-col items-center w-full">
                    {/* Time Selector */}
                    <TimeSelector 
                        seconds={duration} 
                        onChange={setDuration} 
                        disabled={loading}
                    />
                    <div className="mt-4 mb-6 h-6 flex items-center justify-center">
                        <span className="text-sm font-medium text-gray-600 dark:text-slate-400 italic">
                        ~ {getTimeContext(duration)}
                        </span>
                    </div>

                    {/* Style Selector (Added to Tuner) */}
                    <div className="w-full flex justify-center pb-6">
                        <StyleSelector selected={contentStyle} onChange={setContentStyle} />
                    </div>
                </div>

                <button 
                    onClick={handleTunerSubmit}
                    disabled={loading}
                    className="w-full py-4 bg-[#1F2937]/90 dark:bg-slate-100 text-white dark:text-slate-900 rounded-xl font-bold font-display uppercase tracking-wider hover:bg-black dark:hover:bg-white hover:scale-[1.02] active:scale-[0.98] transition-all shadow-lg backdrop-blur-sm"
                >
                    {loading ? 'Regenerating...' : 'Update View'}
                </button>
            </div>
        </div>
      )}

      {/* Footer Credit - Only show when not reading */}
      {!generatedContent && (
        <div className="w-full text-center py-8 space-y-2 z-10 opacity-60 hover:opacity-100 transition-opacity duration-300">
             <p className="text-[10px] text-gray-400 dark:text-slate-600 font-bold tracking-widest uppercase">
                Designed by <a href="https://www.linkedin.com/in/senlinbebop" target="_blank" rel="noopener noreferrer" className="text-gray-500 dark:text-slate-500 hover:text-[#1F2937] dark:hover:text-slate-300 transition-colors pb-0.5 border-b border-transparent hover:border-[#1F2937] dark:hover:border-slate-300">Sen Lin</a>
             </p>
             <p className="text-[10px] text-gray-300 dark:text-slate-700 font-bold tracking-widest uppercase">
                Powered by Gemini 2.5
             </p>
        </div>
      )}
      
    </div>
  );
}

export default App;