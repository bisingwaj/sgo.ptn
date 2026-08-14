/**
 * Préférence d'ouverture du panneau contextuel.
 *
 * Écrite comme un magasin externe plutôt que dans un état de composant, pour
 * une raison précise : la valeur vit dans `localStorage`, qui n'existe pas au
 * rendu serveur.
 *
 * Les deux solutions immédiates échouent, chacune à sa façon :
 *
 *   · lire dans un effet et appeler `setState` — c'est ce que proscrit la
 *     règle `react-hooks/set-state-in-effect`, et cela provoque un rendu en
 *     cascade à chaque montage ;
 *
 *   · lire dans l'initialiseur de `useState` — le serveur rendrait « fermé »
 *     et le client « ouvert », soit une divergence d'hydratation.
 *
 * `useSyncExternalStore` est prévu exactement pour ce cas : il utilise
 * l'instantané serveur pendant l'hydratation, puis bascule sur l'instantané
 * client sans divergence.
 */

const STORAGE_KEY = "ptn-rdc.sidePanelOpen";

let open: boolean | null = null;
const listeners = new Set<() => void>();

function read(): boolean {
  try {
    return window.localStorage.getItem(STORAGE_KEY) === "true";
  } catch {
    // localStorage indisponible (navigation privée) : tiroir fermé.
    return false;
  }
}

export function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function getSnapshot(): boolean {
  // Lecture différée au premier appel côté client, puis mise en cache : un
  // instantané doit être stable d'un appel à l'autre, sans quoi React
  // considère que le magasin change en boucle.
  if (open === null) open = read();
  return open;
}

/** Le serveur ne connaît pas la préférence : le tiroir démarre fermé. */
export function getServerSnapshot(): boolean {
  return false;
}

export function setSidePanelOpen(next: boolean): void {
  open = next;
  try {
    window.localStorage.setItem(STORAGE_KEY, String(next));
  } catch {
    /* sans effet */
  }
  listeners.forEach((l) => l());
}
