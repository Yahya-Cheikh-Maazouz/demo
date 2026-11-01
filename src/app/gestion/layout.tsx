import { StaffShell } from "@/components/gestion/staff-shell";

export default function GestionLayout({ children }: LayoutProps<"/gestion">) {
  return <StaffShell>{children}</StaffShell>;
}
