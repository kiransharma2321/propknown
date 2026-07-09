"use client";

import { useState, useRef, useCallback } from "react";
import { Upload, X, Image as ImageIcon, FileText, Video, CheckCircle, Loader2, Plus, Link as LinkIcon } from "lucide-react";

const PROP_TYPES = ["Apartment", "Villa", "House", "Plot", "Agricultural Land", "Commercial"];
const UNIT_OPTIONS = ["sqft", "sqyard", "acre", "guntas"];

const DOC_CHECKLIST: Record<string, string[]> = {
  Apartment: [
    "Sale Deed / Title Deed",
    "RERA Certificate",
    "Occupancy Certificate (OC)",
    "Building Approval Plan",
    "Encumbrance Certificate (EC)",
    "Property Tax Receipt",
    "Society NOC (if applicable)",
  ],
  Villa: [
    "Sale Deed / Title Deed",
    "RERA Certificate",
    "Occupancy Certificate (OC)",
    "Building Approval Plan",
    "Encumbrance Certificate (EC)",
    "Property Tax Receipt",
    "Society NOC (if applicable)",
  ],
  House: [
    "Sale Deed / Title Deed",
    "RERA Certificate",
    "Occupancy Certificate (OC)",
    "Building Approval Plan",
    "Encumbrance Certificate (EC)",
    "Property Tax Receipt",
  ],
  Plot: [
    "Sale Deed / Title Deed",
    "RERA Certificate (if applicable)",
    "HMDA / DTCP / LP Approval",
    "Encumbrance Certificate (EC)",
    "Land Survey / Pahani",
    "Property Tax Receipt",
    "Layout Approval / FTL Clearance",
  ],
  "Agricultural Land": [
    "Sale Deed / Title Deed",
    "HMDA / DTCP Approval",
    "Land Survey / Pahani / Adangal",
    "Encumbrance Certificate (EC)",
    "Property Tax Receipt",
    "FTL Clearance",
  ],
  Commercial: [
    "Sale Deed / Title Deed",
    "RERA / Trade Approvals",
    "Building Approval & OC",
    "Encumbrance Certificate (EC)",
    "Property Tax Receipt",
  ],
};

interface PhotoEntry {
  tempId: string;
  file: File;
  preview: string;
  uploadedId?: string;
  uploading: boolean;
  error?: string;
  /** Optional, owner-written -- e.g. "Modular kitchen", "Master bedroom with balcony view".
   *  Shown as the photo's alt text in the gallery instead of a generic repeated title, when set. */
  caption: string;
}

interface VideoEntry {
  tempId: string;
  kind: "file" | "url";
  file?: File;
  url: string;
  preview?: string;
  uploadedId?: string;
  uploading: boolean;
  error?: string;
}

interface DocEntry {
  docType: string;
  file?: File;
  uploadedId?: string;
  uploading: boolean;
  error?: string;
}

const initDocs = (propType: string): DocEntry[] =>
  (DOC_CHECKLIST[propType] ?? []).map(docType => ({
    docType, uploading: false,
  }));

async function compressImage(file: File): Promise<File> {
  return new Promise(resolve => {
    const img = new window.Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      const MAX = 1200;
      let w = img.width, h = img.height;
      if (w > MAX || h > MAX) {
        if (w >= h) { h = Math.round(h * MAX / w); w = MAX; }
        else        { w = Math.round(w * MAX / h); h = MAX; }
      }
      const canvas = document.createElement("canvas");
      canvas.width = w; canvas.height = h;
      canvas.getContext("2d")!.drawImage(img, 0, 0, w, h);
      URL.revokeObjectURL(url);
      canvas.toBlob(
        blob => resolve(blob ? new File([blob], file.name.replace(/\.[^.]+$/, ".jpg"), { type: "image/jpeg" }) : file),
        "image/jpeg", 0.82
      );
    };
    img.onerror = () => { URL.revokeObjectURL(url); resolve(file); };
    img.src = url;
  });
}

async function uploadToServer(file: File, docType?: string, isPrivate = false): Promise<string> {
  const fd = new FormData();
  fd.append("file", file);
  if (docType) fd.append("docType", docType);
  fd.append("isPrivate", String(isPrivate));
  const res = await fetch("/api/upload", { method: "POST", body: fd });
  if (!res.ok) {
    const d = await res.json().catch(() => ({}));
    throw new Error(d.error ?? "Upload failed");
  }
  const d = await res.json();
  return d.id as string;
}

