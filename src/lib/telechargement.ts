/**
 * Remise d'un fichier reçu de l'API au système de fichiers du poste.
 *
 * Un lien `<a href>` direct ne convient pas : les documents contractuels
 * sont derrière une permission, et un lien nu ne porte pas d'en-tête
 * `Authorization`. Le fichier est donc récupéré en `fetch`, puis remis par
 * une URL d'objet — ancre synthétique, clic programmé, révocation.
 *
 * La révocation attend le tour de boucle suivant. Immédiate, Safari
 * annulait le téléchargement qu'il venait d'engager.
 */
export function enregistrerFichier(contenu: Blob, nom: string): void {
  const url = URL.createObjectURL(contenu);
  const lien = document.createElement("a");
  lien.href = url;
  lien.download = nom;
  lien.style.display = "none";
  document.body.appendChild(lien);
  lien.click();
  lien.remove();
  setTimeout(() => URL.revokeObjectURL(url), 0);
}
