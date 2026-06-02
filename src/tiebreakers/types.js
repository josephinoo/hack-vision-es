/**
 * @typedef {Object} CatchRainGameConfig
 * @property {number} durationMs
 * @property {number} introMs
 * @property {number} itemSize - px
 * @property {number} grabRadius - normalized 0-1
 * @property {number} maxItems - max ungrabbed on screen
 * @property {number} spawnEveryStart - ms between spawns at start
 * @property {number} spawnEveryEnd - ms between spawns near end (faster rain)
 * @property {number} fallSpeedMin
 * @property {number} fallSpeedMax
 * @property {'emoji'|'image'} itemType
 * @property {string} [itemEmoji]
 * @property {string} [itemImageSrc]
 * @property {string[]} [randomEmojiPool]
 * @property {string} scoreLabel - e.g. "sobres"
 * @property {boolean} [usePointerFingerOnly] - solo punta del índice para colisión
 * @property {number} [bombChance] - 0–1 probabilidad de spawn bomba
 * @property {number} [bombPenalty] - puntos restados al tocar bomba
 * @property {string} [bombEmoji]
 */

/**
 * @typedef {Object} MaletinGameConfig
 * @property {number} introMs
 * @property {number} spawnWindowMs - ventana aleatoria antes de aparecer (ms)
 * @property {number} grabRadius
 * @property {number} timeoutAfterSpawnMs
 * @property {number} itemSize - px
 * @property {string} itemImageSrc
 */

/**
 * @typedef {Object} TieBreakerDefinition
 * @property {string} id - unique slug
 * @property {number} [number] - desempate # (1-4)
 * @property {'catch-rain'|'maletin'} [kind] - catch-rain si hay gameConfig; maletin = custom
 * @property {string} title
 * @property {string} description
 * @property {string} pickerEmoji
 * @property {boolean} implemented
 * @property {boolean} requiresHandTracking - needs Holistic for grab detection
 * @property {CatchRainGameConfig} [gameConfig] - for catch-rain style games
 * @property {MaletinGameConfig} [maletinConfig] - Operación Maletín
 * @property {string} bannerTitle
 * @property {string} bannerIntro
 * @property {string} bannerPlaying
 */

export {}