const inp = "border border-gray-300 text-gray-900 text-sm rounded-lg px-3 py-2.5 w-full focus:outline-none focus:border-yellow-500 placeholder-gray-400 bg-white";
const lbl = "block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5";

export default function SubmissionForm() {
  const [form, setForm] = useState({
    title: "", propType: "Apartment", bhk: "", size: "", sizeUnit: "sqft",
    priceDisplay: "", city: "", area: "", description: "", features: "",
    reraNumber: "", ownerName: "", ownerPhone: "", ownerEmail: "",
  });

  const [photos, setPhotos] = useState<PhotoEntry[]>([]);
  const [videos, setVideos] = useState<VideoEntry[]>([]);
  const [docs,   setDocs]   = useState<DocEntry[]>(initDocs("Apartment"));

  const [submitting, setSubmitting] = useState(false);
  const [submitted,  setSubmitted]  = useState(false);
  const [error,      setError]      = useState("");

  const photoRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLInputElement>(null);

  const setF = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }));

  const changePropType = (t: string) => {
    setF("propType", t);
    setDocs(initDocs(t));
  };

  // ─── Photos ────────────────────────────────────────────────────────
  const addPhotos = useCallback(async (files: FileList | File[]) => {
    const arr = Array.from(files)
      .filter(f => f.type.startsWith("image/"))
      .slice(0, 5 - photos.length);

    if (!arr.length) return;

    const newEntries: PhotoEntry[] = arr.map(f => ({
      tempId:    `${Date.now()}-${Math.random()}`,
      file:      f,
      preview:   URL.createObjectURL(f),
      uploading: true,
      caption:   "",
    }));
    setPhotos(prev => [...prev, ...newEntries].slice(0, 5));

    for (const entry of newEntries) {
      try {
        const compressed = await compressImage(entry.file);
        const id = await uploadToServer(compressed);
        setPhotos(prev => prev.map(p =>
          p.tempId === entry.tempId ? { ...p, uploadedId: id, uploading: false } : p
        ));
      } catch (e: unknown) {
        setPhotos(prev => prev.map(p =>
          p.tempId === entry.tempId
            ? { ...p, uploading: false, error: e instanceof Error ? e.message : "Upload failed" }
            : p
        ));
      }
    }
  }, [photos.length]);

  const removePhoto = (tempId: string) =>
    setPhotos(prev => prev.filter(p => p.tempId !== tempId));

  const setPhotoCaption = (tempId: string, caption: string) =>
    setPhotos(prev => prev.map(p => p.tempId === tempId ? { ...p, caption } : p));

  // ─── Videos ────────────────────────────────────────────────────────
  const addVideoFile = useCallback(async (file: File) => {
    if (videos.length >= 2) return;
    const MAX_VIDEO = 8 * 1024 * 1024;
    if (file.size > MAX_VIDEO) {
      setError("Video too large (max 8 MB). Paste a YouTube or Google Drive link instead.");
      return;
    }
    const entry: VideoEntry = {
      tempId:    `${Date.now()}-${Math.random()}`,
      kind:      "file",
      file,
      url:       "",
      preview:   URL.createObjectURL(file),
      uploading: true,
    };
    setVideos(prev => [...prev, entry]);
    try {
      const id = await uploadToServer(file);
      setVideos(prev => prev.map(v =>
        v.tempId === entry.tempId ? { ...v, uploadedId: id, uploading: false } : v
      ));
    } catch (e: unknown) {
      setVideos(prev => prev.map(v =>
        v.tempId === entry.tempId
          ? { ...v, uploading: false, error: e instanceof Error ? e.message : "Upload failed" }
          : v
      ));
    }
  }, [videos.length]);

  const addVideoUrl = () => {
    if (videos.length >= 2) return;
    setVideos(prev => [...prev, { tempId: `${Date.now()}`, kind: "url", url: "", uploading: false }]);
  };

  const setVideoUrl = (tempId: string, url: string) =>
    setVideos(prev => prev.map(v => v.tempId === tempId ? { ...v, url } : v));

  const removeVideo = (tempId: string) =>
    setVideos(prev => prev.filter(v => v.tempId !== tempId));

  // ─── Documents ─────────────────────────────────────────────────────
  const uploadDoc = useCallback(async (docType: string, file: File) => {
    const MAX_DOC = 5 * 1024 * 1024;
    if (file.size > MAX_DOC) {
      setDocs(prev => prev.map(d =>
        d.docType === docType ? { ...d, error: "File too large (max 5 MB)" } : d
      ));
      return;
    }
    setDocs(prev => prev.map(d =>
      d.docType === docType ? { ...d, file, uploading: true, error: undefined } : d
    ));
    try {
      const id = await uploadToServer(file, docType, true);
      setDocs(prev => prev.map(d =>
        d.docType === docType ? { ...d, uploadedId: id, uploading: false } : d
      ));
    } catch (e: unknown) {
      setDocs(prev => prev.map(d =>
        d.docType === docType
          ? { ...d, uploading: false, error: e instanceof Error ? e.message : "Upload failed" }
          : d
      ));
    }
  }, []);

  const removeDoc = (docType: string) =>
    setDocs(prev => prev.map(d =>
      d.docType === docType ? { ...d, file: undefined, uploadedId: undefined, error: undefined } : d
    ));

  // ─── Submit ────────────────────────────────────────────────────────
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    const pending = photos.some(p => p.uploading) ||
                    videos.some(v => v.uploading) ||
                    docs.some(d => d.uploading);
    if (pending) { setError("Please wait for all uploads to complete."); return; }

    const uploadedPhotos = photos.filter(p => p.uploadedId);
    if (!uploadedPhotos.length) { setError("Please upload at least 1 photo."); return; }

    // Keyed by photoId rather than array position -- position alone would silently point at the
    // wrong photo if a caption were ever added, reordered, or the array re-filtered downstream.
    const photoCaptions: Record<string, string> = {};
    for (const p of uploadedPhotos) {
      if (p.uploadedId && p.caption.trim()) photoCaptions[p.uploadedId] = p.caption.trim();
    }

    setSubmitting(true);
    try {
      const res = await fetch("/api/submit-property", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          photoIds: photos.filter(p => p.uploadedId).map(p => p.uploadedId),
          photoCaptions,
          videoIds: videos.filter(v => v.kind === "file" && v.uploadedId).map(v => v.uploadedId),
          videoUrls: videos.filter(v => v.kind === "url" && v.url.trim()).map(v => v.url.trim()),
          docIds: docs.filter(d => d.uploadedId).map(d => d.uploadedId),
        }),
      });

      const data = await res.json();
      if (!res.ok) { setError(data.error ?? "Submission failed. Please try again."); return; }
      setSubmitted(true);
    } catch {
      setError("Network error. Please check your connection.");
    } finally {
      setSubmitting(false);
    }
  };

  if (submitted) {
    return (
      <div className="bg-green-50 border border-green-200 rounded-2xl p-10 text-center">
        <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <CheckCircle size={32} className="text-green-600" />
        </div>
        <h3 className="text-gray-900 text-xl font-bold mb-2">Submission Received!</h3>
        <p className="text-gray-600 text-sm max-w-md mx-auto">
          Thank you! Your property has been submitted for review. Our team will verify and contact you
          within 24 hours at <strong>{form.ownerPhone}</strong>.
        </p>
        <p className="text-gray-400 text-xs mt-4">We list only genuine, verified properties.</p>
      </div>
    );
  }

  const sec = "bg-white border border-gray-200 rounded-2xl p-6 mb-6 shadow-sm";
  const secTitle = "text-gray-900 font-bold text-base mb-4 flex items-center gap-2";

  return (
    <form onSubmit={handleSubmit} className="space-y-0">
      {/* Property Details */}
      <div className={sec}>
        <h3 className={secTitle}>
          <span className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold text-black shrink-0" style={{ background: "#C9A24B" }}>1</span>
          Property Details
        </h3>
        <div className="grid sm:grid-cols-2 gap-4">
          <div className="sm:col-span-2">
            <label className={lbl} htmlFor="submission-title">Property Title *</label>
            <input id="submission-title" required value={form.title} onChange={e => setF("title", e.target.value)}
              className={inp} placeholder="e.g. 3BHK Apartment in Kokapet" />
          </div>
          <div>
            <label className={lbl} htmlFor="submission-prop-type">Property Type *</label>
            <select id="submission-prop-type" required value={form.propType} onChange={e => changePropType(e.target.value)} className={inp}>
              {PROP_TYPES.map(t => <option key={t}>{t}</option>)}
            </select>
          </div>
          <div>
            <label className={lbl} htmlFor="submission-bhk">BHK / Configuration</label>
            <input id="submission-bhk" value={form.bhk} onChange={e => setF("bhk", e.target.value)}
              className={inp} placeholder="3 BHK, 4 BHK, G+2, etc." />
          </div>
          <div>
            <label className={lbl} htmlFor="submission-size">Size</label>
            <input id="submission-size" value={form.size} onChange={e => setF("size", e.target.value)}
              className={inp} placeholder="e.g. 1850" type="number" min="0" />
          </div>
          <div>
            <label className={lbl} htmlFor="submission-size-unit">Size Unit</label>
            <select id="submission-size-unit" value={form.sizeUnit} onChange={e => setF("sizeUnit", e.target.value)} className={inp}>
              {UNIT_OPTIONS.map(u => <option key={u}>{u}</option>)}
            </select>
          </div>
        </div>
      </div>

      {/* Location & Price */}
      <div className={sec}>
        <h3 className={secTitle}>
          <span className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold text-black shrink-0" style={{ background: "#C9A24B" }}>2</span>
          Location &amp; Price
        </h3>
        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <label className={lbl} htmlFor="submission-city">City *</label>
            <input id="submission-city" required value={form.city} onChange={e => setF("city", e.target.value)}
              className={inp} placeholder="Hyderabad" />
          </div>
          <div>
            <label className={lbl} htmlFor="submission-area">Area / Locality *</label>
            <input id="submission-area" required value={form.area} onChange={e => setF("area", e.target.value)}
              className={inp} placeholder="Kokapet, Gachibowli, Kondapur…" />
          </div>
          <div className="sm:col-span-2">
            <label className={lbl} htmlFor="submission-price">Asking Price *</label>
            <input id="submission-price" required value={form.priceDisplay} onChange={e => setF("priceDisplay", e.target.value)}
              className={inp} placeholder="e.g. ₹1.5 Cr  or  ₹85 Lakhs  or  AED 2.2M" />
          </div>
          <div>
            <label className={lbl} htmlFor="submission-rera">RERA Number (if any)</label>
            <input id="submission-rera" value={form.reraNumber} onChange={e => setF("reraNumber", e.target.value)}
              className={inp} placeholder="P02400…" />
          </div>
        </div>
      </div>

      {/* Description */}
      <div className={sec}>
        <h3 className={secTitle}>
          <span className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold text-black shrink-0" style={{ background: "#C9A24B" }}>3</span>
          Description
        </h3>
        <div className="space-y-4">
          <div>
            <label className={lbl} htmlFor="submission-description">Property Description *</label>
            <textarea id="submission-description" required value={form.description} onChange={e => setF("description", e.target.value)}
              rows={4} className={`${inp} resize-none`}
              placeholder="Describe your property — floors, facing, nearby landmarks, amenities, condition, age of building…" />
          </div>
          <div>
            <label className={lbl} htmlFor="submission-features">Key Features (optional)</label>
            <textarea id="submission-features" value={form.features} onChange={e => setF("features", e.target.value)}
              rows={2} className={`${inp} resize-none`}
              placeholder="e.g. East-facing, Vastu compliant, 2 car parking, gym, swimming pool, 24/7 security" />
          </div>
        </div>
      </div>

      {/* Photos */}
      <div className={sec}>
        <h3 className={secTitle}>
          <span className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold text-black shrink-0" style={{ background: "#C9A24B" }}>4</span>
          Photos <span className="text-gray-400 text-xs font-normal">(required, up to 5)</span>
        </h3>

        {photos.length < 5 && (
          <div
            onClick={() => photoRef.current?.click()}
            className="border-2 border-dashed border-gray-300 rounded-xl p-6 text-center cursor-pointer hover:border-yellow-400 transition-colors mb-4"
          >
            <ImageIcon size={28} className="mx-auto mb-2 text-gray-400" />
            <p className="text-gray-500 text-sm">Click to add photos ({photos.length}/5)</p>
            <p className="text-gray-400 text-xs mt-0.5">JPG, PNG, WebP — auto-compressed</p>
            <input ref={photoRef} type="file" accept="image/*" multiple className="hidden"
              onChange={e => { if (e.target.files) { addPhotos(e.target.files); e.target.value = ""; } }} />
          </div>
        )}

        {photos.length > 0 && (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {photos.map(p => (
              <div key={p.tempId}>
                <div className="relative aspect-square rounded-lg overflow-hidden bg-gray-100 group">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={p.preview} alt="" className="w-full h-full object-cover" />
                  {p.uploading && (
                    <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                      <Loader2 size={18} className="animate-spin text-white" />
                    </div>
                  )}
                  {p.error && (
                    <div className="absolute inset-0 bg-red-900/70 flex items-center justify-center p-1">
                      <p className="text-white text-[10px] text-center">{p.error}</p>
                    </div>
                  )}
                  {p.uploadedId && !p.uploading && (
                    <div className="absolute top-1 right-1 w-4 h-4 bg-green-500 rounded-full flex items-center justify-center">
                      <CheckCircle size={10} className="text-white" />
                    </div>
                  )}
                  <button type="button" onClick={() => removePhoto(p.tempId)}
                    className="absolute top-1 left-1 w-5 h-5 bg-black/60 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                    <X size={10} className="text-white" />
                  </button>
                </div>
                <label className="sr-only" htmlFor={`submission-photo-caption-${p.tempId}`}>Photo caption</label>
                <input
                  id={`submission-photo-caption-${p.tempId}`}
                  value={p.caption}
                  onChange={e => setPhotoCaption(p.tempId, e.target.value)}
                  placeholder="What's in this photo? (optional)"
                  maxLength={80}
                  className="w-full mt-1.5 border border-gray-200 rounded-md px-2 py-1 text-[11px] text-gray-700 focus:outline-none focus:border-yellow-400 placeholder-gray-400"
                />
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Videos */}
      <div className={sec}>
        <h3 className={secTitle}>
          <span className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold text-black shrink-0" style={{ background: "#C9A24B" }}>5</span>
          Videos <span className="text-gray-400 text-xs font-normal">(optional, up to 2)</span>
        </h3>
        <p className="text-gray-400 text-xs mb-4">Upload a short clip (max 8 MB) or paste a YouTube / Google Drive link.</p>

        {videos.map(v => (
          <div key={v.tempId} className="flex items-center gap-3 mb-3 p-3 bg-gray-50 border border-gray-200 rounded-xl">
            {v.kind === "file" ? (
              <>
                <Video size={18} className="text-gray-400 shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-gray-700 truncate">{v.file?.name}</p>
                  {v.uploading && <p className="text-xs text-yellow-600 flex items-center gap-1"><Loader2 size={10} className="animate-spin" /> Uploading…</p>}
                  {v.uploadedId && <p className="text-xs text-green-600 flex items-center gap-1"><CheckCircle size={10} /> Uploaded</p>}
                  {v.error && <p className="text-xs text-red-500">{v.error}</p>}
                </div>
              </>
            ) : (
              <>
                <LinkIcon size={18} className="text-gray-400 shrink-0" />
                <label className="sr-only" htmlFor={`submission-video-url-${v.tempId}`}>Video URL</label>
                <input id={`submission-video-url-${v.tempId}`} value={v.url} onChange={e => setVideoUrl(v.tempId, e.target.value)}
                  className={`${inp} flex-1`} placeholder="https://youtube.com/... or Google Drive link" />
              </>
            )}
            <button type="button" onClick={() => removeVideo(v.tempId)} className="text-gray-400 hover:text-red-500 transition-colors shrink-0">
              <X size={16} />
            </button>
          </div>
        ))}

        {videos.length < 2 && (
          <div className="flex gap-3">
            <button type="button" onClick={() => videoRef.current?.click()}
              className="flex items-center gap-2 text-sm px-4 py-2 rounded-lg border border-gray-300 text-gray-600 hover:border-yellow-400 hover:text-gray-900 transition-all">
              <Upload size={14} /> Upload video
            </button>
            <button type="button" onClick={addVideoUrl}
              className="flex items-center gap-2 text-sm px-4 py-2 rounded-lg border border-gray-300 text-gray-600 hover:border-yellow-400 hover:text-gray-900 transition-all">
              <LinkIcon size={14} /> Paste link
            </button>
            <input ref={videoRef} type="file" accept="video/*" className="hidden"
              onChange={e => { if (e.target.files?.[0]) { addVideoFile(e.target.files[0]); e.target.value = ""; } }} />
          </div>
        )}
      </div>

      {/* Documents */}
      <div className={sec}>
        <h3 className={secTitle}>
          <span className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold text-black shrink-0" style={{ background: "#C9A24B" }}>6</span>
          Property Documents <span className="text-gray-400 text-xs font-normal">(optional)</span>
        </h3>
        <p className="text-gray-500 text-xs mb-4 bg-blue-50 border border-blue-100 rounded-lg p-3">
          Uploading documents helps us verify faster and list sooner. All documents are kept <strong>confidential</strong> and used only for verification — never shown publicly.
        </p>
        <div className="space-y-2.5">
          {docs.map(doc => {
            const docRef = { current: null as HTMLInputElement | null };
            return (
              <div key={doc.docType} className="flex items-center gap-3 p-3 bg-gray-50 border border-gray-100 rounded-xl">
                <FileText size={15} className="text-gray-400 shrink-0" />
                <span className="text-sm text-gray-700 flex-1 min-w-0 truncate">{doc.docType}</span>

                {doc.uploadedId ? (
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="text-xs text-green-600 flex items-center gap-1">
                      <CheckCircle size={11} /> {doc.file?.name ?? "Uploaded"}
                    </span>
                    <button type="button" onClick={() => removeDoc(doc.docType)} className="text-gray-400 hover:text-red-500"><X size={13} /></button>
                  </div>
                ) : doc.uploading ? (
                  <span className="text-xs text-yellow-600 flex items-center gap-1 shrink-0"><Loader2 size={11} className="animate-spin" />Uploading…</span>
                ) : doc.error ? (
                  <span className="text-xs text-red-500 shrink-0">{doc.error}</span>
                ) : (
                  <label className="shrink-0 cursor-pointer">
                    <span className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg border border-gray-300 text-gray-600 hover:border-yellow-400 hover:text-gray-900 transition-all">
                      <Plus size={11} /> Upload
                    </span>
                    <input type="file" accept=".pdf,.jpg,.jpeg,.png" className="hidden"
                      ref={el => { docRef.current = el; }}
                      onChange={e => { if (e.target.files?.[0]) { uploadDoc(doc.docType, e.target.files[0]); e.target.value = ""; } }} />
                  </label>
                )}
              </div>
            );
          })}
        </div>
        <p className="text-gray-400 text-[11px] mt-3">
          {docs.filter(d => d.uploadedId).length} / {docs.length} documents uploaded
        </p>
      </div>

      {/* Contact */}
      <div className={sec}>
        <h3 className={secTitle}>
          <span className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold text-black shrink-0" style={{ background: "#C9A24B" }}>7</span>
          Your Contact Details
        </h3>
        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <label className={lbl} htmlFor="submission-owner-name">Full Name *</label>
            <input id="submission-owner-name" required value={form.ownerName} onChange={e => setF("ownerName", e.target.value)}
              className={inp} placeholder="Your name" />
          </div>
          <div>
            <label className={lbl} htmlFor="submission-owner-phone">Phone Number *</label>
            <input id="submission-owner-phone" required value={form.ownerPhone} onChange={e => setF("ownerPhone", e.target.value)}
              className={inp} placeholder="+91 99999 99999" type="tel" />
          </div>
          <div className="sm:col-span-2">
            <label className={lbl} htmlFor="submission-owner-email">Email Address *</label>
            <input id="submission-owner-email" required value={form.ownerEmail} onChange={e => setF("ownerEmail", e.target.value)}
              className={inp} placeholder="you@example.com" type="email" />
          </div>
        </div>
      </div>

      {/* Notice */}
      <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4 mb-6 text-sm text-yellow-800">
        Your property will be reviewed by our team and listed after verification (we list only genuine, owner-verified properties).
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 mb-4 text-sm text-red-700">
          {error}
        </div>
      )}

      <button
        type="submit"
        disabled={submitting || photos.some(p => p.uploading) || docs.some(d => d.uploading)}
        className="w-full py-4 rounded-xl font-bold text-black text-base transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
        style={{ background: "#C9A24B" }}
      >
        {submitting ? <><Loader2 size={18} className="animate-spin" /> Submitting…</> : "Submit Property for Review"}
      </button>
    </form>
  );
}
