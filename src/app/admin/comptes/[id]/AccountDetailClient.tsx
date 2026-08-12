"use client";

/**
 * Fiche d'un compte — administration.
 *
 * Réunit ce qu'un contrôleur demandera : qui est cette personne, quelles
 * habilitations elle détient, qui les lui a accordées et quand, quels
 * engagements elle a signés. Aucune suppression n'est offerte — le cycle
 * de vie s'arrête à l'archivage.
 */

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Shell } from "@/components/shell/Shell";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card } from "@/components/ui/Card";
import { Tag } from "@/components/ui/Tag";
import { useAuth } from "@/components/auth/AuthContext";
import {
  accountsApi,
  referentielApi,
  ApiError,
  type AccountDetail,
  type AddAssignmentPayload,
  type ComponentApi,
  type FamilyApi,
  type Guardrail,
  type OrganisationApi,
  type ProfileKeyApi,
  type SubroleApi,
  type UserStatusApi,
} from "@/lib/api";
import {
  Add,
  ArrowLeft,
  CheckmarkFilled,
  Close,
  Locked,
  Renew,
  Time,
  TrashCan,
  WarningAltFilled,
} from "@carbon/icons-react";
import styles from "./account-detail.module.scss";

const STATUS: Record<UserStatusApi, { label: string; tone: "blue" | "green" | "yellow" | "red" | "gray" }> = {
  INVITE: { label: "Invité", tone: "blue" },
  ACTIF: { label: "Actif", tone: "green" },
  SUSPENDU: { label: "Suspendu", tone: "yellow" },
  EXPIRE: { label: "Expiré", tone: "red" },
  ARCHIVE: { label: "Archivé", tone: "gray" },
};

type PendingAction = "suspendre" | "archiver" | { revoke: string } | null;

