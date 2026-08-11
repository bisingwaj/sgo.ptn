"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useOrganisation } from "@/components/profile/OrganisationContext";
import { useToast } from "@/components/toast/ToastContext";
import { Field, Input, Textarea } from "@/components/wizard/WizardFields";
import { DropdownPicker } from "@/components/ui/DropdownPicker";
import {
  CheckmarkFilled,
  WarningAltFilled,
  Locked,
  Information,
  Earth,
  Phone,
  Email,
  Save,
  Reset,
} from "@carbon/icons-react";
import styles from "./edit.module.scss";

const STATUTS = [
  {
    value: "EPA",
    label: "Établissement public à caractère administratif",
    sub: "EPA",
  },
  {
    value: "EPIC",
    label: "Établissement public à caractère industriel et commercial",
    sub: "EPIC",
  },
  { value: "ASBL", label: "Association sans but lucratif", sub: "ASBL · Loi 2001" },
  { value: "ONG", label: "ONG internationale", sub: "ONG" },
  { value: "MIN", label: "Ministère / direction centrale", sub: "Administration centrale" },
  { value: "AUTRE", label: "Autre", sub: "Autre forme" },
];

const PROVINCES = [
  { value: "kinshasa", label: "Kinshasa", sub: "Capitale" },
  { value: "kongo-central", label: "Kongo-Central", sub: "Sud-Ouest" },
  { value: "haut-katanga", label: "Haut-Katanga", sub: "Lubumbashi" },
  { value: "lualaba", label: "Lualaba", sub: "Kolwezi" },
  { value: "haut-uele", label: "Haut-Uélé", sub: "Nord-Est" },
  { value: "ituri", label: "Ituri", sub: "Bunia" },
  { value: "nord-kivu", label: "Nord-Kivu", sub: "Goma" },
  { value: "sud-kivu", label: "Sud-Kivu", sub: "Bukavu" },
  { value: "maniema", label: "Maniema", sub: "Kindu" },
  { value: "tshopo", label: "Tshopo", sub: "Kisangani" },
  { value: "tshuapa", label: "Tshuapa", sub: "Centre-Ouest" },
  { value: "kasai", label: "Kasaï", sub: "Tshikapa" },
  { value: "kasai-central", label: "Kasaï Central", sub: "Kananga" },
  { value: "kasai-oriental", label: "Kasaï Oriental", sub: "Mbuji-Mayi" },
  { value: "lomami", label: "Lomami", sub: "Kabinda" },
  { value: "sankuru", label: "Sankuru", sub: "Lusambo" },
  { value: "haut-lomami", label: "Haut-Lomami", sub: "Kamina" },
  { value: "tanganyika", label: "Tanganyika", sub: "Kalemie" },
  { value: "mai-ndombe", label: "Mai-Ndombe", sub: "Inongo" },
  { value: "kwilu", label: "Kwilu", sub: "Bandundu" },
  { value: "kwango", label: "Kwango", sub: "Kenge" },
  { value: "mongala", label: "Mongala", sub: "Lisala" },
  { value: "nord-ubangi", label: "Nord-Ubangi", sub: "Gbadolite" },
  { value: "sud-ubangi", label: "Sud-Ubangi", sub: "Gemena" },
  { value: "equateur", label: "Équateur", sub: "Mbandaka" },
  { value: "bas-uele", label: "Bas-Uélé", sub: "Buta" },
];

