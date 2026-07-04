"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { MapPin, Phone, MessageCircle, ArrowLeft, CheckCircle, Video, Image as ImageIcon } from "lucide-react";
import VerificationBadge, { type VerificationFlags } from "@/components/ui/VerificationBadge";
import LegalChecklistBadge from "@/components/ui/LegalChecklistBadge";
import ConstructionProgress from "@/components/ui/ConstructionProgress";
import RequestVideoTourButton from "@/components/nri/RequestVideoTourButton";
import type { LegalChecklist } from "@/lib/legalShield";
import type { ConstructionMilestone } from "@/lib/constructionProgress";

interface SubDetail {
  id: string; title: string; propType: string; bhk?: string;
  size?: string; sizeUnit?: string; priceDisplay: string;
  city: string; area: string; description: string; features?: string;
  reraNumber?: string; ownerName: string; ownerPhone: string;
  photoIds: string[]; videoIds: string[]; videoUrls: string[];
  verificationFlags?: VerificationFlags;
  legalChecklist?: LegalChecklist;
  legalNotes?: string;
  constructionMilestones?: ConstructionMilestone[];
  constructionPct?: number;
  expectedCompletion?: string;
  createdAt: string;
}

export default function SubmissionDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [sub,     setSub]     = useState<SubDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [activePhoto, setActivePhoto] = useState(0);

  useEffect(() => {
    fetch(`/api/submissions/${id}`)
      .then(r => { if (!r.ok) { setNotFound(true); return null; } return r.json(); })
      .then(d => { if (d) setSub(d); })
      .catch(() => setNotFound(true))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) {
    return (
      <div className="pt-32 pb-20 min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-yellow-400 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (notFound || !sub) {
    return (
      <div className="pt-32 pb-20 min-h-screen text-center">
        <p className="text-gray-500 text-lg">Property not found or not yet approved.</p>
        <Link href="/buy" className="mt-4 inline-block text-sm font-semibold" style={{ color: "#C9A24B" }}>← Back to Buy</Link>
      </div>
    );
  }

  const photoUrls = sub.photoIds.map(pid => `/api/files/${pid}`);
  const waMsg = `https://wa.me/919701771333?text=${encodeURIComponent(`Hi, I'm interested in "${sub.title}" at ${sub.area}, ${sub.city}. Asking: ${sub.priceDisplay}`)}`;

  const isYoutube = (url: string) => url.includes("youtube.com") || url.includes("youtu.be");
  const ytEmbed   = (url: string) => {
    const m = url.match(/(?:v=|youtu\.be\/)([^&?/]+)/);
    return m ? `https://www.youtube.com/embed/${m[1]}` : url;
  };

  return (
    <div className="pt-28 pb-20 bg-white min-h-screen">
      <div className="max-w-6xl mx-auto px-6">
        {/* Back */}
        <Link href="/buy" className="inline-flex items-center gap-2 text-gray-500 hover:text-gray-800 text-sm mb-6 transition-colors">
          <ArrowLeft size={15} /> Back to listings
        </Link>

        <div className="grid lg:grid-cols-3 gap-8">
          {/* Left: Photos + Videos */}
          <div className="lg:col-span-2">
            {/* Main photo */}
            {photoUrls.length > 0 ? (
              <div className="mb-3 rounded-2xl overflow-hidden bg-gray-100 aspect-[16/9]">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={photoUrls[activePhoto]} alt={sub.title} className="w-full h-full object-cover" />
              </div>
            ) : (
              <div className="mb-3 rounded-2xl bg-gray-100 aspect-[16/9] flex items-center justify-center">
                <ImageIcon size={48} className="text-gray-300" />
              </div>
            )}

            {/* Photo thumbnails */}
            {photoUrls.length > 1 && (
              <div className="flex gap-2 mb-6 overflow-x-auto pb-1">
                {photoUrls.map((url, i) => (
                  <button key={i} onClick={() => setActivePhoto(i)}
                    className={`shrink-0 w-16 h-16 rounded-lg overflow-hidden border-2 transition-all ${activePhoto === i ? "border-yellow-400" : "border-transparent"}`}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={url} alt="" className="w-full h-full object-cover" />
                  </button>
                ))}
              </div>
            )}

            {/* Videos */}
            {(sub.videoIds.length > 0 || sub.videoUrls.length > 0) && (
              <div className="mb-6">
                <div className="flex items-center gap-2 mb-3">
                  <Video size={16} style={{ color: "#C9A24B" }} />
                  <h3 className="text-gray-900 font-semibold">Videos</h3>
                </div>
                <div className="space-y-4">
                  {sub.videoIds.map(vid => (
                    <video key={vid} src={`/api/files/${vid}`} controls
                      className="w-full rounded-xl bg-black max-h-64" />
                  ))}
                  {sub.videoUrls.map((url, i) => (
                    isYoutube(url) ? (
                      <iframe key={i} src={ytEmbed(url)} title="Property video"
                        className="w-full aspect-video rounded-xl" allowFullScreen />
                    ) : (
                      <a key={i} href={url} target="_blank" rel="noopener noreferrer"
                        className="block text-sm px-4 py-3 rounded-xl border border-gray-200 text-blue-600 hover:border-blue-300 transition-colors">
                        View video →
                      </a>
                    )
                  ))}
                </div>
              </div>
            )}

            {/* Description */}
            <div className="bg-gray-50 border border-gray-100 rounded-2xl p-6 mb-6">
              <h3 className="text-gray-900 font-bold mb-3">About this property</h3>
              <p className="text-gray-600 text-sm leading-relaxed whitespace-pre-line">{sub.description}</p>
            </div>

            {sub.features && (
              <div className="bg-gray-50 border border-gray-100 rounded-2xl p-6 mb-6">
                <h3 className="text-gray-900 font-bold mb-3">Key Features</h3>
                <p className="text-gray-600 text-sm leading-relaxed">{sub.features}</p>
              </div>
            )}

            {sub.constructionMilestones && sub.constructionMilestones.length > 0 && (
              <div className="mb-6">
                <ConstructionProgress
                  milestones={sub.constructionMilestones}
                  pctComplete={sub.constructionPct}
                  expectedCompletion={sub.expectedCompletion}
                />
              </div>
            )}

            <LegalChecklistBadge id="legal-shield" checklist={sub.legalChecklist ?? {}} notes={sub.legalNotes} />
          </div>

          {/* Right: Details card */}
          <div>
            <div className="sticky top-24 bg-white border border-gray-200 rounded-2xl p-6 shadow-sm">
              <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-blue-50 text-blue-700 border border-blue-200 mb-4 inline-block">
                Owner Listed
              </span>

              <h1 className="text-gray-900 font-bold text-xl mb-1 leading-snug">{sub.title}</h1>
              <div className="flex items-center gap-1 text-gray-400 text-sm mb-4">
                <MapPin size={13} />{sub.area}, {sub.city}
              </div>

              <p className="text-3xl font-bold mb-4" style={{ color: "#C9A24B", fontFamily: "var(--font-playfair,Georgia,serif)" }}>
                {sub.priceDisplay}
              </p>

              <div className="space-y-2 text-sm text-gray-600 mb-5 border-t border-gray-100 pt-4">
                <div className="flex gap-3"><span className="text-gray-400 w-20 shrink-0">Type</span><span>{sub.propType}</span></div>
                {sub.bhk && <div className="flex gap-3"><span className="text-gray-400 w-20 shrink-0">Config</span><span>{sub.bhk}</span></div>}
                {sub.size && <div className="flex gap-3"><span className="text-gray-400 w-20 shrink-0">Size</span><span>{sub.size} {sub.sizeUnit}</span></div>}
                {sub.reraNumber && (
                  <div className="flex gap-3 items-center">
                    <span className="text-gray-400 w-20 shrink-0">RERA</span>
                    <span className="flex items-center gap-1.5 text-green-700 font-medium text-xs">
                      <CheckCircle size={12} /> {sub.reraNumber}
                    </span>
                  </div>
                )}
                <div className="flex gap-3">
                  <span className="text-gray-400 w-20 shrink-0">Photos</span>
                  <span>{photoUrls.length} uploaded</span>
                </div>
              </div>

              <div className="mb-5">
                <VerificationBadge flags={sub.verificationFlags ?? {}} detailLinkHref="#legal-shield" />
              </div>

              <div className="space-y-3">
                <a href={waMsg} target="_blank" rel="noopener noreferrer"
                  className="flex items-center justify-center gap-2 w-full py-3 rounded-xl font-bold text-black text-sm transition-all hover:opacity-90"
                  style={{ background: "#C9A24B" }}>
                  <MessageCircle size={16} /> Enquire on WhatsApp
                </a>
                <a href={`tel:${sub.ownerPhone}`}
                  className="flex items-center justify-center gap-2 w-full py-3 rounded-xl font-semibold text-gray-700 text-sm border border-gray-200 hover:border-gray-400 transition-all">
                  <Phone size={15} /> {sub.ownerPhone}
                </a>
                <RequestVideoTourButton propertyId={sub.id} title={sub.title} />
              </div>

              <p className="text-gray-400 text-[11px] mt-4 text-center">
                Listed by {sub.ownerName}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
