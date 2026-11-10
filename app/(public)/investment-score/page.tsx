import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { FEATURES } from "@/lib/features";
import { FACTORS, MIN_FACTORS, SCORE_VERSION } from "@/lib/investmentScore";
import { RoiCalculator, ScoreLookup } from "@/components/tools/InvestmentScoreTools";

export const metadata: Metadata = {
  title: "Investment Score & ROI Calculator",
  description: "PropKnown Investment Score: a published, rules-based 0-100 score with every factor, weight and data source shown. Plus an ROI, CAGR and rental-yield calculator.",
  alternates: { canonical: "https://www.propknown.com/investment-score" },
};

// M4 (feature flag NEXT_PUBLIC_FEATURE_INVESTMENT_SCORE). 404 while the flag is off.
export default function InvestmentScorePage() {
  if (!FEATURES.investmentScore) notFound();
  return (
    <section className="max-w-6xl mx-auto px-4 sm:px-6 pt-32 pb-20 space-y-12">
      <div>
        <h1 className="heading-h1 mb-3">Investment Score</h1>
        <p className="text-gray-600 max-w-2xl">A 0–100 score that shows its working: every factor, its weight and where the data comes from. It is a transparent, rules-based score, not a machine-learning model and not a price prediction.</p>
      </div>

      <div><h2 className="heading-h3 mb-4">Score an area or project</h2><ScoreLookup /></div>

      <div><h2 className="heading-h3 mb-4">ROI, CAGR and rental-yield calculator</h2><RoiCalculator /></div>

      <div id="method" className="scroll-mt-28">
        <h2 className="heading-h3 mb-2">The method (version {SCORE_VERSION})</h2>
        <p className="text-gray-600 text-sm max-w-3xl mb-4">Each factor gives 0–100 points. The score is the weighted average of the factors we have real inputs for; missing factors are left out and the remaining weights re-scaled. With fewer than {MIN_FACTORS} factors we show no score. Bands: 75+ Strong, 60–74 Good, 40–59 Fair, below 40 Weak.</p>
        <div className="overflow-x-auto rounded-2xl border border-gray-200">
          <table className="w-full min-w-[640px] text-sm">
            <thead className="bg-gray-50 text-left"><tr><th className="p-3">Factor</th><th className="p-3">Weight</th><th className="p-3">How points are given</th><th className="p-3">Data source</th></tr></thead>
            <tbody>
              {Object.entries(FACTORS).map(([k, f]) => (
                <tr key={k} className="border-t border-gray-100 align-top"><td className="p-3 font-semibold">{f.label}</td><td className="p-3">{f.weight}</td><td className="p-3 text-gray-700">{f.how}</td><td className="p-3 text-gray-600">{f.source}</td></tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="text-[11px] text-gray-500 mt-3">Trend and rental yield are AI estimates from live web search and are labelled as such. Infrastructure and legal checks are not part of the score until they can be taken from verified sources. Not financial advice.</p>
      </div>
    </section>
  );
}
