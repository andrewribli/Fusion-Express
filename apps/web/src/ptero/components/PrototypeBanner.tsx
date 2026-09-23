import { CAMPUS } from "@/ptero/config/campus";

export function PrototypeBanner() {
  return (
    <div className="bg-[#111827] px-3 py-1.5 text-center text-[11px] font-medium text-white">
      {CAMPUS.brandName} prototype · dummy {CAMPUS.supermarket} catalog · campus:{" "}
      <span className="font-mono text-[#ED1C24]">{CAMPUS.id}</span>
    </div>
  );
}
