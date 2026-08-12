"use client";

/**
 * Registre des comptes — administration.
 *
 * Aucune suppression n'est offerte : le cycle de vie va de INVITE à
 * ARCHIVE. Il faut pouvoir répondre à « qui avait accès à quoi, et
 * quand » plusieurs années après les faits.
 */

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Shell } from "@/components/shell/Shell";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card } from "@/components/ui/Card";
import { Tag } from "@/components/ui/Tag";
import { useAuth } from "@/components/auth/AuthContext";
import {
  accountsApi,
  type AccountListItem,
  type UserStatusApi,
} from "@/lib/api";
import {
  Add,
  Locked,
  Renew,
  Search,
  Time,
  UserFollow,
  WarningAltFilled,
} from "@carbon/icons-react";
import styles from "./comptes.module.scss";

const STATUS: Record<UserStatusApi, { label: string; tone: "blue" | "green" | "yellow" | "red" | "gray" }> = {
  INVITE: { label: "Invité", tone: "blue" },
  ACTIF: { label: "Actif", tone: "green" },
  SUSPENDU: { label: "Suspendu", tone: "yellow" },
  EXPIRE: { label: "Expiré", tone: "red" },
  ARCHIVE: { label: "Archivé", tone: "gray" },
};

const FILTERS: Array<{ key: UserStatusApi | "all"; label: string }> = [
  { key: "all", label: "Tous" },
  { key: "INVITE", label: "Invités" },
  { key: "ACTIF", label: "Actifs" },
  { key: "SUSPENDU", label: "Suspendus" },
  { key: "EXPIRE", label: "Expirés" },
  { key: "ARCHIVE", label: "Archivés" },
];

