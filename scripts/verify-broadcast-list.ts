/**
 * Smoke: list every broadcast recipient and prove we get more than 10.
 * Does not send mail.
 *
 *   npx tsx scripts/verify-broadcast-list.ts
 */
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
  const { listBroadcastRecipientsRest, filterBroadcastRecipients } =
    await import("../apps/web/src/lib/firestore-rest");
  const listed = await listBroadcastRecipientsRest();
  const everyone = filterBroadcastRecipients(listed.recipients, "everyone");
  console.log(
    JSON.stringify(
      {
        scannedDocs: listed.scannedDocs,
        recipients: listed.recipients.length,
        everyone: everyone.length,
        first10: everyone.slice(0, 10).map((r) => r.email),
        last5: everyone.slice(-5).map((r) => r.email),
      },
      null,
      2,
    ),
  );
  if (listed.scannedDocs <= 10 && listed.recipients.length <= 10) {
    console.warn(
      "WARNING: only <=10 docs scanned — either the project is tiny or pagination still broken",
    );
  } else {
    console.log("OK: listing walked past a 10-doc cap");
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
