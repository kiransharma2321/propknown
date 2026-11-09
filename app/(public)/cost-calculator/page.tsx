import { permanentRedirect } from "next/navigation";

// The calculator moved to /true-cost (sourced, state-wise rates). 308 permanent redirect keeps
// old links and search results working.
export default function CostCalculatorPage() {
  permanentRedirect("/true-cost");
}
