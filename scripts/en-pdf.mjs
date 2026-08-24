/**
 * Impression en PDF par le protocole CDP — aucune dépendance ajoutée.
 *
 * `--print-to-pdf` en ligne de commande impose l'en-tête et le pied par
 * défaut de Chrome (titre, URL du fichier local). Passer par CDP permet de
 * fournir les nôtres : pagination lisible, et rien qui trahisse un chemin
 * de disque.
 */
let idSeq = 0;
const pause = (ms) => new Promise((r) => setTimeout(r, ms));
const fs = await import("node:fs");

const [, , source, sortie] = process.argv;

const t = await (await fetch("http://127.0.0.1:9222/json/list"))
  .json()
  .then((l) => l.filter((x) => x.type === "page")[0]);
const ws = new WebSocket(t.webSocketDebuggerUrl);
const attentes = new Map();
await new Promise((res) => (ws.onopen = res));
ws.onmessage = (m) => {
  const d = JSON.parse(m.data);
  if (d.id && attentes.has(d.id)) {
    const { res, rej } = attentes.get(d.id);
    attentes.delete(d.id);
    d.error ? rej(new Error(JSON.stringify(d.error))) : res(d.result);
  }
};
const cmd = (method, params = {}) =>
  new Promise((res, rej) => {
    const id = ++idSeq;
    attentes.set(id, { res, rej });
    ws.send(JSON.stringify({ id, method, params }));
    setTimeout(
      () => attentes.has(id) && (attentes.delete(id), rej(new Error("délai " + method))),
      120000,
    );
  });

await cmd("Page.enable");
await cmd("Runtime.enable");
await cmd("Page.navigate", { url: "file:///" + source.replace(/\\/g, "/") });

// Attendre le rendu ET le chargement des polices : imprimer trop tôt
// produit un document en police de repli, aux césures différentes.
for (let i = 0; i < 40; i++) {
  await pause(500);
  const r = await cmd("Runtime.evaluate", {
    expression: "document.readyState === 'complete' && document.fonts.status === 'loaded'",
    returnByValue: true,
  });
  if (r.result.value) break;
}
await pause(1200);

const pied = `
<div style="width:100%;font-family:'IBM Plex Sans',sans-serif;font-size:7pt;color:#6d7587;
            padding:0 16mm;display:flex;justify-content:space-between;align-items:center;">
  <span>PTN-RDC · P180495 — Le cycle d’un dossier, du plan au marché</span>
  <span><span class="pageNumber"></span> / <span class="totalPages"></span></span>
</div>`;

const { data } = await cmd("Page.printToPDF", {
  landscape: false,
  printBackground: true,
  paperWidth: 8.27,
  paperHeight: 11.69,
  marginTop: 0.63,
  marginBottom: 0.71,
  marginLeft: 0.63,
  marginRight: 0.63,
  displayHeaderFooter: true,
  headerTemplate: "<span></span>",
  footerTemplate: pied,
  preferCSSPageSize: false,
});

fs.writeFileSync(sortie, Buffer.from(data, "base64"));
const ko = Math.round(fs.statSync(sortie).size / 1024);
console.log("  PDF écrit : " + sortie + "  (" + ko + " Ko)");

ws.close();
process.exit(0);
