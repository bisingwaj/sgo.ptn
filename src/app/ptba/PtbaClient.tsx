"use client";

/**
 * Plan de Travail et Budget Annuel.
 *
 * Cet écran remplace une maquette de 300 lignes dont les huit activités
 * étaient écrites en dur, et dont les chiffres contredisaient le
 * référentiel — 540 M USD annoncés contre 510, 78 activités contre celles
 * réellement inscrites, quatre composantes contre cinq.
 *
 * Le PTBA est le rattachement obligatoire de tout TDR : une activité sans
 * ligne au plan n'a pas d'enveloppe, donc pas de marché possible. C'est
 * ici que le cycle commence.
 */

import { useCallback, useEffect, useMemo, useState } from "react";
import { Shell } from "@/components/shell/Shell";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card } from "@/components/ui/Card";
import { Tag } from "@/components/ui/Tag";
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
import { Add, Close, TaskComplete, TrashCan, WarningAltFilled } from "@carbon/icons-react";
import styles from "./ptba.module.scss";

const STATUT: Record<PtbaYearApi["status"], { label: string; tone: "blue" | "green" | "gray" }> = {
  BROUILLON: { label: "En préparation", tone: "blue" },
  VALIDE: { label: "Validé — opposable", tone: "green" },
  CLOS: { label: "Clos", tone: "gray" },
};

const money = (usd: number) => `${(usd / 1e6).toFixed(2)} M USD`;

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
  code: "",
  title: "",
  componentCode: "",
  subComponent: "",
  envelopeUsd: "",
  idaUsd: "",
  afdUsd: "",
  provinceCode: "",
};

