#!/usr/bin/env python3
"""
PTN-RDC · Vérificateur de texte engendré.

Trois passes sur un même texte, de la plus sûre à la plus faillible :

  1. TYPOGRAPHIE — déterministe, sans faux positif possible. La convention
     n'est pas théorique : elle est relevée sur 121 652 caractères de TDR
     réels de l'UGPTN (apostrophe ’ à 96,6 %, espace simple avant les deux
     points, jamais d'insécable). Ces défauts se corrigent automatiquement.

  2. ORTHOGRAPHE — dictionnaire français + lexique du projet. Un mot absent
     des deux est signalé. Le lexique projet est INDISPENSABLE : sans lui,
     « UGPTN » et « PTBA » sortent comme des fautes à chaque ligne.

  3. REGISTRE — les marques qui trahissent un texte de machine, décrites
     dans la compétence `registre-institutionnel`. Faillible par nature :
     ce sont des indices, pas des verdicts. D'où une NOTE, et non un rejet.

Pourquoi un script et pas une consigne : demander à un modèle de « ne pas
faire de fautes » ne produit rien — il essaie déjà. Ce qui produit un
résultat, c'est de mesurer et de refuser. Le script est la mesure.

Usage :
    python3 verifier-texte.py fichier.txt
    echo "un texte" | python3 verifier-texte.py
    python3 verifier-texte.py --corriger fichier.txt   # réécrit la typographie
    python3 verifier-texte.py --seuil 8 fichier.txt    # sort 1 sous 8/10

Dépendance facultative : `pip install pyspellchecker` pour la passe 2.
Sans elle, les passes 1 et 3 tournent quand même.
"""

import argparse
import pathlib
import re
import sys
import unicodedata

RACINE = pathlib.Path(__file__).resolve().parent.parent
LEXIQUE = RACINE / "references" / "lexique-projet.txt"
ANGLICISMES = RACINE / "references" / "anglicismes.txt"

APOS_DROITE = "'"
APOS_TYPO = "’"
INSEC = " "
INSEC_FINE = " "


# ---------------------------------------------------------------- passe 1
def typographie(texte: str):
    """
    Défauts typographiques, avec leur correction.

    Chacun est certain : il n'y a pas de cas où une apostrophe droite est
    correcte dans un texte français de ce corpus. Ils sont donc corrigeables
    sans arbitrage — c'est ce qui les distingue des deux autres passes.
    """
    defauts = []

    for m in re.finditer(re.escape(APOS_DROITE), texte):
        defauts.append((m.start(), "apostrophe droite", "’ typographique"))

    for m in re.finditer(r'"', texte):
        defauts.append((m.start(), "guillemet droit", "« » français"))

    # Espace insécable avant ponctuation double : le corpus ne l'emploie PAS.
    # C'est un choix maison, contraire à l'usage typographique strict, et
    # c'est celui qu'il faut tenir — un document panaché se voit.
    for m in re.finditer(f"[{INSEC}{INSEC_FINE}]([:;!?])", texte):
        defauts.append((m.start(), "espace insécable avant « %s »" % m.group(1),
                        "espace simple (convention du corpus)"))

    # Ponctuation double collée au mot : jamais dans le corpus.
    for m in re.finditer(r"\w([;!?])", texte):
        defauts.append((m.start() + 1, "« %s » collé au mot" % m.group(1),
                        "espace avant"))
    # Les deux-points sont traités à part : « 15:30 » et « http:// » sont licites.
    for m in re.finditer(r"(?<![\d/])\w(:)(?!\d|//)", texte):
        defauts.append((m.start() + 1, "« : » collé au mot", "espace avant"))

    for m in re.finditer(r"  +", texte):
        defauts.append((m.start(), "espaces multiples", "espace simple"))

    for m in re.finditer(r" +([,.])", texte):
        defauts.append((m.start(), "espace avant « %s »" % m.group(1), "aucun"))

    return defauts


