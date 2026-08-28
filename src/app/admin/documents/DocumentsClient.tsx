"use client";

/**
 * Le corpus documentaire du projet.
 *
 * CE QUE CET ÉCRAN SERT. L'assistant répondait sur la procédure du projet
 * depuis un résumé écrit à la main dans le code — dix-huit mille caractères
 * couvrant le MEP, les Règlements de passation et le cadre E&S. Le résumé
 * tient pour les faits fermés ; il ne tient pas dès qu'on demande CE QUE DIT
 * le MEP sur une procédure. Le MEP lui-même n'était nulle part.
 *
 * Ce qui est déposé ici, l'assistant peut le consulter — et il le préfère à
 * internet : ces pièces font autorité, une page trouvée en ligne non.
 *
 * DÉPOSER EST UN ACTE, PAS UNE SAISIE. Un document périmé mis au corpus fait
 * écrire des règles abrogées dans une pièce contractuelle. D'où la date
 * d'entrée en vigueur demandée au dépôt, et le retrait plutôt que la
 * suppression : ce que l'assistant a cité un jour doit rester retrouvable.
 */

import { useCallback, useEffect, useState } from "react";
import {
  Button,
  DataTableSkeleton,
  FileUploaderDropContainer,
  InlineNotification,
  Modal,
  Select,
  SelectItem,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableHeader,
  TableRow,
  Tag,
  TextArea,
  TextInput,
} from "@carbon/react";
import { Add, Document, TrashCan } from "@carbon/icons-react";
import { PageHeader } from "@/components/ui/PageHeader";
import { useAuth } from "@/components/auth/AuthContext";
import { enregistrerFichier } from "@/lib/telechargement";
import {
  documentsApi,
  aiApi,
  type CapacitesIa,
  type DocumentReferenceApi,
  type NatureDocumentApi,
} from "@/lib/api";

/**
 * Les natures, dans l'ordre où on les cherche.
 *
 * Le MEP d'abord : c'est la source de vérité procédurale, et neuf dépôts
 * sur dix le concernent ou concernent ce qui en découle.
 */
const NATURES: Array<{ code: NatureDocumentApi; label: string }> = [
  { code: "MEP", label: "Manuel d’Exécution du Projet" },
  { code: "PPSD", label: "Stratégie de passation (PPSD)" },
  { code: "PLAN_PASSATION", label: "Plan de Passation des Marchés" },
  { code: "REGLEMENT_BAILLEUR", label: "Règlement ou directive d’un bailleur" },
  { code: "ACCORD_FINANCEMENT", label: "Accord de financement" },
  { code: "CGES", label: "Cadre de Gestion Environnementale et Sociale" },
  { code: "CPR", label: "Cadre de Politique de Réinstallation" },
  { code: "PMPP", label: "Plan de Mobilisation des Parties Prenantes" },
  { code: "PGMO", label: "Procédures de Gestion de la Main-d’Œuvre" },
  { code: "PEES", label: "Plan d’Engagement Environnemental et Social" },
  { code: "PPA", label: "Plan en faveur des Peuples Autochtones" },
  { code: "MANUEL", label: "Manuel de procédures internes" },
  { code: "PROCES_VERBAL", label: "Procès-verbal d’instance" },
  { code: "AUTRE", label: "Autre document" },
];

const LIBELLE_NATURE = (code: NatureDocumentApi) =>
  NATURES.find((n) => n.code === code)?.label ?? code;

const poids = (octets: number) =>
  octets >= 1024 * 1024
    ? `${(octets / 1024 / 1024).toFixed(1)} Mo`
    : `${Math.max(1, Math.round(octets / 1024))} ko`;

const jour = (iso: string | null) =>
  iso
    ? new Date(iso).toLocaleDateString("fr-FR", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      })
    : "—";

