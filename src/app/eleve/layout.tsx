import { StudentShell } from "@/components/eleve/student-shell";

export default function StudentLayout({ children }: LayoutProps<"/eleve">) {
  return <StudentShell>{children}</StudentShell>;
}
