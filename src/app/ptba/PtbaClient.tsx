"use client";

/**
 * PTBA — Plan de Travail et Budget Annuel.
 *
 * La disposition est celle de l'écran d'origine : bandeau d'indicateurs,
 * tableau des activités, rail de répartition et de cycle. Seules deux
 * choses changent — les données viennent du service au lieu d'être écrites
 * en dur, et la saisie d'une activité est réelle.
 *
 * Trois colonnes de l'écran d'origine restent vides : décaissé, exécution
 * et période. Rien ne les porte dans le modèle, et les remplir demanderait
 * de les inventer. Elles gardent leur place, marquées d'un tiret, plutôt
 * que d'afficher un chiffre sans source.
 */

import { useCallback, useEffect, useMemo, useState } from "react";
import { Shell } from "@/components/shell/Shell";
import { PageHeader } from "@/components/ui/PageHeader";
import { useAuth } from "@/components/auth/AuthContext";
import {
  ptbaApi,
  referentielApi,
  ApiError,
  type ComponentApi,
  type ProvinceApi,
  type PtbaActivityApi,
  type PtbaYearApi,
} from "@/lib/api";
import {
  ChartLineSmooth,
  Money,
  TaskApproved,
  Time,
  Add,
  Close,
  Notebook,
  Activity,
  TrashCan,
  WarningAltFilled,
} from "@carbon/icons-react";
import styles from "@/styles/ugp-shared.module.scss";
import form_ from "./ptba-form.module.scss";

const formatM = (n: number) => `${(n / 1_000_000).toFixed(1)} M`;

const STATUT: Record<PtbaYearApi["status"], string> = {
  BROUILLON: "En préparation",
  VALIDE: "Validé — opposable",
  CLOS: "Clos",
};

/** Teintes de l'écran d'origine, une par composante. */
const TEINTE: Record<string, string> = {
  C1: "#007d79",
  C2: "var(--ptn-accent)",
  C3: "#d02670",
  C4: "var(--ptn-status-ai)",
  C5: "var(--cds-text-helper)",
};

const TAG_CLASS: Record<string, string> = {
  C1: styles.tagC1,
  C2: styles.tagC2,
  C3: styles.tagC3,
  C4: styles.tagC4,
};

interface FormState {
  code: string;
  title: string;
  componentCode: string;
  subComponent: string;
  envelopeUsd: string;
  idaUsd: string;
  afdUsd: string;
  provinceCode: string;
}

const FORM_VIDE: FormState = {
  code: "", title: "", componentCode: "", subComponent: "",
  envelopeUsd: "", idaUsd: "", afdUsd: "", provinceCode: "",
};

