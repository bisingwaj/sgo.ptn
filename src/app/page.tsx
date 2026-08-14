import type { Metadata } from "next";
import { RootRouter } from "./RootRouter";

export const metadata: Metadata = {
  title: "PTN-RDC · Plateforme de gouvernance",
};

/**
 * La racine n'affiche rien : elle oriente.
 *
 * L'aiguillage est délégué à un composant client parce que la session vit
 * dans le navigateur — voir RootRouter.
 */
export default function RootPage() {
  return <RootRouter />;
}
