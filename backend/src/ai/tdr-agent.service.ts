import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { AiService, type ChatMessage, type ToolCall, type ToolSpec } from './ai.service';
import { buildSystemPrompt } from './project-knowledge';
import { FIELDS, champ, enumerationChamps, normaliseListe, refus } from './field-registry';
import type { AuthenticatedUser } from '../common/types/authenticated-user';
import type { RequestContext } from '../auth/auth.service';

/** Ce que le parcours reçoit, au fil de l'eau. */
export type AgentEvent =
  | { type: 'texte'; delta: string }
  | { type: 'travail'; libelle: string }
  /** Le texte en train d'etre ecrit dans un champ, au fil de l'eau */
  | { type: 'apercu'; champ: string; delta: string }
  | { type: 'ecriture'; champ: string; etape: string; valeur: unknown; avant: unknown }
  | { type: 'refus'; champ: string; motif: string }
  | { type: 'fin'; tours: number }
  | { type: 'erreur'; message: string };

interface TourDeParole {
  role: 'user' | 'assistant';
  content: string;
}

/**
 * L'assistant du parcours de rédaction.
 *
 * Il ne reçoit plus une intention codée en dur mais une instruction libre,
 * et il n'a qu'un seul moyen d'agir : des outils. Tout ce qu'il écrit passe
 * par le registre des champs, qui décide seul de ce qui est ouvert.
 *
 * Trois principes que le code tient, et non l'invite :
 *
 *  1. Un champ absent du registre n'existe pas pour lui. Les montants, le
 *     rattachement et les attestations lui sont fermés.
 *  2. Toute valeur écrite est contrôlée après génération. Une consigne se
 *     contourne ; un contrôle non.
 *  3. Chaque écriture est marquée et journalisée. L'agent écrivant
 *     directement, la marque remplace le geste de reprise qu'exigeait
 *     l'ancien parcours.
 */
@Injectable()
export class TdrAgentService {
  private readonly logger = new Logger(TdrAgentService.name);

  /** Un agent qui boucle est un agent qui coûte. Trois tours suffisent. */
  private static readonly TOURS_MAX = 4;

  /** Ce que l'auteur lit pendant que l'outil travaille. */
  private static readonly LIBELLES: Record<string, string> = {
    ecrire_champ: 'Écriture en cours…',
    lire_activite_ptba: 'Lecture de l’activité du plan…',
    lire_bibliotheque: 'Consultation du référentiel…',
  };

  constructor(
    private readonly prisma: PrismaService,
    private readonly ai: AiService,
    private readonly audit: AuditService,
  ) {}

  /** Les outils offerts au modèle, engendrés depuis le registre. */
  private static outils(): ToolSpec[] {
    return [
      {
        type: 'function',
        function: {
          name: 'ecrire_champ',
          description:
            "Écrit une valeur dans un champ du dossier. C'est le SEUL moyen de modifier le TDR : un texte affiché dans la conversation n'y entre pas. N'écrivez que ce que l'auteur a demandé, un champ à la fois.",
          parameters: {
            type: 'object',
            properties: {
              champ: {
                type: 'string',
                enum: FIELDS.map((f) => f.cle),
                description: 'Identifiant du champ à écrire.',
              },
              valeur: {
                description:
                  "Pour un champ de texte : une chaîne. Pour objectives : [{title, criteria}]. Pour deliverables : [{title, format, deadline}].",
              },
            },
            required: ['champ', 'valeur'],
          },
        },
      },
      {
        type: 'function',
        function: {
          name: 'lire_activite_ptba',
          description:
            "Lit ce que l'activité PTBA de rattachement porte en propre : ses objectifs, ses livrables attendus, ses indicateurs clés, ses risques et ses normes. À consulter avant de rédiger quoi que ce soit qui touche à l'objet du marché.",
          parameters: { type: 'object', properties: {} },
        },
      },
      {
        type: 'function',
        function: {
          name: 'lire_bibliotheque',
          description:
            "Liste les intitulés disponibles dans une bibliothèque du référentiel, pour le type de ce dossier. Sert à savoir ce qui existe, non à l'inventer.",
          parameters: {
            type: 'object',
            properties: {
              genre: { type: 'string', enum: ['clauses', 'indicateurs', 'risques'] },
            },
            required: ['genre'],
          },
        },
      },
    ];
  }