export function PtbaClient() {
  const { can, loading: authLoading } = useAuth();

  const [years, setYears] = useState<PtbaYearApi[]>([]);
  const [year, setYear] = useState<PtbaYearApi | null>(null);
  const [activities, setActivities] = useState<PtbaActivityApi[]>([]);
  const [components, setComponents] = useState<ComponentApi[]>([]);
  const [provinces, setProvinces] = useState<ProvinceApi[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [openForm, setOpenForm] = useState(false);
  const [form, setForm] = useState<FormState>(FORM_VIDE);
  const [formError, setFormError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const peutEcrire = can("ptba:write");
  const peutValider = can("ptba:validate");
  const editable = year?.status === "BROUILLON";

  const charger = useCallback(async (annee?: number) => {
    setLoading(true);
    setError(null);
    try {
      const exercices = await ptbaApi.years();
      setYears(exercices);
      const cible = annee ?? exercices[0]?.year;
      if (!cible) {
        setYear(null);
        setActivities([]);
        return;
      }
      const detail = await ptbaApi.activities(cible);
      setYear(detail.year);
      setActivities(detail.activities);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Chargement impossible.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (authLoading) return;
    void charger();
    Promise.all([referentielApi.composantes(), referentielApi.provinces()])
      .then(([c, p]) => {
        // C5 est la réserve non dotée : aucune activité ne peut s'y inscrire
        // tant qu'aucune crise éligible ne l'a mobilisée.
        setComponents(c.filter((x) => Number(x.totalUsdM) > 0));
        setProvinces(p);
      })
      .catch(() => undefined);
  }, [authLoading, charger]);

  /**
   * Solde par composante. Le serveur refuse déjà tout dépassement, mais le
   * rédacteur doit voir ce qui reste avant de saisir, et non l'apprendre
   * par un refus.
   */
  const soldes = useMemo(() => {
    const engage: Record<string, number> = {};
    for (const a of activities) {
      engage[a.componentCode] = (engage[a.componentCode] ?? 0) + Number(a.envelopeUsd);
    }
    return components.map((c) => {
      const plafond = Number(c.totalUsdM) * 1e6;
      const utilise = engage[c.code] ?? 0;
      return {
        code: c.code,
        shortLabel: c.shortLabel,
        plafond,
        utilise,
        reste: plafond - utilise,
        activites: activities.filter((a) => a.componentCode === c.code).length,
        reconciliation: c.reconciliation ?? null,
      };
    });
  }, [components, activities]);

  const totalEngage = activities.reduce((s, a) => s + Number(a.envelopeUsd), 0);

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
      await charger(year.year);
    } catch (e) {
      setFormError(e instanceof ApiError ? e.message : "Enregistrement impossible.");
    } finally {
      setSaving(false);
    }
  };

  const retirer = async (a: PtbaActivityApi) => {
    if (!year) return;
    try {
      await ptbaApi.deactivate(a.id);
      await charger(year.year);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Retrait impossible.");
    }
  };

  const valider = async () => {
    if (!year) return;
    try {
      await ptbaApi.validateYear(year.year);
      await charger(year.year);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Validation impossible.");
    }
  };

  const complet =
    form.code.trim().length > 0 &&
    form.title.trim().length >= 5 &&
    form.componentCode !== "" &&
    Number(form.envelopeUsd) > 0;

  return (
    <Shell crumbs={[{ label: "Cockpit UGP", href: "/cockpit" }, { label: "PTBA" }]}>
      <PageHeader
        eyebrow="PLAN DE TRAVAIL ET BUDGET ANNUEL"
        title={year ? year.label : "PTBA"}
        subtitle="Toute activité inscrite ici devient un rattachement possible pour un TDR. Une activité absente du plan n’a pas d’enveloppe, donc pas de marché."
        meta={
          year ? (
            <>
              <span>
                <Tag tone={STATUT[year.status].tone}>{STATUT[year.status].label}</Tag>
              </span>
              <span>·</span>
              <span>
                {activities.length} activité{activities.length > 1 ? "s" : ""} inscrite
                {activities.length > 1 ? "s" : ""}
              </span>
              <span>·</span>
              <span>
                Engagé <strong className="ptn-mono">{money(totalEngage)}</strong>
              </span>
            </>
          ) : undefined
        }
        actions={
          <>
            {years.length > 1 && (
              <select
                className={styles.yearPicker}
                value={year?.year ?? ""}
                onChange={(e) => void charger(Number(e.target.value))}
                aria-label="Exercice"
              >
                {years.map((y) => (
                  <option key={y.id} value={y.year}>
                    {y.label}
                  </option>
                ))}
              </select>
            )}
            {peutEcrire && editable && (
              <button
                type="button"
                className={styles.btnPrimary}
                onClick={() => setOpenForm((v) => !v)}
              >
                {openForm ? <Close size={14} aria-hidden /> : <Add size={14} aria-hidden />}
                {openForm ? "Fermer" : "Inscrire une activité"}
              </button>
            )}
            {peutValider && editable && activities.length > 0 && (
              <button type="button" className={styles.btnGhost} onClick={() => void valider()}>
                <TaskComplete size={14} aria-hidden /> Valider l’exercice
              </button>
            )}
          </>
        }
      />

      {error && (
        <div className={styles.alert}>
          <WarningAltFilled size={16} aria-hidden /> {error}
        </div>
      )}

      {!editable && year && (
        <div className={styles.notice}>
          L’exercice est {STATUT[year.status].label.toLowerCase()}. Les activités ne s’y inscrivent
          plus.
        </div>
      )}

      {openForm && (
        <Card title="Nouvelle activité au plan">
          <div className={styles.form}>
            <div className={styles.row3}>
              <label className={styles.field}>
                <span>Code activité <em>*</em></span>
                <input
                  value={form.code}
                  onChange={(e) => setForm({ ...form, code: e.target.value })}
                  placeholder="A2.3.1"
                  className="ptn-mono"
                />
                <small>Codification du PTBA : composante, sous-composante, rang.</small>
              </label>
              <label className={styles.field} style={{ gridColumn: "span 2" }}>
                <span>Intitulé de l’activité <em>*</em></span>
                <input
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                  placeholder="Plateforme nationale d’identité numérique"
                />
              </label>
            </div>

            <div className={styles.row3}>
              <label className={styles.field}>
                <span>Composante <em>*</em></span>
                <select
                  value={form.componentCode}
                  onChange={(e) => setForm({ ...form, componentCode: e.target.value })}
                >
                  <option value="">— Sélectionner —</option>
                  {soldes.map((c) => (
                    <option key={c.code} value={c.code}>
                      {c.code} · {c.shortLabel} — reste {money(c.reste)}
                    </option>
                  ))}
                </select>
              </label>
              <label className={styles.field}>
                <span>Sous-composante</span>
                <input
                  value={form.subComponent}
                  onChange={(e) => setForm({ ...form, subComponent: e.target.value })}
                  placeholder="2.3"
                  className="ptn-mono"
                />
              </label>
              <label className={styles.field}>
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
            </div>

            <div className={styles.row3}>
              <label className={styles.field}>
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
              <label className={styles.field}>
                <span>Part IDA</span>
                <input
                  type="number"
                  min={0}
                  value={form.idaUsd}
                  onChange={(e) => setForm({ ...form, idaUsd: e.target.value })}
                  className="ptn-mono"
                />
              </label>
              <label className={styles.field}>
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

            <p className={styles.hint}>
              La ventilation est facultative, mais si elle est renseignée, IDA et AFD doivent
              totaliser l’enveloppe. Les deux bailleurs ne se consolident jamais sans distinction.
            </p>

            {formError && (
              <div className={styles.alert}>
                <WarningAltFilled size={16} aria-hidden /> {formError}
              </div>
            )}

            <div className={styles.formActions}>
              <button type="button" className={styles.btnGhost} onClick={() => setOpenForm(false)}>
                Annuler
              </button>
              <button
                type="button"
                className={styles.btnPrimary}
                onClick={() => void soumettre()}
                disabled={!complet || saving}
              >
                {saving ? "Enregistrement…" : "Inscrire au plan"}
              </button>
            </div>
          </div>
        </Card>
      )}

      <div className={styles.soldes}>
        {soldes.map((c) => {
          const part = c.plafond > 0 ? (c.utilise / c.plafond) * 100 : 0;
          return (
            <div key={c.code} className={styles.solde}>
              <div className={styles.soldeHead}>
                <strong className="ptn-mono">{c.code}</strong>
                <span>{c.shortLabel}</span>
              </div>
              <div className={styles.gauge} aria-hidden>
                <span style={{ width: `${Math.min(part, 100)}%` }} />
              </div>
              <div className={styles.soldeMeta}>
                <span className="ptn-mono">{money(c.utilise)}</span>
                <span>sur {money(c.plafond)}</span>
              </div>
              <div className={styles.soldeCount}>
                {c.activites} activité{c.activites > 1 ? "s" : ""}
              </div>
              {/* Le corpus impose de signaler la réconciliation MEP/PAD
                  partout où le montant s'affiche. */}
              {c.reconciliation && <p className={styles.reconc}>{c.reconciliation}</p>}
            </div>
          );
        })}
      </div>

      <Card title="Activités inscrites" noPadding>
        {loading ? (
          <p className={styles.empty}>Chargement…</p>
        ) : activities.length === 0 ? (
          <p className={styles.empty}>
            Aucune activité au plan. Tant qu’il est vide, aucun TDR ne peut être ouvert : le
            rattachement à une ligne du plan est obligatoire.
          </p>
        ) : (
          <div className={styles.tableWrap}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Code</th>
                  <th>Intitulé</th>
                  <th>Composante</th>
                  <th>Province</th>
                  <th className={styles.num}>Enveloppe</th>
                  <th className={styles.num}>IDA</th>
                  <th className={styles.num}>AFD</th>
                  {peutEcrire && editable && <th />}
                </tr>
              </thead>
              <tbody>
                {activities.map((a) => (
                  <tr key={a.id}>
                    <td className="ptn-mono">{a.code}</td>
                    <td>{a.title}</td>
                    <td>
                      <span className="ptn-mono">{a.componentCode}</span>
                      {a.subComponent && <span className={styles.sub}> · {a.subComponent}</span>}
                    </td>
                    <td>{a.province?.label ?? "National"}</td>
                    <td className={`${styles.num} ptn-mono`}>{money(Number(a.envelopeUsd))}</td>
                    <td className={`${styles.num} ptn-mono`}>
                      {a.idaUsd ? money(Number(a.idaUsd)) : "—"}
                    </td>
                    <td className={`${styles.num} ptn-mono`}>
                      {a.afdUsd ? money(Number(a.afdUsd)) : "—"}
                    </td>
                    {peutEcrire && editable && (
                      <td>
                        {/* Retrait, jamais suppression : un TDR peut déjà
                            citer cette ligne. */}
                        <button
                          type="button"
                          className={styles.remove}
                          onClick={() => void retirer(a)}
                          aria-label={`Retirer ${a.code} du plan`}
                          title="Retirer du plan"
                        >
                          <TrashCan size={14} aria-hidden />
                        </button>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </Shell>
  );
}
