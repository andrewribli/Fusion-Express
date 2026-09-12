"use client";

export function BootScreen({ error }: { error?: string | null }) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-lakers-navy px-6 text-center">
      {error ? (
        <>
          <p className="text-base font-bold text-white">Could not start GraceRun</p>
          <p className="mt-3 max-w-md text-sm text-lakers-gold">{error}</p>
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="mt-5 rounded-xl bg-[#ED1C24] px-5 py-3 text-sm font-semibold text-white"
          >
            Retry
          </button>
        </>
      ) : (
        <p className="text-sm text-lakers-gold">Loading…</p>
      )}
    </div>
  );
}