def corriger_typographie(texte: str) -> str:
    """Applique les corrections certaines. L'ordre compte."""
    t = texte.replace(APOS_DROITE, APOS_TYPO)
    t = re.sub(f"[{INSEC}{INSEC_FINE}]([:;!?])", r" \1", t)
    t = re.sub(r"(\w)([;!?])", r"\1 \2", t)
    t = re.sub(r"(?<![\d/])(\w)(:)(?!\d|//)", r"\1 \2", t)
    t = re.sub(r" +([,.])", r"\1", t)
    t = re.sub(r"  +", " ", t)
    return t


# ---------------------------------------------------------------- passe 2
def charger(fichier: pathlib.Path) -> set:
    if not fichier.exists():
        return set()
    mots = set()
    for ligne in fichier.read_text(encoding="utf8").splitlines():
        ligne = ligne.strip()
        if ligne and not ligne.startswith("#"):
            mots.add(ligne.lower())
    return mots


# `œ` et `æ` sont des lettres, non des ligatures décoratives : les omettre
# coupait « œuvre » en « uvre » et signalait une faute inexistante.
MOT = re.compile(r"[A-Za-zÀ-ÖØ-öø-ÿœæŒÆ][A-Za-zÀ-ÖØ-öø-ÿœæŒÆ'’-]*")

# Élisions : « l’accès » se juge sur « accès ». La liste est fermée — un
# découpage sur toute apostrophe casserait les noms propres étrangers.
ELISION = re.compile(r"^(?:[ldnjcmts]|qu|jusqu|lorsqu|puisqu|aujourd|"
                     r"quelqu|presqu|entr)['’]", re.I)


def segmenter(mot: str):
    """
    Rend les unités à confronter au dictionnaire.

    Un composé se juge morceau par morceau : « suivi-évaluation » n'est pas
    au dictionnaire, « suivi » et « évaluation » y sont. Sans cela, tout mot
    composé du corpus ressortait comme une faute.
    """
    m = ELISION.sub("", mot.strip("-’'"))
    parts = [p for p in re.split(r"[-’']", m) if len(p) > 1]
    return [p.lower() for p in parts]


def orthographe(texte: str):
    """
    Mots inconnus du français ET du lexique projet.

    Rend `None` si le correcteur n'est pas installé — l'absence de passe est
    dite, jamais silencieuse : un contrôle qui ne tourne pas et ne le signale
    pas est pire que pas de contrôle, il rassure à tort.
    """
    try:
        from spellchecker import SpellChecker
    except ImportError:
        return None

    lexique = charger(LEXIQUE)
    sc = SpellChecker(language="fr")

    mots = {}
    for m in re.finditer(MOT, texte):
        brut = m.group(0)
        if brut.lower() in lexique:
            continue
        # Un sigle tout en majuscules relève du vocabulaire fermé, non de
        # l'orthographe : le dictionnaire français n'a rien à en dire.
        if brut.isupper() and len(brut) > 1:
            mots.setdefault(brut, m.start())
            continue
        for part in segmenter(brut):
            if part and part not in lexique:
                mots.setdefault(part, m.start())

    inconnus = sc.unknown(list(mots.keys()))
    return sorted(
        (mots[w], w, sorted(sc.candidates(w) or [])[:3]) for w in inconnus if w in mots
    )


# ---------------------------------------------------------------- passe 3
TRIADE = re.compile(
    r"\b(\w+(?:if|ive|el|elle|ique|able|ible|ant|ent|é|ée))\s*,\s*"
    r"(\w+(?:if|ive|el|elle|ique|able|ible|ant|ent|é|ée))\s+et\s+"
    r"(\w+(?:if|ive|el|elle|ique|able|ible|ant|ent|é|ée))\b",
    re.I,
)

SURPLOMB = re.compile(
    r"^\s*(?:Dans un monde|À l['’]ère|Aujourd['’]hui plus que jamais|"
    r"De nos jours|Face aux (?:défis|enjeux) (?:croissants|actuels))",
    re.I | re.M,
)

PROMESSE = re.compile(
    r"(?:contribuant ainsi|participant ainsi|ouvrant ainsi la voie|"
    r"pour un avenir|au bénéfice de tous|gage d['’]un avenir)[^.]*\.",
    re.I,
)

