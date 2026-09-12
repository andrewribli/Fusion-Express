/** Native anchors so Safari (especially iOS) actually opens legal pages. */
export function LegalLink({
  href,
  children,
  className = "font-semibold text-[#ED1C24] underline",
}: {
  href: "/terms" | "/privacy";
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <a href={href} className={className}>
      {children}
    </a>
  );
}