export function AccountDetailClient({ accountId }: { accountId: string }) {
  const { can, loading: authLoading, user } = useAuth();

  const [account, setAccount] = useState<AccountDetail | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [reissued, setReissued] = useState<string | null>(null);
  const [pending, setPending] = useState<PendingAction>(null);
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  const [showAddForm, setShowAddForm] = useState(false);

  const [families, setFamilies] = useState<FamilyApi[]>([]);
  const [organisations, setOrganisations] = useState<OrganisationApi[]>([]);
  const [components, setComponents] = useState<ComponentApi[]>([]);

  const load = useCallback(async () => {
    try {
      setAccount(await accountsApi.get(accountId));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Compte introuvable.");
    }
  }, [accountId]);

  useEffect(() => {
    if (authLoading || !user) return;
    void load();
    Promise.all([referentielApi.familles(), referentielApi.organisations(), referentielApi.composantes()])
      .then(([f, o, c]) => {
        setFamilies(f);
        setOrganisations(o);
        setComponents(c);
      })
      .catch(() => setError("Référentiel indisponible."));
  }, [authLoading, user, load]);

  const runAction = async (action: () => Promise<unknown>, message: string) => {
    setBusy(true);
    setError(null);
    try {
      await action();
      setNotice(message);
      setPending(null);
      setReason("");
      await load();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "L’opération a échoué.");
    } finally {
      setBusy(false);
    }
  };

  if (authLoading) return <div className={styles.gate}>Chargement…</div>;

  if (!user || !can("admin:users")) {
    return (
      <div className={styles.gate}>
        <Locked size={32} aria-hidden />
        <h1>Habilitation insuffisante</h1>
        <p>L’administration des comptes est réservée au sous-rôle UGP « Responsable Informatique ».</p>
      </div>
    );
  }

  if (!account) {
    return (
      <div className={styles.gate}>
        {error ? <WarningAltFilled size={32} aria-hidden /> : null}
        <p>{error ?? "Chargement de la fiche…"}</p>
        <Link href="/admin/comptes" className={styles.gateLink}>
          Retour au registre
        </Link>
      </div>
    );
  }

  const statusDef = STATUS[account.status];
  const activeAssignments = account.assignments.filter((a) => a.status === "ACTIVE");
  const pastAssignments = account.assignments.filter((a) => a.status !== "ACTIVE");
  const isSelf = account.id === user.userId;

  return (
    <Shell
      crumbs={[
        { label: "Cockpit UGP", href: "/cockpit" },
        { label: "Comptes", href: "/admin/comptes" },
        { label: `${account.firstName} ${account.lastName}` },
      ]}
    >
      <PageHeader
        eyebrow="ADMINISTRATION · FICHE DE COMPTE"
        title={`${account.firstName} ${account.lastName}`}
        subtitle={account.email}
        meta={
          <>
            <Tag tone={statusDef.tone} size="sm">
              {statusDef.label}
            </Tag>
            <span>·</span>
            <span>
              {activeAssignments.length} habilitation{activeAssignments.length > 1 ? "s" : ""} active
              {activeAssignments.length > 1 ? "s" : ""}
            </span>
            <span>·</span>
            <span>
              {account.lastLoginAt
                ? `Dernière connexion ${new Date(account.lastLoginAt).toLocaleString("fr-FR")}`
                : "Jamais connecté"}
            </span>
          </>
        }
        actions={
          <Link href="/admin/comptes" className={styles.btnGhost}>
            <ArrowLeft size={14} aria-hidden /> Registre
          </Link>
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

      {reissued && (
        <div className={`${styles.banner} ${styles.bannerPwd}`} role="alert">
          <Locked size={16} aria-hidden />
          <div>
            <strong>Nouveau mot de passe temporaire</strong>
            <p>Affiché une seule fois. Transmettez-le de vive voix ou par un canal sûr.</p>
          </div>
          <code className="ptn-mono">{reissued}</code>
          <button type="button" onClick={() => setReissued(null)} aria-label="Fermer">
            <Close size={16} aria-hidden />
          </button>
        </div>
      )}

      <div className={styles.grid}>
        {/* ===== Identité & engagements ===== */}
        <Card>
          <h2 className={styles.sectionTitle}>Identité</h2>
          <dl className={styles.kv}>
            <Row label="Adresse électronique" value={account.email} mono />
            <Row label="Téléphone" value={account.phone ?? "—"} mono={Boolean(account.phone)} />
            <Row label="Langue" value={account.preferredLanguage} />
            <Row label="Compte créé le" value={new Date(account.createdAt).toLocaleDateString("fr-FR")} />
            <Row
              label="Créé par"
              value={
                account.createdBy
                  ? `${account.createdBy.firstName} ${account.createdBy.lastName}`
                  : "Seed d’amorçage"
              }
            />
          </dl>

          <h3 className={styles.subTitle}>Engagements</h3>
          <p className={styles.hint}>
            Signés par la personne elle-même à sa première connexion. Un administrateur ne peut pas
            déclarer un conflit d’intérêts à sa place (MEP § 5.2.8).
          </p>
          <ul className={styles.engagements}>
            <Engagement label="Code de conduite" at={account.codeOfConductSignedAt} />
            <Engagement label="Déclaration de conflit d’intérêts" at={account.coiDeclaredAt} />
            <Engagement label="Parcours d’accueil" at={account.onboardingCompletedAt} />
          </ul>
          {account.status === "ACTIF" && !account.onboardingCompletedAt && (
            <div className={styles.inlineWarn}>
              <WarningAltFilled size={14} aria-hidden />
              Compte actif sans engagements signés. Le parcours d’accueil n’est pas encore branché
              sur l’API — cette personne ne peut donc pas siéger en commission tant que sa
              déclaration n’est pas recueillie.
            </div>
          )}
        </Card>

        {/* ===== Cycle de vie ===== */}
        <Card>
          <h2 className={styles.sectionTitle}>Cycle de vie</h2>
          <p className={styles.hint}>
            Aucune suppression : la piste d’audit doit rester reconstituable des années après.
          </p>

          <div className={styles.actions}>
            {account.status !== "ARCHIVE" && (
              <button
                type="button"
                className={styles.action}
                disabled={busy}
                onClick={() =>
                  void runAction(async () => {
                    const r = await accountsApi.resetPassword(account.id);
                    setReissued(r.temporaryPassword);
                  }, "Mot de passe temporaire réémis.")
                }
              >
                <Renew size={14} aria-hidden /> Réémettre un mot de passe
              </button>
            )}

            {account.status === "SUSPENDU" ? (
              <button
                type="button"
                className={styles.action}
                disabled={busy}
                onClick={() =>
                  void runAction(() => accountsApi.reactivate(account.id), "Compte réactivé.")
                }
              >
                <CheckmarkFilled size={14} aria-hidden /> Lever la suspension
              </button>
            ) : (
              account.status !== "ARCHIVE" && (
                <button
                  type="button"
                  className={styles.action}
                  disabled={busy || isSelf}
                  title={isSelf ? "Vous ne pouvez pas suspendre votre propre compte." : undefined}
                  onClick={() => setPending("suspendre")}
                >
                  <Time size={14} aria-hidden /> Suspendre
                </button>
              )
            )}

            {account.status !== "ARCHIVE" && (
              <button
                type="button"
                className={`${styles.action} ${styles.actionDanger}`}
                disabled={busy || isSelf}
                title={isSelf ? "Vous ne pouvez pas archiver votre propre compte." : undefined}
                onClick={() => setPending("archiver")}
              >
                <TrashCan size={14} aria-hidden /> Archiver
              </button>
            )}
          </div>

          {(pending === "suspendre" || pending === "archiver") && (
            <ReasonPrompt
              title={pending === "suspendre" ? "Suspendre ce compte" : "Archiver ce compte"}
              description={
                pending === "suspendre"
                  ? "Les sessions en cours sont closes immédiatement. Le compte pourra être réactivé."
                  : "Toutes les habilitations sont révoquées et le compte ne pourra plus se connecter. L’historique est conservé."
              }
              reason={reason}
              onReason={setReason}
              busy={busy}
              onCancel={() => {
                setPending(null);
                setReason("");
              }}
              onConfirm={() =>
                void runAction(
                  () =>
                    pending === "suspendre"
                      ? accountsApi.suspend(account.id, reason)
                      : accountsApi.archive(account.id, reason),
                  pending === "suspendre" ? "Compte suspendu." : "Compte archivé.",
                )
              }
            />
          )}
        </Card>
      </div>

      {/* ===== Habilitations ===== */}
      <Card>
        <div className={styles.sectionHead}>
          <h2 className={styles.sectionTitle}>Habilitations actives</h2>
          {account.status !== "ARCHIVE" && (
            <button
              type="button"
              className={styles.btnPrimary}
              onClick={() => setShowAddForm((v) => !v)}
            >
              <Add size={16} aria-hidden /> {showAddForm ? "Annuler" : "Ajouter une habilitation"}
            </button>
          )}
        </div>

        {showAddForm && (
          <AddAssignmentForm
            accountId={account.id}
            families={families}
            organisations={organisations}
            components={components}
            onDone={async (label) => {
              setShowAddForm(false);
              setNotice(`Habilitation « ${label} » accordée.`);
              await load();
            }}
          />
        )}

        <ul className={styles.assignments}>
          {activeAssignments.map((a) => (
            <li key={a.id} className={styles.assignment}>
              <div className={styles.assignmentMain}>
                <div className={styles.assignmentHead}>
                  <strong>{a.subrole.label}</strong>
                  {a.isPrimary && (
                    <Tag tone="blue" size="sm">
                      Principale
                    </Tag>
                  )}
                  {a.subrole.isSensitive && (
                    <Tag tone="red" size="sm">
                      Sensible
                    </Tag>
                  )}
                  <Tag tone="gray" size="sm">
                    {a.profile}
                  </Tag>
                </div>
                <span className={styles.assignmentOrg}>{a.organisation.fullName}</span>
                <span className={styles.assignmentMeta}>
                  {a.componentCode && `Composante ${a.componentCode} · `}
                  {a.provinceCode && `${a.provinceCode} · `}
                  {a.missionRef && (
                    <>
                      Mission <span className="ptn-mono">{a.missionRef}</span> ·{" "}
                    </>
                  )}
                  Accordée le {new Date(a.createdAt).toLocaleDateString("fr-FR")}
                  {a.grantedBy && ` par ${a.grantedBy.firstName} ${a.grantedBy.lastName}`}
                </span>
                {a.validUntil && (
                  <span className={styles.assignmentExpiry}>
                    <Time size={12} aria-hidden /> Expire le{" "}
                    {new Date(a.validUntil).toLocaleDateString("fr-FR")}
                  </span>
                )}
                {a.justification && (
                  <span className={styles.assignmentJustif}>« {a.justification} »</span>
                )}
              </div>

              {account.status !== "ARCHIVE" && (
                <button
                  type="button"
                  className={styles.revoke}
                  disabled={busy}
                  onClick={() => setPending({ revoke: a.id })}
                >
                  Révoquer
                </button>
              )}
            </li>
          ))}
        </ul>

        {typeof pending === "object" && pending !== null && "revoke" in pending && (
          <ReasonPrompt
            title="Révoquer cette habilitation"
            description="Les sessions adossées à cette habilitation sont closes. Elle reste visible dans l’historique."
            reason={reason}
            onReason={setReason}
            busy={busy}
            onCancel={() => {
              setPending(null);
              setReason("");
            }}
            onConfirm={() =>
              void runAction(
                () => accountsApi.revokeAssignment(account.id, pending.revoke, reason),
                "Habilitation révoquée.",
              )
            }
          />
        )}

        {pastAssignments.length > 0 && (
          <>
            <h3 className={styles.subTitle}>Historique</h3>
            <ul className={styles.assignments}>
              {pastAssignments.map((a) => (
                <li key={a.id} className={`${styles.assignment} ${styles.assignmentPast}`}>
                  <div className={styles.assignmentMain}>
                    <div className={styles.assignmentHead}>
                      <strong>{a.subrole.label}</strong>
                      <Tag tone="gray" size="sm">
                        {a.status === "REVOKED" ? "Révoquée" : a.status}
                      </Tag>
                    </div>
                    <span className={styles.assignmentMeta}>
                      {a.organisation.name}
                      {a.revokedAt && ` · le ${new Date(a.revokedAt).toLocaleDateString("fr-FR")}`}
                      {a.revokeReason && ` — ${a.revokeReason}`}
                    </span>
                  </div>
                </li>
              ))}
            </ul>
          </>
        )}
      </Card>
    </Shell>
  );
}

