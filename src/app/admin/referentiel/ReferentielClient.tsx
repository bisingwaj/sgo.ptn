"use client";

/**
 * Référentiel de passation — panneau d'administration.
 *
 * Ces contenus partent dans des documents contractuels soumis à ANO :
 * l'édition ne modifie donc jamais l'existant, elle crée une version. La
 * précédente est archivée mais conservée, sinon un TDR déjà approuvé
 * verrait ses clauses changer rétroactivement.
 *
 * L'accès relève du RPM et des spécialistes, pas de l'administrateur
 * technique : éditer une clause n'est pas un réglage système.
 */

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Shell } from "@/components/shell/Shell";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card } from "@/components/ui/Card";
import { Tag } from "@/components/ui/Tag";
import { useAuth } from "@/components/auth/AuthContext";
import {
  tdrReferentielApi,
  ApiError,
  type ClauseApi,
  type IndicatorApi,
  type LibraryEntry,
  type LibraryKind,
  type MethodApi,
  type RiskApi,
  type TdrTypeApi,
  type TemplateStatusApi,
} from "@/lib/api";
import {
  CheckmarkFilled,
  Close,
  DocumentBlank,
  Edit,
  Locked,
  Money,
  Time,
  WarningAltFilled,
} from "@carbon/icons-react";
import styles from "./referentiel.module.scss";

type Section = "types" | "methodes" | "clauses" | "indicateurs" | "risques";

const SECTIONS: Array<{ key: Section; label: string; permission?: string }> = [
  { key: "types", label: "Types de TDR" },
  { key: "methodes", label: "Méthodes & seuils" },
  { key: "clauses", label: "Clauses" },
  { key: "indicateurs", label: "Indicateurs" },
  { key: "risques", label: "Risques" },
];

const CLAUSE_CATEGORY_LABEL: Record<ClauseApi["category"], string> = {
  REG: "Réglementaire",
  TECH: "Technique",
  CONF: "Conformité",
  SAFE: "Sauvegarde E&S",
  GOV: "Gouvernance",
};

const STATUS_TONE: Record<TemplateStatusApi, "green" | "yellow" | "gray"> = {
  PUBLIE: "green",
  BROUILLON: "yellow",
  ARCHIVE: "gray",
};

const STATUS_LABEL: Record<TemplateStatusApi, string> = {
  PUBLIE: "En vigueur",
  BROUILLON: "Brouillon",
  ARCHIVE: "Archivée",
};

function isClause(e: LibraryEntry): e is ClauseApi {
  return "text" in e;
}
function isIndicator(e: LibraryEntry): e is IndicatorApi {
  return "measure" in e;
}
function isRisk(e: LibraryEntry): e is RiskApi {
  return "mitigation" in e;
}

