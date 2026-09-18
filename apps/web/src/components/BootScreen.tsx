export function BootScreen({ error }: { error?: string | null }) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-[#f3f4f6] px-6 text-center">
      {error ? (
        <>
          <p className="text-base font-semibold text-gray-900">Couldn’t load GraceRun</p>
          <p className="mt-3 max-w-md text-sm text-[#ED1C24]">{error}</p>
        </>
      ) : (
        <p className="text-sm text-gray-500">Loading…</p>
      )}
    </div>
  );
}
