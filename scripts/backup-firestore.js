/**
 * backup-firestore.js
 * Descarrega totes les col·leccions de Firestore a fitxers JSON locals.
 *
 * Ús:
 *   node backup-firestore.js
 *
 * Resultat:
 *   backup_YYYY-MM-DD_HH-MM/
 *     ├── users.json
 *     ├── scores__llanca-ensaimada__players.json
 *     ├── scores__pastis-caigut__players.json
 *     └── ... (una carpeta per col·lecció/subcolecció)
 *
 * Requisits:
 *   npm install firebase-admin
 *   Fitxer de credencials: ./serviceAccountKey.json
 */

const { initializeApp, cert } = require('firebase-admin/app');
const { getFirestore }        = require('firebase-admin/firestore');
const fs    = require('fs');
const path  = require('path');

const serviceAccount = require('./serviceAccountKey.json');

initializeApp({ credential: cert(serviceAccount) });
const db = getFirestore();

// ── Directori de sortida ───────────────────────────────────────────────────
const now = new Date();
const pad = n => String(n).padStart(2, '0');
const timestamp = `${now.getFullYear()}-${pad(now.getMonth()+1)}-${pad(now.getDate())}_${pad(now.getHours())}-${pad(now.getMinutes())}`;
const OUTPUT_DIR = path.join(__dirname, 'backups', `backup_${timestamp}`);
fs.mkdirSync(OUTPUT_DIR, { recursive: true });

// ── Utilitats ──────────────────────────────────────────────────────────────
function saveJson(filename, data) {
  const filepath = path.join(OUTPUT_DIR, filename);
  fs.writeFileSync(filepath, JSON.stringify(data, null, 2), 'utf8');
  return filepath;
}

function firestoreValueToJs(value) {
  if (value === null || value === undefined) return value;
  // Timestamp de Firestore
  if (value && typeof value.toDate === 'function') return value.toDate().toISOString();
  // GeoPoint
  if (value && value._latitude !== undefined) return { lat: value._latitude, lng: value._longitude };
  // DocumentReference
  if (value && value.path && value.firestore) return `REF:${value.path}`;
  if (Array.isArray(value)) return value.map(firestoreValueToJs);
  if (typeof value === 'object') {
    return Object.fromEntries(Object.entries(value).map(([k, v]) => [k, firestoreValueToJs(v)]));
  }
  return value;
}

function snapToObject(snap) {
  const result = {};
  snap.forEach(doc => {
    result[doc.id] = firestoreValueToJs(doc.data());
  });
  return result;
}

// ── Backup recursiu ────────────────────────────────────────────────────────
async function backupCollection(colRef, namePrefix) {
  let snap;
  try {
    snap = await colRef.get();
  } catch (e) {
    console.warn(`  ⚠️  No s'ha pogut llegir ${namePrefix}: ${e.message}`);
    return { docs: 0, subcols: 0 };
  }

  if (snap.empty) {
    console.log(`  ○  ${namePrefix}  (buida)`);
    return { docs: 0, subcols: 0 };
  }

  const data = snapToObject(snap);
  const filename = `${namePrefix.replace(/\//g, '__')}.json`;
  const filepath = saveJson(filename, data);
  console.log(`  ✓  ${namePrefix.padEnd(50)}  ${snap.size} docs  → ${path.basename(filepath)}`);

  // Subcoleccions de cada document
  let totalSubcols = 0;
  for (const doc of snap.docs) {
    let subcols;
    try {
      subcols = await doc.ref.listCollections();
    } catch (e) {
      continue;
    }
    for (const subcol of subcols) {
      const subPrefix = `${namePrefix}/${doc.id}/${subcol.id}`;
      // Simplificació: per col·leccions de players les agrupem al nom del pare
      const flatName  = `${namePrefix}__${subcol.id}`;
      await backupCollection(subcol, flatName);
      totalSubcols++;
    }
  }

  return { docs: snap.size, subcols: totalSubcols };
}

// ── Main ───────────────────────────────────────────────────────────────────
async function main() {
  console.log('');
  console.log('╔══════════════════════════════════════════════════════════════╗');
  console.log('║  BACKUP FIRESTORE — Obrador Guadiana 2026                    ║');
  console.log(`║  Directori: backup_${timestamp}                   ║`);
  console.log('╚══════════════════════════════════════════════════════════════╝');
  console.log('');

  // Llista totes les col·leccions arrel
  let rootCols;
  try {
    rootCols = await db.listCollections();
  } catch (e) {
    console.error('Error llistant col·leccions:', e.message);
    process.exit(1);
  }

  console.log(`Col·leccions arrel trobades: ${rootCols.map(c => c.id).join(', ')}\n`);

  let totalDocs = 0;
  for (const col of rootCols) {
    const { docs } = await backupCollection(col, col.id);
    totalDocs += docs;
  }

  // Resum
  const files = fs.readdirSync(OUTPUT_DIR);
  const totalSize = files.reduce((s, f) => {
    return s + fs.statSync(path.join(OUTPUT_DIR, f)).size;
  }, 0);

  console.log('');
  console.log('═══════════════════════════════════════════════════════════════');
  console.log('  BACKUP COMPLETAT');
  console.log(`  Documents: ${totalDocs}`);
  console.log(`  Fitxers JSON: ${files.length}`);
  console.log(`  Mida total: ${(totalSize / 1024).toFixed(1)} KB`);
  console.log(`  Directori: ${OUTPUT_DIR}`);
  console.log('═══════════════════════════════════════════════════════════════');
  console.log('');
}

main().catch(err => {
  console.error('Error fatal:', err);
  process.exit(1);
});