  /**
   * Lit la valeur en cours de frappe dans des arguments JSON incomplets.
   *
   * Le modèle n'écrit pas le texte dans sa réponse : il l'écrit dans les
   * arguments de l'outil, qui arrivent par morceaux. Les accumuler en
   * silence laissait vingt secondes d'écran immobile — précisément ce qu'il
   * fallait éviter. On décode donc ce qui est déjà lisible, en s'arrêtant au
   * dernier échappement complet : une chaîne coupée au milieu d'un échappement
   * produirait un caractère faux.
   */
  private static valeurPartielle(args: string): string | null {
    const debut = args.indexOf('"valeur"');
    if (debut === -1) return null;
    const guillemet = args.indexOf('"', args.indexOf(':', debut) + 1);
    if (guillemet === -1) return null;

    const ECHAPPES: Record<string, string> = {
      n: '\n',
      t: '\t',
      r: '\r',
      b: '\b',
      f: '\f',
    };

    let sortie = '';
    for (let i = guillemet + 1; i < args.length; i += 1) {
      const c = args[i];
      if (c === '\\') {
        const suite = args[i + 1];
        // Échappement coupé en deux fragments : on s'arrête là et on
        // reprendra au morceau suivant.
        if (suite === undefined) break;
        if (suite === 'u') {
          if (i + 5 >= args.length) break;
          sortie += String.fromCharCode(parseInt(args.slice(i + 2, i + 6), 16));
          i += 5;
        } else {
          sortie += ECHAPPES[suite] ?? suite;
          i += 1;
        }
      } else if (c === '"') {
        break;
      } else {
        sortie += c;
      }
    }
    return sortie;
  }

  private async charger(tdrId: string) {
    const tdr = await this.prisma.tdr.findUniqueOrThrow({
      where: { id: tdrId },
      include: {
        tdrType: true,
        ptbaActivity: {
          include: {
            component: true,
            objectives: { orderBy: { position: 'asc' } },
            deliverables: { orderBy: { position: 'asc' } },
            indicators: { orderBy: { position: 'asc' } },
            risks: { orderBy: { position: 'asc' } },
            clauses: { orderBy: { position: 'asc' } },
          },
        },
        organisation: { select: { name: true, fullName: true } },
        beneficiaryOrganisation: { select: { name: true, fullName: true } },
        province: true,
        objectives: { orderBy: { position: 'asc' } },
        deliverables: { orderBy: { position: 'asc' } },
      },
    });

    if (!['BROUILLON', 'RETOURNE'].includes(tdr.status)) {
      throw new BadRequestException(
        'L’assistance n’est proposée que sur un TDR en cours de rédaction.',
      );
    }
    return tdr;
  }

