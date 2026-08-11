"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Field, Textarea } from "@/components/wizard/WizardFields";
import { DropdownPicker } from "@/components/ui/DropdownPicker";
import { useToast } from "@/components/toast/ToastContext";
import {
  Upload,
  Document,
  CheckmarkFilled,
  TrashCan,
  Locked,
  Save,
} from "@carbon/icons-react";
import styles from "./upload.module.scss";

interface UploadFile {
  name: string;
  size: string;
  type: "PDF" | "DOCX" | "XLSX";
  progress: number;
  done?: boolean;
}

const QUEUED: UploadFile[] = [
  { name: "TDR-AMOA-Plateforme-identite-v3.docx", size: "1,2 Mo", type: "DOCX", progress: 100, done: true },
  { name: "Annexe-budgetaire-v3.xlsx", size: "560 Ko", type: "XLSX", progress: 100, done: true },
  { name: "Note-cadrage-strategique-ANIE.pdf", size: "320 Ko", type: "PDF", progress: 64 },
];

const FOLDERS = [
  { value: "tdr", label: "Termes de référence", sub: "TDR · DAO" },
  { value: "pges", label: "Sauvegardes E&S", sub: "PGES · CGES" },
  { value: "rapports", label: "Rapports & livrables", sub: "L1-L5" },
  { value: "contrats", label: "Contrats & avenants", sub: "Signés / actifs" },
  { value: "correspondance", label: "Correspondance UGP", sub: "Lettres officielles" },
];

const PROPOSITIONS = [
  { value: "", label: "Aucune (document général)", sub: "" },
  { value: "PROP-2026-019", label: "Plateforme identité numérique", sub: "PROP-2026-019" },
  { value: "PROP-2026-014", label: "PGES Datacenter", sub: "PROP-2026-014" },
  { value: "PROP-2026-011", label: "Atelier ID4Africa", sub: "PROP-2026-011" },
  { value: "PROP-2026-007", label: "Modernisation registre", sub: "PROP-2026-007" },
];

const STATUSES = [
  { value: "draft", label: "Brouillon", sub: "Interne" },
  { value: "review", label: "En revue UGP", sub: "Visible UGP" },
  { value: "signed", label: "Signé / final", sub: "Verrouillé" },
];

const VISIBILITIES = [
  { value: "anie", label: "Mon organisation uniquement", sub: "Privé" },
  { value: "ugp", label: "Mon organisation + UGP", sub: "Standard" },
  { value: "all", label: "Mon organisation + UGP + Bailleurs", sub: "Étendu" },
];

function FileIcon({ type }: { type: UploadFile["type"] }) {
  const cls =
    type === "PDF"
      ? styles.fileIcoPdf
      : type === "XLSX"
        ? styles.fileIcoXls
        : styles.fileIcoDoc;
  return (
    <div className={`${styles.fileIco} ${cls}`}>
      <Document size={16} aria-hidden />
    </div>
  );
}

