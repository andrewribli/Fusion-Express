/**
 * Integration: temp users/{uid}, send welcome once via same job helpers,
 * assert idempotency. Bypasses server-only by loading through dynamic import
 * after stubbing the package.
 */
import Module from "node:module";

const originalLoad = Module._load;
Module._load = function (request: string, parent: unknown, isMain: boolean) {
  if (request === "server-only") return {};
  return originalLoad(request, parent, isMain);
};

async function main() {
  const { collectionName } = await import("../src/lib/constants");
  const {
    deleteAdminDocumentRest,
    getAdminDocumentRest,
    patchAdminDocumentRest,
  } = await import("../src/lib/firestore-rest");
  const { runWelcomeEmailJob } = await import("../src/lib/welcome-email-job");
  const { WELCOME_EMAIL_SUBJECT } = await import("../src/lib/welcome-email");

  const uid = `welcome_test_${Date.now()}`;
  const email = "hello@gracerun.fit";
  const usersCol = collectionName("users");

  await patchAdminDocumentRest(usersCol, uid, {
    uid,
    email,
    fullName: "Welcome E2E",
    role: "customer",
    isGuest: false,
    isRunner: false,
    campus: "cuhk",
    createdAt: new Date(),
    updatedAt: new Date(),
  });

  try {
    const first = await runWelcomeEmailJob({ uid, authEmail: email });
    console.log("first", first);
    if (first.outcome !== "sent") {
      throw new Error(`expected sent, got ${JSON.stringify(first)}`);
    }

    const doc = await getAdminDocumentRest(usersCol, uid);
    console.log("user fields", {
      welcomeEmailStatus: doc?.welcomeEmailStatus,
      welcomeEmailMessageId: doc?.welcomeEmailMessageId,
      welcomeEmailSentAt: doc?.welcomeEmailSentAt,
    });
    if (doc?.welcomeEmailStatus !== "sent") {
      throw new Error("welcomeEmailStatus not sent");
    }
    if (!doc?.welcomeEmailMessageId) {
      throw new Error("missing welcomeEmailMessageId");
    }
    if (!doc?.welcomeEmailSentAt) {
      throw new Error("missing welcomeEmailSentAt");
    }

    const second = await runWelcomeEmailJob({ uid, authEmail: email });
    console.log("second", second);
    if (second.outcome !== "already_sent") {
      throw new Error(`expected already_sent, got ${JSON.stringify(second)}`);
    }

    console.log(
      JSON.stringify({
        ok: true,
        subject: WELCOME_EMAIL_SUBJECT,
        messageId: doc.welcomeEmailMessageId,
        uid,
      }),
    );
  } finally {
    await deleteAdminDocumentRest(usersCol, uid).catch(() => undefined);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
