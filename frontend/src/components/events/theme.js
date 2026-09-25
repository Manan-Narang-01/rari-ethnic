// Shared style tokens for event-page section renderers, branching on the
// campaign's `theme` field ("festive" preserves the original Navratri
// maroon/gold look exactly; "default" uses the site's normal brand palette).
export const eventTheme = (theme) => {
  const festive = theme === "festive";
  return {
    festive,
    bg: festive ? "bg-[#3E0714]" : "bg-[#E8E3D7]",
    text: festive ? "text-[#F5E9C9]" : "text-[#2A2E30]",
    textMuted: festive ? "text-[#F5E9C9]/70" : "text-[#6E7B85]",
    accent: festive ? "text-[#F4C842]" : "text-[#A0684E]",
    accentBg: festive ? "bg-[#F4C842]" : "bg-[#A0684E]",
    accentText: festive ? "text-[#3E0714]" : "text-[#E8E3D7]",
    accentBorder: festive ? "border-[#F4C842]/30" : "border-[#A0684E]/25",
    cardBg: festive ? "bg-[#5A1424]" : "bg-[#DDD5C4]/40",
    divider: festive ? "border-[#F4C842]/15" : "border-[#2A2E30]/8",
  };
};
