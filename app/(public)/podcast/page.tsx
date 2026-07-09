import type { Metadata } from "next";
import { Mic2, PlayCircle, Clock } from "lucide-react";

export const metadata: Metadata = {
  title: "Podcast — Real Estate Intelligence",
  description: "PropKnown Podcast: Market trends, investment strategies, buyer stories, and expert conversations on Indian and global real estate.",
  alternates: { canonical: "https://www.propknown.com/podcast" },
};

const EPISODES = [
  { ep: "EP 12", title: "Hyderabad 2025: Why Gachibowli is the Next Financial District", duration: "42 min", guest: "Rajesh Kumar, Urban Economist" },
  { ep: "EP 11", title: "NRI Investment Guide: Dubai vs Hyderabad — Where to Park ₹1 Crore?", duration: "38 min", guest: "Srinivas Rao, NRI Property Expert" },
  { ep: "EP 10", title: "RERA Deep Dive: Your Rights as a Buyer", duration: "51 min", guest: "Advocate Priya Reddy" },
  { ep: "EP 09", title: "AI in Real Estate: How Technology is Changing Property Decisions", duration: "44 min", guest: "Pinnelli Raghu Kiran, Founder PropKnown" },
  { ep: "EP 08", title: "Bangalore Off-Plan Opportunity: Early Mover Advantage in Whitefield", duration: "36 min", guest: "Anil Mehta, Developer" },
  { ep: "EP 07", title: "First Home Buyer Blueprint: From Search to Registration", duration: "55 min", guest: "Kavitha Nair, Home Buyer Advocate" },
];

export default function PodcastPage() {
  return (
    <div className="pt-32 pb-20 bg-white min-h-screen">
      <div className="max-w-7xl mx-auto px-6">
        <div className="text-center mb-14">
          <div className="inline-flex items-center gap-2 bg-gray-100 border border-gray-200 text-gray-500 text-xs px-4 py-2 rounded-full mb-4">
            <Mic2 size={13} style={{ color: "#8a6a2e" }} /> PropKnown Podcast
          </div>
          <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold text-gray-900 mb-4" style={{ fontFamily: "var(--font-playfair, Georgia, serif)" }}>
            Real Estate <span className="gold-text">Intelligence Podcast</span>
          </h1>
          <p className="text-gray-500 mt-4 max-w-2xl mx-auto text-base leading-relaxed">
            Market trends, investment strategies, buyer stories, and expert conversations —
            helping you make smarter property decisions.
          </p>
        </div>

        <h2 className="text-xl font-bold text-gray-900 mb-5">Latest Episodes</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {EPISODES.map((ep) => (
            <div key={ep.ep} className="bg-white border border-gray-200 rounded-xl p-5 flex items-start gap-4">
              <div className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0" style={{ background: "rgba(201,162,75,0.1)", border: "1px solid rgba(201,162,75,0.3)" }}>
                <PlayCircle size={20} style={{ color: "#8a6a2e" }} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-bold tracking-widest" style={{ color: "#8a6a2e" }}>{ep.ep}</span>
                  <span className="flex items-center gap-1 text-gray-400 text-xs">
                    <Clock size={11} /> {ep.duration}
                  </span>
                </div>
                <h3 className="text-gray-900 font-semibold text-sm mb-1 leading-snug">
                  {ep.title}
                </h3>
                <p className="text-gray-400 text-xs">{ep.guest}</p>
              </div>
            </div>
          ))}
        </div>

        <div className="text-center mt-12">
          <p className="text-gray-400 text-sm mb-4">Available on Spotify, Apple Podcasts & YouTube</p>
          <div className="flex justify-center gap-3 flex-wrap">
            {["Spotify", "Apple Podcasts", "YouTube"].map((platform) => (
              <span key={platform} className="bg-gray-50 border border-gray-200 text-gray-600 text-sm px-5 py-2 rounded-full">
                {platform}
              </span>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
