import { useLocale } from "../i18n/LocaleProvider.js";
import type { Dictionary } from "../i18n/en.js";

export function PipelineIcon({ kind }: { kind: number }) {
  return <svg viewBox="0 0 32 32" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    {kind === 0 ? <path d="m18 3-13 16h10l-2 10 14-17H17z" /> : <><circle cx="9" cy="6" r="3" /><circle cx="24" cy="9" r="3" /><circle cx="9" cy="26" r="3" /><path d="M9 9v14m15-11c0 8-15 4-15 11" /></>}
  </svg>;
}

type ArtLabels = [keyof Dictionary, keyof Dictionary, "diagram" | "document" | "device" | "audio" | "code"];
const concepts: Record<string, ArtLabels> = {
  mermaid: ["art_words", "art_diagram", "diagram"],
  "pdf-js": ["art_scan", "art_search", "document"],
  scrcpy: ["art_phone", "art_desktop", "device"],
  "tesseract-js": ["art_pixels", "art_text", "document"],
  localsend: ["art_phone", "art_laptop", "device"],
  whisperx: ["art_speech", "art_subtitles", "audio"],
  immich: ["art_photos", "art_library", "document"],
  ollama: ["art_prompt", "art_response", "code"],
};

export function CampaignArt({ slug, name }: { slug: string; name: string }) {
  const { text } = useLocale();
  const [input, output, kind] = concepts[slug] ?? ["art_code", "art_change", "code"];
  return <div className={`art art-${slug} art-concept-${kind}`} aria-hidden="true">
    <span className="art-category">{text[output]}</span>
    <div className="art-flow"><span>{text[input]}</span><i>→</i><div className="art-engine">
      <svg viewBox="0 0 48 48" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
        {kind === "diagram" ? <><rect x="7" y="6" width="15" height="14" rx="3" /><rect x="27" y="29" width="14" height="13" rx="3" /><path d="M15 20v15h12" /></> : kind === "document" ? <><path d="M28 5H13a4 4 0 0 0-4 4v29a4 4 0 0 0 4 4h22a4 4 0 0 0 4-4V16z" /><path d="M28 5v12h11M16 31h10M16 36h16" /><circle cx="22" cy="23" r="5" /><path d="m26 27 5 5" /></> : kind === "device" ? <><rect x="5" y="8" width="28" height="21" rx="3" /><rect x="29" y="21" width="13" height="22" rx="3" /><path d="M12 37h14m-7-8v8" /></> : kind === "audio" ? <><path d="M7 20v8m7-15v22m7-28v34m7-29v24m7-17v10m7-6v2" /></> : <><path d="m17 12-12 12 12 12m14-24 12 12-12 12m-4-29-6 34" /></>}
      </svg>
    </div><i>→</i><span>{text[output]}</span></div>
    <strong>{name}</strong>
  </div>;
}
