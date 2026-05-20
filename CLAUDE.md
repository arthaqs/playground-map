# Playground Map — Claude Code Context

## Co je tento projekt
Interaktivní web app s mapou dětského hřiště (`hriste1_web.png`). Na obrázku hřiště jsou definovány klikatelné zóny (SVG polygony). Po kliknutí na zónu se zobrazí modal s detaily hry (název, počet hráčů, popis, miniatura tvaru polygonu).

## Jak spustit
```bash
npm install
npm run dev
# → http://localhost:5173
```

## Tech stack
- React 18 + Vite + TypeScript
- CSS moduly (`components.module.css`)
- Žádný backend — vše frontend, data hardcoded

## Architektura

```
src/
  components/
    HomePage.tsx        # Orchestrátor — drží state, renderuje PlayArea + Modal
    PlayArea.tsx        # Obrázek + SVG overlay (absolutně pozicovaný)
    InteractiveSVG.tsx  # SVG polygony (hover + click eventy)
    Modal.tsx           # Modal overlay s detaily zóny
    ZoneInfo.tsx        # Obsah modalu — název, polygon preview SVG, hráči, popis
  data/
    zones.ts            # Definice zón (JEDINÝ soubor který měníš pro přidání/úpravu zón)
  hooks/
    usePlayground.ts    # State: selectedZoneId, hoveredZoneId, isModalOpen
    useLocalStorage.ts  # Připraven pro budoucí persistenci
  types/
    playground.ts       # TypeScript typy (PlaygroundState, PlaygroundActions)
  styles/
    globals.css         # CSS proměnné (--color-yellow, --color-purple)
```

## Souřadnicový systém polygonů

**DŮLEŽITÉ:** Polygon souřadnice jsou v prostoru **přirozeného obrázku (2400×1525 px)**.

SVG overlay používá `viewBox="0 0 2400 1525"` a je absolutně pozicován přes obrázek s `width: 100% height: 100%`. To znamená polygony automaticky škálují se zobrazením — souřadnice stačí zadat jednou v přirozeném prostoru obrázku.

Zdrojový obrázek: `public/hriste1_web.png` (zmenšen z originálu `hriste1.png` 5532×3516 pomocí sharp na 2400×1525).

### Jak najít souřadnice na obrázku
Spusť v browser console (nebo přes preview eval):
```js
(() => {
  const container = document.querySelector('div[style*="relative"]');
  const img = document.querySelector('img');
  const helper = document.createElement('div');
  helper.style.cssText = 'position:absolute;top:0;left:0;width:100%;height:100%;z-index:999;cursor:crosshair;';
  const label = document.createElement('div');
  label.style.cssText = 'position:absolute;top:5px;left:5px;background:black;color:lime;font:bold 14px monospace;padding:4px 8px;border-radius:4px;pointer-events:none;';
  label.id = 'coord-label';
  helper.appendChild(label);
  helper.addEventListener('mousemove', e => {
    const r = img.getBoundingClientRect();
    const x = Math.round((e.clientX - r.left) / r.width * 2400);
    const y = Math.round((e.clientY - r.top) / r.height * 1525);
    label.textContent = `x:${x} y:${y}`;
  });
  container.appendChild(helper);
})()
```
Pak přejeď myší nad rohy zóny a přečti souřadnice.

## Jak přidat/upravit zónu

Edituj pouze `src/data/zones.ts`:

```typescript
{
  id: 'zone-twister',           // unikátní ID
  name: 'Twister',              // zobrazený název
  players: 4,                   // počet hráčů
  description: 'Popis hry...',  // zobrazeno v modalu
  polygon: {
    points: [[x1,y1],[x2,y2],[x3,y3],...]  // v prostoru 2400×1525
  },
  color: 'yellow' | 'purple'   // barva overlay a nadpisu v modalu
}
```

## Aktuální stav zón

| ID | Hra | Stav |
|----|-----|------|
| zone-twister | Twister | ⚠️ Polygon přibližný — souřadnice ještě nekalibrované na obrázek |

## TODO — co ještě zbývá

1. **Twister polygon** — opravit souřadnice tak, aby polygon přesně pokrýval oblast barevných kolíček na hřišti. Použij coordinate helper výše pro přesné naměření.

2. **Skákačka** — přidat zónu pro vlakový přejezd s čísly 0–10, tunel a nádraží (hra "skákačka"). Oblast: koleje s čísly, tunel vlevo dole, nádraží vpravo nahoře.

3. **Další zóny** — uživatel plánuje přidat další hry z obrázku (bude upřesněno).

## Barvy
- Žlutá: `#FFC107`
- Fialová: `#9C27B0`
- Pozadí stránky: `#FAFAFA`

## Nastavení serveru
`.claude/launch.json` je nakonfigurován — preview tools fungují přes `playground-map` server na portu 5173.

## GitHub
https://github.com/arthaqs/playground-map