// ============================================================

function Row({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className={styles.kvRow}>
      <dt>{label}</dt>
      <dd className={mono ? "ptn-mono" : ""}>{value}</dd>
    </div>
  );
}

function Engagement({ label, at }: { label: string; at: string | null }) {
  return (
    <li className={at ? styles.engagementOk : styles.engagementPending}>
      <CheckmarkFilled size={14} aria-hidden />
      <span>{label}</span>
      <span className={styles.engagementDate}>
        {at ? new Date(at).toLocaleDateString("fr-FR") : "Non signé"}
      </span>
    </li>
  );
}

function ReasonPrompt({
  title,
  description,
  reason,
  onReason,
  onCancel,
  onConfirm,
  busy,
}: {
  title: string;
  description: string;
  reason: string;
  onReason: (v: string) => void;
  onCancel: () => void;
  onConfirm: () => void;
  busy: boolean;
}) {
  return (
    <div className={styles.prompt}>
      <strong>{title}</strong>
      <p>{description}</p>
      <label htmlFor="reason">Motif — consigné dans la piste d’audit</label>
      <textarea
        id="reason"
        rows={2}
        value={reason}
        onChange={(e) => onReason(e.target.value)}
        placeholder="Fin de mission, changement d’affectation, décision n°…"
      />
      <div className={styles.promptActions}>
        <button type="button" onClick={onCancel} className={styles.btnGhost} disabled={busy}>
          Annuler
        </button>
        <button
          type="button"
          onClick={onConfirm}
          className={styles.btnPrimary}
          disabled={busy || reason.trim().length < 5}
        >
          {busy ? "En cours…" : "Confirmer"}
        </button>
      </div>
    </div>
  );
}

