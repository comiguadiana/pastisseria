const fs = require('fs');
const path = require('path');

const gamesDir = path.join(__dirname, 'games');
const games = fs.readdirSync(gamesDir).filter(f => fs.statSync(path.join(gamesDir, f)).isDirectory());

games.forEach(game => {
    const jsPath = path.join(gamesDir, game, `${game}.js`);
    if (!fs.existsSync(jsPath)) return;
    
    let content = fs.readFileSync(jsPath, 'utf8');

    // 1. Add imports for doc, getDoc, db
    if (!content.includes('firebase-firestore')) {
        // Find the ranking.js import and put it after
        content = content.replace(
            /from '\.\.\/\.\.\/assets\/js\/ranking\.js';/,
            `from '../../assets/js/ranking.js';\nimport { db } from '../../assets/js/firebase-config.js';\nimport { doc, getDoc } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";`
        );
    }
    
    // Convert GAME name enum
    const gameEnumMap = {
        'pasteblock': 'PASTEBLOCK',
        'pastis-caigut': 'PASTIS_CAIGUT',
        'llanca-ensaimada': 'LLANCA_ENSAIMADA',
        'memoria-pastissera': 'MEMORIA_PASTISSERA',
        'pastis-perfecte': 'PASTIS_PERFECTE',
        'caca-sasha': 'CACA_SASHA',
        'suika-pastis': 'FUSIO_PASTISSERA'
    };
    const enumName = gameEnumMap[game];

    // 2. Replace requireAuth block
    // It looks like: requireAuth(...).then(({ user, profile: p }) => { ... bestScore = parseInt(localStorage...); ... })
    content = content.replace(
        /requireAuth\((.*?)\)[\s\n]*\.then\(\(\{\s*user,\s*profile:\s*p\s*\}\)\s*=>\s*\{([\s\S]*?)initGame\(\);/m,
        `requireAuth($1)\n  .then(async ({ user, profile: p }) => {\n    uid = user.uid; profile = p;\n    renderNavbarUser(p, user);\n    try {\n      const ref = doc(db, 'scores', GAMES.${enumName}, 'players', uid);\n      const snap = await getDoc(ref);\n      if (snap.exists()) bestScore = snap.data().score;\n    } catch(e) {}\n    const bestEl = document.getElementById('best');\n    if (bestEl) bestEl.textContent = bestScore.toLocaleString();\n    initGame();`
    );

    // 3. Remove localStorage.setItem for bestScore
    content = content.replace(
        /if\s*\(isNew\)\s*\{\s*bestScore\s*=\s*score;\s*localStorage\.setItem\([^)]+\);\s*\}/g,
        `if (isNew) { bestScore = score; }`
    );
    // There are some places without braces maybe? Wait, in my previous code I used `{ bestScore = score; localStorage... }`
    content = content.replace(
        /localStorage\.setItem\(`[^`]+_best_\$\{uid\}`,\s*score\);/g,
        ``
    );

    // 4. Update unlockNextGame call and remove localstorage guadiana_score
    content = content.replace(
        /unlockNextGame\(GAMES\.[A-Z_]+\);/g,
        `await unlockNextGame(GAMES.${enumName}, uid);`
    );
    // Suika game had a hardcoded string
    content = content.replace(
        /unlockNextGame\('fusio-pastissera'\);/g,
        `await unlockNextGame(GAMES.FUSIO_PASTISSERA, uid);`
    );
    
    // Remove localStorage guadiana_score_*
    content = content.replace(
        /localStorage\.setItem\('guadiana_score_[^']+',\s*score\);/g,
        ``
    );
    // also backticks
    content = content.replace(
        /localStorage\.setItem\(`guadiana_score_[^`]+`,\s*score\);/g,
        ``
    );
    
    // Wait, memoria-pastissera didn't have bestEl id "best", it updates overlay directly.
    // That's fine, the `const bestEl` check handles it.
    
    fs.writeFileSync(jsPath, content);
    console.log('Patched', game);
});
