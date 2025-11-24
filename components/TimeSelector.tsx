import React, { useRef, useEffect, useState, useId } from 'react';
import { formatTime } from '../types';
import { MousePointer2 } from 'lucide-react';

interface TimeSelectorProps {
  seconds: number;
  onChange: (seconds: number) => void;
  disabled?: boolean;
  isDemo?: boolean;
  onInteractionStart?: () => void;
}

// Helper to calculate SVG path for an arc
const polarToCartesian = (centerX: number, centerY: number, radius: number, angleInDegrees: number) => {
  const angleInRadians = (angleInDegrees - 90) * Math.PI / 180.0;
  return {
    x: centerX + (radius * Math.cos(angleInRadians)),
    y: centerY + (radius * Math.sin(angleInRadians))
  };
};

const describeArc = (x: number, y: number, radius: number, startAngle: number, endAngle: number) => {
    const start = polarToCartesian(x, y, radius, endAngle);
    const end = polarToCartesian(x, y, radius, startAngle);
    const largeArcFlag = endAngle - startAngle <= 180 ? "0" : "1";
    return [
        "M", start.x, start.y, 
        "A", radius, radius, 0, largeArcFlag, 0, end.x, end.y
    ].join(" ");
};

export const TimeSelector: React.FC<TimeSelectorProps> = ({ 
  seconds, 
  onChange, 
  disabled, 
  isDemo = false,
  onInteractionStart 
}) => {
  const knobRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const audioContextRef = useRef<AudioContext | null>(null);
  const lastValueRef = useRef<number>(seconds);
  const gradientId = useId(); // Unique ID for SVG gradient
  
  // Configuration
  const MIN_ANGLE = -135;
  const MAX_ANGLE = 135;
  const ANGLE_RANGE = MAX_ANGLE - MIN_ANGLE;
  const MIN_SECONDS = 15; // Minimum 15s
  const MAX_SECONDS = 900; // 15 mins
  const TOTAL_VISUAL_TICKS = 60;
  
  // Helper: Convert Fraction (0-1) to Seconds (Snapped to 5s)
  const fractionToSeconds = (f: number) => {
    const power = 1.2; 
    const raw = MIN_SECONDS + (MAX_SECONDS - MIN_SECONDS) * Math.pow(f, power);
    return Math.round(raw / 5) * 5;
  };

  // Helper: Convert Seconds to Fraction (0-1)
  const secondsToFraction = (s: number) => {
    const power = 1.2;
    const clamped = Math.max(MIN_SECONDS, Math.min(MAX_SECONDS, s));
    return Math.pow((clamped - MIN_SECONDS) / (MAX_SECONDS - MIN_SECONDS), 1 / power);
  };

  const currentFraction = secondsToFraction(seconds);
  const currentAngle = MIN_ANGLE + (currentFraction * ANGLE_RANGE);

  // Audio Feedback - Mechanical "Safe" Click
  const playClickSound = () => {
    // Don't play sound during the automatic demo animation
    if (isDemo) return;

    try {
        const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
        if (!AudioContextClass) return;
        if (!audioContextRef.current) audioContextRef.current = new AudioContextClass();
        const ctx = audioContextRef.current;
        if (ctx.state === 'suspended') ctx.resume();

        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        const filter = ctx.createBiquadFilter();

        // Use a triangle wave for a "sharper", more metallic edge than a sine wave
        osc.type = 'triangle';
        
        // High frequency start dropping fast simulates a hard object strike (click)
        osc.frequency.setValueAtTime(2500, ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(600, ctx.currentTime + 0.015);
        
        // High pass filter to remove "muddy" low end, making it sound smaller and mechanical
        filter.type = 'highpass';
        filter.frequency.value = 500;

        // Short, sharp envelope
        gain.gain.setValueAtTime(0, ctx.currentTime);
        gain.gain.linearRampToValueAtTime(0.08, ctx.currentTime + 0.002); // Fast attack
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.03); // Very fast decay

        // Connect: Oscillator -> Filter -> Gain -> Output
        osc.connect(filter);
        filter.connect(gain);
        gain.connect(ctx.destination);
        
        osc.start();
        osc.stop(ctx.currentTime + 0.04);
    } catch (e) {}
  };

  // Interaction Logic
  const handleInteraction = (clientX: number, clientY: number) => {
    if (disabled || !knobRef.current) return;

    const rect = knobRef.current.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;

    const dx = clientX - centerX;
    const dy = clientY - centerY;
    
    let angleDeg = Math.atan2(dy, dx) * (180 / Math.PI);
    angleDeg += 90; // Shift so -90 (Top) becomes 0
    
    if (angleDeg > 180) angleDeg -= 360;
    
    let clampedAngle = Math.max(MIN_ANGLE, Math.min(MAX_ANGLE, angleDeg));
    const newFraction = (clampedAngle - MIN_ANGLE) / ANGLE_RANGE;
    const newSeconds = fractionToSeconds(newFraction);

    if (newSeconds !== lastValueRef.current) {
        playClickSound();
        lastValueRef.current = newSeconds;
    }

    onChange(newSeconds);
  };

  const handleStart = () => {
    if (onInteractionStart) onInteractionStart();
    setIsDragging(true);
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    if (disabled) return;
    e.preventDefault();
    handleStart();
    handleInteraction(e.clientX, e.clientY);
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    if (disabled) return;
    // IMPORTANT: Prevent default to stop scrolling the page while interacting with the knob
    e.preventDefault();
    handleStart();
    handleInteraction(e.touches[0].clientX, e.touches[0].clientY);
  };

  useEffect(() => {
    const handleMove = (e: MouseEvent) => { if (isDragging) handleInteraction(e.clientX, e.clientY); };
    const handleTouchMove = (e: TouchEvent) => { 
        if (isDragging) {
            // Prevent scrolling during drag
            if (e.cancelable) e.preventDefault();
            handleInteraction(e.touches[0].clientX, e.touches[0].clientY); 
        }
    };
    const handleUp = () => setIsDragging(false);

    if (isDragging) {
      window.addEventListener('mousemove', handleMove);
      window.addEventListener('mouseup', handleUp);
      // Use passive: false to allow calling preventDefault()
      window.addEventListener('touchmove', handleTouchMove, { passive: false });
      window.addEventListener('touchend', handleUp);
    }
    return () => {
      window.removeEventListener('mousemove', handleMove);
      window.removeEventListener('mouseup', handleUp);
      window.removeEventListener('touchmove', handleTouchMove);
      window.removeEventListener('touchend', handleUp);
    };
  }, [isDragging, disabled]);

  // Generate ticks
  const ticks = Array.from({ length: TOTAL_VISUAL_TICKS + 1 }).map((_, i) => {
    const fraction = i / TOTAL_VISUAL_TICKS;
    const angle = MIN_ANGLE + fraction * ANGLE_RANGE;
    return { angle, fraction, isMajor: i % 5 === 0 };
  });

  const timeString = formatTime(seconds);
  const isStacked = timeString.includes('m') && timeString.includes('s');
  const [timeMain, timeSub] = isStacked ? timeString.split(' ') : [timeString, null];

  // SVG Progress Ring Parameters
  const SVG_SIZE = 280;
  const CENTER = SVG_SIZE / 2;
  const RADIUS = 112; // Radius for the progress bar (outside the knob)
  
  // Safe ID for gradient
  const safeGradientId = gradientId ? gradientId.replace(/:/g, '') + '-flow' : 'flow-gradient';

  return (
    <div className="relative flex flex-col items-center select-none scale-[0.95] transform-gpu">
      
      {/* Floating Tooltip (Only visible in Demo/Intro mode) */}
      <div 
        className={`absolute -top-16 z-40 transition-all duration-700 ease-in-out pointer-events-none ${isDemo ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}
      >
        <div className="animate-bounce-slow relative flex flex-col items-center">
            <div className="bg-white/90 dark:bg-slate-800/90 backdrop-blur-sm border border-gray-200 dark:border-slate-600 px-4 py-2 rounded-full shadow-lg flex items-center gap-2">
                <MousePointer2 className="w-4 h-4 text-[#1F2937] dark:text-slate-200 fill-[#1F2937] dark:fill-slate-200" />
                <span className="text-xs font-bold uppercase tracking-widest text-[#1F2937] dark:text-slate-200">Choose your attention rate</span>
            </div>
            {/* Triangle pointer */}
            <div className="w-0 h-0 border-l-[6px] border-l-transparent border-r-[6px] border-r-transparent border-t-[6px] border-t-white/90 dark:border-t-slate-800/90 -mt-[1px] drop-shadow-sm"></div>
        </div>
      </div>

      {/* Main Dial Container */}
      <div className="relative w-64 h-64 flex items-center justify-center">
        
        {/* SVG Progress Ring Layer (Behind Knob, Aligned with Ticks) */}
        <div className="absolute inset-[-8px] z-0 pointer-events-none flex items-center justify-center opacity-100">
            <svg width={SVG_SIZE} height={SVG_SIZE} className="overflow-visible">
                <defs>
                    <linearGradient id={safeGradientId} x1="0%" y1="0%" x2="100%" y2="0%">
                        {/* 
                           Gradient Palette: "Spiritual Haze"
                        */}
                        <stop offset="0%" stopColor="#94a3b8" />    {/* Slate 400 */}
                        <stop offset="40%" stopColor="#e2e8f0" />    {/* Slate 200 */}
                        <stop offset="60%" stopColor="#d8b4fe" />    {/* Pale Lavender */}
                        <stop offset="80%" stopColor="#cbd5e1" />    {/* Slate 300 */}
                        <stop offset="100%" stopColor="#94a3b8" />   {/* Loop back */}
                        
                        <animateTransform 
                            attributeName="gradientTransform" 
                            type="rotate" 
                            from="0 0.5 0.5" 
                            to="360 0.5 0.5" 
                            dur="12s" 
                            repeatCount="indefinite" 
                        />
                    </linearGradient>
                </defs>
                {/* Background Track (Subtle Gray/Dark Gray) */}
                <path 
                    d={describeArc(CENTER, CENTER, RADIUS, MIN_ANGLE, MAX_ANGLE)} 
                    fill="none" 
                    className="stroke-gray-200 dark:stroke-slate-700 transition-colors duration-300"
                    strokeWidth="4" 
                    strokeLinecap="round" 
                />
                {/* Active Progress (Spiritual Gradient) */}
                <path 
                    d={describeArc(CENTER, CENTER, RADIUS, MIN_ANGLE, currentAngle)} 
                    fill="none" 
                    stroke={`url(#${safeGradientId})`} 
                    strokeWidth="6" 
                    strokeLinecap="round" 
                    className="" 
                />
            </svg>
        </div>

        {/* Tick Marks Ring */}
        <div className="absolute inset-0 z-0">
           {ticks.map((tick, i) => {
             const isActive = tick.fraction <= currentFraction;
             return (
               <div
                  key={i}
                  className="absolute top-0 left-1/2 h-full w-[2px] -translate-x-1/2 pointer-events-none"
                  style={{ 
                    transform: `rotate(${tick.angle}deg)`,
                  }}
               >
                 {/* Outer Tick */}
                 <div 
                   className={`absolute top-1 left-0 w-full rounded-full transition-all duration-300
                      ${tick.isMajor ? 'h-2 bg-gray-300 dark:bg-slate-600' : 'h-1 bg-gray-200 dark:bg-slate-700'}
                      ${isActive ? 'opacity-0' : 'opacity-100'} 
                   `} 
                 />
               </div>
             );
           })}
        </div>

        {/* The Interactive Ring Track (Invisible hit area) */}
        {/* Added touch-action-none to allow JS to handle touch without browser scrolling */}
        <div 
            ref={knobRef}
            onMouseDown={handleMouseDown}
            onTouchStart={handleTouchStart}
            className="absolute inset-2 rounded-full cursor-grab active:cursor-grabbing z-20 group touch-none"
            style={{ transform: `rotate(${currentAngle}deg)` }}
        >
             {/* The Indicator - Notch on the knob */}
             <div className="absolute top-[8px] left-1/2 -translate-x-1/2 w-1.5 h-3.5 rounded-full bg-slate-400/80 dark:bg-slate-200/80 shadow-[inset_0_1px_2px_rgba(0,0,0,0.4)] z-30"></div>
        </div>

        {/* Static Center Hub - Physical styled button look */}
        {/* 
           MATERIAL UPDATE: Matte Ceramic in Light, Brushed Slate in Dark
        */}
        <div className="absolute w-48 h-48 rounded-full z-10 pointer-events-none flex flex-col items-center justify-center
            bg-white dark:bg-slate-800
            shadow-[0_24px_48px_-12px_rgba(15,23,42,0.15),0_0_0_1px_rgba(15,23,42,0.05),inset_0_1px_1px_rgba(255,255,255,1),inset_0_-2px_4px_rgba(0,0,0,0.05)]
            dark:shadow-[0_24px_48px_-12px_rgba(0,0,0,0.5),0_0_0_1px_rgba(255,255,255,0.05),inset_0_1px_1px_rgba(255,255,255,0.1),inset_0_-2px_4px_rgba(0,0,0,0.2)]
            overflow-hidden
            transition-colors duration-300
        "
        style={{
             // Subtle "Paper/Stone" grain
             backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 400 400' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)' opacity='0.05'/%3E%3C/svg%3E")`
        }}
        >
            
            {/* Inner Rim Highlight */}
            <div className="absolute inset-2 rounded-full border border-white/60 dark:border-slate-600/50 shadow-[inset_0_4px_8px_rgba(255,255,255,0.5)] dark:shadow-none"></div>

            {/* Time Display */}
            <div className={`relative z-10 font-display font-black text-[#1F2937] dark:text-white leading-none tracking-tighter transition-all duration-200 text-center flex flex-col items-center justify-center ${isStacked ? 'mt-[-4px]' : ''}`}>
                {isStacked ? (
                    <>
                        <span className="text-5xl drop-shadow-sm">{timeMain}</span>
                        <span className="text-3xl text-slate-400 dark:text-slate-500 font-bold">{timeSub}</span>
                    </>
                ) : (
                    <span className={`${seconds > 3600 ? 'text-4xl' : 'text-5xl drop-shadow-sm'}`}>{timeString}</span>
                )}
            </div>
            
            {/* Sublabel */}
            <div className="relative z-10 text-[9px] font-bold text-slate-400 dark:text-slate-500 mt-2 uppercase tracking-[0.25em] pt-2 px-4 border-t border-slate-200 dark:border-slate-700 w-24 text-center transition-colors">
                Reading time
            </div>
        </div>

      </div>

      {/* Helper Labels */}
      <div className="w-full max-w-[280px] flex justify-between text-[10px] font-bold text-gray-400/80 dark:text-slate-600 uppercase tracking-widest mt-4 px-6 transition-colors">
        <span>Micro</span>
        <span>Deep</span>
      </div>
    </div>
  );
};