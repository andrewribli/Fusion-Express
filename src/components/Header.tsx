import Link from "next/link";
import Image from "next/image";

export function Header() {
  return (
    <header className="sticky top-0 z-40 border-b border-gray-100 bg-white/95 shadow-sm backdrop-blur">
      <div className="mx-auto flex max-w-[480px] items-center justify-between px-4 py-3">
        <Link href="/" className="flex items-center gap-2.5">
          <Image
            src="https://upload.wikimedia.org/wikipedia/commons/9/9a/Fusion_logo.svg"
            alt="Fusion"
            width={36}
            height={36}
            className="h-9 w-9 object-contain"
          />
          <div>
            <p className="text-sm font-bold leading-tight text-gray-900">
              Fusion Express
            </p>
            <p className="text-xs text-gray-500">CUHK dorm delivery</p>
          </div>
        </Link>
        <nav className="flex items-center gap-3 text-xs font-medium">
          <Link href="/track" className="text-gray-600 hover:text-fusion-red">
            Track
          </Link>
          <Link href="/runner" className="text-gray-600 hover:text-fusion-red">
            Runner
          </Link>
        </nav>
      </div>
    </header>
  );
}