export function EditOrgClient() {
  const router = useRouter();
  const { org, updateOrg, reset } = useOrganisation();
  const { toast } = useToast();

  const [name, setName] = useState(org.name);
  const [fullName, setFullName] = useState(org.fullName);
  const [sigle, setSigle] = useState(org.sigle);
  const [statut, setStatut] = useState("EPA");
  const [tutelle, setTutelle] = useState("Ministère du Numérique (MPTN)");
  const [decret, setDecret] = useState("n° 23-027 du 14 mars 2023");
  const [website, setWebsite] = useState("https://www.anie.gouv.cd");
  const [address, setAddress] = useState(
    "Boulevard du 30 juin, immeuble Cobil, 5e étage",
  );
  const [zipCommune, setZipCommune] = useState("Gombe — Kinshasa");
  const [province, setProvince] = useState("kinshasa");
  const [phone, setPhone] = useState(org.phone);
  const [email, setEmail] = useState(org.email);
  const [description, setDescription] = useState(
    "L'Office National d'Identité (ANIE) est l'institution publique chargée de la conception, du déploiement et de la gestion de la plateforme nationale d'identité numérique de la République Démocratique du Congo.",
  );

  const handleSave = () => {
    updateOrg({
      name,
      fullName,
      sigle,
      province: PROVINCES.find((p) => p.value === province)?.label ?? "Kinshasa",
      phone,
      email,
    });
    toast({
      tone: "success",
      title: "Profil organisation mis à jour",
      message: `Le nom « ${fullName} » est désormais propagé sur l'ensemble de la plateforme.`,
      duration: 5000,
    });
    setTimeout(() => router.push("/partenaire/organisation"), 200);
  };

  const handleReset = () => {
    reset();
    toast({
      tone: "info",
      title: "Profil réinitialisé",
      message: "Les valeurs par défaut ont été restaurées.",
      duration: 4000,
    });
    setTimeout(() => router.push("/partenaire/organisation"), 200);
  };

  return (
    <>
      <div className={styles.headerRow}>
        <div>
          <div className={styles.eyebrow}>{org.sigle} · MODIFICATION DU PROFIL</div>
          <h1 className={styles.title}>Modifier le profil de l&apos;organisation</h1>
          <p className={styles.subtitle}>
            Le nom et le sigle saisis ici seront affichés partout sur la plateforme (sidenav,
            en-têtes de page, e-mails). Les champs RCCM/NIF déclenchent une re-validation KYC.
          </p>
        </div>
        <div className={styles.actionsRow}>
          <button type="button" className={styles.btnSecondary} onClick={handleReset}>
            <Reset size={14} aria-hidden /> Réinitialiser
          </button>
          <Link href="/partenaire/organisation" className={styles.btnSecondary}>
            Annuler
          </Link>
          <button type="button" className={styles.btnPrimary} onClick={handleSave}>
            <Save size={16} aria-hidden /> Enregistrer
          </button>
        </div>
      </div>

      <div className={styles.layout}>
        <div className={styles.form}>
          <div className={styles.warning}>
            <WarningAltFilled
              size={16}
              aria-hidden
              style={{ color: "var(--ptn-status-warning)", flexShrink: 0, marginTop: 2 }}
            />
            <div>
              <strong>Modification soumise à validation UGP.</strong> Les champs RCCM, NIF et
              représentant légal sont verrouillés MEP §2.4 — toute modification déclenchera une
              re-vérification KYC.
            </div>
          </div>

          <section className={styles.section}>
            <h3 className={styles.sectionH}>
              <Information size={16} aria-hidden /> Identité légale
            </h3>
            <p className={styles.sectionDesc}>
              Le nom court (sigle) sera utilisé partout — assurez-vous qu&apos;il correspond à
              votre identité officielle.
            </p>
            <div className={styles.grid2}>
              <Field label="Sigle / nom court (affiché partout)" required>
                <Input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="ex. ANIE"
                />
              </Field>
              <Field label="Sigle alternatif" helper="Affiché dans le SideNav et les badges">
                <Input
                  value={sigle}
                  onChange={(e) => setSigle(e.target.value)}
                />
              </Field>
              <Field label="Raison sociale complète" required>
                <Input
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                />
              </Field>
              <Field
                label="RCCM"
                required
                helper={
                  <>
                    <Locked size={11} aria-hidden style={{ verticalAlign: "middle" }} /> Verrouillé
                    — modification = re-vérification KYC
                  </>
                }
              >
                <Input defaultValue={org.rccm} disabled />
              </Field>
              <Field
                label="NIF"
                required
                helper={
                  <>
                    <Locked size={11} aria-hidden style={{ verticalAlign: "middle" }} /> Verrouillé
                  </>
                }
              >
                <Input defaultValue={org.nif} disabled />
              </Field>
              <Field label="Statut juridique" required>
                <DropdownPicker
                  options={STATUTS}
                  value={statut}
                  onChange={setStatut}
                  searchable
                  placeholder="Sélectionnez le statut"
                  ariaLabel="Statut juridique"
                />
              </Field>
              <Field label="Tutelle ministérielle" required>
                <Input value={tutelle} onChange={(e) => setTutelle(e.target.value)} />
              </Field>
              <Field label="Décret de création">
                <Input value={decret} onChange={(e) => setDecret(e.target.value)} />
              </Field>
              <Field label="Site web officiel">
                <Input
                  type="url"
                  value={website}
                  onChange={(e) => setWebsite(e.target.value)}
                />
              </Field>
            </div>
          </section>

          <section className={styles.section}>
            <h3 className={styles.sectionH}>
              <Earth size={16} aria-hidden /> Coordonnées
            </h3>
            <div className={styles.grid2}>
              <Field label="Adresse du siège" required>
                <Input value={address} onChange={(e) => setAddress(e.target.value)} />
              </Field>
              <Field label="Commune / quartier">
                <Input
                  value={zipCommune}
                  onChange={(e) => setZipCommune(e.target.value)}
                />
              </Field>
              <Field label="Province" required>
                <DropdownPicker
                  options={PROVINCES}
                  value={province}
                  onChange={setProvince}
                  searchable
                  placeholder="Sélectionnez une province"
                  ariaLabel="Province"
                />
              </Field>
              <Field label="Pays">
                <Input defaultValue="République Démocratique du Congo" disabled />
              </Field>
              <Field
                label="Téléphone institutionnel"
                required
                helper={
                  <>
                    <Phone size={11} aria-hidden style={{ verticalAlign: "middle" }} /> Format E.164
                  </>
                }
              >
                <Input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                />
              </Field>
              <Field
                label="Email institutionnel"
                required
                helper={
                  <>
                    <Email size={11} aria-hidden style={{ verticalAlign: "middle" }} /> Domaine
                    officiel uniquement
                  </>
                }
              >
                <Input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </Field>
            </div>
          </section>

          <section className={styles.section}>
            <h3 className={styles.sectionH}>
              <CheckmarkFilled size={16} aria-hidden /> Description publique
            </h3>
            <p className={styles.sectionDesc}>
              Description visible par l&apos;UGP et les bailleurs lors de l&apos;arbitrage —
              maximum 800 caractères.
            </p>
            <Field label="Mission de l'organisation">
              <Textarea
                rows={5}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                maxLength={800}
              />
            </Field>
          </section>

          <div className={styles.formFooter}>
            <Link href="/partenaire/organisation" className={styles.btnSecondary}>
              Annuler
            </Link>
            <button type="button" className={styles.btnPrimary} onClick={handleSave}>
              <Save size={16} aria-hidden /> Enregistrer les modifications
            </button>
          </div>
        </div>

        <aside className={styles.rail}>
          <section className={styles.railCard}>
            <h4 className={styles.railH}>Aperçu temps réel</h4>
            <p className={styles.railP}>Voici comment votre organisation apparaîtra :</p>
            <div
              style={{
                marginTop: 10,
                padding: "10px 12px",
                background: "var(--cds-layer-accent-01)",
                fontFamily: "var(--font-ibm-plex-mono)",
                fontSize: 11,
              }}
            >
              <div style={{ color: "var(--cds-text-helper)", marginBottom: 6 }}>SIDENAV</div>
              <div style={{ fontSize: 11, color: "var(--cds-text-helper)" }}>PARTENAIRE</div>
              <div style={{ fontSize: 13, fontWeight: 500, color: "var(--cds-text-primary)" }}>
                {fullName || "(nom complet)"}
              </div>
              <div style={{ fontSize: 11, color: "var(--cds-text-helper)" }}>
                {org.ref} · 2025-2029
              </div>
            </div>
            <div
              style={{
                marginTop: 10,
                padding: "10px 12px",
                background: "var(--cds-layer-accent-01)",
                fontFamily: "var(--font-ibm-plex-mono)",
                fontSize: 11,
              }}
            >
              <div style={{ color: "var(--cds-text-helper)", marginBottom: 6 }}>EYEBROW PAGE</div>
              <div
                style={{
                  fontSize: 11,
                  textTransform: "uppercase",
                  letterSpacing: "0.32px",
                  color: "var(--cds-text-helper)",
                }}
              >
                {(name || "ANIE").toUpperCase()} · PARTENAIRE INSTITUTIONNEL
              </div>
            </div>
          </section>

          <section className={styles.railCard}>
            <h4 className={styles.railH}>Ce qui sera re-vérifié</h4>
            <p className={styles.railP}>
              Si vous modifiez l&apos;un des champs verrouillés, votre profil passera en{" "}
              <strong>statut « En revue »</strong> jusqu&apos;à validation par le secrétariat
              UGP — délai indicatif 3 jours ouvrables.
            </p>
            <div className={styles.railList}>
              <div className={styles.railItem}>
                <Locked size={12} aria-hidden style={{ color: "var(--cds-text-helper)" }} /> RCCM
              </div>
              <div className={styles.railItem}>
                <Locked size={12} aria-hidden style={{ color: "var(--cds-text-helper)" }} /> NIF
              </div>
              <div className={styles.railItem}>
                <Locked size={12} aria-hidden style={{ color: "var(--cds-text-helper)" }} /> Statut juridique
              </div>
              <div className={styles.railItem}>
                <Locked size={12} aria-hidden style={{ color: "var(--cds-text-helper)" }} /> Tutelle
              </div>
            </div>
          </section>
        </aside>
      </div>
    </>
  );
}
