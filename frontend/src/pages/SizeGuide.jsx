import { Ruler, Info } from "lucide-react";

const CHART = [
  { size: "XS", bust: "32", waist: "26", hip: "35" },
  { size: "S", bust: "34", waist: "28", hip: "37" },
  { size: "M", bust: "36", waist: "30", hip: "39" },
  { size: "L", bust: "38", waist: "32", hip: "41" },
  { size: "XL", bust: "40", waist: "34", hip: "43" },
  { size: "XXL", bust: "42", waist: "36", hip: "45" },
];

export const SizeGuide = () => {
  return (
    <div className="bg-[#FAF6F0]">
      <div className="container-x py-16 md:py-24 max-w-4xl">
        <div className="text-center mb-12 fade-up">
          <span className="label-caps text-[#7E1F35]">Sizing</span>
          <h1 className="font-display text-5xl sm:text-6xl mt-2">Size Guide</h1>
          <p className="mt-4 text-[#6B5B55] max-w-lg mx-auto">
            All measurements in inches. Our fit runs true — but if you're between
            two sizes, our fit notes on each product will tell you exactly what to do.
          </p>
        </div>

        <div className="bg-[#FAF6F0] border border-[#2B211E]/10 rounded-sm overflow-hidden">
          <table className="w-full text-sm" data-testid="size-chart-table">
            <thead className="bg-[#7E1F35] text-[#FAF6F0]">
              <tr>
                <th className="p-3 text-left font-body font-medium">Size</th>
                <th className="p-3 text-left font-body font-medium">Bust</th>
                <th className="p-3 text-left font-body font-medium">Waist</th>
                <th className="p-3 text-left font-body font-medium">Hip</th>
              </tr>
            </thead>
            <tbody>
              {CHART.map((r, i) => (
                <tr key={r.size} className={i % 2 === 0 ? "bg-[#F3EDE4]/50" : ""}>
                  <td className="p-3 font-display text-lg">{r.size}</td>
                  <td className="p-3">{r.bust}"</td>
                  <td className="p-3">{r.waist}"</td>
                  <td className="p-3">{r.hip}"</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* How to measure */}
        <div className="mt-16">
          <div className="flex items-center gap-2 mb-6">
            <Ruler size={20} className="text-[#7E1F35]" />
            <h2 className="font-display text-3xl">How to measure</h2>
          </div>
          <div className="grid md:grid-cols-3 gap-6">
            {[
              { t: "Bust", d: "Wrap the tape around the fullest part of your bust. Keep it snug but not tight." },
              { t: "Waist", d: "Measure the smallest part of your natural waist, above your belly button." },
              { t: "Hip", d: "Around the fullest part of your hips — usually 8 inches below your waist." },
            ].map((it, i) => (
              <div key={i} className="border border-[#2B211E]/10 p-6 rounded-sm bg-[#FAF6F0]">
                <div className="font-display text-2xl text-[#7E1F35]">{i + 1}. {it.t}</div>
                <p className="text-sm text-[#6B5B55] mt-2 leading-relaxed">{it.d}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Tip box */}
        <div className="mt-12 bg-[#DCA537]/12 border border-[#DCA537]/30 rounded-sm p-5 flex gap-3">
          <Info size={18} className="text-[#7E1F35] shrink-0 mt-0.5" />
          <div>
            <div className="font-display text-lg">Between two sizes?</div>
            <p className="text-sm text-[#2B211E]/80 mt-1 leading-relaxed">
              Check the <strong>Fit Notes</strong> on each product. For anarkalis and
              flared kurtis, we usually recommend sizing down. For structured suits, size up.
              Still unsure? WhatsApp us — we'll help you decide.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SizeGuide;