  /**
   * L'état du dossier, transmis à chaque requête plutôt qu'à chaque tour.
   *
   * L'agent n'a pas d'outil de lecture des champs : il les voit ici. Cela
   * épargne un aller-retour par question, et surtout garantit qu'il travaille
   * sur l'état réel de la base plutôt que sur un souvenir de conversation.
   */
  private static etatDuDossier(tdr: Awaited<ReturnType<TdrAgentService['charger']>>): string {
    const lignes: string[] = [];
    const dit = (cle: string, v: unknown) =>
      lignes.push(`${cle} : ${v === null || v === undefined || v === '' ? '(vide)' : String(v)}`);

    lignes.push('ÉTAT ACTUEL DU DOSSIER');
    lignes.push(`Référence : ${tdr.reference} · type ${tdr.tdrTypeCode} — ${tdr.tdrType.name}`);
    dit('Intitulé du marché', tdr.title);

    if (tdr.ptbaActivity) {
      const a = tdr.ptbaActivity;
      lignes.push(
        `Activité PTBA de rattachement : ${a.code} — « ${a.title} », composante ${a.componentCode} (${a.component.label}).`,
      );
    }
    lignes.push(
      tdr.beneficiaryOrganisation
        ? `Maîtrise d'ouvrage bénéficiaire : ${tdr.beneficiaryOrganisation.fullName}. Vous pouvez la nommer.`
        : `AUCUNE maîtrise d'ouvrage bénéficiaire n'est désignée. N'en devinez pas : désignez l'acteur par sa fonction.`,
    );
    lignes.push(`Organisation rédactrice : ${tdr.organisation.fullName}.`);
    lignes.push('');

    for (const f of FIELDS) {
      const v = (tdr as unknown as Record<string, unknown>)[f.cle];
      if (f.kind === 'texte') {
        const t = typeof v === 'string' ? v.trim() : '';
        dit(f.cle, t ? `${t.length} caractères déjà rédigés` : '');
      } else if (Array.isArray(v)) {
        dit(f.cle, v.length ? `${v.length} entrée(s)` : '');
      }
    }

    lignes.push('');
    lignes.push('CHAMPS QUE VOUS POUVEZ ÉCRIRE');
    lignes.push(enumerationChamps());
    lignes.push('');
    lignes.push(
      "Tout autre champ vous est fermé. Les montants, le type, l'activité de rattachement, la catégorie environnementale et les attestations de conformité ne se rédigent pas : ils se décident. Si l'auteur vous en demande un, dites-lui que ce champ ne vous est pas ouvert et pourquoi.",
    );
    return lignes.join('\n');
  }

  private static instructions(): string {
    return [
      "VOTRE RÔLE DANS CETTE CONVERSATION",
      "Vous assistez la rédaction d'un dossier de termes de référence. L'auteur vous parle ; vous exécutez ce qu'il demande.",
      '',
      "Pour modifier le dossier, appelez l'outil `ecrire_champ`. Un texte que vous vous contentez d'afficher dans la conversation n'entre PAS dans le document : l'auteur le verrait sans qu'il soit enregistré.",
      '',
      "Avant de rédiger sur l'objet du marché, appelez `lire_activite_ptba` : l'activité porte ses propres objectifs, livrables et indicateurs, et le dossier doit s'y accorder.",
      '',
      "Écrivez un champ à la fois, et dites en une phrase ce que vous venez d'écrire. Ne réécrivez jamais un champ que l'auteur ne vous a pas désigné.",
      '',
      "Si l'auteur conteste un texte, retouchez-le et réécrivez le champ. Ne recommencez pas de zéro sans qu'il le demande.",
    ].join('\n');
  }

