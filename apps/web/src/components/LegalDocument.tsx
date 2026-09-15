import type { LegalSection } from "@/data/legal";
import { LEGAL_UPDATED } from "@/data/legal";
import { LegalLink } from "@/components/LegalLink";

function SectionBlock({ section }: { section: LegalSection }) {
  return (
    <section id={section.id} className="scroll-mt-24">
      <h2 className="text-base font-bold text-[#ED1C24]">{section.title}</h2>
      <div className="mt-3 space-y-3 text-sm leading-relaxed text-gray-700">
        {section.paragraphs.map((p) => (
          <p key={p}>{p}</p>
        ))}
        {section.bullets && (
          <ul className="list-disc space-y-1.5 pl-5">
            {section.bullets.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}

export function LegalDocument({
  title,
  intro,
  groups,
}: {
  title: string;
  intro: string;
  groups: { heading: string; sections: LegalSection[] }[];
}) {
  return (
    <article className="rounded-2xl bg-white p-5 shadow-sm sm:p-8">
      <p className="text-xs font-semibold uppercase tracking-wide text-[#ED1C24]">
        GraceRun
      </p>
      <h1 className="mt-1 text-2xl font-bold text-gray-900">{title}</h1>
      <p className="mt-2 text-sm text-gray-500">Last updated {LEGAL_UPDATED}</p>
      <p className="mt-4 text-sm leading-relaxed text-gray-700">{intro}</p>

      <nav
        aria-label="On this page"
        className="mt-6 rounded-xl border border-gray-100 bg-gray-50 px-4 py-3"
      >
        <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
          Contents
        </p>
        <ol className="mt-2 space-y-1 text-sm">
          {groups.flatMap((group) =>
            group.sections.map((section) => (
              <li key={section.id}>
                <a
                  href={`#${section.id}`}
                  className="text-[#ED1C24] underline-offset-2 hover:underline"
                >
                  {section.title}
                </a>
              </li>
            )),
          )}
        </ol>
      </nav>

      {groups.map((group) => (
        <div key={group.heading} className="mt-10">
          <h2 className="border-b border-gray-100 pb-2 text-lg font-bold text-gray-900">
            {group.heading}
          </h2>
          <div className="mt-6 space-y-8">
            {group.sections.map((section) => (
              <SectionBlock key={section.id} section={section} />
            ))}
          </div>
        </div>
      ))}

      <p className="mt-10 text-sm text-gray-600">
        Related:{" "}
        <LegalLink href="/terms">Terms &amp; Conditions</LegalLink>
        {" · "}
        <LegalLink href="/privacy">Privacy Policy</LegalLink>
      </p>
    </article>
  );
}
