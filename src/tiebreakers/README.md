# Desempates (tie-breakers)

Cada empate puede resolverse con un mini-juego distinto. El registro central está en `registry.js`.

## Añadir un desempate nuevo

### Opción A — Sustituir un stub (#1, #2 o #3)

1. Crea `src/tiebreakers/miDesempate.js`:

```js
/** @type {import('./types.js').TieBreakerDefinition} */
export const miDesempate = {
  id: 'mi-desempate',
  number: 1, // 1, 2 o 3
  title: 'Mi juego',
  description: 'Breve texto en el selector.',
  pickerEmoji: '🎯',
  implemented: true,
  requiresHandTracking: true, // false si no usa cámara/manos
  bannerTitle: 'Mi juego',
  bannerIntro: 'Texto al empezar',
  bannerPlaying: 'Texto durante la partida',
  gameConfig: { /* ver cazaSobres.js */ },
}
```

2. En `registry.js`, importa y reemplaza el stub:

```js
import { miDesempate } from './miDesempate'
// en TIE_BREAKERS_LIST, índice 0 = #1, 1 = #2, 2 = #3
TIE_BREAKERS_LIST[0] = miDesempate
```

### Opción B — `registerTieBreaker()` en runtime

```js
import { registerTieBreaker } from './registry'
registerTieBreaker(miDesempate, 0)
```

## Tipo “lluvia + coger” (como #4 Caza de Sobres)

Reutiliza `useCatchRainGame` + `CatchRainOverlay`. Solo define `gameConfig`:

| Campo | Uso |
|--------|-----|
| `maxItems` | Cuántos objetos pueden estar en pantalla |
| `spawnEveryStart` / `spawnEveryEnd` | Frecuencia de spawn (ms); baja = más lluvia |
| `randomEmojiPool` | Emojis que caen (p. ej. `['💵','✉️']`) |
| `itemType: 'image'` + `itemImageSrc` | En vez de emoji |

Detección: `getPenaltyGrabbers` + `tryGrabItem` en `utils/grabDetection.js`.

## Tipo custom (otra mecánica)

1. `implemented: true`, `requiresHandTracking` según necesidad.
2. **No** pongas `gameConfig`.
3. En `App.jsx`, extiende el `switch (tieBreaker.kind)` cuando añadamos `kind: 'catch-rain' | 'custom'` — por ahora los custom pueden engancharse sustituyendo la lógica en `App` o añadiendo un hook propio y un overlay propio referenciado desde la definición.

## #4 Caza de Sobres

Archivo: `cazaSobres.js` — lluvia masiva de 💵💰✉️🧧, 16 s, hasta 52 objetos en pantalla.