AFFICHAGE = re.compile(
    r"\b(?:il convient de (?:souligner|noter|rappeler)|force est de constater|"
    r"il importe de (?:rappeler|souligner)|il est à noter)\b",
    re.I,
)

RESERVE = re.compile(
    r"\b(?:notamment|susceptible|susceptibles|demeure|demeurent|le cas échéant|"
    r"en particulier|encore largement|à défaut|sous réserve)\b",
    re.I,
)

PRESCRIPTION = re.compile(r"\b(?:devra|devront|assure|assurer|assurera|vise à|visent à)\b", re.I)

INTERDITS = [
    (re.compile(r"\b(?:défaillances?|carences?|manque de capacités?|"
                r"faiblesse des capacités)\b", re.I),
     "constat de carence institutionnelle"),
    (re.compile(r"\b(?:zones? instables?|provinces? (?:en conflit|affectées? par le conflit)|"
                r"territoires? sous tension)\b", re.I),
     "caractérisation sécuritaire d’une province"),
    (re.compile(r"\b(?:principal bailleur|bailleur secondaire|bailleur principal)\b", re.I),
     "classement entre bailleurs"),
    (re.compile(r"\b(?:contrairement au|à l['’]instar du|comme au) "
                r"(?:Rwanda|Kenya|Ghana|Sénégal|Nigéria|Nigeria)\b", re.I),
     "comparaison avec un pays tiers"),
    (re.compile(r"\ble présent (?:termes?) de référence\b", re.I),
     "« termes de référence » est un pluriel — écrire « les présents termes de référence »"),
]


def phrases(texte: str):
    return [p.strip() for p in re.split(r"(?<=[.!?])\s+", texte) if len(p.strip()) > 15]


def anglicismes(texte: str):
    """
    Mots anglais employés là où le français a un équivalent.

    Ils ne relèvent PAS de l'orthographe — ils sont correctement écrits, dans
    la mauvaise langue. Les compter comme fautes ferait passer un défaut de
    registre pour une coquille, et `PROHIBITIONS` proscrit déjà « aucun
    anglicisme évitable ».
    """
    liste = charger(ANGLICISMES)
    if not liste:
        return []
    trouves = []
    for m in re.finditer(MOT, texte):
        if m.group(0).lower() in liste:
            trouves.append((m.start(), m.group(0)))
    return trouves


def registre(texte: str):
    """Indices de texte engendré. Rend les constats et une note sur 10."""
    ph = phrases(texte)
    mots = len(texte.split())
    constats = []
    note = 10.0

    for m in TRIADE.finditer(texte):
        constats.append(("triade d’adjectifs", m.group(0)[:70]))
    for m in SURPLOMB.finditer(texte):
        constats.append(("ouverture en surplomb", m.group(0)[:70]))
    for m in PROMESSE.finditer(texte):
        constats.append(("clôture en promesse", m.group(0)[:70]))
    for m in AFFICHAGE.finditer(texte):
        constats.append(("connecteur d’affichage", m.group(0)[:70]))
    for motif, libelle in INTERDITS:
        for m in motif.finditer(texte):
            constats.append(("INTERDIT · " + libelle, m.group(0)[:70]))
    for _, mot in anglicismes(texte):
        constats.append(("anglicisme", mot))

    note -= min(4.0, 1.0 * len(constats))

    # Rythme : la prose d'expert est inégale. Un écart-type faible sur la
    # longueur des phrases signe le parallélisme mécanique.
    ecart = 0.0
    if len(ph) >= 4:
        L = [len(p.split()) for p in ph]
        moy = sum(L) / len(L)
        ecart = (sum((x - moy) ** 2 for x in L) / len(L)) ** 0.5
        if moy and ecart / moy < 0.35:
            constats.append(("parallélisme mécanique",
                             f"écart-type {ecart:.1f} pour une moyenne de {moy:.0f} mots"))
            note -= 1.5

    # Réserve : le corpus réel en porte ~4,5 pour 1 000 mots.
    dens_reserve = 1000 * len(RESERVE.findall(texte)) / max(mots, 1)
    if mots >= 120 and dens_reserve < 2.0:
        constats.append(("affirmation plate",
                         f"{dens_reserve:.1f} marque(s) de réserve pour 1 000 mots, "
                         f"contre ~4,5 dans le corpus réel"))
        note -= 1.5

    return constats, max(0.0, note), {
        "mots": mots, "phrases": len(ph),
        "ecart_type": round(ecart, 1), "reserve_pour_mille": round(dens_reserve, 1),
        "prescription": len(PRESCRIPTION.findall(texte)),
    }