  private async executer(
    tdrId: string,
    appel: ToolCall,
    tdr: Awaited<ReturnType<TdrAgentService['charger']>>,
    actor: AuthenticatedUser,
    ctx: RequestContext,
  ): Promise<{ resultat: string; evenement?: AgentEvent }> {
    let args: Record<string, unknown>;
    try {
      args = JSON.parse(appel.function.arguments || '{}') as Record<string, unknown>;
    } catch {
      return { resultat: 'Arguments illisibles. Reformulez votre appel.' };
    }

    switch (appel.function.name) {
      case 'lire_activite_ptba': {
        const a = tdr.ptbaActivity;
        if (!a) return { resultat: "Aucune activité PTBA n'est rattachée à ce dossier." };
        const bloc = (titre: string, lignes: string[]) =>
          `${titre} : ${lignes.length ? lignes.join(' | ') : 'aucun'}`;
        return {
          resultat: [
            `Activité ${a.code} — « ${a.title} », composante ${a.componentCode}.`,
            bloc('Objectifs', a.objectives.map((o) => o.title + (o.criteria ? ` (${o.criteria})` : ''))),
            bloc('Livrables attendus', a.deliverables.map((d) => d.title + (d.deadline ? ` [${d.deadline}]` : ''))),
            bloc('Indicateurs', a.indicators.map((i) => i.label + (i.target ? ` — cible ${i.target}` : ''))),
            bloc('Risques', a.risks.map((r) => r.label + (r.mitigation ? ` — ${r.mitigation}` : ''))),
            bloc('Normes', a.clauses.map((c) => c.label)),
          ].join('\n'),
          evenement: { type: 'travail', libelle: `Lecture de l’activité ${a.code}` },
        };
      }

      case 'lire_bibliotheque': {
        const genre = String(args.genre ?? '');
        const table =
          genre === 'clauses'
            ? this.prisma.clauseTemplate
            : genre === 'indicateurs'
              ? this.prisma.indicatorTemplate
              : genre === 'risques'
                ? this.prisma.riskTemplate
                : null;
        if (!table) return { resultat: 'Genre inconnu. Attendu : clauses, indicateurs ou risques.' };
        const entrees = await (table as { findMany: (a: unknown) => Promise<Array<{ label: string }>> }).findMany({
          where: { tdrTypeCode: tdr.tdrTypeCode, status: 'PUBLIE' },
          select: { label: true },
          orderBy: { label: 'asc' },
        });
        return {
          resultat: entrees.length
            ? `${genre} disponibles : ${entrees.map((e) => e.label).join(' | ')}`
            : `Aucune entrée publiée pour ${genre} sur ce type.`,
          evenement: { type: 'travail', libelle: `Consultation des ${genre}` },
        };
      }

      case 'ecrire_champ': {
        const cle = String(args.champ ?? '');
        const spec = champ(cle);
        if (!spec) {
          return {
            resultat: `Le champ « ${cle} » ne vous est pas ouvert. Dites-le à l'auteur.`,
            evenement: { type: 'refus', champ: cle, motif: 'Champ fermé à l’assistant.' },
          };
        }

        const motif = refus(spec, args.valeur);
        if (motif) {
          return { resultat: `Écriture refusée : ${motif}`, evenement: { type: 'refus', champ: cle, motif } };
        }

        const avant = (tdr as unknown as Record<string, unknown>)[cle];
        await this.ecrire(tdrId, spec.cle, spec.kind, args.valeur);

        await this.audit.record({
          actorId: actor.userId,
          actorEmail: actor.email,
          action: 'tdr.agent_wrote_field',
          entityType: 'Tdr',
          entityId: tdrId,
          payload: { champ: cle, modele: this.ai.model },
          ...ctx,
        });

        return {
          resultat: `Le champ ${cle} a été écrit.`,
          evenement: {
            type: 'ecriture',
            champ: cle,
            etape: spec.etape,
            valeur: args.valeur,
            avant: avant ?? null,
          },
        };
      }

      default:
        return { resultat: `Outil inconnu : ${appel.function.name}.` };
    }
  }

  /** Écrit la valeur et marque le champ comme ayant reçu une contribution. */
  private async ecrire(tdrId: string, cle: string, kind: string, valeur: unknown): Promise<void> {
    await this.prisma.$transaction(async (tx) => {
      if (kind === 'texte') {
        await tx.tdr.update({ where: { id: tdrId }, data: { [cle]: valeur as string } });
      } else if (kind === 'liste_objectifs') {
        const rows = normaliseListe(champ(cle)!, valeur as unknown[]);
        await tx.tdrObjective.deleteMany({ where: { tdrId } });
        await tx.tdrObjective.createMany({
          data: rows.map((r, i) => ({ tdrId, title: r.title, criteria: r.criteria ?? '', position: i })),
        });
      } else {
        const rows = normaliseListe(champ(cle)!, valeur as unknown[]);
        await tx.tdrDeliverable.deleteMany({ where: { tdrId } });
        await tx.tdrDeliverable.createMany({
          data: rows.map((r, i) => ({
            tdrId,
            title: r.title,
            format: r.format || null,
            deadline: r.deadline || null,
            position: i,
          })),
        });
      }

      // La marque dit que l'assistant a contribué à ce champ. Elle subsiste
      // après retouche : elle reste vraie, et c'est ce qu'un relecteur doit
      // savoir.
      const actuel = await tx.tdr.findUniqueOrThrow({
        where: { id: tdrId },
        select: { aiAssistedFields: true },
      });
      if (!actuel.aiAssistedFields.includes(cle)) {
        await tx.tdr.update({
          where: { id: tdrId },
          data: { aiAssistedFields: [...actuel.aiAssistedFields, cle] },
        });
      }
    });
  }

