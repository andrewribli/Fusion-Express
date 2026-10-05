import type { NavTab } from "@/lib/nav";

export function NavIcon({
  id,
  className = "h-6 w-6",
}: {
  id: NavTab["iconId"];
  className?: string;
}) {
  const common = {
    viewBox: "0 0 24 24",
    className,
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 2,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    "aria-hidden": true as const,
  };

  switch (id) {
    case "home":
      return (
        <svg {...common}>
          <path d="M4 10.5 12 4l8 6.5V20a1 1 0 0 1-1 1h-5v-6H10v6H5a1 1 0 0 1-1-1v-9.5Z" />
        </svg>
      );
    case "track":
    case "orders":
      return (
        <svg {...common}>
          <path d="M12 3v10" />
          <path d="m8 9 4 4 4-4" />
          <path d="M5 17h14" />
          <path d="M7 21h10" />
        </svg>
      );
    case "cart":
      return (
        <svg {...common}>
          <path d="M3 5h2l2.2 10.2a2 2 0 0 0 2 1.6h7.6a2 2 0 0 0 2-1.5L21 8H7" />
          <circle cx="10" cy="20" r="1.2" fill="currentColor" stroke="none" />
          <circle cx="17" cy="20" r="1.2" fill="currentColor" stroke="none" />
        </svg>
      );
    case "profile":
      return (
        <svg {...common}>
          <circle cx="12" cy="8" r="3.5" />
          <path d="M5 19.5c1.8-3.2 4.2-4.5 7-4.5s5.2 1.3 7 4.5" />
        </svg>
      );
    case "available":
      return (
        <svg {...common}>
          <circle cx="12" cy="12" r="8" />
          <path d="M12 8v4l2.5 1.5" />
        </svg>
      );
    case "deliveries":
      return (
        <svg {...common}>
          <path d="M3 7h13v10H3z" />
          <path d="M16 10h3l2 3v4h-5" />
          <circle cx="7" cy="19" r="1.5" />
          <circle cx="18" cy="19" r="1.5" />
        </svg>
      );
    case "runner":
      return (
        <svg {...common}>
          <circle cx="14" cy="5" r="2.25" />
          <path d="M8 11.5 11 9.5l2.5 1.5L12 15l3 2.5" />
          <path d="m13.5 11 3-1.5 2 3" />
          <path d="M11 15.5 8.5 20" />
          <path d="m15 17.5 1.5 3.5" />
        </svg>
      );
    default:
      return (
        <svg {...common}>
          <circle cx="12" cy="12" r="8" />
        </svg>
      );
  }
}
