import { useEffect, useMemo, useState } from "react";

// Fallback target if no campaign date is configured (Sharad Navratri 2026).
const DEFAULT_TARGET = "2026-10-12T00:00:00+05:30";

const diff = (target) => {
  const now = new Date();
  const ms = target.getTime() - now.getTime();
  if (ms <= 0) return { days: 0, hours: 0, minutes: 0, seconds: 0, ended: true };
  const days = Math.floor(ms / (1000 * 60 * 60 * 24));
  const hours = Math.floor((ms / (1000 * 60 * 60)) % 24);
  const minutes = Math.floor((ms / (1000 * 60)) % 60);
  const seconds = Math.floor((ms / 1000) % 60);
  return { days, hours, minutes, seconds, ended: false };
};

export const CountdownTimer = ({
  target,
  label = "Navratri arrives in",
  variant = "light",
}) => {
  const targetDate = useMemo(() => {
    const raw = target || DEFAULT_TARGET;
    return raw instanceof Date ? raw : new Date(raw);
  }, [target]);
  const [t, setT] = useState(() => diff(targetDate));

  useEffect(() => {
    setT(diff(targetDate));
    const id = setInterval(() => setT(diff(targetDate)), 1000);
    return () => clearInterval(id);
  }, [targetDate]);

  const isDark = variant === "dark";
  const cellBase = isDark
    ? "bg-[#2A2E30]/70 text-[#E8E3D7] border border-[#B58D3E]/30"
    : "bg-[#E8E3D7]/95 text-[#2A2E30] border border-[#A0684E]/15";

  const items = [
    { v: t.days, l: "Days" },
    { v: t.hours, l: "Hours" },
    { v: t.minutes, l: "Min" },
    { v: t.seconds, l: "Sec" },
  ];

  return (
    <div data-testid="countdown-timer" className="flex flex-col items-center gap-3">
      <span className={`label-caps ${isDark ? "text-[#B58D3E]" : "text-[#A0684E]"}`}>
        {label}
      </span>
      <div className="flex gap-2 sm:gap-3">
        {items.map((it) => (
          <div
            key={it.l}
            className={`${cellBase} rounded-md px-3 py-2 sm:px-5 sm:py-3 min-w-[62px] sm:min-w-[80px] text-center backdrop-blur-sm`}
          >
            <div className="font-display text-2xl sm:text-4xl leading-none">
              {String(it.v).padStart(2, "0")}
            </div>
            <div className="text-[10px] sm:text-xs mt-1 tracking-widest uppercase opacity-70">
              {it.l}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
