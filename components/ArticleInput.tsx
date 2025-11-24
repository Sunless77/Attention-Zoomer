
import React from 'react';
import { ArrowUp, Link2, Loader2, Clock } from 'lucide-react';
import { ContentStyle } from '../types';
import { StyleSelector } from './StyleSelector';

interface ArticleInputProps {
  value: string;
  onChange: (value: string) => void;
  onSubmit: () => void;
  style: ContentStyle;
  onStyleChange: (style: ContentStyle) => void;
  disabled?: boolean;
  loading?: boolean;
  mode?: 'submit' | 'tune'; // 'submit' shows arrow, 'tune' shows clock
  placeholder?: string;
  compact?: boolean;
}

export const ArticleInput: React.FC<ArticleInputProps> = ({ 
    value, 
    onChange, 
    onSubmit, 
    style,
    onStyleChange,
    disabled, 
    loading, 
    mode = 'submit',
    placeholder = "Paste article link or text here...",
    compact = false
}) => {
  
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
      if (!disabled && value.trim()) {
        onSubmit();
      }
    }
  };

  const hasContent = value.trim().length > 0;

  return (
    <div className={`w-full relative group isolation-auto`}>
      
      {/* Ethereal Glow Border - Visible when content exists */}
      {/* Updated to "Spirit Haze" palette: Slate / Pale Lavender / Foggy Zinc */}
      <div 
        className={`absolute -inset-[3px] rounded-[2.2rem] bg-gradient-to-r from-slate-300 via-indigo-200 via-zinc-200 to-slate-300 bg-[length:200%_100%] transition-opacity duration-700 -z-10 blur-[2px] ${hasContent ? 'opacity-100 animate-border-spin' : 'opacity-0'}`}
      />

      {/* Main Card Container */}
      {/* Removed overflow-hidden to allow StyleSelector dropdown to display */}
      <div className={`w-full relative bg-white rounded-[2rem] shadow-sm transition-all duration-300 group-focus-within:shadow-md border border-transparent z-10 flex ${compact ? 'flex-row items-center py-2 pr-2 pl-4' : 'flex-col pb-3'}`}>
        
        {/* Top Section: Icon + Textarea */}
        <div className={`relative flex ${compact ? 'items-center flex-grow' : 'w-full p-5 pb-0 items-start'}`}>
            {/* Icon */}
            <div className={`flex-shrink-0 transition-colors duration-500 ${hasContent ? 'text-indigo-300' : 'text-gray-400'} ${compact ? 'mr-3' : 'mt-1 mr-3'}`}>
                <Link2 className="w-5 h-5" />
            </div>

            {/* Text Input */}
            <textarea
                className={`w-full bg-transparent border-none text-gray-900 placeholder:text-gray-400 focus:ring-0 focus:outline-none resize-none font-medium leading-relaxed font-display ${compact ? 'h-6 py-0 text-base' : 'h-32 text-lg'}`}
                placeholder={placeholder}
                value={value}
                onChange={(e) => onChange(e.target.value)}
                onKeyDown={handleKeyDown}
                disabled={disabled}
                rows={compact ? 1 : 4}
            />
        </div>

        {/* Bottom Section: Actions */}
        <div className={`flex items-center ${compact ? 'flex-shrink-0 ml-2' : 'w-full px-5 mt-2 justify-between'}`}>
            
            {/* Style Selector (Left side in Expanded mode, Before button in Compact mode) */}
            <div className={`relative z-20 ${compact ? 'mr-3 hidden md:block' : 'translate-y-0.5'}`}>
               <StyleSelector selected={style} onChange={onStyleChange} compact={compact} />
            </div>

            {/* Submit/Tune Button */}
            <button
                onClick={onSubmit}
                disabled={disabled || !value.trim()}
                className={`
                    rounded-full flex items-center justify-center transition-all duration-200 relative z-10
                    ${compact ? 'w-10 h-10' : 'w-10 h-10'}
                    ${!value.trim() 
                        ? 'bg-gray-100 text-gray-300 cursor-not-allowed' 
                        : 'bg-[#1F2937] text-white hover:bg-black hover:scale-105 active:scale-95 shadow-md shadow-gray-200'}
                `}
                aria-label={mode === 'tune' ? "Adjust time settings" : "Generate summary"}
            >
                {loading ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                ) : mode === 'tune' ? (
                     <Clock className="w-5 h-5" />
                ) : (
                    <ArrowUp className="w-5 h-5" />
                )}
            </button>
        </div>

      </div>
      
      <style>{`
        @keyframes border-spin {
          0% { background-position: 0% 50%; }
          100% { background-position: 200% 50%; }
        }
        .animate-border-spin {
          animation: border-spin 4s linear infinite;
        }
      `}</style>
    </div>
  );
};
