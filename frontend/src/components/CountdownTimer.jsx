import { useEffect, useState } from "react";

// Navratri 2026 begins around March 19, 2026 (Chaitra Navratri)
// but user is planning ahead — we'll target Sharad Navratri (Oct 2026 approx Oct 12)
// Using an env-driven target keeps this reusable for Diwali too.
const NAVRATRI_TARGET = new Date("2026-10-12T00:00:00+05:30");

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
  target = NAVRATRI_TARGET,
  label = "Navratri arrives in",
  variant = "light",
}) => {
  const [t, setT] = useState(diff(target));

  useEffect(() => {
    const id = setInterval(() => setT(diff(target)), 1000);
    return () => clearInterval(id);
  }, [target]);

  const isDark = variant === "dark";
  const cellBase = isDark
    ? "bg-[#2B211E]/70 text-[#FAF6F0] border border-[#DCA537]/30"
    : "bg-[#FAF6F0]/95 text-[#2B211E] border border-[#7E1F35]/15";

  const items = [
    { v: t.days, l: "Days" },
    { v: t.hours, l: "Hours" },
    { v: t.minutes, l: "Min" },
    { v: t.seconds, l: "Sec" },
  ];

  return (
    <div data-testid="countdown-timer" className="flex flex-col items-center gap-3">
      <span className={`label-caps ${isDark ? "text-[#DCA537]" : "text-[#7E1F35]"}`}>
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