# ---------------------------------------------------------------- sortie
def situer(texte: str, pos: int) -> str:
    ligne = texte.count("\n", 0, pos) + 1
    col = pos - (texte.rfind("\n", 0, pos) + 1) + 1
    return f"{ligne}:{col}"


def main() -> int:
    ap = argparse.ArgumentParser(description="Vérifie un texte engendré : typographie, orthographe, registre.")
    ap.add_argument("fichier", nargs="?", help="fichier à vérifier ; à défaut, l’entrée standard")
    ap.add_argument("--corriger", action="store_true", help="réécrit la typographie sur la sortie standard")
    ap.add_argument("--seuil", type=float, default=None, help="note minimale de registre ; sort 1 en dessous")
    a = ap.parse_args()

    texte = pathlib.Path(a.fichier).read_text(encoding="utf8") if a.fichier else sys.stdin.read()
    texte = unicodedata.normalize("NFC", texte)

    # TÉMOIN. Un texte vide traversait les trois passes sans rien déclencher et
    # sortait « ACCEPTÉ » — un contrôle qui approuve le néant ne contrôle rien,
    # et c'est ainsi qu'une extraction ratée passe pour une réussite.
    if len(texte.split()) < 20:
        print(f"REFUSÉ — {len(texte.split())} mot(s) reçu(s). "
              f"Sous 20 mots, aucune passe n'est concluante : vérifiez l'extraction.")
        return 2

    if a.corriger:
        sys.stdout.write(corriger_typographie(texte))
        return 0

    faute = False

    typo = typographie(texte)
    print(f"TYPOGRAPHIE  {len(typo)} défaut(s)" + ("  — corrigeables par --corriger" if typo else ""))
    for pos, quoi, attendu in typo[:15]:
        print(f"   {situer(texte, pos):>9}  {quoi} → {attendu}")
    if len(typo) > 15:
        print(f"   … et {len(typo) - 15} autre(s)")
    if typo:
        faute = True

    ortho = orthographe(texte)
    if ortho is None:
        print("\nORTHOGRAPHE  NON VÉRIFIÉE — `pip install pyspellchecker` absent")
    else:
        print(f"\nORTHOGRAPHE  {len(ortho)} mot(s) inconnu(s) du français et du lexique projet")
        for pos, mot, cand in ortho[:15]:
            sug = f"  → {', '.join(cand)}" if cand else ""
            print(f"   {situer(texte, pos):>9}  {mot}{sug}")
        if len(ortho) > 15:
            print(f"   … et {len(ortho) - 15} autre(s)")
        if ortho:
            faute = True

    constats, note, m = registre(texte)
    print(f"\nREGISTRE     {note:.1f}/10   "
          f"({m['mots']} mots · {m['phrases']} phrases · écart-type {m['ecart_type']} · "
          f"réserve {m['reserve_pour_mille']}‰ · {m['prescription']} prescription(s))")
    for quoi, extrait in constats[:15]:
        print(f"   {quoi} — « {extrait} »")
    if not constats:
        print("   aucune marque relevée")

    print()
    if faute:
        print("REFUSÉ — une pièce contractuelle ne part pas avec une faute.")
        return 1
    if a.seuil is not None and note < a.seuil:
        print(f"REFUSÉ — registre {note:.1f}/10, seuil {a.seuil}.")
        return 1
    print("ACCEPTÉ")
    return 0


if __name__ == "__main__":
    sys.exit(main())
