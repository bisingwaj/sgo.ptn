import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import {
  AiService,
  type ChatMessage,
  type ToolCall,
  type ToolSpec,
} from '../ai/ai.service';
import { buildSystemPrompt } from '../ai/project-knowledge';
import type { AuthenticatedUser } from '../common/types/authenticated-user';
import type { RequestContext } from '../auth/auth.service';

/** Ce que l'écran reçoit, au fil de l'eau. */
export type AssistantEvent =
  | { type: 'texte'; delta: string }
  /** Une consultation en cours, dite pendant qu'elle a lieu */
  | { type: 'consultation'; libelle: string }
  /** Ce qui a RÉELLEMENT été consulté pour composer la réponse */
  | { type: 'sources'; sources: string[] }
  | { type: 'fin' }
  | { type: 'erreur'; message: string };

export interface TourAssistant {
  role: 'user' | 'assistant';
  content: string;
}

/**
 * L'assistant général de la plateforme.
 *
 * Il répond aux questions de procédure — seuils, méthodes, catégories,
 * parcours — depuis le socle de connaissance du projet et depuis le
 * RÉFÉRENTIEL EN BASE. C'est la distinction qui fonde ce service : un modèle
 * prié de citer un seuil en inventera un plausible, et un seuil plausible se
 * croit d'autant mieux qu'il est faux. Les chiffres viennent donc d'outils
 * qui lisent les tables, jamais de la mémoire du modèle.
 *
 * TROIS RÈGLES QUE LE CODE TIENT, ET NON L'INVITE
 *
 *  1. Il ne SAIT RIEN écrire. Aucun outil ne modifie quoi que ce soit ; il
 *     lit, il répond. Un assistant présent sur les 59 écrans et devant les
 *     huit profils ne doit pas pouvoir agir.
 *
 *  2. Ses sources sont celles qu'il a réellement consultées, rapportées par
 *     le service et non par le modèle. La version précédente affichait
 *     « MEP §4.2 » sous des chiffres inventés : une citation fabriquée fait
 *     croire un chiffre fabriqué, et c'était le vrai défaut.
 *
 *  3. Il ne lit que le RÉFÉRENTIEL et les dossiers de l'organisation de
 *     l'appelant. Aucun dossier d'autrui, aucune donnée personnelle, et
 *     rien du canal MGP-EAS/HS — le seul endroit où le corpus interdit
 *     formellement l'IA générative.
 */
@Injectable()
export class AssistantService {
  private readonly logger = new Logger(AssistantService.name);

  /** Un assistant qui boucle est un assistant qui coûte. */
  private static readonly TOURS_MAX = 3;

  constructor(
    private readonly prisma: PrismaService,
    private readonly ai: AiService,
    private readonly audit: AuditService,
  ) {}

  /**
   * Les outils : que de la lecture.
   *
   * Chacun rapporte, avec sa réponse, le nom de ce qu'il a consulté. C'est
   * ce nom qui s'affichera en source — pas une référence composée par le
   * modèle.
   */
  private static outils(): ToolSpec[] {
    return [
      {
        type: 'function',
        function: {
          name: 'lire_seuils',
          description:
            'Lit la table des seuils de passation EN VIGUEUR : méthode applicable par catégorie et par montant, et type de revue qui en découle. À appeler AVANT de citer le moindre seuil ou la moindre méthode — ne jamais les donner de mémoire.',
          parameters: {
            type: 'object',
            properties: {
              categorie: {
                type: 'string',
                enum: [
                  'TRAVAUX',
                  'FOURNITURES',
                  'SERVICES_CONSULTANTS',
                  'SERVICES_NON_CONSULTANTS',
                ],
                description:
                  'Restreint à une catégorie. Omettre pour tout obtenir.',
              },
            },
          },
        },
      },
      {
        type: 'function',
        function: {
          name: 'lire_types_tdr',
          description:
            "Énumère les types de TDR du référentiel, avec leur catégorie de passation et l'exigence de PGES. À consulter avant de décrire un parcours de rédaction.",
          parameters: { type: 'object', properties: {} },
        },
      },
      {
        type: 'function',
        function: {
          name: 'lire_composantes',
          description:
            'Lit les composantes du projet et leur dotation. Les montants sont ceux du document de projet : les citer tels quels, ne jamais les recalculer.',
          parameters: { type: 'object', properties: {} },
        },
      },
      {
        type: 'function',
        function: {
          name: 'lire_mes_dossiers',
          description:
            "Lit les TDR de l'organisation de la personne qui pose la question : référence, intitulé, statut. Sert à répondre « où en est mon dossier ». Ne donne accès à aucun dossier d'une autre organisation.",
          parameters: { type: 'object', properties: {} },
        },
      },
    ];
  }

