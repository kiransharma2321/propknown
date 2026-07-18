import type { Metadata } from "next";
import { Mic2, PlayCircle, Clock } from "lucide-react";
import { OG_IMAGE } from "@/app/layout";

const BASE_URL = "https://www.propknown.com";
const title = "Podcast — Real Estate Market Intelligence";
const description = "PropKnown Podcast: real conversations on Hyderabad market trends, NRI investment (Dubai vs Hyderabad), RERA buyer rights, and AI in real estate.";

export const metadata: Metadata = {
  title,
  description,
  alternates: { canonical: `${BASE_URL}/podcast` },
  openGraph: { title, description, images: [OG_IMAGE] },
  twitter: { card: "summary_large_image", title, description, images: [OG_IMAGE.url] },
};

const EPISODES = [
  { ep: "EP 12", title: "Hyderabad 2025: Why Gachibowli is the Next Financial District", duration: "42 min", guest: "Rajesh Kumar, Urban Economist" },
  { ep: "EP 11", title: "NRI Investment Guide: Dubai vs Hyderabad — Where to Park ₹1 Crore?", duration: "38 min", guest: "Srinivas Rao, NRI Property Expert" },
  { ep: "EP 10", title: "RERA Deep Dive: Your Rights as a Buyer", duration: "51 min", guest: "Advocate Priya Reddy" },
  { ep: "EP 09", title: "AI in Real Estate: How Technology is Changing Property Decisions", duration: "44 min", guest: "Pinnelli Raghu Kiran, Founder PropKnown" },
  { ep: "EP 08", title: "Bangalore Off-Plan Opportunity: Early Mover Advantage in Whitefield", duration: "36 min", guest: "Anil Mehta, Developer" },
  { ep: "EP 07", title: "First Home Buyer Blueprint: From Search to Registration", duration: "55 min", guest: "Kavitha Nair, Home Buyer Advocate" },
];

// "42 min" -> "PT42M" (ISO 8601), a direct reformat of the existing duration string --
// no fabricated data. Episodes have no stored publish date or audio file URL, so
// datePublished/associatedMedia are omitted entirely rather than guessed (same principle
// as datePosted on the listing schema elsewhere in this app).
function toIsoDuration(display: string): string | undefined {
  const m = display.match(/(\d+)\s*min/i);
  return m ? `PT${m[1]}M` : undefined;
}

const podcastJsonLd = {
  "@context": "https://schema.org",
  "@type": "PodcastSeries",
  name: "PropKnown Podcast",
  description,
  url: `${BASE_URL}/podcast`,
  webFeed: `${BASE_URL}/podcast`,
  image: OG_IMAGE.url,
  publisher: { "@type": "Organization", name: "PropKnown Infra Pvt Ltd", url: BASE_URL },
  episode: EPISODES.map(ep => ({
    "@type": "PodcastEpisode",
    name: ep.title,
    url: `${BASE_URL}/podcast#${ep.ep.toLowerCase().replace(/\s+/g, "-")}`,
    ...(toIsoDuration(ep.duration) ? { duration: toIsoDuration(ep.duration) } : {}),
    actor: { "@type": "Person", name: ep.guest },
  })),
};

export default function PodcastPage() {
  return (
    <div className="pt-32 pb-20 bg-white min-h-screen">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(podcastJsonLd) }} />
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
            <div key={ep.ep} id={ep.ep.toLowerCase().replace(/\s+/g, "-")} className="bg-white border border-gray-200 rounded-xl p-5 flex items-start gap-4">
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
