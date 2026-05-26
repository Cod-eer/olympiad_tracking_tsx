import { Loader2 } from "lucide-react";

export default function LoadingOverlay() {
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/35 backdrop-blur-[2px]">
      <div className="surface flex items-center gap-3 px-4 py-3"><Loader2 className="h-5 w-5 animate-spin" /><span className="text-sm">Processing…</span></div>
    </div>
  );
}