  /** Ce que le modèle doit tenir, en plus du socle. */
  private static instructions(user: AuthenticatedUser): string {
    return [
      'VOTRE RÔLE',
      `Vous répondez aux questions de ${user.firstName} ${user.lastName}, qui intervient au titre de ${user.organisationName} comme ${user.subroleLabel}. Répondez brièvement, en français, et allez au fait.`,
      '',
      'CE QUE VOUS NE FAITES PAS',
      "Vous ne modifiez rien. Vous n'avez aucun moyen d'agir sur un dossier : si on vous demande de rédiger, de soumettre ou de valider, dites où le faire dans la plateforme.",
      '',
      'LES CHIFFRES NE VIENNENT PAS DE VOUS',
      "Un seuil, un montant, une méthode de passation, un type de revue : appelez l'outil correspondant AVANT d'en citer un. Vous n'avez pas ces valeurs en mémoire, et une valeur plausible mais fausse est pire qu'une absence de réponse — elle se croit.",
      "Un délai de traitement, un taux, une moyenne, une cible : si l'outil ne vous les donne pas, ILS N'EXISTENT PAS pour vous. Dites que la plateforme ne les publie pas. N'en composez jamais.",
      '',
      'VOS SOURCES',
      "Ne citez aucune référence de la forme « MEP § 4.2 » : le manuel ne se numérote pas ainsi, et une citation fabriquée fait croire ce qu'elle accompagne. La plateforme affiche elle-même ce que vous avez consulté.",
      '',
      'CE QUI VOUS EST INTERDIT',
      "Le canal MGP-EAS/HS — violences sexuelles, harcèlement, exploitation. Vous n'y touchez pas, ni pour conseiller, ni pour reformuler, ni pour qualifier. Si la question s'en approche, donnez UNIQUEMENT l'adresse du canal confidentiel, /mgp-eas-hs, et rappelez qu'il est cloisonné. C'est le seul endroit où le corpus du projet interdit formellement l'IA générative.",
    ].join('\n');
  }

  /** Exécute une lecture, et dit ce qu'elle a consulté. */
  private async executer(
    appel: ToolCall,
    user: AuthenticatedUser,
  ): Promise<{ resultat: string; source: string; libelle: string }> {
    let args: Record<string, unknown>;
    try {
      args = JSON.parse(appel.function.arguments || '{}') as Record<
        string,
        unknown
      >;
    } catch {
      args = {};
    }

    switch (appel.function.name) {
      case 'lire_seuils': {
        const categorie =
          typeof args.categorie === 'string' ? args.categorie : null;
        const seuils = await this.prisma.procurementThreshold.findMany({
          where: categorie ? { category: categorie as never } : {},
          include: { method: { select: { code: true, label: true } } },
          orderBy: [{ category: 'asc' }, { minUsd: 'asc' }],
        });

        const borne = (v: unknown) =>
          v === null || v === undefined
            ? null
            : `${Number(v).toLocaleString('fr-FR')} USD`;

        const lignes = seuils.map((s) => {
          const min = borne(s.minUsd);
          const max = borne(s.maxUsd);
          const plage =
            min && max
              ? `de ${min} à ${max}`
              : min
                ? `à partir de ${min}`
                : max
                  ? `jusqu'à ${max}`
                  : 'sans borne de montant';
          return `${s.category} · ${s.method.code} (${s.method.label}) · ${plage} · revue ${s.reviewType === 'PRIOR' ? 'préalable' : 'postérieure'}`;
        });

        return {
          resultat: lignes.length
            ? lignes.join('\n')
            : 'Aucun seuil enregistré pour cette catégorie.',
          source: 'Table des seuils de passation',
          libelle: 'Lecture des seuils en vigueur…',
        };
      }

      case 'lire_types_tdr': {
        const types = await this.prisma.tdrType.findMany({
          where: { isActive: true },
          select: {
            code: true,
            name: true,
            familyLabel: true,
            procurementCategory: true,
            requiresPges: true,
          },
          orderBy: { code: 'asc' },
        });
        return {
          resultat: types
            .map(
              (t) =>
                `${t.code} — ${t.name} (${t.familyLabel})` +
                `${t.procurementCategory ? ` · catégorie ${t.procurementCategory}` : ''}` +
                `${t.requiresPges ? ' · PGES exigé' : ''}`,
            )
            .join('\n'),
          source: 'Référentiel des types de TDR',
          libelle: 'Consultation des types de TDR…',
        };
      }

      case 'lire_composantes': {
        const composantes = await this.prisma.component.findMany({
          orderBy: { code: 'asc' },
        });
        return {
          resultat: composantes
            .map(
              (c) =>
                // Les dotations sont exprimées en millions dans le document
                // de projet : on les rend dans leur unité d'origine plutôt
                // que de les convertir — une conversion est déjà un calcul,
                // et un calcul est déjà une occasion de se tromper.
                `${c.code} — ${c.label} · ${Number(c.totalUsdM)} M USD` +
                ` (IDA ${Number(c.idaUsdM)} M, AFD ${Number(c.afdUsdM)} M)`,
            )
            .join('\n'),
          source: 'Composantes du projet',
          libelle: 'Lecture des composantes…',
        };
      }

      case 'lire_mes_dossiers': {
        // Bornage à l'organisation : un assistant offert aux huit profils ne
        // doit pas devenir une fenêtre sur les dossiers d'autrui.
        const dossiers = await this.prisma.tdr.findMany({
          where: { organisationId: user.organisationId },
          select: {
            reference: true,
            title: true,
            status: true,
            updatedAt: true,
          },
          orderBy: { updatedAt: 'desc' },
          take: 20,
        });
        return {
          resultat: dossiers.length
            ? dossiers
                .map((d) => `${d.reference} — « ${d.title} » · ${d.status}`)
                .join('\n')
            : `Aucun TDR au nom de ${user.organisationName}.`,
          source: `Dossiers de ${user.organisationName}`,
          libelle: 'Lecture de vos dossiers…',
        };
      }

      default:
        return {
          resultat: 'Outil inconnu.',
          source: '',
          libelle: '',
        };
    }
  }

