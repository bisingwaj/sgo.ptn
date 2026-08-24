# Documents

Documents destinés à être envoyés ou imprimés, produits depuis ce dépôt.

## Le cycle d'un dossier, du plan au marché

`cycle-passation.html` est la **source**, `PTN-RDC_cycle-passation.pdf` le
document à envoyer. Le PDF se régénère depuis la source ; ne pas le
retoucher ailleurs, la retouche serait perdue à la prochaine génération.

Régénération, sans dépendance ajoutée au projet — Chrome imprime lui-même :

```bash
chrome --headless=new --remote-debugging-port=9222 --user-data-dir=/tmp/chrome-pdf about:blank &
node scripts/en-pdf.mjs documents/cycle-passation.html documents/PTN-RDC_cycle-passation.pdf
```

**Ce que le document affirme doit rester vrai.** Les habilitations du § 5
sont relevées dans `subrole_permissions`, les écrans cités existent, et les
actes signalés « sans écran » le sont encore. Toute évolution du cycle
demande de reprendre le document avant de le rediffuser — un schéma faux
coûte plus cher que pas de schéma.
