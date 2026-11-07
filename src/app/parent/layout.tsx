import { ParentShell } from "@/components/parent/parent-shell";

export default function ParentLayout({ children }: LayoutProps<"/parent">) {
  return <ParentShell>{children}</ParentShell>;
}
