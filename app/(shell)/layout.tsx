import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { ShellProviders } from "@/components/providers/shell-providers";
import { ShellChrome } from "@/components/shell/shell-chrome";

export default async function ShellLayout({ children }: { children: React.ReactNode }) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) redirect("/login");
  return (
    <ShellProviders>
      <ShellChrome>{children}</ShellChrome>
    </ShellProviders>
  );
}
