import type { ReactNode } from "react";
import { CircleCheck, CircleMinus } from "lucide-react";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { RevealValue } from "@/components/ui/reveal-value";
import { NephValue } from "@/features/profil/neph-value";
import { ageAt, initials, maskEmail, maskPhone } from "@/lib/format";
import type { StudentProfile } from "@/lib/types";
import { ArchiveButton } from "./archive-button";

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="border-t border-line px-5 py-4 sm:px-6">
      <h3 className="mb-3 text-xs font-bold tracking-wide text-ink-subtle uppercase">{title}</h3>
      {children}
    </section>
  );
}

function Row({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-4 py-1.5">
      <dt className="shrink-0 text-sm text-ink-subtle">{label}</dt>
      <dd className="text-right text-sm font-semibold text-ink">{children}</dd>
    </div>
  );
}

const NOT_SET = <span className="font-medium text-ink-subtle italic">Non renseigné</span>;

/**
 * "Informations générales" panel of the staff student file (layout from the school's brief).
 * NEPH, phone, e-mail and address are masked by default.
 */
export function GeneralInfo({ profile, now, canManage }: { profile: StudentProfile; now: string; canManage: boolean }) {
  const phoneHref = `tel:${profile.phone.replace(/\s/g, "")}`;
  return (
    <Card className="overflow-hidden">
      <div className="flex flex-col items-center gap-3 bg-brand-soft/60 px-6 pt-6 pb-5 text-center">
        <span className="rounded-full bg-surface p-1 shadow-card">
          <Avatar initials={initials(profile.firstName, profile.lastName)} size="lg" />
        </span>
        <div>
          <h2 className="text-xl font-bold text-ink">
            {profile.firstName} {profile.lastName}
          </h2>
          <div className="mt-2 flex flex-wrap justify-center gap-1.5">
            {profile.archived ? (
              <Badge icon={CircleMinus}>Archivé</Badge>
            ) : (
              <Badge tone="success" icon={CircleCheck}>
                Dossier actif
              </Badge>
            )}
            {profile.isMinor && <Badge tone="brand">Mineur</Badge>}
          </div>
        </div>
      </div>

      <dl>
        <Section title="Identité et inscription">
          <Row label="NEPH">
            <NephValue neph={profile.neph} />
          </Row>
          <Row label="Genre">{profile.gender}</Row>
          <Row label="Âge">{ageAt(profile.birthDate, now)} ans</Row>
          <Row label="Type">{profile.studentType}</Row>
          <Row label="Financeur">{profile.financer}</Row>
          <Row label="Bureau">{profile.office}</Row>
          <Row label="Permis">{profile.licence}</Row>
          <Row label="Formation accélérée">{profile.accelerated ? "Oui" : "Non"}</Row>
          <Row label="Adresse">
            <RevealValue
              value={profile.address.line1}
              masked="Adresse masquée"
              maskedLabel="adresse masquée"
              noun="l'adresse"
            />
            <span className="block font-medium text-ink-muted">
              {profile.address.postalCode} {profile.address.city}
            </span>
          </Row>
          <Row label="Lieu de naissance">{profile.birthPlace ?? <span className="font-medium text-ink-subtle italic">À renseigner</span>}</Row>
        </Section>

        <Section title="Contact">
          <Row label="Téléphone">
            <RevealValue
              value={
                <a href={phoneHref} className="text-brand underline-offset-2 hover:underline">
                  {profile.phone}
                </a>
              }
              masked={maskPhone(profile.phone)}
              maskedLabel={`masqué, se termine par ${profile.phone.replace(/\D/g, "").slice(-2)}`}
              noun="le téléphone"
            />
          </Row>
          <Row label="Téléphone secondaire">{profile.phoneSecondary ?? NOT_SET}</Row>
          <Row label="E-mail">
            <RevealValue
              value={
                <a href={`mailto:${profile.email}`} className="break-all text-brand underline-offset-2 hover:underline">
                  {profile.email}
                </a>
              }
              masked={maskEmail(profile.email)}
              maskedLabel="adresse e-mail masquée"
              noun="l'e-mail"
            />
          </Row>
        </Section>

        <Section title="Représentant légal">
          {profile.legalGuardian ? (
            <div className="space-y-1 text-sm">
              <p className="font-semibold text-ink">{profile.legalGuardian.name}</p>
              <p className="text-ink-muted">{profile.legalGuardian.phone}</p>
              <p className="break-all text-ink-muted">{profile.legalGuardian.email}</p>
            </div>
          ) : (
            <p className="rounded-xl bg-subtle px-3 py-2.5 text-sm text-ink-muted">Non concerné · élève majeur</p>
          )}
        </Section>

        <Section title="Moniteur référent">
          <div className="flex items-center gap-3">
            <Avatar initials={initials(profile.referentInstructor.firstName, profile.referentInstructor.lastName)} />
            <div>
              <p className="font-semibold text-ink">
                {profile.referentInstructor.firstName} {profile.referentInstructor.lastName}
              </p>
              <p className="text-sm text-ink-muted">Référent·e pédagogique</p>
            </div>
          </div>
          <Row label="Réservation limitée au référent">{profile.restrictedToReferent ? "Oui" : "Non"}</Row>
        </Section>

        <Section title="Disponibilités">
          {profile.availabilities.length === 0 ? (
            <p className="text-sm text-ink-subtle">Non renseignées</p>
          ) : (
            <ul className="space-y-1.5">
              {profile.availabilities.map((a) => (
                <li key={`${a.day}-${a.from}`} className="flex justify-between rounded-xl bg-subtle px-3 py-2 text-sm">
                  <span className="font-semibold text-ink">{a.day}</span>
                  <span className="text-ink-muted tabular-nums">
                    {a.from} – {a.to}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </Section>
      </dl>

      {canManage && (
        <div className="flex justify-center border-t border-line px-5 py-4">
          <ArchiveButton studentId={profile.id} archived={profile.archived} name={`${profile.firstName} ${profile.lastName}`} />
        </div>
      )}
    </Card>
  );
}
