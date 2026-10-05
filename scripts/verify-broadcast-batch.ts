import Module from "node:module";

const originalLoad = (Module as unknown as { _load: typeof Module._load })._load;
(Module as unknown as { _load: typeof Module._load })._load = function (
  request: string,
  parent: unknown,
  isMain: boolean,
) {
  if (request === "server-only") return {};
  return originalLoad(request, parent, isMain);
};

async function main() {
  const { sendAdminBroadcastBatch } = await import(
    "../apps/web/src/lib/email"
  );
  // 25 distinct addresses in one Resend batch. Only hello@ is a verified inbox;
  // others may fail individually under permissive validation — that proves
  // one failure does not stop the rest.
  const targets = [
    "hello@gracerun.fit",
    ...Array.from(
      { length: 24 },
      (_, i) => `broadcast-batch-${i + 1}@gracerun.fit`,
    ),
  ];
  const result = await sendAdminBroadcastBatch(
    targets,
    "GraceRun broadcast batch smoke",
    "Batch path check — you can ignore this.",
  );
  console.log(
    JSON.stringify(
      {
        attempted: targets.length,
        sent: result.sent.length,
        failed: result.failed.length,
        helloSent: result.sent.includes("hello@gracerun.fit"),
        sampleFailed: result.failed.slice(0, 3),
      },
      null,
      2,
    ),
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
