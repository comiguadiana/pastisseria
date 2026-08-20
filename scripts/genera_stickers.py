#!/usr/bin/env python3
"""
Genera paquets d'adhesius de WhatsApp (.wastickers) a partir de les sashes del projecte.
Requisits: pip install Pillow
Ús:        python3 genera_stickers.py
Resultat:  sasha_games_pack1.wastickers  (stickers 1-30)
           sasha_games_pack2.wastickers  (stickers 31-42)

Per instal·lar a Android:
  1. Copia els .wastickers al mòbil
  2. Obre'l amb un gestor de fitxers → "Obrir amb WhatsApp"
"""

import json
import zipfile
import io
import os
from pathlib import Path

try:
    from PIL import Image
except ImportError:
    print("ERROR: Cal instal·lar Pillow:  pip install Pillow")
    exit(1)

# ── Configuració ──────────────────────────────────────────────────────────────
SASHAS_DIR   = Path(__file__).parent.parent / "assets/img/sashas"
OUTPUT_DIR   = Path(__file__).parent.parent
STICKER_SIZE = 512
TRAY_SIZE    = 96
MAX_PER_PACK = 21

PACK_META = {
    "publisher":              "Guadiana Electronics",
    "publisher_email":        "",
    "publisher_website":      "https://guadiana.cat",
    "privacy_policy_website": "",
    "license_agreement_website": "",
}

PACKS = [
    {
        "identifier": "sasha_games_pack1",
        "name":       "Sasha Games · Pack 1",
        "tray":       "sasha_rei_corona.png",
    },
    {
        "identifier": "sasha_games_pack2",
        "name":       "Sasha Games · Pack 2",
        "tray":       "sasha_dj_auriculars.png",
    },
]

EMOJI_MAP = {
    "arquitecte":   ["🏗️", "📐"],
    "artista":      ["🎨", "🖌️"],
    "astronauta":   ["🚀", "🌙"],
    "badminton":    ["🏸"],
    "basquet":      ["🏀"],
    "bomber":       ["🚒", "🔥"],
    "cassador":     ["🗺️", "💎"],
    "catedratic":   ["🎓", "📚"],
    "ciclista":     ["🚴", "🌳"],
    "cientific":    ["🔬", "⚗️"],
    "detectiu":     ["🔍", "🕵️"],
    "dj":           ["🎧", "🎵"],
    "doctor":       ["🩺", "💊"],
    "escacs":       ["♟️"],
    "explorador":   ["🦁", "🌿"],
    "flautista":    ["🎶", "🎼"],
    "fotograf":     ["📸"],
    "futbolista":   ["⚽", "🏟️"],
    "gangster":     ["🔫", "😤"],
    "hacker":       ["💻", "🖥️"],
    "jardiner":     ["🌸", "🌱"],
    "jutge":        ["⚖️"],
    "mag":          ["✨", "🌟"],
    "mariner":      ["⚓", "🚢"],
    "mecanic":      ["🔧", "🛠️"],
    "mestre":       ["📝", "🍎"],
    "miner":        ["⛏️"],
    "ninja":        ["🥷", "⭐"],
    "obrer":        ["🔨", "🏗️"],
    "pages":        ["🌾", "🥕"],
    "paleontoleg":  ["🦖", "🦴"],
    "patinador":    ["🛹"],
    "pilot":        ["🛸", "👾"],
    "pirata":       ["🏴‍☠️", "💰"],
    "rei":          ["👑"],
    "reporter":     ["🎤", "📺"],
    "rocker":       ["🎸", "🤘"],
    "samurai":      ["⚔️", "🗡️"],
    "submarinista": ["🤿", "🐠"],
    "surfista":     ["🏄", "🌊"],
    "viking":       ["🪓", "⚔️"],
    "xef":          ["👨‍🍳", "🍽️"],
}

def get_emojis(filename):
    name = filename.lower()
    for key, emojis in EMOJI_MAP.items():
        if key in name:
            return emojis
    return ["😄"]

def png_to_webp_bytes(png_path, size):
    img = Image.open(png_path).convert("RGBA")
    canvas = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    img.thumbnail((size, size), Image.LANCZOS)
    offset = ((size - img.width) // 2, (size - img.height) // 2)
    canvas.paste(img, offset, img)
    buf = io.BytesIO()
    canvas.save(buf, format="WEBP", lossless=True, quality=100)
    return buf.getvalue()

def build_pack(pack_meta, sticker_files, output_path):
    stickers_json = []
    webp_files    = {}

    print(f"\n📦  Generant {output_path.name}  ({len(sticker_files)} stickers)")

    tray_src  = SASHAS_DIR / pack_meta["tray"]
    tray_data = png_to_webp_bytes(tray_src, TRAY_SIZE)
    tray_name = "tray.webp"

    for png in sticker_files:
        webp_name = png.stem + ".webp"
        data      = png_to_webp_bytes(png, STICKER_SIZE)
        kb        = len(data) / 1024
        warn      = "  ⚠️ >100KB" if kb > 100 else ""
        print(f"  ✓ {png.name:45s} → {kb:.1f} KB{warn}")
        webp_files[webp_name] = data
        stickers_json.append({
            "image_file":         webp_name,
            "emojis":             get_emojis(png.stem),
            "accessibility_text": png.stem.replace("sasha_", "Sasha ").replace("_", " "),
        })

    contents = {
        "android_play_store_link": "",
        "ios_app_store_link":      "",
        "sticker_packs": [{
            "identifier":                pack_meta["identifier"],
            "name":                      pack_meta["name"],
            "publisher":                 PACK_META["publisher"],
            "tray_image_file":           tray_name,
            "publisher_email":           PACK_META["publisher_email"],
            "publisher_website":         PACK_META["publisher_website"],
            "privacy_policy_website":    PACK_META["privacy_policy_website"],
            "license_agreement_website": PACK_META["license_agreement_website"],
            "image_data_version":        "1",
            "avoid_cache":               False,
            "stickers":                  stickers_json,
        }],
    }

    with zipfile.ZipFile(output_path, "w", zipfile.ZIP_DEFLATED) as zf:
        zf.writestr("contents.json", json.dumps(contents, ensure_ascii=False, indent=2))
        zf.writestr(tray_name, tray_data)
        for name, data in webp_files.items():
            zf.writestr(name, data)

    print(f"  ✅  Desat: {output_path}  ({output_path.stat().st_size / 1024:.0f} KB)")

def main():
    pngs = sorted(SASHAS_DIR.glob("*.png"))
    if not pngs:
        print(f"ERROR: No s'han trobat PNGs a {SASHAS_DIR}")
        return

    print(f"🐾  Sashes trobades: {len(pngs)}")
    chunks = [pngs[i:i+MAX_PER_PACK] for i in range(0, len(pngs), MAX_PER_PACK)]

    for chunk, pack_cfg in zip(chunks, PACKS):
        out = OUTPUT_DIR / f"{pack_cfg['identifier']}.wastickers"
        build_pack(pack_cfg, chunk, out)

    print("\n🎉  Fet! Transfereix els .wastickers al mòbil Android i obre'ls.")
    print("    (Gestor de fitxers → Obrir amb → WhatsApp)")

if __name__ == "__main__":
    main()
