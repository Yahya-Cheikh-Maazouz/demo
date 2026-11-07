import { redirect } from "next/navigation";

/** Booking now happens on the planning page (week grid of the referent instructor). */
export default function BookLessonPage() {
  redirect("/eleve/planning#reserver");
}
