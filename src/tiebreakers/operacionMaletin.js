/** Solo rama desempate-maletin: lanzar el #3 al entrar y tras cada ronda (para probar). */
export const DEV_ALWAYS_MALETIN = true

export const MALETIN_DECOYS = [
  { id: 'tanga', emoji: '👙', label: 'Tanga' },
  { id: 'mascarilla', emoji: '😷', label: 'Mascarilla' },
  { id: 'open-corsa', emoji: '🚗', label: 'Open Corsa' },
]

/** @type {import('./types.js').TieBreakerDefinition} */
export const operacionMaletinTieBreaker = {
  id: 'operacion-maletin',
  number: 3,
  kind: 'maletin',
  title: 'Operación Maletín',
  description:
    '¡Cuidado! Aparecen tanga, mascarilla y Open Corsa — si las coges, pierdes. Solo el maletín vale.',
  pickerEmoji: '💼',
  implemented: true,
  requiresHandTracking: true,
  bannerTitle: 'Operación Maletín',
  bannerIntro: '✊ Cierra el puño para coger · maletines suman, lo demás resta y quita vida',
  bannerPlaying: '✊ Cierra el puño sobre 💼 · evita 👙😷🚗 (restan y quitan vida)',
  maletinConfig: {
    introMs: 1500,
    durationMs: 35_000,
    grabRadius: 0.14,
    itemSize: 58,
    startHealth: 3,
    briefcaseChance: 0.4,
    itemLifetimeMs: 2600,
    spawnEveryMinMs: 700,
    spawnEveryMaxMs: 1500,
    maxItemsOnScreen: 3,
    itemImageSrc: '/images/billete.png',
  },
}
