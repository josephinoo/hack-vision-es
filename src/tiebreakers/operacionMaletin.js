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
    'Primer jugador con 3 maletines gana. Cuidado con tanga, mascarilla y Open Corsa.',
  pickerEmoji: '💼',
  implemented: true,
  // El agarre usa los landmarks de 2 manos del reconocedor RPS (getFistGrabbers).
  // No hace falta el HolisticLandmarker (modelo pesado de pose+cara+manos), que
  // además es de una sola persona. Mantenerlo apagado evita correr 2 modelos a la vez.
  requiresHandTracking: false,
  bannerTitle: 'Operación Maletín',
  bannerIntro: '✊ Cierra el puño · el primero con 3 maletines gana',
  bannerPlaying: '✊ Coge 💼 maletines · evita 👙😷🚗',
  maletinConfig: {
    introMs: 1500,
    durationMs: 35_000,
    winScore: 3,
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
