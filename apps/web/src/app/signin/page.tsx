import { redirect } from "next/navigation";

/** Alias so /signin lands on the same auth screen as /login. */
export default function SignInAliasPage() {
  redirect("/login");
}
