import type { Metadata } from "next";
import { DesignSystemClient } from "./DesignSystemClient";

export const metadata: Metadata = {
  title: "Fondations · Design system · PTN-RDC",
  description:
    "Référence vivante des tokens, de l'échelle typographique et des composants Carbon du PTN-RDC.",
};

export default function DesignSystemPage() {
  return <DesignSystemClient />;
}