export function UploadClient() {
  const router = useRouter();
  const { toast } = useToast();
  const [folder, setFolder] = useState("tdr");
  const [proposition, setProposition] = useState("PROP-2026-019");
  const [status, setStatus] = useState("review");
  const [visibility, setVisibility] = useState("ugp");
  const [description, setDescription] = useState("");

  const handleUpload = () => {
    toast({
      tone: "success",
      title: "Documents téléversés",
      message: `${QUEUED.length} fichier(s) ajouté(s) au dossier · UGP notifiée.`,
      duration: 4500,
    });
    setTimeout(() => router.push("/partenaire/documents"), 200);
  };

  return (
    <>
      <div className={styles.headerRow}>
        <div>
          <div className={styles.eyebrow}>ANIE · TÉLÉVERSEMENT DE DOCUMENTS</div>
          <h1 className={styles.title}>Téléverser des documents</h1>
          <p className={styles.subtitle}>
            Ajoutez TDR, annexes, livrables ou correspondance officielle. Chaque document est
            scanné, vectorisé pour le moteur de similarité, et signé HMAC pour audit.
          </p>
        </div>
        <div className={styles.actionsRow}>
          <Link href="/partenaire/documents" className={styles.btnSecondary}>
            Annuler
          </Link>
          <button type="button" className={styles.btnPrimary} onClick={handleUpload}>
            <Save size={16} aria-hidden /> Téléverser ({QUEUED.length})
          </button>
        </div>
      </div>

      <div className={styles.layout}>
        <div>
          {/* Dropzone */}
          <div className={styles.dropzone}>
            <div className={styles.dropzoneIco}>
              <Upload size={24} aria-hidden />
            </div>
            <div className={styles.dropzoneTitle}>Déposez vos fichiers ici</div>
            <div className={styles.dropzoneSub}>
              ou cliquez pour parcourir vos dossiers — sélection multiple supportée
            </div>
            <button type="button" className={styles.dropzoneBtn}>
              <Upload size={14} aria-hidden /> Parcourir les fichiers
            </button>
            <div className={styles.dropzoneFormats}>
              PDF · DOCX · XLSX · PPTX · ZIP — max 50 Mo par fichier
            </div>
          </div>

          {/* Files queue */}
          <div className={styles.filesCard}>
            <div className={styles.filesH}>
              <h3 className={styles.filesTitle}>
                File d&apos;attente{" "}
                <span
                  className="ptn-mono"
                  style={{ color: "var(--cds-text-helper)", fontWeight: 400, marginLeft: 6 }}
                >
                  ({QUEUED.length})
                </span>
              </h3>
              <button
                type="button"
                style={{
                  background: "transparent",
                  border: 0,
                  color: "var(--ptn-accent)",
                  fontSize: 12,
                  cursor: "pointer",
                }}
              >
                Tout supprimer
              </button>
            </div>
            {QUEUED.map((f, i) => (
              <div key={i} className={styles.fileItem}>
                <FileIcon type={f.type} />
                <div className={styles.fileMain}>
                  <div className={styles.fileName}>{f.name}</div>
                  <div className={styles.fileMeta}>
                    {f.type} · {f.size}
                  </div>
                </div>
                <div>
                  {f.done ? (
                    <span className={`${styles.fileStatus} ${styles.fileStatusOk}`}>
                      <CheckmarkFilled
                        size={12}
                        aria-hidden
                        style={{ verticalAlign: "middle", marginRight: 4 }}
                      />
                      Terminé
                    </span>
                  ) : (
                    <>
                      <div className={`${styles.fileBar} ${f.done ? styles.fileBarDone : ""}`}>
                        <i style={{ width: `${f.progress}%` }} />
                      </div>
                      <div className={styles.fileStatus}>{f.progress} %</div>
                    </>
                  )}
                </div>
                <button type="button" className={styles.fileRemove} aria-label="Retirer">
                  <TrashCan size={16} aria-hidden />
                </button>
              </div>
            ))}
          </div>

          {/* Metadata form */}
          <div className={styles.metaCard}>
            <section className={styles.section}>
              <h3 className={styles.sectionH}>Métadonnées partagées</h3>
              <div className={styles.grid2}>
                <Field label="Dossier" required>
                  <DropdownPicker
                    value={folder}
                    onChange={setFolder}
                    options={FOLDERS}
                    ariaLabel="Dossier"
                  />
                </Field>
                <Field label="Proposition liée">
                  <DropdownPicker
                    value={proposition}
                    onChange={setProposition}
                    options={PROPOSITIONS}
                    placeholder="Aucune"
                    searchable
                    ariaLabel="Proposition liée"
                  />
                </Field>
                <Field label="Statut" required>
                  <DropdownPicker
                    value={status}
                    onChange={setStatus}
                    options={STATUSES}
                    ariaLabel="Statut"
                  />
                </Field>
                <Field label="Visibilité">
                  <DropdownPicker
                    value={visibility}
                    onChange={setVisibility}
                    options={VISIBILITIES}
                    ariaLabel="Visibilité"
                  />
                </Field>
              </div>

              <div style={{ marginTop: 12 }}>
                <Field
                  label="Description (facultatif)"
                  helper="Visible dans la fiche du document — facilite le moteur de similarité IA."
                >
                  <Textarea
                    rows={3}
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Version finale du TDR AMOA après prise en compte des remarques UGP."
                  />
                </Field>
              </div>
            </section>

            <div className={styles.formFooter}>
              <Link href="/partenaire/documents" className={styles.btnSecondary}>
                Annuler
              </Link>
              <button type="button" className={styles.btnSecondary}>
                Enregistrer en brouillon
              </button>
              <button type="button" className={styles.btnPrimary} onClick={handleUpload}>
                <Save size={16} aria-hidden /> Téléverser et notifier l&apos;UGP
              </button>
            </div>
          </div>
        </div>

        <aside className={styles.rail}>
          <section className={styles.railCard}>
            <h4 className={styles.railH}>Stockage utilisé</h4>
            <div className={styles.railRow}>
              <span className={styles.railK}>Utilisé</span>
              <span className={styles.railV}>147 Mo</span>
            </div>
            <div className={styles.railRow}>
              <span className={styles.railK}>Total alloué</span>
              <span className={styles.railV}>2,0 Go</span>
            </div>
            <div className={styles.railRow}>
              <span className={styles.railK}>Disponible</span>
              <span className={styles.railV}>1,85 Go</span>
            </div>
            <div className={styles.storageBar}>
              <i style={{ width: "7%" }} />
            </div>
            <div
              style={{
                fontSize: 11,
                color: "var(--cds-text-helper)",
                fontFamily: "var(--font-ibm-plex-mono)",
                marginTop: 4,
              }}
            >
              7 % utilisé
            </div>
          </section>

          <section className={styles.railCard}>
            <h4 className={styles.railH}>
              <Locked size={12} aria-hidden style={{ verticalAlign: "middle", marginRight: 4 }} />
              Sécurité & confidentialité
            </h4>
            <p
              style={{
                fontSize: 12,
                color: "var(--cds-text-secondary)",
                lineHeight: 1.5,
                margin: 0,
              }}
            >
              Chiffrement AES-256 au repos · TLS 1.3 en transit · Hash SHA-256 + signature HMAC
              pour audit · Conservation 5 ans après clôture du projet (Loi RDC 2023-006).
            </p>
          </section>

          <section className={styles.railCard}>
            <h4 className={styles.railH}>Formats acceptés</h4>
            <div
              style={{
                fontSize: 12,
                color: "var(--cds-text-secondary)",
                lineHeight: 1.6,
                fontFamily: "var(--font-ibm-plex-mono)",
              }}
            >
              <div>PDF · DOCX · DOC · ODT</div>
              <div>XLSX · XLS · ODS · CSV</div>
              <div>PPTX · PPT · ODP</div>
              <div>ZIP · 7Z (archives)</div>
              <div>PNG · JPG (annexes)</div>
            </div>
          </section>
        </aside>
      </div>
    </>
  );
}
