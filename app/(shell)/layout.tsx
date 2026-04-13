import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { ShellChrome } from "@/components/shell/shell-chrome";

export default async function ShellLayout({ children }: { children: React.ReactNode }) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) redirect("/login");
  return <ShellChrome>{children}</ShellChrome>;
}