export function ReferentielClient() {
  const { can, loading: authLoading, user } = useAuth();

  const [section, setSection] = useState<Section>("types");
  const [types, setTypes] = useState<TdrTypeApi[]>([]);
  const [methods, setMethods] = useState<MethodApi[]>([]);
  const [entries, setEntries] = useState<LibraryEntry[]>([]);
  const [typeFilter, setTypeFilter] = useState<string>("");
  const [statusFilter, setStatusFilter] = useState<TemplateStatusApi | "">("PUBLIE");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [history, setHistory] = useState<{ familyKey: string; entries: LibraryEntry[] } | null>(null);
  const [editing, setEditing] = useState<ClauseApi | null>(null);

  const canEditLibrary = can("referentiel:clauses");
  const kind: LibraryKind | null =
    section === "clauses" ? "clauses" : section === "indicateurs" ? "indicateurs" : section === "risques" ? "risques" : null;

  useEffect(() => {
    if (authLoading || !user) return;
    Promise.all([tdrReferentielApi.types(), tdrReferentielApi.methods()])
      .then(([t, m]) => {
        setTypes(t);
        setMethods(m);
      })
      .catch((e: unknown) => setError(e instanceof Error ? e.message : "Référentiel indisponible."));
  }, [authLoading, user]);

  const loadLibrary = useCallback(async () => {
    if (!kind) return;
    setLoading(true);
    setError(null);
    try {
      setEntries(
        await tdrReferentielApi.library(kind, {
          type: typeFilter || undefined,
          status: statusFilter || undefined,
        }),
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : "Chargement impossible.");
    } finally {
      setLoading(false);
    }
  }, [kind, typeFilter, statusFilter]);

  useEffect(() => {
    if (authLoading || !user) return;
    void loadLibrary();
  }, [authLoading, user, loadLibrary]);

  const act = async (fn: () => Promise<unknown>, message: string) => {
    setError(null);
    try {
      await fn();
      setNotice(message);
      await loadLibrary();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "L’opération a échoué.");
    }
  };

  const byFamily = useMemo(() => {
    const map: Record<string, LibraryEntry[]> = {};
    for (const e of entries) (map[e.familyKey] ??= []).push(e);
    return map;
  }, [entries]);

  if (authLoading) return <div className={styles.gate}>Chargement…</div>;

  if (!user || !(can("referentiel:passation") || can("referentiel:clauses"))) {
    return (
      <div className={styles.gate}>
        <Locked size={32} aria-hidden />
        <h1>Habilitation insuffisante</h1>
        <p>
          Le référentiel de passation est administré par le Responsable Passation des Marchés et
          les spécialistes. Ce n’est pas une fonction d’administration technique.
        </p>
        {user && (
          <p className={styles.gateMeta}>
            Habilitation active : {user.subroleLabel} · {user.organisationName}
          </p>
        )}
        {!user && (
          <Link href="/login" className={styles.gateLink}>
            Aller à la connexion
          </Link>
        )}
      </div>
    );
  }

  return (
    <Shell crumbs={[{ label: "Cockpit UGP", href: "/cockpit" }, { label: "Référentiel de passation" }]}>
      <PageHeader
        eyebrow="ADMINISTRATION · RÉFÉRENTIEL"
        title="Référentiel de passation"
        subtitle="Types de TDR, méthodes, seuils et bibliothèques de contenu réglementaire."
        meta={
          <>
            <span>{types.length} types · {methods.length} méthodes</span>
            <span>·</span>
            <span>
              Les éditions créent des versions : un TDR déjà soumis conserve les clauses en vigueur
              à sa date
            </span>
          </>
        }
      />

      {notice && (
        <div className={`${styles.banner} ${styles.bannerOk}`} role="status">
          <CheckmarkFilled size={16} aria-hidden />
          <span>{notice}</span>
          <button type="button" onClick={() => setNotice(null)} aria-label="Fermer">
            <Close size={16} aria-hidden />
          </button>
        </div>
      )}
      {error && (
        <div className={`${styles.banner} ${styles.bannerErr}`} role="alert">
          <WarningAltFilled size={16} aria-hidden />
          <span>{error}</span>
          <button type="button" onClick={() => setError(null)} aria-label="Fermer">
            <Close size={16} aria-hidden />
          </button>
        </div>
      )}

      <div className={styles.tabs} role="tablist">
        {SECTIONS.map((s) => (
          <button
            key={s.key}
            type="button"
            role="tab"
            aria-selected={section === s.key}
            className={`${styles.tab} ${section === s.key ? styles.tabActive : ""}`}
            onClick={() => {
              setSection(s.key);
              setHistory(null);
              setEditing(null);
            }}
          >
            {s.label}
          </button>
        ))}
      </div>

      {/* ===== Types de TDR ===== */}
      {section === "types" && (
        <Card noPadding>
          <ul className={styles.list}>
            {types.map((t) => (
              <li key={t.code} className={styles.item}>
                <div className={styles.itemMain}>
                  <div className={styles.itemHead}>
                    <strong>{t.name}</strong>
                    <span className={`${styles.code} ptn-mono`}>{t.code}</span>
                    <Tag tone="gray" size="sm">
                      {t.familyLabel}
                    </Tag>
                    {t.requiresPges && (
                      <Tag tone="yellow" size="sm">
                        PGES requis
                      </Tag>
                    )}
                  </div>
                  <span className={styles.itemMeta}>
                    {t.defaultMethod ? `Méthode par défaut ${t.defaultMethod.code} · ` : ""}
                    {t.stepCount} étapes · rédigeable par {t.allowedOrigins.join(", ").toLowerCase()}
                  </span>
                </div>
              </li>
            ))}
          </ul>
          <div className={styles.footNote}>
            <DocumentBlank size={14} aria-hidden />
            Le bailleur n’apparaît dans aucune origine : il consulte et émet des ANO, il ne rédige
            jamais de TDR (présentation UGPTN § 15.4).
          </div>
        </Card>
      )}

      {/* ===== Méthodes & seuils ===== */}
      {section === "methodes" && (
        <Card noPadding>
          <ul className={styles.list}>
            {methods.map((m) => (
              <li key={m.code} className={styles.item}>
                <div className={styles.itemMain}>
                  <div className={styles.itemHead}>
                    <strong>{m.label}</strong>
                    <span className={`${styles.code} ptn-mono`}>{m.code}</span>
                    <Tag tone="gray" size="sm">
                      {m.category.replace(/_/g, " ").toLowerCase()}
                    </Tag>
                    {m.isException && (
                      <Tag tone="red" size="sm">
                        Exception
                      </Tag>
                    )}
                  </div>
                  {m.description && <span className={styles.itemMeta}>{m.description}</span>}
                  {m.thresholds.length > 0 && (
                    <ul className={styles.thresholds}>
                      {m.thresholds.map((t) => (
                        <li key={t.id}>
                          <Money size={12} aria-hidden />
                          <span className="ptn-mono">
                            {t.minUsd ? `≥ ${(Number(t.minUsd) / 1e6).toFixed(2)} M` : ""}
                            {t.minUsd && t.maxUsd ? " · " : ""}
                            {t.maxUsd ? `< ${(Number(t.maxUsd) / 1e6).toFixed(2)} M` : ""}
                            {!t.minUsd && !t.maxUsd ? "sans borne" : " USD"}
                          </span>
                          <Tag tone={t.reviewType === "PRIOR" ? "purple" : "blue"} size="sm">
                            revue {t.reviewType === "PRIOR" ? "préalable" : "postérieure"}
                          </Tag>
                          {t.note && <span className={styles.thresholdNote}>{t.note}</span>}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </li>
            ))}
          </ul>
          <div className={styles.footNote}>
            <DocumentBlank size={14} aria-hidden />
            Les méthodes d’exception sont écartées de la déduction automatique : un gré à gré se
            justifie, il ne se déduit pas d’un montant.
          </div>
        </Card>
      )}

      {/* ===== Bibliothèques ===== */}
      {kind && (
        <>
          <div className={styles.filters}>
            <label>
              Type
              <select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)}>
                <option value="">Tous</option>
                <option value="transversal">Transversaux</option>
                {types.map((t) => (
                  <option key={t.code} value={t.code}>
                    {t.name}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Statut
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as TemplateStatusApi | "")}
              >
                <option value="PUBLIE">En vigueur</option>
                <option value="BROUILLON">Brouillons</option>
                <option value="ARCHIVE">Archivées</option>
                <option value="">Toutes versions</option>
              </select>
            </label>
            <span className={styles.count}>{entries.length} éléments</span>
          </div>

          <Card noPadding>
            {loading ? (
              <div className={styles.empty}>Chargement…</div>
            ) : entries.length === 0 ? (
              <div className={styles.empty}>Aucun élément pour ces critères.</div>
            ) : (
              <ul className={styles.list}>
                {Object.entries(byFamily).map(([familyKey, versions]) => {
                  const entry = versions[0];
                  return (
                    <li key={familyKey} className={styles.item}>
                      <div className={styles.itemMain}>
                        <div className={styles.itemHead}>
                          <strong>{entry.label}</strong>
                          <span className={`${styles.version} ptn-mono`}>v{entry.version}</span>
                          <Tag tone={STATUS_TONE[entry.status]} size="sm">
                            {STATUS_LABEL[entry.status]}
                          </Tag>
                          {isClause(entry) && (
                            <Tag tone="outline" size="sm">
                              {CLAUSE_CATEGORY_LABEL[entry.category]}
                            </Tag>
                          )}
                          {isRisk(entry) && (
                            <Tag tone={entry.level === "ELEVE" ? "red" : "yellow"} size="sm">
                              {entry.level.toLowerCase()}
                            </Tag>
                          )}
                        </div>

                        {isClause(entry) && <p className={styles.text}>{entry.text}</p>}
                        {isIndicator(entry) && (
                          <p className={styles.text}>
                            {entry.measure} — cible <strong>{entry.target}</strong>
                          </p>
                        )}
                        {isRisk(entry) && (
                          <p className={styles.text}>
                            {entry.description} <em>Atténuation : {entry.mitigation}</em>
                          </p>
                        )}

                        <span className={styles.itemMeta}>
                          {entry.tdrTypeCode ?? "transversal"}
                          {entry.effectiveFrom &&
                            ` · en vigueur depuis le ${new Date(entry.effectiveFrom).toLocaleDateString("fr-FR")}`}
                        </span>
                      </div>

                      <div className={styles.itemActions}>
                        <button
                          type="button"
                          className={styles.action}
                          onClick={async () => {
                            setHistory({
                              familyKey,
                              entries: await tdrReferentielApi.history(kind, familyKey),
                            });
                          }}
                        >
                          <Time size={14} aria-hidden /> Historique
                        </button>

                        {canEditLibrary && entry.status === "BROUILLON" && (
                          <button
                            type="button"
                            className={`${styles.action} ${styles.actionPrimary}`}
                            onClick={() =>
                              void act(
                                () => tdrReferentielApi.publish(kind, entry.id),
                                `Version ${entry.version} mise en vigueur.`,
                              )
                            }
                          >
                            <CheckmarkFilled size={14} aria-hidden /> Mettre en vigueur
                          </button>
                        )}

                        {canEditLibrary && kind === "clauses" && isClause(entry) && (
                          <button
                            type="button"
                            className={styles.action}
                            onClick={() => setEditing(entry)}
                          >
                            <Edit size={14} aria-hidden /> Nouvelle version
                          </button>
                        )}
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </Card>
        </>
      )}

      {history && (
        <Card>
          <div className={styles.sectionHead}>
            <h2 className={styles.sectionTitle}>Historique des versions</h2>
            <button type="button" className={styles.action} onClick={() => setHistory(null)}>
              <Close size={14} aria-hidden /> Fermer
            </button>
          </div>
          <p className={`${styles.itemMeta} ptn-mono`}>{history.familyKey}</p>
          <ul className={styles.historyList}>
            {history.entries.map((h) => (
              <li key={h.id}>
                <span className={`${styles.version} ptn-mono`}>v{h.version}</span>
                <Tag tone={STATUS_TONE[h.status]} size="sm">
                  {STATUS_LABEL[h.status]}
                </Tag>
                <span className={styles.historyDate}>
                  {h.effectiveFrom
                    ? `en vigueur le ${new Date(h.effectiveFrom).toLocaleDateString("fr-FR")}`
                    : `créée le ${new Date(h.createdAt).toLocaleDateString("fr-FR")}`}
                  {h.supersededAt &&
                    ` · remplacée le ${new Date(h.supersededAt).toLocaleDateString("fr-FR")}`}
                </span>
                {isClause(h) && <p className={styles.text}>{h.text}</p>}
              </li>
            ))}
          </ul>
        </Card>
      )}

      {editing && (
        <ClauseEditor
          clause={editing}
          onCancel={() => setEditing(null)}
          onSaved={async () => {
            setEditing(null);
            setNotice("Nouvelle version créée en brouillon. Mettez-la en vigueur pour qu’elle s’applique.");
            await loadLibrary();
          }}
        />
      )}
    </Shell>
  );
}

// ============================================================

function ClauseEditor({
  clause,
  onCancel,
  onSaved,
}: {
  clause: ClauseApi;
  onCancel: () => void;
  onSaved: () => void | Promise<void>;
}) {
  const [label, setLabel] = useState(clause.label);
  const [text, setText] = useState(clause.text);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async () => {
    setBusy(true);
    setError(null);
    try {
      await tdrReferentielApi.draftClause(
        { tdrTypeCode: clause.tdrTypeCode ?? undefined, category: clause.category, label, text },
        clause.familyKey,
      );
      await onSaved();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Enregistrement impossible.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Card>
      <div className={styles.sectionHead}>
        <h2 className={styles.sectionTitle}>
          Nouvelle version — v{clause.version + 1}
        </h2>
        <button type="button" className={styles.action} onClick={onCancel}>
          <Close size={14} aria-hidden /> Annuler
        </button>
      </div>

      <p className={styles.editorHint}>
        La version {clause.version} restera consultable et continuera de s’appliquer aux TDR qui la
        citent. La nouvelle est créée en brouillon : elle n’entre en vigueur qu’après mise en
        service explicite.
      </p>

      <label className={styles.field}>
        Libellé
        <input value={label} onChange={(e) => setLabel(e.target.value)} />
      </label>

      <label className={styles.field}>
        Texte inséré dans le TDR
        <textarea rows={6} value={text} onChange={(e) => setText(e.target.value)} />
      </label>

      {error && (
        <div className={`${styles.banner} ${styles.bannerErr}`} role="alert">
          <WarningAltFilled size={16} aria-hidden /> <span>{error}</span>
        </div>
      )}

      <div className={styles.editorActions}>
        <button type="button" className={styles.action} onClick={onCancel} disabled={busy}>
          Annuler
        </button>
        <button
          type="button"
          className={`${styles.action} ${styles.actionPrimary}`}
          disabled={busy || label.trim().length < 3 || text.trim().length < 20}
          onClick={() => void submit()}
        >
          {busy ? "Enregistrement…" : "Créer le brouillon"}
        </button>
      </div>
    </Card>
  );
}