export function PtbaClient() {
  const { can, loading: authLoading } = useAuth();

  const [year, setYear] = useState<PtbaYearApi | null>(null);
  const [activities, setActivities] = useState<PtbaActivityApi[]>([]);
  const [components, setComponents] = useState<ComponentApi[]>([]);
  const [provinces, setProvinces] = useState<ProvinceApi[]>([]);
  const [error, setError] = useState<string | null>(null);

  const [openForm, setOpenForm] = useState(false);
  const [form, setForm] = useState<FormState>(FORM_VIDE);
  const [formError, setFormError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const peutEcrire = can("ptba:write");
  const editable = year?.status === "BROUILLON";

  const charger = useCallback(async () => {
    setError(null);
    try {
      const exercices = await ptbaApi.years();
      const cible = exercices[0]?.year;
      if (!cible) return;
      const detail = await ptbaApi.activities(cible);
      setYear(detail.year);
      setActivities(detail.activities);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Chargement impossible.");
    }
  }, []);

  useEffect(() => {
    if (authLoading) return;
    void charger();
    Promise.all([referentielApi.composantes(), referentielApi.provinces()])
      .then(([c, p]) => {
        setComponents(c);
        setProvinces(p);
      })
      .catch(() => undefined);
  }, [authLoading, charger]);

  const engage = activities.reduce((s, a) => s + Number(a.envelopeUsd), 0);
  const dotationTotale = components.reduce((s, c) => s + Number(c.totalUsdM) * 1e6, 0);

  const parComposante = useMemo(
    () =>
      components.map((c) => {
        const lignes = activities.filter((a) => a.componentCode === c.code);
        return {
          code: c.code,
          label: c.shortLabel,
          dotation: Number(c.totalUsdM),
          engage: lignes.reduce((s, a) => s + Number(a.envelopeUsd), 0),
          nb: lignes.length,
          reconciliation: c.reconciliation ?? null,
        };
      }),
    [components, activities],
  );

  const soumettre = async () => {
    if (!year) return;
    setSaving(true);
    setFormError(null);
    try {
      await ptbaApi.createActivity(year.year, {
        code: form.code.trim(),
        title: form.title.trim(),
        componentCode: form.componentCode,
        subComponent: form.subComponent.trim() || undefined,
        envelopeUsd: Number(form.envelopeUsd),
        idaUsd: form.idaUsd ? Number(form.idaUsd) : undefined,
        afdUsd: form.afdUsd ? Number(form.afdUsd) : undefined,
        provinceCode: form.provinceCode || undefined,
      });
      setForm(FORM_VIDE);
      setOpenForm(false);
      await charger();
    } catch (e) {
      setFormError(e instanceof ApiError ? e.message : "Enregistrement impossible.");
    } finally {
      setSaving(false);
    }
  };

  const retirer = async (a: PtbaActivityApi) => {
    try {
      await ptbaApi.deactivate(a.id);
      await charger();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Retrait impossible.");
    }
  };

  const complet =
    form.code.trim() !== "" &&
    form.title.trim().length >= 5 &&
    form.componentCode !== "" &&
    Number(form.envelopeUsd) > 0;

  return (
    <Shell crumbs={[{ label: "Cockpit UGP", href: "/cockpit" }, { label: "PTBA" }]}>
      <PageHeader
        eyebrow="UGP · PLAN DE TRAVAIL ET BUDGET ANNUEL"
        title={year ? `${year.label} — exécution & suivi` : "PTBA"}
        subtitle={
          year
            ? `${activities.length} activité${activities.length > 1 ? "s" : ""} inscrite${activities.length > 1 ? "s" : ""} · ${components.length} composantes · dotation globale ${formatM(dotationTotale)} USD.`
            : "Chargement du plan…"
        }
        meta={
          year ? (
            <>
              <span>
                Statut : <strong>{STATUT[year.status]}</strong>
              </span>
              <span>·</span>
              <span>
                Engagé au plan : <span className="ptn-mono">{formatM(engage)} USD</span>
              </span>
            </>
          ) : undefined
        }
        actions={
          peutEcrire && editable ? (
            <button
              type="button"
              className="demoBtnSecondary"
              onClick={() => setOpenForm((v) => !v)}
            >
              {openForm ? <Close size={14} aria-hidden /> : <Add size={14} aria-hidden />}
              {openForm ? "Fermer" : "Ajouter une activité"}
            </button>
          ) : undefined
        }
      />

      {error && (
        <div className={form_.alert}>
          <WarningAltFilled size={16} aria-hidden /> {error}
        </div>
      )}

      {openForm && (
        <section className={form_.panel}>
          <h3 className={form_.panelTitle}>Nouvelle activité au plan</h3>
          <div className={form_.grid}>
            <label className={form_.field}>
              <span>Code <em>*</em></span>
              <input
                value={form.code}
                onChange={(e) => setForm({ ...form, code: e.target.value })}
                placeholder="A2.3.1"
                className="ptn-mono"
              />
            </label>
            <label className={`${form_.field} ${form_.span2}`}>
              <span>Intitulé de l’activité <em>*</em></span>
              <input
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                placeholder="Plateforme nationale d’identité numérique"
              />
            </label>

            <label className={form_.field}>
              <span>Composante <em>*</em></span>
              <select
                value={form.componentCode}
                onChange={(e) => setForm({ ...form, componentCode: e.target.value })}
              >
                <option value="">— Sélectionner —</option>
                {parComposante
                  .filter((c) => c.dotation > 0)
                  .map((c) => (
                    <option key={c.code} value={c.code}>
                      {c.code} · {c.label} — reste{" "}
                      {(c.dotation - c.engage / 1e6).toFixed(1)} M USD
                    </option>
                  ))}
              </select>
            </label>
            <label className={form_.field}>
              <span>Sous-composante</span>
              <input
                value={form.subComponent}
                onChange={(e) => setForm({ ...form, subComponent: e.target.value })}
                placeholder="2.3"
                className="ptn-mono"
              />
            </label>
            <label className={form_.field}>
              <span>Province</span>
              <select
                value={form.provinceCode}
                onChange={(e) => setForm({ ...form, provinceCode: e.target.value })}
              >
                <option value="">Couverture nationale</option>
                {provinces.map((p) => (
                  <option key={p.code} value={p.code}>
                    {p.label}
                    {p.isPriorityCpf ? " · prioritaire CPF" : ""}
                  </option>
                ))}
              </select>
            </label>

            <label className={form_.field}>
              <span>Enveloppe USD <em>*</em></span>
              <input
                type="number"
                min={0}
                value={form.envelopeUsd}
                onChange={(e) => setForm({ ...form, envelopeUsd: e.target.value })}
                placeholder="8700000"
                className="ptn-mono"
              />
            </label>
            <label className={form_.field}>
              <span>Part IDA</span>
              <input
                type="number"
                min={0}
                value={form.idaUsd}
                onChange={(e) => setForm({ ...form, idaUsd: e.target.value })}
                className="ptn-mono"
              />
            </label>
            <label className={form_.field}>
              <span>Part AFD</span>
              <input
                type="number"
                min={0}
                value={form.afdUsd}
                onChange={(e) => setForm({ ...form, afdUsd: e.target.value })}
                className="ptn-mono"
              />
            </label>
          </div>

          <p className={form_.hint}>
            La ventilation est facultative ; renseignée, IDA et AFD doivent totaliser l’enveloppe.
            Le cumul des activités d’une composante ne peut excéder sa dotation.
          </p>

          {formError && (
            <div className={form_.alert}>
              <WarningAltFilled size={16} aria-hidden /> {formError}
            </div>
          )}

          <div className={form_.actions}>
            <button type="button" className="demoBtnSecondary" onClick={() => setOpenForm(false)}>
              Annuler
            </button>
            <button
              type="button"
              className="demoBtnPrimary"
              onClick={() => void soumettre()}
              disabled={!complet || saving}
            >
              {saving ? "Enregistrement…" : "Inscrire au plan"}
            </button>
          </div>
        </section>
      )}

      <div className={styles.kpis}>
        <div className={styles.kpi}>
          <div className={styles.kpiK}>
            <Notebook size={14} aria-hidden /> Activités {year?.year ?? ""}
          </div>
          <div className={styles.kpiV}>{activities.length}</div>
          <div className={styles.kpiU}>
            {parComposante
              .filter((c) => c.nb > 0)
              .map((c) => `${c.code} · ${c.nb}`)
              .join(" / ") || "Aucune activité inscrite"}
          </div>
        </div>
        <div className={styles.kpi}>
          <div className={styles.kpiK}>
            <Money size={14} aria-hidden /> Dotation du projet
          </div>
          <div className={styles.kpiV}>{formatM(dotationTotale)}</div>
          <div className={styles.kpiU}>USD · IDA + AFD, MEP Tableau 2</div>
        </div>
        <div className={styles.kpi}>
          <div className={styles.kpiK}>
            <TaskApproved size={14} aria-hidden /> Engagé au plan
          </div>
          <div className={styles.kpiV} style={{ color: "var(--ptn-status-success)" }}>
            {formatM(engage)}
          </div>
          <div className={`${styles.kpiBar} ${styles.kpiBarOk}`}>
            <i style={{ width: `${dotationTotale ? (engage / dotationTotale) * 100 : 0}%` }} />
          </div>
          <div className={styles.kpiU}>
            {dotationTotale ? ((engage / dotationTotale) * 100).toFixed(1) : "0"} % de la dotation
          </div>
        </div>
        <div className={styles.kpi}>
          <div className={styles.kpiK}>
            <Time size={14} aria-hidden /> Décaissé
          </div>
          <div className={styles.kpiV}>—</div>
          <div className={styles.kpiU}>Non suivi à ce stade</div>
        </div>
      </div>

      <div className={styles.layout}>
        <div className={styles.tableCard}>
          <div className={styles.toolbar}>
            <h3>
              Activités PTBA <span className={styles.num}>({activities.length})</span>
            </h3>
            <div className={styles.spacer} />
          </div>
          <div className={styles.tableWrap}>
            <table className={styles.table}>
              <colgroup>
                <col style={{ width: "11%" }} />
                <col style={{ width: "30%" }} />
                <col style={{ width: "9%" }} />
                <col style={{ width: "12%" }} />
                <col style={{ width: "11%" }} />
                <col style={{ width: "16%" }} />
                <col style={{ width: "11%" }} />
              </colgroup>
              <thead>
                <tr>
                  <th>Code</th>
                  <th>Activité</th>
                  <th>Composante</th>
                  <th style={{ textAlign: "right" }}>Enveloppe</th>
                  <th style={{ textAlign: "right" }}>Décaissé</th>
                  <th>Exécution</th>
                  <th>{peutEcrire && editable ? "" : "Période"}</th>
                </tr>
              </thead>
              <tbody>
                {activities.length === 0 ? (
                  <tr>
                    <td colSpan={7} className={styles.date} style={{ padding: 24 }}>
                      Aucune activité au plan. Tant qu’il est vide, aucun TDR ne peut être ouvert :
                      le rattachement à une ligne du plan est obligatoire.
                    </td>
                  </tr>
                ) : (
                  activities.map((a) => (
                    <tr key={a.id}>
                      <td>
                        <span className={styles.ref}>{a.code}</span>
                      </td>
                      <td>
                        <div className={styles.title}>{a.title}</div>
                      </td>
                      <td>
                        <span
                          className={`${styles.tag} ${TAG_CLASS[a.componentCode] ?? styles.tagC4}`}
                        >
                          {a.componentCode}
                        </span>
                      </td>
                      <td className={styles.amount}>{formatM(Number(a.envelopeUsd))}</td>
                      <td className={styles.amount}>—</td>
                      <td className={styles.date}>—</td>
                      <td>
                        {peutEcrire && editable ? (
                          <button
                            type="button"
                            className={form_.rowAction}
                            onClick={() => void retirer(a)}
                            aria-label={`Retirer ${a.code} du plan`}
                            title="Retirer du plan"
                          >
                            <TrashCan size={14} aria-hidden />
                          </button>
                        ) : (
                          <span className={styles.date}>—</span>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        <aside className={styles.rail}>
          <section className={styles.railCard}>
            <h4 className={styles.railH}>
              <Activity size={12} aria-hidden /> Répartition composantes
            </h4>
            <div className={styles.railBody}>
              {parComposante.map((c) => (
                <div key={c.code} style={{ marginBottom: 10 }}>
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      fontSize: 12,
                      marginBottom: 4,
                    }}
                  >
                    <span>
                      <strong style={{ fontFamily: "var(--font-ibm-plex-mono)", marginRight: 6 }}>
                        {c.code}
                      </strong>
                      {c.label}
                    </span>
                    <span
                      className="ptn-mono"
                      style={{ fontSize: 11, color: "var(--cds-text-helper)" }}
                    >
                      {c.dotation} M
                    </span>
                  </div>
                  <div style={{ height: 4, background: "var(--cds-border-subtle)", overflow: "hidden" }}>
                    <i
                      style={{
                        display: "block",
                        height: "100%",
                        width: `${dotationTotale ? (c.dotation / (dotationTotale / 1e6)) * 100 : 0}%`,
                        background: TEINTE[c.code],
                      }}
                    />
                  </div>
                  {/* Le corpus impose de signaler la réconciliation MEP/PAD
                      partout où la dotation s'affiche. */}
                  {c.reconciliation && (
                    <p style={{ fontSize: 10, lineHeight: 1.4, color: "var(--cds-text-helper)", marginTop: 3 }}>
                      {c.reconciliation}
                    </p>
                  )}
                </div>
              ))}
            </div>
          </section>

          <section className={styles.railCard}>
            <h4 className={styles.railH}>
              <ChartLineSmooth size={12} aria-hidden /> Cycle PTBA
            </h4>
            <div className={styles.railBody}>
              <div className={styles.railRow}>
                <div className={styles.railK}>Exercice</div>
                <div className={`${styles.railV} ${styles.railVMono}`}>{year?.year ?? "—"}</div>
              </div>
              <div className={styles.railRow}>
                <div className={styles.railK}>Statut</div>
                <div className={styles.railV}>{year ? STATUT[year.status] : "—"}</div>
              </div>
              <div className={styles.railRow}>
                <div className={styles.railK}>Validé le</div>
                <div className={`${styles.railV} ${styles.railVMono}`}>
                  {year?.validatedAt
                    ? new Date(year.validatedAt).toLocaleDateString("fr-FR")
                    : "—"}
                </div>
              </div>
              <div className={styles.railRow}>
                <div className={styles.railK}>Activités inscrites</div>
                <div className={styles.railV}>
                  <strong>{activities.length}</strong>
                </div>
              </div>
            </div>
          </section>
        </aside>
      </div>
    </Shell>
  );
}