export function DocumentsClient() {
  const { can, loading: authLoading } = useAuth();

  const [rows, setRows] = useState<DocumentReferenceApi[] | null>(null);
  const [erreur, setErreur] = useState<string | null>(null);
  const [capacites, setCapacites] = useState<CapacitesIa | null>(null);

  const [ouvert, setOuvert] = useState(false);
  const [fichier, setFichier] = useState<File | null>(null);
  const [titre, setTitre] = useState("");
  const [nature, setNature] = useState<NatureDocumentApi>("MEP");
  const [resume, setResume] = useState("");
  const [version, setVersion] = useState("");
  const [entreeEnVigueur, setEntreeEnVigueur] = useState("");

  const [aRetirer, setARetirer] = useState<DocumentReferenceApi | null>(null);
  const [occupe, setOccupe] = useState(false);
  const [refus, setRefus] = useState<string | null>(null);

  const charger = useCallback(async () => {
    try {
      const d = await documentsApi.lister(true);
      setRows(d.rows);
      setErreur(null);
    } catch (e) {
      setErreur(e instanceof Error ? e.message : "Corpus indisponible.");
    }
  }, []);

  useEffect(() => {
    if (authLoading) return;
    void (async () => {
      await charger();
      // L'écran ne doit pas annoncer une lecture par l'assistant si le modèle
      // configuré ne lit pas les fichiers : le cas s'est déjà produit sur les
      // pièces jointes, et l'auteur croyait l'assistant informé.
      try {
        setCapacites(await aiApi.capacites());
      } catch {
        setCapacites(null);
      }
    })();
  }, [authLoading, charger]);

  const peutDeposer = can("referentiel:documents");
  const assistantLit = capacites === null || capacites.fichier;

  const deposer = async () => {
    if (!fichier) return;
    setOccupe(true);
    setRefus(null);
    try {
      await documentsApi.deposer(fichier, {
        titre: titre.trim(),
        nature,
        resume: resume.trim() || undefined,
        version: version.trim() || undefined,
        effectiveFrom: entreeEnVigueur || undefined,
      });
      setOuvert(false);
      setFichier(null);
      setTitre("");
      setResume("");
      setVersion("");
      setEntreeEnVigueur("");
      await charger();
    } catch (e) {
      setRefus(e instanceof Error ? e.message : "Le dépôt n’a pas abouti.");
    } finally {
      setOccupe(false);
    }
  };

  const retirer = async () => {
    if (!aRetirer) return;
    setOccupe(true);
    setRefus(null);
    try {
      await documentsApi.retirer(aRetirer.id);
      setARetirer(null);
      await charger();
    } catch (e) {
      setRefus(e instanceof Error ? e.message : "Le retrait n’a pas abouti.");
    } finally {
      setOccupe(false);
    }
  };

  const telecharger = async (d: DocumentReferenceApi) => {
    try {
      enregistrerFichier(await documentsApi.fichier(d.id), d.filename);
    } catch (e) {
      setErreur(e instanceof Error ? e.message : "Téléchargement impossible.");
    }
  };

  const titreValide = titre.trim().length >= 4;
  const enService = (rows ?? []).filter((d) => d.enVigueur).length;

  return (
    <>
      <PageHeader
        eyebrow="ADMINISTRATION · CORPUS DOCUMENTAIRE"
        title="Documents de référence"
        subtitle="Les pièces qui font autorité sur la procédure du projet — MEP, PPSD, plans de passation, instruments de sauvegarde. L’assistant les consulte pour répondre, et les préfère à ce qu’il trouverait sur internet."
        actions={
          peutDeposer ? (
            <Button
              renderIcon={Add}
              size="md"
              onClick={() => {
                setRefus(null);
                setOuvert(true);
              }}
            >
              Déposer un document
            </Button>
          ) : undefined
        }
      />

      {erreur && (
        <InlineNotification
          kind="error"
          lowContrast
          hideCloseButton
          title="Chargement impossible"
          subtitle={erreur}
          className="mb-6 max-w-none"
        />
      )}

      {!authLoading && !peutDeposer && (
        <InlineNotification
          kind="info"
          lowContrast
          hideCloseButton
          title="Consultation seule"
          subtitle="Déposer un document au corpus relève de la coordination et du RPM. Vous pouvez consulter et télécharger ce qui s’y trouve."
          className="mb-6 max-w-none"
        />
      )}

      {/* Ne rien promettre qui n'ait lieu : si le modèle configuré ne lit pas
          les fichiers, le corpus reste une archive et l'écran le dit. */}
      {!assistantLit && (
        <InlineNotification
          kind="warning"
          lowContrast
          hideCloseButton
          title="L’assistant ne lit pas les fichiers"
          subtitle="Le modèle configuré ne reçoit que du texte. Les documents déposés restent consultables et téléchargeables, mais l’assistant ne peut pas s’y référer. Changer de modèle rétablit cette lecture."
          className="mb-6 max-w-none"
        />
      )}

      {rows === null && !erreur ? (
        <DataTableSkeleton columnCount={5} rowCount={4} showHeader={false} showToolbar={false} />
      ) : (
        <TableContainer
          title="Corpus du projet"
          description={
            (rows ?? []).length === 0
              ? "Aucun document déposé. L’assistant répond alors sur ce que porte son socle de connaissance, sans pouvoir citer d’article."
              : `${enService} document${enService > 1 ? "s" : ""} en vigueur sur ${(rows ?? []).length} déposé${(rows ?? []).length > 1 ? "s" : ""}.`
          }
        >
          <Table size="lg">
            <TableHead>
              <TableRow>
                <TableHeader>Document</TableHeader>
                <TableHeader>Nature</TableHeader>
                <TableHeader>En vigueur</TableHeader>
                <TableHeader>Fichier</TableHeader>
                <TableHeader>État</TableHeader>
                {peutDeposer && <TableHeader>Retrait</TableHeader>}
              </TableRow>
            </TableHead>
            <TableBody>
              {(rows ?? []).length === 0 && (
                <TableRow>
                  <TableCell colSpan={peutDeposer ? 6 : 5}>
                    <div className="text-secondary py-8 text-center">
                      <p>Le corpus est vide.</p>
                      <p className="text-caption text-helper mx-auto mt-2 max-w-[60ch]">
                        Déposez le Manuel d’Exécution du Projet en premier : c’est la source
                        de vérité procédurale, et l’assistant s’y réfère avant toute autre
                        pièce.
                      </p>
                    </div>
                  </TableCell>
                </TableRow>
              )}
              {(rows ?? []).map((d) => (
                <TableRow key={d.id}>
                  <TableCell>
                    <span className="text-body text-primary">{d.titre}</span>
                    {d.version && (
                      <div className="text-caption text-secondary mono">{d.version}</div>
                    )}
                    {d.resume && (
                      <div className="text-caption text-helper mt-1 max-w-[52ch]">
                        {d.resume}
                      </div>
                    )}
                  </TableCell>
                  <TableCell>
                    <span className="text-caption">{LIBELLE_NATURE(d.nature)}</span>
                  </TableCell>
                  <TableCell className="text-caption">{jour(d.effectiveFrom)}</TableCell>
                  <TableCell>
                    <Button
                      kind="ghost"
                      size="sm"
                      renderIcon={Document}
                      onClick={() => void telecharger(d)}
                    >
                      {d.formatLisible} · {poids(d.sizeBytes)}
                    </Button>
                  </TableCell>
                  <TableCell>
                    {!d.isActive ? (
                      <Tag type="cool-gray">Retiré</Tag>
                    ) : !d.lisibleParAssistant ? (
                      <Tag type="gray">Archive seule</Tag>
                    ) : d.enVigueur ? (
                      <Tag type="green">Consulté par l’assistant</Tag>
                    ) : (
                      <Tag type="gray">Pas encore en vigueur</Tag>
                    )}
                  </TableCell>
                  {peutDeposer && (
                    <TableCell>
                      {d.isActive && (
                        <Button
                          kind="ghost"
                          size="sm"
                          renderIcon={TrashCan}
                          hasIconOnly
                          iconDescription={`Retirer « ${d.titre} » du corpus`}
                          tooltipPosition="left"
                          onClick={() => {
                            setARetirer(d);
                            setRefus(null);
                          }}
                        />
                      )}
                    </TableCell>
                  )}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      {/* ---------- Dépôt ---------- */}
      <Modal
        open={ouvert}
        modalHeading="Déposer un document de référence"
        primaryButtonText={occupe ? "Dépôt…" : "Déposer au corpus"}
        secondaryButtonText="Annuler"
        primaryButtonDisabled={occupe || !fichier || !titreValide}
        onRequestClose={() => {
          setOuvert(false);
          setRefus(null);
        }}
        onRequestSubmit={() => void deposer()}
      >
        <p className="text-body text-secondary mb-4">
          Le PDF est soumis à l’assistant, qui le lit tel quel — aucune extraction, donc
          aucune déformation. Word et texte sont conservés à l’archive sans lui être
          transmis.
        </p>

        <FileUploaderDropContainer
          labelText={
            fichier
              ? `${fichier.name} — ${poids(fichier.size)}`
              : "Glissez le fichier ici, ou cliquez pour le choisir"
          }
          accept={[".pdf", ".docx", ".doc", ".txt"]}
          multiple={false}
          onAddFiles={(_e, { addedFiles }: { addedFiles: File[] }) => {
            const f = addedFiles[0];
            if (!f) return;
            setFichier(f);
            // L'intitulé se propose depuis le nom du fichier, extension
            // retirée : neuf fois sur dix il est déjà le bon, et le corriger
            // coûte moins que le saisir.
            if (!titre.trim()) setTitre(f.name.replace(/\.[^.]+$/, ""));
          }}
        />

        <div className="mt-4 flex flex-col gap-4">
          <TextInput
            id="doc-titre"
            labelText="Intitulé au catalogue"
            helperText="C’est par lui que l’assistant désigne le document. Quatre caractères au minimum."
            value={titre}
            onChange={(e) => setTitre(e.target.value)}
          />

          <Select
            id="doc-nature"
            labelText="Nature du document"
            value={nature}
            onChange={(e) => setNature(e.target.value as NatureDocumentApi)}
          >
            {NATURES.map((n) => (
              <SelectItem key={n.code} value={n.code} text={n.label} />
            ))}
          </Select>

          <TextArea
            id="doc-resume"
            labelText="Ce que le document apporte (facultatif)"
            helperText="Une phrase. C’est elle que l’assistant lit pour décider s’il doit ouvrir cette pièce — sans elle, il n’a que l’intitulé."
            rows={2}
            value={resume}
            onChange={(e) => setResume(e.target.value)}
          />

          <div className="grid grid-cols-2 gap-4">
            <TextInput
              id="doc-version"
              labelText="Millésime (facultatif)"
              placeholder="Ex. édition de février 2025"
              value={version}
              onChange={(e) => setVersion(e.target.value)}
            />
            <TextInput
              id="doc-vigueur"
              type="date"
              labelText="En vigueur depuis"
              value={entreeEnVigueur}
              onChange={(e) => setEntreeEnVigueur(e.target.value)}
            />
          </div>
        </div>

        {refus && (
          <p className="text-caption text-error-text mt-4" role="alert">
            {refus}
          </p>
        )}
      </Modal>

      {/* ---------- Retrait ---------- */}
      <Modal
        open={aRetirer !== null}
        danger
        modalHeading="Retirer ce document du corpus ?"
        modalLabel={aRetirer?.titre}
        primaryButtonText={occupe ? "Retrait…" : "Retirer du corpus"}
        secondaryButtonText="Annuler"
        primaryButtonDisabled={occupe}
        onRequestClose={() => {
          setARetirer(null);
          setRefus(null);
        }}
        onRequestSubmit={() => void retirer()}
      >
        <p className="text-body text-secondary mb-4">
          L’assistant cessera de s’y référer. Le fichier <strong>n’est pas effacé</strong> :
          il reste téléchargeable et repérable, parce que ce qu’il a servi à rédiger se
          relit des années plus tard.
        </p>
        <p className="text-body text-secondary">
          À faire dès qu’une version postérieure paraît : deux éditions du même texte au
          corpus laisseraient l’assistant citer l’ancienne sans raison de préférer l’autre.
        </p>
        {refus && (
          <p className="text-caption text-error-text mt-4" role="alert">
            {refus}
          </p>
        )}
      </Modal>
    </>
  );
}
