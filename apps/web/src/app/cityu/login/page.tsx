import { redirect } from "next/navigation";

/**
 * CityU sign-in is the shared /login form. This route only forwards so a
 * blank client page cannot sit here with no button.
 */
export default async function CityULoginRedirect({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const nextRaw = params.next;
  const next = Array.isArray(nextRaw) ? nextRaw[0] : nextRaw;
  const modeRaw = params.mode;
  const mode = Array.isArray(modeRaw) ? modeRaw[0] : modeRaw;

  const query = new URLSearchParams();
  if (mode === "signup") query.set("mode", "signup");
  if (next === "/runner/register") query.set("next", "/cityu/runner/register");
  else if (next === "/checkout") query.set("next", "/cityu/checkout");
  else if (next && next.startsWith("/") && !next.startsWith("//")) {
    query.set("next", next);
  }

  const suffix = query.toString();
  redirect(suffix ? `/login?${suffix}` : "/login");
}
