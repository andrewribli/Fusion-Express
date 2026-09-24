"use client";

import Link from "next/link";
import { AppLogo } from "@/components/AppLogo";
import { LegalLink } from "@/components/LegalLink";

/**
 * Marketing homepage for signed-out visitors.
 * Signed-in users never see this — they land on the channel menu.
 */
export function MarketingHome() {
  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white">
      <header className="sticky top-0 z-40 border-b border-white/10 bg-[#0a0a0a]/90 backdrop-blur-md">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-3 px-4 py-3">
          <Link href="/" className="flex items-center gap-2" aria-label="GraceRun home">
            <AppLogo size={40} className="h-10 w-10" />
            <span className="text-sm font-extrabold tracking-tight">GraceRun</span>
          </Link>
          <div className="flex items-center gap-2">
            <Link
              href="/login"
              className="rounded-full px-3 py-2 text-sm font-semibold text-zinc-300 hover:text-white"
            >
              Sign in
            </Link>
            <Link
              href="/login?mode=signup"
              className="rounded-full bg-[#ED1C24] px-4 py-2 text-sm font-bold text-white hover:bg-[#c9171e]"
            >
              Get Started
            </Link>
          </div>
        </div>
      </header>

      {/* Hero — one composition: brand, headline, support, CTAs */}
      <section className="relative overflow-hidden border-b border-white/10">
        <div
          className="pointer-events-none absolute inset-0"
          style={{
            background:
              "radial-gradient(ellipse 80% 60% at 50% -10%, rgba(237,28,36,0.28), transparent 55%), linear-gradient(180deg, #121212 0%, #0a0a0a 100%)",
          }}
          aria-hidden
        />
        <div className="relative mx-auto flex min-h-[min(88vh,720px)] max-w-5xl flex-col justify-center px-4 pb-16 pt-14 sm:pt-20">
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[#ED1C24]">
            GraceRun
          </p>
          <h1 className="mt-4 max-w-3xl text-4xl font-extrabold leading-[1.08] tracking-tight sm:text-5xl md:text-6xl">
            Groceries and canteen food, delivered to your dorm lobby.
          </h1>
          <p className="mt-5 max-w-xl text-lg text-zinc-400 sm:text-xl">
            No hill. No queue. Just food.
          </p>
          <div className="mt-8 flex flex-wrap items-center gap-3">
            <Link
              href="/cuhk"
              className="inline-flex min-h-12 items-center justify-center rounded-full bg-[#ED1C24] px-7 text-base font-bold text-white shadow-lg shadow-[#ED1C24]/25 hover:bg-[#c9171e]"
            >
              CUHK
            </Link>
            <Link
              href="/cityu"
              className="inline-flex min-h-12 items-center justify-center rounded-full border border-white/20 bg-white/5 px-7 text-base font-bold text-white hover:bg-white/10"
            >
              CityU
            </Link>
            <Link
              href="/login?mode=signup"
              className="inline-flex min-h-12 items-center justify-center px-3 text-sm font-semibold text-zinc-400 underline-offset-4 hover:text-white hover:underline"
            >
              Create account
            </Link>
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="mx-auto max-w-5xl px-4 py-16 sm:py-20">
        <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">
          How it works
        </h2>
        <p className="mt-2 max-w-lg text-sm text-zinc-400">
          Three steps from cart to lobby.
        </p>
        <ol className="mt-10 grid gap-8 sm:grid-cols-3">
          {[
            {
              n: "1",
              title: "Pick your items",
              body: "Shop Fusion or Taste groceries, or order from a campus canteen.",
              icon: (
                <path
                  d="M4 7h16M6 7l1.5 11h9L18 7M9 7V5a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                />
              ),
            },
            {
              n: "2",
              title: "A student runner picks them up",
              body: "A verified classmate accepts your order and shops or collects it.",
              icon: (
                <path
                  d="M12 12a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7ZM5 20a7 7 0 0 1 14 0"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                />
              ),
            },
            {
              n: "3",
              title: "Delivered to your lobby. Pay after delivery.",
              body: "Meet them downstairs. You only pay once the food is in your hands.",
              icon: (
                <path
                  d="M3 10h18M5 10V8l2-3h10l2 3v2M7 14h.01M17 14h.01M6 18h12"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                />
              ),
            },
          ].map((step) => (
            <li key={step.n} className="relative">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#ED1C24]/15 text-[#ED1C24]">
                <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" aria-hidden>
                  {step.icon}
                </svg>
              </div>
              <p className="mt-4 text-xs font-semibold uppercase tracking-wide text-[#ED1C24]">
                Step {step.n}
              </p>
              <h3 className="mt-1 text-lg font-bold">{step.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-zinc-400">
                {step.body}
              </p>
            </li>
          ))}
        </ol>
      </section>

      {/* Why GraceRun */}
      <section className="border-y border-white/10 bg-[#111111]">
        <div className="mx-auto max-w-5xl px-4 py-16 sm:py-20">
          <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">
            Why GraceRun
          </h2>
          <ul className="mt-10 grid gap-6 sm:grid-cols-3">
            {[
              {
                title: "Built by students, for students",
                body: "Campus runners who know the hills, halls, and lobbies.",
              },
              {
                title: "No minimum order",
                body: "One snack or a full shop — same flat canteen fee, zone-based grocery delivery.",
              },
              {
                title: "Pay only after you receive your food",
                body: "No prepaid risk. Settle the receipt when delivery is done.",
              },
            ].map((item) => (
              <li key={item.title}>
                <h3 className="text-lg font-bold text-white">{item.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-zinc-400">
                  {item.body}
                </p>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* Two services */}
      <section className="mx-auto max-w-5xl px-4 py-16 sm:py-20">
        <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">
          Two ways to order
        </h2>
        <p className="mt-2 text-sm text-zinc-400">
          Same runners. Same lobby drop-off.
        </p>
        <div className="mt-8 grid gap-4 sm:grid-cols-2">
          <div className="rounded-3xl border border-white/10 bg-gradient-to-br from-[#1a1010] to-[#0f0f0f] p-6">
            <p className="text-xs font-semibold uppercase tracking-wide text-[#ED1C24]">
              Groceries
            </p>
            <h3 className="mt-2 text-xl font-bold">Fusion & Taste</h3>
            <p className="mt-2 text-sm leading-relaxed text-zinc-400">
              From Fusion (CUHK) or Taste (CityU) to your dorm lobby.
            </p>
          </div>
          <div className="rounded-3xl border border-white/10 bg-gradient-to-br from-[#10141a] to-[#0f0f0f] p-6">
            <p className="text-xs font-semibold uppercase tracking-wide text-emerald-400">
              Canteen
            </p>
            <h3 className="mt-2 text-xl font-bold">Campus food</h3>
            <p className="mt-2 text-sm leading-relaxed text-zinc-400">
              From your campus canteen to your dorm lobby.
            </p>
          </div>
        </div>
      </section>

      {/* Trust */}
      <section className="border-y border-white/10 bg-[#111111]">
        <div className="mx-auto max-w-5xl px-4 py-14">
          <ul className="grid gap-4 sm:grid-cols-3">
            {[
              "Verified student emails only.",
              "Your runner is a fellow student.",
              "Pay after delivery. No risk.",
            ].map((line) => (
              <li
                key={line}
                className="flex gap-3 text-sm font-medium leading-snug text-zinc-200"
              >
                <span className="mt-0.5 text-[#ED1C24]" aria-hidden>
                  ✓
                </span>
                {line}
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* FAQ */}
      <section className="mx-auto max-w-5xl px-4 py-16 sm:py-20">
        <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">FAQ</h2>
        <dl className="mt-8 space-y-6">
          {[
            {
              q: "How does payment work?",
              a: "You pay after delivery — usually via Airwallex on the track page once your order is delivered. No charge until the food arrives.",
            },
            {
              q: "Who delivers my order?",
              a: "A GraceRun student runner on your campus. They pick up groceries or canteen food and bring it to your hall lobby.",
            },
            {
              q: "What if I'm not in my dorm?",
              a: "Delivery is to the hall lobby. Add a note at checkout if you need a short wait or a specific lobby point.",
            },
            {
              q: "Is this available at my campus?",
              a: "GraceRun serves CUHK (Fusion + canteens) and CityU (Taste). Pick your university when you sign up or at guest checkout.",
            },
          ].map((item) => (
            <div key={item.q} className="border-b border-white/10 pb-6">
              <dt className="text-base font-bold text-white">{item.q}</dt>
              <dd className="mt-2 text-sm leading-relaxed text-zinc-400">
                {item.a}
              </dd>
            </div>
          ))}
        </dl>
      </section>

      {/* CTA */}
      <section className="border-t border-white/10 bg-[#120808]">
        <div className="mx-auto max-w-5xl px-4 py-16 text-center sm:py-20">
          <h2 className="text-3xl font-extrabold tracking-tight sm:text-4xl">
            Ready to skip the hill?
          </h2>
          <Link
            href="/login?mode=signup"
            className="mt-8 inline-flex min-h-12 items-center justify-center rounded-full bg-[#ED1C24] px-8 text-base font-bold text-white hover:bg-[#c9171e]"
          >
            Sign Up Now
          </Link>
        </div>
      </section>

      <footer className="border-t border-white/10 bg-[#0a0a0a]">
        <div className="mx-auto flex max-w-5xl flex-col gap-4 px-4 py-10 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-wrap gap-x-4 gap-y-2 text-sm text-zinc-400">
            <LegalLink href="/terms" className="hover:text-white">
              Terms &amp; Conditions
            </LegalLink>
            <LegalLink href="/privacy" className="hover:text-white">
              Privacy Policy
            </LegalLink>
            <a
              href="mailto:hello@gracerun.fit"
              className="hover:text-white"
            >
              Contact
            </a>
          </div>
          <p className="text-xs text-zinc-500">© GraceRun 2026</p>
        </div>
      </footer>
    </div>
  );
}
