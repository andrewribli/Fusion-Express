/**
 * Soft-redirect: /browse/dry/chips → /browse/dry/snacks
 * Chips aisle was merged into Snacks (ParknShop brand snacks).
 */
import { redirect } from "next/navigation";

export default function ChipsRedirectPage() {
  redirect("/browse/dry/snacks");
}
