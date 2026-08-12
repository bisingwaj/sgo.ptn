import { Injectable, Logger } from '@nestjs/common';
import { createHash } from 'node:crypto';
import { PrismaService } from '../prisma/prisma.service';

export interface AuditEntry {
  actorId?: string | null;
  actorEmail?: string | null;
  action: string;
  entityType?: string | null;
  entityId?: string | null;
  payload?: Record<string, unknown> | null;
  ipAddress?: string | null;
  userAgent?: string | null;
}

/**
 * Clé de verrou consultatif PostgreSQL sérialisant l'écriture du journal.
 * Sans elle, deux écritures concurrentes liraient le même maillon
 * précédent et produiraient une chaîne bifurquée.
 */
const AUDIT_CHAIN_LOCK = 4_820_117;

/**
 * Piste d'audit en ajout seul, chaînée cryptographiquement.
 *
 * Chaque entrée scelle le hachage de la précédente. Toute suppression ou
 * modification a posteriori rompt la chaîne et devient détectable par
 * `verifyChain()`. C'est ce qui distingue une piste d'audit opposable
 * — devant la Cour des Comptes, l'IGF ou un auditeur de la Banque
 * mondiale — d'une simple table de logs.
 *
 * Aucune méthode de mise à jour ni de suppression n'est exposée, par
 * conception.
 */
@Injectable()
export class AuditService {
  private readonly logger = new Logger(AuditService.name);

  constructor(private readonly prisma: PrismaService) {}

  private static computeHash(previousHash: string | null, entry: AuditEntry, createdAt: string): string {
    const material = JSON.stringify({
      previousHash: previousHash ?? 'GENESIS',
      actorId: entry.actorId ?? null,
      actorEmail: entry.actorEmail ?? null,
      action: entry.action,
      entityType: entry.entityType ?? null,
      entityId: entry.entityId ?? null,
      payload: entry.payload ?? null,
      createdAt,
    });
    return createHash('sha256').update(material).digest('hex');
  }

  /**
   * Consigne un événement. Ne lève jamais : un échec d'écriture du
   * journal ne doit pas annuler l'opération métier déjà réalisée — mais
   * il est journalisé côté serveur comme incident.
   */
  async record(entry: AuditEntry): Promise<void> {
    try {
      await this.prisma.$transaction(async (tx) => {
        await tx.$executeRaw`SELECT pg_advisory_xact_lock(${AUDIT_CHAIN_LOCK}::bigint)`;

        const last = await tx.auditLog.findFirst({
          orderBy: { sequence: 'desc' },
          select: { hash: true },
        });

        const createdAt = new Date().toISOString();
        const hash = AuditService.computeHash(last?.hash ?? null, entry, createdAt);

        await tx.auditLog.create({
          data: {
            actorId: entry.actorId ?? null,
            actorEmail: entry.actorEmail ?? null,
            action: entry.action,
            entityType: entry.entityType ?? null,
            entityId: entry.entityId ?? null,
            payload: (entry.payload ?? undefined) as never,
            ipAddress: entry.ipAddress ?? null,
            userAgent: entry.userAgent ?? null,
            previousHash: last?.hash ?? null,
            hash,
            createdAt: new Date(createdAt),
          },
        });
      });
    } catch (error) {
      this.logger.error(
        `Échec d'écriture de la piste d'audit pour l'action « ${entry.action} »`,
        error instanceof Error ? error.stack : String(error),
      );
    }
  }

  /**
   * Vérifie l'intégrité de la chaîne. Destiné aux contrôles d'audit :
   * retourne le premier maillon rompu, le cas échéant.
   */
  async verifyChain(limit = 10_000): Promise<{ valid: boolean; brokenAt?: string; checked: number }> {
    const entries = await this.prisma.auditLog.findMany({
      orderBy: { sequence: 'asc' },
      take: limit,
    });

    let previousHash: string | null = null;
    for (const entry of entries) {
      const expected = AuditService.computeHash(
        previousHash,
        {
          actorId: entry.actorId,
          actorEmail: entry.actorEmail,
          action: entry.action,
          entityType: entry.entityType,
          entityId: entry.entityId,
          payload: entry.payload as Record<string, unknown> | null,
        },
        entry.createdAt.toISOString(),
      );

      if (entry.hash !== expected || entry.previousHash !== previousHash) {
        return { valid: false, brokenAt: entry.id, checked: entries.length };
      }
      previousHash = entry.hash;
    }

    return { valid: true, checked: entries.length };
  }
}
