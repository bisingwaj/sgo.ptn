"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Field, Input } from "@/components/wizard/WizardFields";
import { DropdownPicker } from "@/components/ui/DropdownPicker";
import { useToast } from "@/components/toast/ToastContext";
import { Save, Reset, Time } from "@carbon/icons-react";
import styles from "./preferences.module.scss";

interface NotifType {
  id: string;
  name: string;
  desc: string;
  inApp: boolean;
  email: boolean;
  sms: boolean;
}

const NOTIF_TYPES: NotifType[] = [
  {
    id: "ano",
    name: "ANO bailleur reçu",
    desc: "ANO favorable ou défavorable de la Banque mondiale ou de l'AFD",
    inApp: true,
    email: true,
    sms: true,
  },
  {
    id: "clarif",
    name: "Demande de clarification UGP",
    desc: "Le coordonnateur ou un référent demande une réponse",
    inApp: true,
    email: true,
    sms: false,
  },
  {
    id: "echeance",
    name: "Échéance imminente (J−3 et J−1)",
    desc: "Rappels avant une date limite (livrable, soumission, signature)",
    inApp: true,
    email: true,
    sms: true,
  },
  {
    id: "ai",
    name: "Suggestion IA disponible",
    desc: "Nouveau brouillon généré ou recommandation contextuelle",
    inApp: true,
    email: false,
    sms: false,
  },
  {
    id: "etape",
    name: "Changement d'étape pipeline",
    desc: "Progression d'une proposition (Brouillon → UGP → PPM → ANO → Exécution)",
    inApp: true,
    email: true,
    sms: false,
  },
  {
    id: "doc",
    name: "Nouveau document partagé",
    desc: "Un membre UGP ou bailleur a téléversé un document",
    inApp: true,
    email: false,
    sms: false,
  },
  {
    id: "mgp",
    name: "Mise à jour plainte MGP",
    desc: "Réponse du référent ou changement de statut sur une plainte ouverte",
    inApp: true,
    email: true,
    sms: false,
  },
  {
    id: "rapport",
    name: "Rapport semestriel",
    desc: "Validation, retour ou rappel de soumission",
    inApp: true,
    email: true,
    sms: false,
  },
  {
    id: "newsletter",
    name: "Newsletter mensuelle PTN-RDC",
    desc: "Synthèse trimestrielle des activités, KPIs et bonnes pratiques",
    inApp: false,
    email: false,
    sms: false,
  },
];

const TZ_OPTIONS = [
  { value: "utc+1", label: "UTC+1 · Kinshasa", sub: "WAT" },
  { value: "utc+2", label: "UTC+2 · Lubumbashi", sub: "CAT" },
  { value: "utc+0", label: "UTC · Londres", sub: "GMT" },
  { value: "utc+2-paris", label: "UTC+2 · Paris", sub: "CEST" },
];

