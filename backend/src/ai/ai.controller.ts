import { Controller, Get, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { AiService } from './ai.service';
import type { CapacitesModele } from './capacites';

/**
 * Ce que l'assistance sait faire ici, pour que l'écran n'offre que cela.
 *
 * Un écran qui propose une action que le serveur ne peut pas honorer use la
 * confiance à chaque usage — c'est la règle du dépôt, et le bouton
 * « Joindre une pièce » l'enfreignait sans que personne le sache : il
 * versait des PDF vers un modèle qui ne lit que du texte.
 *
 * La réponse ne dit pas seulement OUI ou NON : elle porte le MOTIF, en
 * français, et c'est ce motif que l'écran affiche. L'écran n'a ainsi rien
 * à savoir des modèles ni de leurs modalités — il rend ce que le serveur
 * lui dit, ce qui est exactement le partage annoncé par le socle.
 */
@ApiTags('assistance')
@ApiBearerAuth()
@Controller('ai')
export class AiController {
  constructor(private readonly ai: AiService) {}

  @Get('capacites')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Ce dont l’assistance est capable sur ce serveur',
    description:
      'Lu au catalogue du fournisseur, non codé en dur : changer le modèle en ' +
      'configuration suffit à ouvrir ou fermer une fonctionnalité, sans redéployer ' +
      'l’écran. Réponse mise en cache une demi-heure.',
  })
  async capacites(): Promise<
    CapacitesModele & { configuree: boolean; pieces: boolean }
  > {
    // Sans clé, rien n'est possible : le dire franchement plutôt que de
    // laisser l'écran découvrir un 503 au premier clic.
    if (!this.ai.isConfigured) {
      return {
        modele: '—',
        image: false,
        fichier: false,
        outils: false,
        indetermine: false,
        configuree: false,
        pieces: false,
        motifPiecesFermees:
          'L’assistance n’est pas configurée sur ce serveur : aucune clé de génération n’est renseignée.',
      };
    }

    const c = await this.ai.capacites();
    return {
      ...c,
      configuree: true,
      // Une pièce n'a d'intérêt que si le modèle sait la lire. Le PDF et
      // l'image sont les deux seules formes soumises ; le reste est déjà
      // conservé sans être transmis.
      pieces: c.image || c.fichier,
    };
  }
}
