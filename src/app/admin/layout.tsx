import type { ReactNode } from "react";
import { AdminShell } from "@/components/admin/admin-shell";

/** Platform back-office: reachable on the platform host only (proxy.ts), for super-admins (src/lib/api/admin.ts). */
export default function AdminLayout({ children }: { children: ReactNode }) {
  return <AdminShell>{children}</AdminShell>;
}