  /**
   * Un échange. Rend les évènements au fil de l'eau : le premier fragment de
   * texte arrive en moins d'une seconde, là où la réponse entière demande
   * dix à vingt-cinq secondes.
   */
  async *converser(
    tdrId: string,
    instruction: string,
    historique: TourDeParole[],
    actor: AuthenticatedUser,
    ctx: RequestContext,
  ): AsyncGenerator<AgentEvent> {
    const tdr = await this.charger(tdrId);

    const messages: ChatMessage[] = [
      {
        role: 'system',
        content: [
          buildSystemPrompt({ includeSafeguards: tdr.tdrType.requiresPges }),
          '',
          TdrAgentService.instructions(),
          '',
          TdrAgentService.etatDuDossier(tdr),
        ].join('\n'),
      },
      // L'historique est borné : au-delà, le dossier lui-même dit l'état, et
      // rappeler vingt tours coûte plus qu'il ne sert.
      ...historique.slice(-8).map((t) => ({ role: t.role, content: t.content }) as ChatMessage),
      { role: 'user', content: instruction },
    ];

    let tours = 0;

    while (tours < TdrAgentService.TOURS_MAX) {
      tours += 1;

      let texte = '';
      const appels = new Map<number, { id: string; nom: string; args: string; annonce: boolean; vu: number }>();
      let motifArret: string | undefined;

      try {
        for await (const ev of this.ai.stream({
          messages,
          tools: TdrAgentService.outils(),
          maxTokens: 2000,
          timeoutMs: 90_000,
        })) {
          if (ev.type === 'texte') {
            texte += ev.delta;
            yield { type: 'texte', delta: ev.delta };
          } else if (ev.type === 'outil') {
            // Le fournisseur envoie le nom d'abord, puis les arguments par
            // morceaux : il faut réassembler avant de pouvoir lire.
            const courant = appels.get(ev.index) ?? { id: '', nom: '', args: '', annonce: false, vu: 0 };
            const suivant = {
              id: ev.id ?? courant.id,
              nom: ev.nom ?? courant.nom,
              args: courant.args + (ev.argsDelta ?? ''),
              annonce: courant.annonce,
              vu: courant.vu,
            };

            // Dès que l'outil est nommé, on le dit. C'est le premier signe
            // de vie, et il arrive en une seconde au lieu de vingt.
            if (!suivant.annonce && suivant.nom) {
              suivant.annonce = true;
              yield { type: 'travail', libelle: TdrAgentService.LIBELLES[suivant.nom] ?? suivant.nom };
            }

            // Puis le texte lui-même, à mesure qu'il s'écrit.
            if (suivant.nom === 'ecrire_champ') {
              const partiel = TdrAgentService.valeurPartielle(suivant.args);
              if (partiel !== null && partiel.length > suivant.vu) {
                const cible = /"champ"\s*:\s*"([a-zA-Z]+)"/.exec(suivant.args)?.[1] ?? '';
                yield { type: 'apercu', champ: cible, delta: partiel.slice(suivant.vu) };
                suivant.vu = partiel.length;
              }
            }

            appels.set(ev.index, suivant);
          } else {
            motifArret = ev.finishReason;
          }
        }
      } catch (e) {
        this.logger.error('Échange interrompu', e as Error);
        yield { type: 'erreur', message: e instanceof Error ? e.message : 'Échange interrompu.' };
        return;
      }

      if (appels.size === 0) {
        if (motifArret === 'length') {
          yield { type: 'erreur', message: 'La réponse a été coupée. Reformulez plus court.' };
        }
        yield { type: 'fin', tours };
        return;
      }

      const toolCalls: ToolCall[] = [...appels.entries()]
        .sort(([a], [b]) => a - b)
        .map(([, a]) => ({
          id: a.id || `appel-${tours}`,
          type: 'function' as const,
          function: { name: a.nom, arguments: a.args },
        }));

      messages.push({ role: 'assistant', content: texte || null, tool_calls: toolCalls });

      for (const appel of toolCalls) {
        const { resultat, evenement } = await this.executer(tdrId, appel, tdr, actor, ctx);
        if (evenement) yield evenement;
        messages.push({ role: 'tool', tool_call_id: appel.id, content: resultat });
      }
    }

    yield { type: 'erreur', message: 'Trop d’étapes enchaînées. Reformulez votre demande.' };
  }
}