export function AccountsListClient() {
  const { can, loading: authLoading, user } = useAuth();

  const [items, setItems] = useState<AccountListItem[]>([]);
  const [total, setTotal] = useState(0);
  const [status, setStatus] = useState<UserStatusApi | "all">("all");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reissued, setReissued] = useState<{ name: string; password: string } | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await accountsApi.list({
        status: status === "all" ? undefined : status,
        search: search.trim() || undefined,
      });
      setItems(response.items);
      setTotal(response.total);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Chargement impossible.");
    } finally {
      setLoading(false);
    }
  }, [status, search]);

  useEffect(() => {
    if (authLoading || !user) return;
    const timer = window.setTimeout(() => void load(), search ? 300 : 0);
    return () => window.clearTimeout(timer);
  }, [authLoading, user, load, search]);

  const reissuePassword = async (account: AccountListItem) => {
    try {
      const result = await accountsApi.resetPassword(account.id);
      setReissued({
        name: `${account.firstName} ${account.lastName}`,
        password: result.temporaryPassword,
      });
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Réémission impossible.");
    }
  };

  if (authLoading) {
    return <div className={styles.gate}>Chargement de la session…</div>;
  }

  if (!user || !can("admin:users")) {
    return (
      <div className={styles.gate}>
        <Locked size={32} aria-hidden />
        <h1>Habilitation insuffisante</h1>
        <p>
          L’administration des comptes est réservée au sous-rôle UGP «&nbsp;Responsable
          Informatique&nbsp;».
        </p>
        {!user && (
          <Link href="/login" className={styles.gateLink}>
            Aller à la connexion
          </Link>
        )}
      </div>
    );
  }

  return (
    <Shell crumbs={[{ label: "Cockpit UGP", href: "/cockpit" }, { label: "Comptes" }]}>
      <PageHeader
        eyebrow="ADMINISTRATION · HABILITATIONS"
        title="Registre des comptes"
        subtitle="Chaque compte porte une ou plusieurs habilitations, bornées par un périmètre et une durée."
        meta={
          <>
            <span>
              <strong>{total}</strong> compte{total > 1 ? "s" : ""}
            </span>
            <span>·</span>
            <span>Aucune suppression — archivage seul, pour préserver la piste d’audit</span>
          </>
        }
        actions={
          <Link href="/admin/comptes/nouveau" className={styles.btnPrimary}>
            <Add size={16} aria-hidden /> Créer un compte
          </Link>
        }
      />

      {reissued && (
        <div className={styles.reissued} role="alert">
          <div>
            <strong>Nouveau mot de passe temporaire — {reissued.name}</strong>
            <p>Affiché une seule fois. Transmettez-le par un canal sûr.</p>
          </div>
          <code className="ptn-mono">{reissued.password}</code>
          <button type="button" onClick={() => setReissued(null)} className={styles.dismiss}>
            Fermer
          </button>
        </div>
      )}

      <div className={styles.toolbar}>
        <div className={styles.searchBox}>
          <Search size={16} aria-hidden />
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Rechercher par nom ou adresse électronique…"
            aria-label="Rechercher un compte"
          />
        </div>
        <div className={styles.pills}>
          {FILTERS.map((f) => (
            <button
              key={f.key}
              type="button"
              onClick={() => setStatus(f.key)}
              className={`${styles.pill} ${status === f.key ? styles.pillActive : ""}`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {error && (
        <div className={styles.error} role="alert">
          <WarningAltFilled size={16} aria-hidden /> {error}
        </div>
      )}

      <Card noPadding>
        {loading ? (
          <div className={styles.empty}>Chargement…</div>
        ) : items.length === 0 ? (
          <div className={styles.empty}>
            <UserFollow size={24} aria-hidden />
            <p>Aucun compte ne correspond à ces critères.</p>
          </div>
        ) : (
          <ul className={styles.list}>
            {items.map((account) => {
              const statusDef = STATUS[account.status];
              const primary = account.assignments.find((a) => a.isPrimary) ?? account.assignments[0];
              const sensitive = account.assignments.some((a) => a.subrole.isSensitive);
              const expiring = account.assignments.find(
                (a) =>
                  a.validUntil &&
                  new Date(a.validUntil).getTime() - Date.now() < 30 * 86_400_000,
              );

              return (
                <li key={account.id} className={styles.item}>
                  <Link href={`/admin/comptes/${account.id}`} className={styles.itemMain}>
                    <div className={styles.itemHead}>
                      <strong>
                        {account.firstName} {account.lastName}
                      </strong>
                      <Tag tone={statusDef.tone} size="sm">
                        {statusDef.label}
                      </Tag>
                      {sensitive && (
                        <Tag tone="red" size="sm">
                          Habilitation sensible
                        </Tag>
                      )}
                    </div>
                    <span className={`${styles.itemEmail} ptn-mono`}>{account.email}</span>
                    <span className={styles.itemRole}>
                      {primary
                        ? `${primary.subrole.label} · ${primary.organisation.name}`
                        : "Aucune habilitation active"}
                      {account.assignments.length > 1 &&
                        ` · +${account.assignments.length - 1} autre${account.assignments.length > 2 ? "s" : ""}`}
                    </span>
                    {expiring?.validUntil && (
                      <span className={styles.itemExpiry}>
                        <Time size={12} aria-hidden /> Habilitation
                        {expiring.missionRef ? ` ${expiring.missionRef}` : ""} expire le{" "}
                        {new Date(expiring.validUntil).toLocaleDateString("fr-FR")}
                      </span>
                    )}
                  </Link>

                  <div className={styles.itemMeta}>
                    <span className={styles.itemLogin}>
                      {account.lastLoginAt
                        ? `Dernière connexion ${new Date(account.lastLoginAt).toLocaleDateString("fr-FR")}`
                        : "Jamais connecté"}
                    </span>
                    {account.mustChangePassword && account.status !== "ARCHIVE" && (
                      <button
                        type="button"
                        className={styles.action}
                        onClick={() => void reissuePassword(account)}
                      >
                        <Renew size={14} aria-hidden /> Réémettre le mot de passe
                      </button>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </Card>
    </Shell>
  );
}
