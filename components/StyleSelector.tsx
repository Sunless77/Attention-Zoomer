
import React, { useState, useRef, useEffect } from 'react';
import { BookOpenText, Scale, LayoutList, ChevronDown, Check, Zap, Sparkles } from 'lucide-react';
import { ContentStyle } from '../types';

interface StyleSelectorProps {
  selected: ContentStyle;
  onChange: (style: ContentStyle) => void;
  compact?: boolean;
}

export const StyleSelector: React.FC<StyleSelectorProps> = ({ selected, onChange, compact = false }) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const options: { id: ContentStyle; label: string; icon: React.FC<any>; desc?: string }[] = [
    { 
      id: 'default', 
      label: 'Standard', 
      icon: Sparkles,
      desc: 'Balanced summary' 
    },
    { 
      id: 'story', 
      label: 'Storytelling', 
      icon: BookOpenText,
      desc: 'Narrative flow'
    },
    { 
      id: 'neutral', 
      label: 'Neutral', 
      icon: Scale,
      desc: 'Objective facts'
    },
    { 
      id: 'structured', 
      label: 'Structured', 
      icon: LayoutList,
      desc: 'Lists & headers'
    },
  ];

  const selectedOption = options.find(o => o.id === selected) || options[0];

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSelect = (id: ContentStyle) => {
    onChange(id);
    setIsOpen(false);
  };

  return (
    <div className="flex items-center relative" ref={dropdownRef}>
      <div className="relative">
        {/* Trigger Button - Text Only */}
        <button
          onClick={() => setIsOpen(!isOpen)}
          className={`
             flex items-center gap-2 transition-colors duration-200 group
             ${compact ? 'text-gray-500 hover:text-gray-900' : 'text-gray-400 hover:text-gray-800'}
          `}
        >
          {/* Icon */}
          <selectedOption.icon className={`
            ${compact ? 'w-4 h-4' : 'w-4 h-4'}
            ${selected !== 'default' ? 'text-[#1F2937]' : ''}
            group-hover:text-[#1F2937] transition-colors
          `} />
          
          {/* Label */}
          <span className={`
             ${compact ? 'text-xs font-bold' : 'text-[10px] font-bold uppercase tracking-widest'}
             ${selected !== 'default' ? 'text-[#1F2937]' : ''}
             group-hover:text-[#1F2937] transition-colors
          `}>
            {selected === 'default' ? 'Content Style' : selectedOption.label}
          </span>
          
          <ChevronDown className={`w-3 h-3 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
        </button>

        {/* Dropdown Menu */}
        {isOpen && (
          <div className={`
            absolute z-[60] mt-3 w-56 bg-white rounded-xl shadow-xl shadow-gray-200/50 border border-gray-100 overflow-hidden animate-in fade-in zoom-in-95 duration-200 origin-top-left
            ${compact ? 'bottom-full mb-2 left-0 origin-bottom-left' : 'top-full left-0'}
          `}>
             <div className="py-1">
                {options.map((option) => {
                  const Icon = option.icon;
                  const isSelected = selected === option.id;
                  return (
                    <button
                      key={option.id}
                      onClick={() => handleSelect(option.id)}
                      className={`
                        w-full text-left px-4 py-3 flex items-start gap-3 transition-colors
                        ${isSelected ? 'bg-gray-50' : 'hover:bg-gray-50'}
                      `}
                    >
                      <div className={`mt-0.5 ${isSelected ? 'text-[#1F2937]' : 'text-gray-400'}`}>
                        <Icon className="w-4 h-4" />
                      </div>
                      <div className="flex-grow">
                        <div className={`text-sm font-medium ${isSelected ? 'text-[#1F2937]' : 'text-gray-700'}`}>
                          {option.label}
                        </div>
                        {option.desc && (
                           <div className="text-[10px] text-gray-400 font-medium uppercase tracking-wide mt-0.5">
                             {option.desc}
                           </div>
                        )}
                      </div>
                      {isSelected && <Check className="w-4 h-4 text-[#1F2937]" />}
                    </button>
                  );
                })}
             </div>
          </div>
        )}
      </div>
    </div>
  );
};