  /**
   * Un échange.
   *
   * Les évènements partent au fil de l'eau : une réponse met cinq à quinze
   * secondes, et l'écran ne doit pas rester immobile pendant ce temps.
   */
  async *repondre(
    question: string,
    historique: TourAssistant[],
    user: AuthenticatedUser,
    ctx: RequestContext,
  ): AsyncGenerator<AssistantEvent> {
    const messages: ChatMessage[] = [
      {
        role: 'system',
        content: [
          buildSystemPrompt({
            includeSafeguards: true,
            includeFiduciary: true,
            includeGrievance: true,
          }),
          '',
          AssistantService.instructions(user),
        ].join('\n'),
      },
      // L'historique est borné : au-delà, il coûte plus qu'il ne sert.
      ...historique
        .slice(-6)
        .map((t) => ({ role: t.role, content: t.content })),
      { role: 'user', content: question },
    ];

    // Ce qui aura RÉELLEMENT été lu. C'est cela, et rien d'autre, qui
    // s'affichera en source sous la réponse.
    const sources = new Set<string>();
    let tours = 0;

    try {
      while (tours < AssistantService.TOURS_MAX) {
        tours += 1;

        let texte = '';
        const appels = new Map<
          number,
          { id: string; nom: string; args: string; annonce: boolean }
        >();

        for await (const ev of this.ai.stream({
          messages,
          tools: AssistantService.outils(),
          maxTokens: 1200,
          timeoutMs: 60_000,
        })) {
          if (ev.type === 'texte') {
            texte += ev.delta;
            yield { type: 'texte', delta: ev.delta };
          } else if (ev.type === 'outil') {
            const courant = appels.get(ev.index) ?? {
              id: '',
              nom: '',
              args: '',
              annonce: false,
            };
            const suivant = {
              id: ev.id ?? courant.id,
              nom: ev.nom ?? courant.nom,
              args: courant.args + (ev.argsDelta ?? ''),
              annonce: courant.annonce,
            };
            // Dès que l'outil est nommé, on le dit : c'est le premier signe
            // de vie, et il arrive en une seconde au lieu de dix.
            if (!suivant.annonce && suivant.nom) {
              suivant.annonce = true;
              yield {
                type: 'consultation',
                libelle: LIBELLES[suivant.nom] ?? 'Consultation…',
              };
            }
            appels.set(ev.index, suivant);
          }
        }

        if (appels.size === 0) break;

        const toolCalls: ToolCall[] = [...appels.values()].map((a) => ({
          id: a.id,
          type: 'function' as const,
          function: { name: a.nom, arguments: a.args || '{}' },
        }));
        messages.push({
          role: 'assistant',
          content: texte || null,
          tool_calls: toolCalls,
        });

        for (const appel of toolCalls) {
          const { resultat, source } = await this.executer(appel, user);
          if (source) sources.add(source);
          messages.push({
            role: 'tool',
            tool_call_id: appel.id,
            content: resultat,
          });
        }
      }
    } catch (e) {
      this.logger.error('Échange interrompu', e as Error);
      yield {
        type: 'erreur',
        message:
          'La réponse n’a pas abouti. Réessayez dans un instant ; si cela persiste, signalez-le à votre administrateur.',
      };
      return;
    }

    // Les sources ne sont annoncées qu'une fois la réponse close : elles
    // disent ce qui a servi, et cela ne se sait qu'à la fin.
    if (sources.size > 0) yield { type: 'sources', sources: [...sources] };

    await this.audit.record({
      actorId: user.userId,
      actorEmail: user.email,
      action: 'assistant.question',
      entityType: 'Assistant',
      entityId: user.userId,
      // La question est journalisée, la réponse non : c'est ce qui permet de
      // savoir ce qu'on demande à l'outil sans constituer un corpus.
      payload: { question: question.slice(0, 300), sources: [...sources] },
      ...ctx,
    });

    yield { type: 'fin' };
  }
}

/** Ce que l'on lit pendant que l'outil travaille. */
const LIBELLES: Record<string, string> = {
  lire_seuils: 'Lecture des seuils en vigueur…',
  lire_types_tdr: 'Consultation des types de TDR…',
  lire_composantes: 'Lecture des composantes…',
  lire_mes_dossiers: 'Lecture de vos dossiers…',
};
