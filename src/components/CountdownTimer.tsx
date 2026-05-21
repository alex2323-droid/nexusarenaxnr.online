import React, { useState, useEffect } from 'react';
import { Clock } from 'lucide-react';
import { cn } from '../lib/utils';

interface CountdownTimerProps {
  targetDate: Date;
  className?: string;
}

const CountdownTimer: React.FC<CountdownTimerProps> = ({ targetDate, className }) => {
  const [timeLeft, setTimeLeft] = useState<{
    days: number;
    hours: number;
    minutes: number;
    seconds: number;
    total: number;
  }>({ days: 0, hours: 0, minutes: 0, seconds: 0, total: 0 });

  useEffect(() => {
    const calculateTimeLeft = () => {
      const difference = +targetDate - +new Date();
      let timeLeft = {
        days: 0,
        hours: 0,
        minutes: 0,
        seconds: 0,
        total: difference
      };

      if (difference > 0) {
        timeLeft = {
          days: Math.floor(difference / (1000 * 60 * 60 * 24)),
          hours: Math.floor((difference / (1000 * 60 * 60)) % 24),
          minutes: Math.floor((difference / 1000 / 60) % 60),
          seconds: Math.floor((difference / 1000) % 60),
          total: difference
        };
      }

      return timeLeft;
    };

    const timer = setInterval(() => {
      setTimeLeft(calculateTimeLeft());
    }, 1000);

    setTimeLeft(calculateTimeLeft());

    return () => clearInterval(timer);
  }, [targetDate]);

  if (timeLeft.total <= 0) {
    return (
      <div className={cn("inline-flex items-center gap-1.5 px-2 py-1 rounded bg-green-500/10 text-green-500 text-[10px] font-bold uppercase", className)}>
        <Clock size={12} />
        ¡En Curso!
      </div>
    );
  }

  return (
    <div className={cn("inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-black/60 border border-white/10 backdrop-blur-sm", className)}>
      <Clock size={14} className="text-primary animate-pulse" />
      <div className="flex gap-2">
        {timeLeft.days > 0 && (
          <div className="flex flex-col items-center">
            <span className="text-xs font-mono font-bold leading-none">{timeLeft.days}d</span>
          </div>
        )}
        <div className="flex flex-col items-center">
          <span className="text-xs font-mono font-bold leading-none">{timeLeft.hours.toString().padStart(2, '0')}h</span>
        </div>
        <div className="flex flex-col items-center">
          <span className="text-xs font-mono font-bold leading-none">{timeLeft.minutes.toString().padStart(2, '0')}m</span>
        </div>
        <div className="flex flex-col items-center">
          <span className="text-xs font-mono font-bold leading-none text-primary">{timeLeft.seconds.toString().padStart(2, '0')}s</span>
        </div>
      </div>
    </div>
  );
};

export default CountdownTimer;
