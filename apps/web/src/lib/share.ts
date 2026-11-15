export const GRACERUN_SHARE_URL = "https://www.gracerun.fit";
export const GRACERUN_SHARE_TEXT =
  "GraceRun — groceries delivered to your CUHK hall lobby.";

export async function shareGraceRun(): Promise<"shared" | "copied"> {
  if (typeof navigator !== "undefined" && typeof navigator.share === "function") {
    await navigator.share({
      title: "GraceRun",
      text: GRACERUN_SHARE_TEXT,
      url: GRACERUN_SHARE_URL,
    });
    return "shared";
  }
  await navigator.clipboard.writeText(`${GRACERUN_SHARE_TEXT} ${GRACERUN_SHARE_URL}`);
  return "copied";
}
