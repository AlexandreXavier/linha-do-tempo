import { useState, useEffect, useRef } from 'react';

interface YearDropdownProps {
  selectedYears: string[];
  onYearChange: (years: string[]) => void;
  years?: string[];
  className?: string;
  maxSelections?: number;
}

export function YearDropdown({ 
  selectedYears = [], 
  onYearChange, 
  years = ['1900','1920','1940','1950','1960','1970','1980','1990','2000','2020'],
  className = '',
  maxSelections = 4
}: YearDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const toggleYear = (year: string) => {
    const isSelected = selectedYears.includes(year);
    let newSelectedYears: string[];

    if (isSelected) {
      newSelectedYears = selectedYears.filter(y => y !== year);
    } else if (selectedYears.length < maxSelections) {
      newSelectedYears = [...selectedYears, year];
    } else {
      // If max selections reached, replace the first selected year
      newSelectedYears = [...selectedYears.slice(1), year];
    }

    onYearChange(newSelectedYears);
  };

  const displayText = selectedYears.length > 0 
    ? selectedYears.join(', ')
    : 'Decada';

  return (
    <div className={`relative font-caveat ${className}`} ref={dropdownRef}>
      <button
        type="button"
        className="text-6xl md:text-8xl font-bold text-[#5A4A3E] hover:text-[#3D332C] transition-colors duration-200 focus:outline-none"
        onClick={() => setIsOpen(!isOpen)}
      >
        {displayText}
        <span className="ml-2 text-3xl md:text-5xl">▼</span>
      </button>

      {isOpen && (
        <div className="absolute z-10 w-full mt-2 bg-[#F8F4E3] border-2 border-[#5A4A3E] rounded-lg shadow-xl overflow-hidden">
          <div className="py-1">
            {years.map((year) => (
              <div
                key={year}
                className={`px-6 py-3 text-2xl md:text-3xl cursor-pointer hover:bg-[#E8E0D5] transition-colors duration-200 ${
                  selectedYears.includes(year) ? 'bg-[#E8E0D5] font-bold' : 'text-[#5A4A3E]'
                }`}
                onClick={() => {
                  toggleYear(year);
                }}
              >
                <div className="flex items-center">
                  <span className="relative flex items-center">
                    <span className={`w-6 h-6 flex items-center justify-center border-2 border-[#5A4A3E] rounded mr-3 ${
                      selectedYears.includes(year) ? 'bg-[#5A4A3E]' : 'bg-transparent'
                    }`}>
                      {selectedYears.includes(year) && (
                        <span className="text-[#F8F4E3] text-xl">✓</span>
                      )}
                    </span>
                    {year}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default YearDropdown;
