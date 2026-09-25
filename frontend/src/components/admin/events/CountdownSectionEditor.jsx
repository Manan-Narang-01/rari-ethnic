export const CountdownSectionEditor = ({ config, onChange }) => (
  <div>
    <label className="label-caps">Style</label>
    <select
      value={config.variant || "dark"}
      onChange={(e) => onChange({ ...config, variant: e.target.value })}
      className="w-full mt-1 border-b border-[#8B9A9F]/40 bg-transparent py-2 outline-none focus:border-[#A0684E]"
    >
      <option value="dark">Dark strip</option>
      <option value="light">Light strip</option>
    </select>
    <p className="text-xs text-[#6E7B85] mt-2">
      Uses the countdown date set in the "Countdown" card above. Add this section anywhere you want a second countdown on the page (the hero already shows one automatically).
    </p>
  </div>
);

export default CountdownSectionEditor;
