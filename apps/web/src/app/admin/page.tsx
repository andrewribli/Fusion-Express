import { redirect } from "next/navigation";

/** `/admin` hub — user management is the primary admin dashboard. */
export default function AdminIndexPage() {
  redirect("/admin/users");
}