// ============================================================
// Ajout d'une habilitation
// ============================================================

function AddAssignmentForm({
  accountId,
  families,
  organisations,
  components,
  onDone,
}: {
  accountId: string;
  families: FamilyApi[];
  organisations: OrganisationApi[];
  components: ComponentApi[];
  onDone: (label: string) => void | Promise<void>;
}) {
  const [profile, setProfile] = useState<ProfileKeyApi | "">("");
  const [subroleCode, setSubroleCode] = useState("");
  const [organisationId, setOrganisationId] = useState("");
  const [componentCode, setComponentCode] = useState("");
  const [missionRef, setMissionRef] = useState("");
  const [validUntil, setValidUntil] = useState("");
  const [justification, setJustification] = useState("");
  const [isPrimary, setIsPrimary] = useState(false);

  const [blockers, setBlockers] = useState<Guardrail[]>([]);
  const [warnings, setWarnings] = useState<Guardrail[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const allProfiles = useMemo(() => families.flatMap((f) => f.profiles), [families]);
  const subroles: SubroleApi[] = useMemo(
    () => allProfiles.find((p) => p.key === profile)?.subroles ?? [],
    [allProfiles, profile],
  );
  const subrole = subroles.find((s) => s.code === subroleCode);

  const payload: AddAssignmentPayload | null =
    profile && subroleCode && organisationId
      ? {
          profile,
          subroleCode,
          organisationId,
          componentCode: componentCode || undefined,
          missionRef: missionRef.trim() || undefined,
          validUntil: validUntil || undefined,
          justification: justification.trim() || undefined,
          isPrimary,
        }
      : null;

  const payloadKey = JSON.stringify(payload);

  // Les règles sont évaluées par le backend : les dupliquer ici les ferait
  // dériver tôt ou tard.
  useEffect(() => {
    if (!payload) {
      setBlockers([]);
      setWarnings([]);
      return;
    }
    let cancelled = false;
    accountsApi
      .checkAssignment(accountId, payload)
      .then((report) => {
        if (cancelled) return;
        setBlockers(report.blockers);
        setWarnings(report.warnings);
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [payloadKey, accountId]);

  const submit = async () => {
    if (!payload) return;
    setBusy(true);
    setError(null);
    try {
      const result = await accountsApi.addAssignment(accountId, payload);
      await onDone(result.assignment.subroleLabel);
    } catch (e) {
      setError(
        e instanceof ApiError
          ? e.blockers.map((b) => b.message).join(" · ") || e.message
          : "L’ajout a échoué.",
      );
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className={styles.addForm}>
      <div className={styles.addRow}>
        <label>
          Profil
          <select
            value={profile}
            onChange={(e) => {
              setProfile(e.target.value as ProfileKeyApi);
              setSubroleCode("");
            }}
          >
            <option value="">Sélectionner…</option>
            {allProfiles.map((p) => (
              <option key={p.key} value={p.key}>
                {p.label}
              </option>
            ))}
          </select>
        </label>

        <label>
          Sous-rôle
          <select
            value={subroleCode}
            onChange={(e) => setSubroleCode(e.target.value)}
            disabled={!profile}
          >
            <option value="">Sélectionner…</option>
            {subroles.map((s) => (
              <option key={s.code} value={s.code}>
                {s.label}
                {s.isUnique ? " · poste unique" : ""}
                {s.isSensitive ? " · sensible" : ""}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div className={styles.addRow}>
        <label>
          Organisation
          <select value={organisationId} onChange={(e) => setOrganisationId(e.target.value)}>
            <option value="">Sélectionner…</option>
            {organisations.map((o) => (
              <option key={o.id} value={o.id}>
                {o.code} — {o.fullName}
              </option>
            ))}
          </select>
        </label>

        <label>
          Composante {subrole?.requiresComponent && <span className={styles.req}>requise</span>}
          <select value={componentCode} onChange={(e) => setComponentCode(e.target.value)}>
            <option value="">Aucune</option>
            {components.map((c) => (
              <option key={c.code} value={c.code}>
                {c.code} · {c.shortLabel}
              </option>
            ))}
          </select>
        </label>
      </div>

      {subrole?.requiresMission && (
        <div className={styles.addRow}>
          <label>
            Référence de mission <span className={styles.req}>requise</span>
            <input
              value={missionRef}
              onChange={(e) => setMissionRef(e.target.value)}
              placeholder="AUD-EXT-2026-T1"
            />
          </label>
          <label>
            Fin d’habilitation <span className={styles.req}>requise</span>
            <input type="date" value={validUntil} onChange={(e) => setValidUntil(e.target.value)} />
          </label>
        </div>
      )}

      {subrole?.isSensitive && (
        <label className={styles.addFull}>
          Justification <span className={styles.req}>requise</span>
          <textarea
            rows={2}
            value={justification}
            onChange={(e) => setJustification(e.target.value)}
            placeholder="Nomination par décision n°… du …"
          />
        </label>
      )}

      <label className={styles.checkRow}>
        <input type="checkbox" checked={isPrimary} onChange={(e) => setIsPrimary(e.target.checked)} />
        Faire de cette habilitation celle chargée par défaut à la connexion
      </label>

      {blockers.map((b) => (
        <div key={b.code + b.message} className={styles.guardBlocker}>
          <WarningAltFilled size={14} aria-hidden /> {b.message}
        </div>
      ))}
      {warnings.map((w) => (
        <div key={w.code + w.message} className={styles.guardWarning}>
          <WarningAltFilled size={14} aria-hidden /> {w.message}
        </div>
      ))}
      {error && <div className={styles.guardBlocker}>{error}</div>}

      <div className={styles.promptActions}>
        <button
          type="button"
          className={styles.btnPrimary}
          disabled={!payload || blockers.length > 0 || busy}
          onClick={() => void submit()}
        >
          {busy ? "Ajout…" : "Accorder l’habilitation"}
        </button>
      </div>
    </div>
  );
}