export function PreferencesClient() {
  const router = useRouter();
  const { toast } = useToast();
  const [tz, setTz] = useState("utc+1");
  const [start, setStart] = useState("20:00");
  const [end, setEnd] = useState("07:00");
  const [days, setDays] = useState<Set<string>>(
    new Set(["lun", "mar", "mer", "jeu", "ven"]),
  );
  const [matrix, setMatrix] = useState(NOTIF_TYPES);

  const toggleDay = (id: string) => {
    setDays((cur) => {
      const next = new Set(cur);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleChannel = (id: string, channel: "inApp" | "email" | "sms") => {
    setMatrix((cur) =>
      cur.map((n) => (n.id === id ? { ...n, [channel]: !n[channel] } : n)),
    );
  };

  const handleSave = () => {
    toast({
      tone: "success",
      title: "Préférences enregistrées",
      message: "Vos canaux et heures silencieuses sont à jour.",
      duration: 3500,
    });
    setTimeout(() => router.push("/partenaire/notifications"), 200);
  };

  return (
    <>
      <div className={styles.headerRow}>
        <div>
          <div className={styles.eyebrow}>ANIE · PRÉFÉRENCES NOTIFICATIONS</div>
          <h1 className={styles.title}>Préférences de notifications</h1>
          <p className={styles.subtitle}>
            Configurez les canaux par type d&apos;alerte. Les notifications critiques (ANO,
            échéances) ne peuvent pas être désactivées entièrement.
          </p>
        </div>
        <div className={styles.actionsRow}>
          <button type="button" className={styles.btnSecondary}>
            <Reset size={16} aria-hidden /> Réinitialiser
          </button>
          <button type="button" className={styles.btnPrimary} onClick={handleSave}>
            <Save size={16} aria-hidden /> Enregistrer
          </button>
        </div>
      </div>

      <div className={styles.matrixCard}>
        <div className={styles.matrixHead}>
          <h3 className={styles.matrixH}>Canaux par type d&apos;alerte</h3>
          <p className={styles.matrixDesc}>
            Choisissez les canaux qui vous conviennent. SMS uniquement pour les alertes
            critiques (taxation possible).
          </p>
        </div>
        <table className={styles.matrix}>
          <thead>
            <tr>
              <th>Type d&apos;alerte</th>
              <th className="center">In-app</th>
              <th className="center">Email</th>
              <th className="center">SMS</th>
            </tr>
          </thead>
          <tbody>
            {matrix.map((n) => (
              <tr key={n.id}>
                <td>
                  <div style={{ fontWeight: 500 }}>{n.name}</div>
                  <div className={styles.matrixDesc2}>{n.desc}</div>
                </td>
                <td className="center">
                  <label className={styles.toggle}>
                    <input
                      type="checkbox"
                      checked={n.inApp}
                      onChange={() => toggleChannel(n.id, "inApp")}
                    />
                    <span className={styles.toggleSlider} />
                  </label>
                </td>
                <td className="center">
                  <label className={styles.toggle}>
                    <input
                      type="checkbox"
                      checked={n.email}
                      onChange={() => toggleChannel(n.id, "email")}
                    />
                    <span className={styles.toggleSlider} />
                  </label>
                </td>
                <td className="center">
                  <label className={styles.toggle}>
                    <input
                      type="checkbox"
                      checked={n.sms}
                      onChange={() => toggleChannel(n.id, "sms")}
                    />
                    <span className={styles.toggleSlider} />
                  </label>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className={styles.quietCard}>
        <h3 className={styles.matrixH}>
          <Time size={14} aria-hidden style={{ verticalAlign: "middle", marginRight: 6 }} />
          Heures silencieuses
        </h3>
        <p className={styles.matrixDesc} style={{ marginBottom: 16 }}>
          Pas d&apos;email ni de SMS pendant ces plages — seules les alertes critiques (ANO,
          urgences) restent envoyées.
        </p>
        <div className={styles.quietGrid}>
          <Field label="Début">
            <Input type="time" value={start} onChange={(e) => setStart(e.target.value)} />
          </Field>
          <Field label="Fin">
            <Input type="time" value={end} onChange={(e) => setEnd(e.target.value)} />
          </Field>
          <Field label="Fuseau horaire">
            <DropdownPicker
              value={tz}
              onChange={setTz}
              options={TZ_OPTIONS}
              ariaLabel="Fuseau horaire"
            />
          </Field>
        </div>

        <div style={{ marginTop: 16 }}>
          <Field label="Jours d'application">
            <div className={styles.daysRow}>
              {[
                { id: "lun", label: "Lun" },
                { id: "mar", label: "Mar" },
                { id: "mer", label: "Mer" },
                { id: "jeu", label: "Jeu" },
                { id: "ven", label: "Ven" },
                { id: "sam", label: "Sam" },
                { id: "dim", label: "Dim" },
              ].map((d) => (
                <button
                  key={d.id}
                  type="button"
                  className={`${styles.dayChip} ${days.has(d.id) ? styles.dayChipActive : ""}`}
                  onClick={() => toggleDay(d.id)}
                  aria-pressed={days.has(d.id)}
                >
                  {d.label}
                </button>
              ))}
            </div>
          </Field>
        </div>

        <div className={styles.formFooter}>
          <Link href="/partenaire/notifications" className={styles.btnSecondary}>
            Annuler
          </Link>
          <button type="button" className={styles.btnPrimary} onClick={handleSave}>
            <Save size={16} aria-hidden /> Enregistrer les préférences
          </button>
        </div>
      </div>
    </>
  );
}
