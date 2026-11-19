"""Importa perspectivas públicas do material Opus Altana para a galeria local.

O usuário forneceu o book original do empreendimento; as mesmas perspectivas
também estão publicadas em páginas de divulgação do projeto.
"""
from io import BytesIO
from pathlib import Path
from urllib.request import Request, urlopen
from PIL import Image

BASE = "https://opusaltana.midimob.com.br/imgs/"
IMAGES = [

  [
    "wellness-01.webp",
    "imagens-opus-altana-academia_p.jpg"
  ],
  [
    "wellness-02.webp",
    "imagens-opus-altana-academia-interno_p.jpg"
  ],
  [
    "wellness-03.webp",
    "imagens-opus-altana-pilates_p.jpg"
  ],
  [
    "wellness-04.webp",
    "imagens-opus-altana-spa_p.jpg"
  ],
  [
    "wellness-05.webp",
    "imagens-opus-altana-sky-decks_p.jpg"
  ],
  [
    "grand-slam-01.webp",
    "imagens-opus-altana-quadra-de-tenis-coberta_p.png"
  ],
  [
    "grand-slam-02.webp",
    "imagens-opus-altana-quadra-de-tenis_p.png"
  ],
  [
    "grand-slam-03.webp",
    "imagens-opus-altana-quadra-poliesportiva_p.png"
  ],
  [
    "grand-slam-04.webp",
    "imagens-opus-altana-quadra-areia_p.png"
  ],
  [
    "kids-01.webp",
    "imagens-opus-altana-academia-infantil_p.jpg"
  ],
  [
    "kids-02.webp",
    "imagens-opus-altana-brinquedoteca_p.jpg"
  ],
  [
    "kids-03.webp",
    "imagens-opus-altana-playground_p.png"
  ],
  [
    "kids-04.webp",
    "imagens-opus-altana-playground-3_p.jpg"
  ],
  [
    "social-01.webp",
    "imagens-opus-altana-winebar-indoor_p.jpg"
  ],
  [
    "social-02.webp",
    "imagens-opus-altana-winebar_p.jpg"
  ],
  [
    "social-03.webp",
    "imagens-opus-altana-charutaria_p.jpg"
  ],
  [
    "social-04.webp",
    "imagens-opus-altana-mirante-charutaria_p.jpg"
  ],
  [
    "social-05.webp",
    "imagens-opus-altana-feirinha_p.jpg"
  ],
  [
    "social-06.webp",
    "imagens-opus-altana-lago-bangalo_p.jpg"
  ],
  [
    "pet-01.webp",
    "imagens-opus-altana-clube_p.png"
  ],
  [
    "pet-02.webp",
    "imagens-opus-altana-pet-place_p.jpg"
  ]
] 

DEST = Path("dist/assets")
DEST.mkdir(parents=True, exist_ok=True)
for filename, source in IMAGES:
    # A origem usa sufixo _p para a miniatura (500 px).
    # Preferir a versão sem sufixo quando existir e tiver resolução maior.
    candidates = [BASE + source.replace("_p.", "."), BASE + source]
    best_photo = None
    best_url = None
    for url in candidates:
        try:
            req = Request(url, headers={"User-Agent": "Mozilla/5.0 (compatible; AltanaMediaImport/1.0)"})
            with urlopen(req, timeout=30) as response:
                content = response.read()
            if len(content) < 5000:
                continue
            with Image.open(BytesIO(content)) as opened:
                photo = opened.convert("RGB")
                if best_photo is None or photo.width * photo.height > best_photo.width * best_photo.height:
                    best_photo = photo
                    best_url = url
            if best_photo.width >= 1150:
                break
        except (OSError, ValueError) as error:
            print(f"Fonte indisponível: {url} ({error})")
    if best_photo is None:
        raise ValueError(f"Não foi possível obter a imagem {filename}")
    photo = best_photo
    if photo.width > 1440:
        height = max(1, round(photo.height * (1440 / photo.width)))
        photo = photo.resize((1440, height), Image.Resampling.LANCZOS)
    target = DEST / filename
    photo.save(target, "WEBP", quality=82, method=6)
    print(f"{target} {photo.width}x{photo.height} ({target.stat().st_size} B) | {best_url}")
print(f"Importadas {len(IMAGES)} perspectivas.")
