
import React, { useEffect, useState, useRef } from 'react';

interface StatsCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  subValue?: string | number;
  icon?: React.ReactNode;
  trend?: 'up' | 'down' | 'neutral';
  className?: string;
  children?: React.ReactNode;
}

const StatsCard: React.FC<StatsCardProps> = ({ 
  title, 
  value, 
  subtitle, 
  subValue, 
  icon, 
  trend,
  className = "",
  children
}) => {
  const [pulseClass, setPulseClass] = useState("");
  const prevValue = useRef(value);

  useEffect(() => {
    if (prevValue.current !== value) {
      const isIncrease = Number(value) > Number(prevValue.current);
      setPulseClass(isIncrease ? "text-emerald-400 scale-105" : "text-rose-400 scale-105");
      const timer = setTimeout(() => setPulseClass(""), 1000);
      prevValue.current = value;
      return () => clearTimeout(timer);
    }
  }, [value]);

  return (
    <div className={`glass-card p-5 rounded-xl flex flex-col justify-between transition-all duration-500 ${className}`}>
      <div className="flex justify-between items-start mb-2">
        <h3 className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-500 flex items-center gap-2">
          {icon}
          {title}
        </h3>
        {trend === 'up' && (
          <span className="text-emerald-500/50">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 7h8m0 0v8m0-8l-9 9-4-4-6 6"></path></svg>
          </span>
        )}
      </div>
      
      <div className="mt-1">
        <div className={`text-3xl font-black tracking-tighter transition-all duration-500 ${pulseClass}`}>
          {typeof value === 'number' && trend !== 'neutral' ? (value > 0 ? `+${value.toFixed(2)}%` : `${value.toFixed(2)}%`) : value}
        </div>
        
        {subtitle && (
          <div className="mt-4 flex flex-col gap-1">
            <div className="flex justify-between text-[10px] font-bold uppercase text-slate-500">
              <span>{subtitle}</span>
              <span className={subValue && subValue.toString().startsWith('+') ? 'text-emerald-400' : subValue && subValue.toString().startsWith('-') ? 'text-rose-400' : 'text-slate-300'}>
                {subValue}
              </span>
            </div>
          </div>
        )}
      </div>

      {children && <div className="mt-4">{children}</div>}
    </div>
  );
};

export default StatsCard;
