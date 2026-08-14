"use client";

/**
 * Référence vivante des fondations visuelles.
 *
 * Rôle : servir de contrat visuel partagé avant de refondre les 61 écrans.
 * Tout ce qui est montré ici est branché sur les vraies variables — si un
 * token change, cette page change. Ce n'est pas une maquette.
 *
 * Composants Carbon utilisés : Button, Tag, TextInput, Dropdown, Checkbox,
 * InlineNotification, Tile, DataTable, Tabs, ProgressIndicator.
 */

import { useState } from "react";
import {
  Button,
  Checkbox,
  ContentSwitcher,
  DataTable,
  Dropdown,
  InlineNotification,
  Switch,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableHeader,
  TableRow,
  Tag,
  TextInput,
} from "@carbon/react";
import { Asleep, Light, WarningAlt } from "@carbon/icons-react";
import { useProfile } from "@/components/profile/ProfileContext";
import { PROFILES, PROFILE_KEYS, type ProfileKey } from "@/lib/profiles";
import { BrandLockup } from "@/components/brand/BrandLockup";
import { PartnerMarks } from "@/components/brand/PartnerMarks";
import { cn } from "@/lib/cn";

/* ------------------------------------------------------------------ */

function Section({
  title,
  intent,
  children,
}: {
  title: string;
  intent: string;
  children: React.ReactNode;
}) {
  return (
    <section className="border-subtle border-t pt-6">
      <h2 className="text-heading-03 text-primary">{title}</h2>
      <p className="text-body text-secondary mt-1 max-w-[68ch]">{intent}</p>
      <div className="mt-5">{children}</div>
    </section>
  );
}

