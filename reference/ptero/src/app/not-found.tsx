import Link from "next/link";
import { CAMPUS } from "@/config/campus";

export default function NotFound() {
  return (
    <main className="mx-auto max-w-[480px] px-4 py-16 text-center">
      <h1 className="text-lg font-bold">{CAMPUS.brandName}</h1>
      <p className="mt-2 text-sm text-gray-600">That page is not in this prototype.</p>
      <Link href="/" className="mt-4 inline-block text-sm font-semibold text-[#ED1C24]">
        Back to shop
      </Link>
    </main>
  );
}