function Swatch({ token, label }: { token: string; label: string }) {
  return (
    <div className="flex flex-col gap-1.5">
      <div
        className="border-subtle h-14 w-full border"
        style={{ background: `var(${token})` }}
      />
      <div>
        <div className="text-caption text-primary font-medium">{label}</div>
        <code className="text-caption text-helper mono">{token}</code>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */

const TYPE_SCALE = [
  { cls: "text-heading-06", name: "heading-06", px: "42px", use: "Titre de page publique" },
  { cls: "text-heading-05", name: "heading-05", px: "32px", use: "Titre d'écran" },
  { cls: "text-heading-04", name: "heading-04", px: "28px", use: "Valeur de KPI" },
  { cls: "text-heading-03", name: "heading-03", px: "20px", use: "Titre de section" },
  { cls: "text-heading-02", name: "heading-02", px: "16px", use: "Titre de carte" },
  { cls: "text-heading-01", name: "heading-01", px: "14px", use: "Titre de sous-section" },
  { cls: "text-body-lg", name: "body-lg", px: "16px", use: "Lecture longue, champs de formulaire" },
  { cls: "text-body", name: "body", px: "14px", use: "Corps par défaut" },
  { cls: "text-caption", name: "caption", px: "12px", use: "Métadonnée — PLANCHER ABSOLU" },
];

const STATUS = [
  { label: "Succès", base: "--ptn-status-success", surface: "--ptn-status-success-surface", text: "--ptn-status-success-text" },
  { label: "Avertissement", base: "--ptn-status-warning", surface: "--ptn-status-warning-surface", text: "--ptn-status-warning-text" },
  { label: "Erreur", base: "--ptn-status-danger", surface: "--ptn-status-danger-surface", text: "--ptn-status-danger-text" },
  { label: "Information", base: "--ptn-status-info", surface: "--ptn-status-info-surface", text: "--ptn-status-info-text" },
  { label: "Généré par IA", base: "--ptn-status-ai", surface: "--ptn-status-ai-surface", text: "--ptn-status-ai-text" },
];

const ANO_ROWS = [
  { id: "PTN-2026-019", marche: "Plateforme d'identité numérique", montant: "8 700 000", delai: "14,2 j", statut: "En attente" },
  { id: "PTN-2026-024", marche: "Extension backbone Kasaï", montant: "31 400 000", delai: "6,0 j", statut: "Approuvé" },
  { id: "PTN-2026-031", marche: "Hubs numériques universitaires", montant: "2 150 000", delai: "22,8 j", statut: "En retard" },
];

const HEADERS = [
  { key: "id", header: "Référence" },
  { key: "marche", header: "Marché" },
  { key: "montant", header: "Montant (USD)" },
  { key: "delai", header: "Délai ANO" },
  { key: "statut", header: "Statut" },
];

/* ------------------------------------------------------------------ */

export function DesignSystemClient() {
  const { profile, setProfile, theme, setTheme } = useProfile();
  const [zoomNote, setZoomNote] = useState(false);
  const isDark = theme === "g100";

  return (
    <main id="ptn-main" className="bg-background min-h-screen">
      {/* ---------- Barre de contrôle ---------- */}
      <header className="border-subtle bg-layer sticky top-0 z-10 border-b">
        <div className="mx-auto flex max-w-[1200px] flex-wrap items-center gap-4 px-6 py-3">
          <BrandLockup tone="clair" height={26} />
          <div className="ml-auto flex flex-wrap items-center gap-3">
            <label className="text-caption text-secondary" htmlFor="ds-profile">
              Profil actif
            </label>
            <select
              id="ds-profile"
              value={profile}
              onChange={(e) => setProfile(e.target.value as ProfileKey)}
              className="border-strong bg-field text-body text-primary h-8 border px-2"
            >
              {PROFILE_KEYS.map((k) => (
                <option key={k} value={k}>
                  {PROFILES[k].label}
                </option>
              ))}
            </select>
            <Button
              size="sm"
              kind="tertiary"
              renderIcon={isDark ? Light : Asleep}
              onClick={() => setTheme(isDark ? "g10" : "g100")}
            >
              {isDark ? "Thème clair" : "Thème sombre"}
            </Button>
          </div>
        </div>
      </header>

      <div className="mx-auto flex max-w-[1200px] flex-col gap-10 px-6 py-10">
        {/* ---------- Intro ---------- */}
        <div>
          <p className="text-caption text-accent font-medium tracking-wider uppercase">
            Fondations
          </p>
          <h1 className="text-heading-05 text-primary mt-2">Design system PTN-RDC</h1>
          <p className="text-body-lg text-secondary mt-3 max-w-[68ch]">
            Carbon v11 pour les composants, Tailwind pour la mise en page. Aucune couleur
            n&apos;est écrite en dur : chaque utilitaire pointe vers une variable Carbon ou
            projet. Changez le profil ou le thème ci-dessus — toute la page suit, sans
            JavaScript de theming.
          </p>
        </div>

        {/* ---------- Typographie ---------- */}
        <Section
          title="Échelle typographique"
          intent="Exprimée en rem, pas en px : un utilisateur qui agrandit la police par défaut de son navigateur voit l'interface suivre. Plancher dur à 12px — les tailles 9, 10 et 11px de la version précédente ne sont plus atteignables."
        >
          <div className="border-subtle divide-subtle divide-y border">
            {TYPE_SCALE.map((t) => (
              <div
                key={t.name}
                className="bg-layer flex flex-wrap items-baseline gap-x-6 gap-y-1 px-4 py-3"
              >
                <span className={cn(t.cls, "text-primary min-w-[16rem]")}>
                  Décaissement trimestriel
                </span>
                <code className="text-caption text-helper mono">{t.name}</code>
                <code className="text-caption text-helper mono">{t.px}</code>
                <span className="text-caption text-secondary ml-auto">{t.use}</span>
              </div>
            ))}
          </div>

          <InlineNotification
            kind="info"
            lowContrast
            hideCloseButton
            title="Pourquoi c'est la correction la plus importante"
            subtitle="La version précédente comptait 265 déclarations en 11px et 87 en 10px : 11px y était la taille la plus fréquente de l'application. Pour un directeur de ministère de 55 ans lisant des montants de marché, c'est le premier obstacle à l'usage — avant toute considération esthétique."
            className="mt-4 max-w-none"
          />
        </Section>

        {/* ---------- Couleur ---------- */}
        <Section
          title="Surfaces et texte"
          intent="Branchées sur les tokens Carbon g10/g100. Basculez le thème : ces échantillons changent parce qu'ils lisent la variable au runtime, pas une valeur figée à la compilation."
        >
          <div className="grid grid-cols-2 gap-4 md:grid-cols-4 lg:grid-cols-6">
            <Swatch token="--cds-background" label="Fond" />
            <Swatch token="--cds-layer" label="Calque" />
            <Swatch token="--cds-layer-accent" label="Calque accentué" />
            <Swatch token="--cds-field" label="Champ" />
            <Swatch token="--cds-border-subtle" label="Bordure discrète" />
            <Swatch token="--cds-border-strong" label="Bordure forte" />
          </div>
        </Section>

        <Section
          title="Accent de profil"
          intent="Une seule variable repeint l'application pour chacun des 8 profils. La surface est dérivée par color-mix avec le fond du thème courant — elle reste donc lisible en clair comme en sombre, sans table de correspondance à maintenir."
        >
          <div className="grid grid-cols-2 gap-4 md:grid-cols-5">
            <Swatch token="--ptn-accent" label="Accent" />
            <Swatch token="--ptn-accent-hover" label="Survol" />
            <Swatch token="--ptn-accent-active" label="Actif" />
            <Swatch token="--ptn-accent-surface" label="Surface (dérivée)" />
            <Swatch token="--ptn-accent-surface-strong" label="Surface forte" />
          </div>

          <div className="bg-accent-surface border-accent mt-5 border-l-4 p-4">
            <p className="text-heading-02 text-primary">
              {PROFILES[profile].label}
            </p>
            <p className="text-body text-secondary mt-1">
              {PROFILES[profile].greeting}
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              <Tag type="blue">{PROFILES[profile].subroles.length} sous-rôles</Tag>
              {PROFILES[profile].readOnly && <Tag type="cool-gray">Lecture seule</Tag>}
              <Tag type={PROFILES[profile].canAuthorTdr ? "green" : "red"}>
                {PROFILES[profile].canAuthorTdr ? "Peut rédiger un TDR" : "Ne rédige pas de TDR"}
              </Tag>
            </div>
          </div>
        </Section>

        <Section
          title="Statuts — universels"
          intent="Jamais repeints par le profil. Un rouge doit signifier « erreur » pour les huit profils : c'est une règle de sécurité d'usage, pas une préférence graphique."
        >
          <div className="grid grid-cols-1 gap-3 md:grid-cols-5">
            {STATUS.map((s) => (
              <div key={s.label} className="border-subtle border">
                <div className="h-2" style={{ background: `var(${s.base})` }} />
                <div
                  className="p-3"
                  style={{ background: `var(${s.surface})` }}
                >
                  <div
                    className="text-heading-01"
                    style={{ color: `var(${s.text})` }}
                  >
                    {s.label}
                  </div>
                  <code className="text-caption mono text-secondary mt-1 block">
                    {s.base.replace("--ptn-status-", "")}
                  </code>
                </div>
              </div>
            ))}
          </div>
        </Section>

        <Section
          title="Identité institutionnelle"
          intent="La marque identifie, l'accent agit. Le cyan du logo ne colore jamais un élément cliquable — sans quoi rien ne distingue plus « notre logo » de « ceci se clique »."
        >
          <div className="grid gap-4 md:grid-cols-3">
            <Swatch token="--ptn-brand" label="Marque (Cyan 50)" />
            <Swatch token="--ptn-drc-yellow" label="Drapeau — jaune" />
            <Swatch token="--ptn-drc-red" label="Drapeau — rouge" />
          </div>
          <div className="mt-5 flex flex-wrap items-center gap-8">
            <div className="border-subtle bg-layer border p-5">
              <BrandLockup tone="clair" height={64} />
            </div>
            <div className="border-subtle border bg-[#161616] p-5">
              <BrandLockup tone="sombre" height={64} />
            </div>
            <div className="border-subtle bg-layer flex items-center border p-5">
              <PartnerMarks tone="clair" height={30} />
            </div>
            <div className="border-subtle flex items-center border bg-[#161616] p-5">
              <PartnerMarks tone="sombre" height={30} />
            </div>
          </div>
        </Section>

        {/* ---------- Composants Carbon ---------- */}
        <Section
          title="Composants Carbon"
          intent="Rendus par @carbon/react, pas réimplémentés. Gestion du focus, navigation clavier et sémantique ARIA sont fournies et testées en amont — c'est tout l'intérêt de la décision A."
        >
          <div className="grid gap-8 lg:grid-cols-2">
            <div className="flex flex-col gap-4">
              <h3 className="text-heading-01 text-primary">Actions</h3>
              <div className="flex flex-wrap items-start gap-3">
                <Button size="md">Soumettre pour ANO</Button>
                <Button size="md" kind="secondary">
                  Enregistrer
                </Button>
                <Button size="md" kind="tertiary">
                  Prévisualiser
                </Button>
                <Button size="md" kind="danger--tertiary">
                  Rejeter
                </Button>
              </div>

              <h3 className="text-heading-01 text-primary mt-2">Saisie</h3>
              <TextInput
                id="ds-ref"
                labelText="Référence du marché"
                placeholder="PTN-2026-000"
                helperText="Format imposé par le PPM."
              />
              <Dropdown
                id="ds-composante"
                titleText="Composante"
                label="Choisir une composante"
                items={[
                  "C1 · Accès et inclusion numériques",
                  "C2 · Fondations numériques",
                  "C3 · Compétences et innovation",
                  "C4 · Coordination et gestion",
                ]}
              />
              <Checkbox
                id="ds-prior"
                labelText="Revue préalable requise (seuil BM dépassé)"
              />
            </div>

            <div className="flex flex-col gap-4">
              <h3 className="text-heading-01 text-primary">Retour d&apos;information</h3>
              <InlineNotification
                kind="warning"
                lowContrast
                hideCloseButton
                title="Délai ANO dépassé"
                subtitle="3 dossiers dépassent la cible de 12 jours."
                className="max-w-none"
              />
              <InlineNotification
                kind="error"
                lowContrast
                hideCloseButton
                title="Habilitation insuffisante"
                subtitle="Les bailleurs ne rédigent pas de TDR (présentation UGPTN § 15.5)."
                className="max-w-none"
              />

              <h3 className="text-heading-01 text-primary mt-2">Sélection</h3>
              <ContentSwitcher onChange={() => setZoomNote((v) => !v)}>
                <Switch name="tous" text="Tous" />
                <Switch name="attente" text="En attente" />
                <Switch name="retard" text="En retard" />
              </ContentSwitcher>
              {zoomNote && (
                <p className="text-caption text-helper">
                  Le ContentSwitcher gère seul les flèches clavier et `aria-selected`.
                </p>
              )}
            </div>
          </div>
        </Section>

        <Section
          title="Tableau de données"
          intent="Carbon DataTable : tri au clavier, en-têtes correctement associés, ordre d'annonce cohérent. Les montants sont en chiffres tabulaires et alignés à droite — une colonne de montants mal alignée est illisible, et c'est l'essentiel de ce produit."
        >
          <DataTable rows={ANO_ROWS} headers={HEADERS} isSortable>
            {({ rows, headers, getHeaderProps, getRowProps, getTableProps }) => (
              <TableContainer
                title="Inbox ANO"
                description="Avis de non-objection en attente de décision bailleur."
              >
                <Table {...getTableProps()} size="lg">
                  <TableHead>
                    <TableRow>
                      {headers.map((header) => {
                        const { key, ...rest } = getHeaderProps({ header });
                        const numeric = header.key === "montant" || header.key === "delai";
                        return (
                          <TableHeader
                            key={key as string}
                            {...rest}
                            className={numeric ? "text-right" : undefined}
                          >
                            {header.header}
                          </TableHeader>
                        );
                      })}
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {rows.map((row) => {
                      const { key, ...rest } = getRowProps({ row });
                      return (
                        <TableRow key={key as string} {...rest}>
                          {row.cells.map((cell) => {
                            const numeric =
                              cell.info.header === "montant" || cell.info.header === "delai";
                            const isStatus = cell.info.header === "statut";
                            return (
                              <TableCell
                                key={cell.id}
                                className={cn(
                                  numeric && "mono text-right",
                                  cell.info.header === "id" && "mono",
                                )}
                              >
                                {isStatus ? (
                                  <Tag
                                    type={
                                      cell.value === "Approuvé"
                                        ? "green"
                                        : cell.value === "En retard"
                                          ? "red"
                                          : "cyan"
                                    }
                                  >
                                    {cell.value}
                                  </Tag>
                                ) : (
                                  cell.value
                                )}
                              </TableCell>
                            );
                          })}
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </TableContainer>
            )}
          </DataTable>
        </Section>

        {/* ---------- Règles ---------- */}
        <Section
          title="Règles tenues par l'outillage"
          intent="Une convention que rien ne vérifie est une convention qui se perd. Celles-ci échouent au lint."
        >
          <ul className="border-subtle divide-subtle divide-y border">
            {[
              {
                rule: "Aucune police sous 12px",
                why: "text-[11px] et assimilés échouent au lint. 265 occurrences dans l'ancien code.",
              },
              {
                rule: "Aucune hauteur figée sur la fenêtre",
                why: "calc(100vh − 320px) s'effondre à 150 % de zoom — un réglage courant chez les utilisateurs seniors. Utiliser `scroll-region`.",
              },
              {
                rule: "Rayon de bordure à 0",
                why: "Carbon est carré. Seules exceptions : avatars et pastilles (rounded-full).",
              },
              {
                rule: "Aucune couleur écrite en dur",
                why: "514 hexadécimaux dans l'ancien SCSS, dont 84 fois #0f62fe — autant d'endroits qui restaient bleus pour un profil Bailleur.",
              },
              {
                rule: "Le violet est réservé à l'IA",
                why: "Tout ce qu'un modèle génère ou suggère porte cette couleur, et rien d'autre ne la porte.",
              },
            ].map((r) => (
              <li key={r.rule} className="bg-layer flex gap-4 px-4 py-3">
                <WarningAlt size={16} className="text-warning mt-0.5 shrink-0" aria-hidden />
                <div>
                  <p className="text-heading-01 text-primary">{r.rule}</p>
                  <p className="text-body text-secondary mt-0.5">{r.why}</p>
                </div>
              </li>
            ))}
          </ul>
        </Section>
      </div>
    </main>
  );
}
