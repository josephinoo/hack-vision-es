/**
 * Placeholder para desempates que implementará otro compañero.
 * @param {number} number
 * @param {string} title
 * @param {string} description
 * @param {string} pickerEmoji
 * @returns {import('./types.js').TieBreakerDefinition}
 */
export function createStubTieBreaker(number, title, description, pickerEmoji = '🎮') {
  return {
    id: `desempate-${number}`,
    number,
    title,
    description,
    pickerEmoji,
    implemented: false,
    requiresHandTracking: false,
    bannerTitle: title,
    bannerIntro: '',
    bannerPlaying: '',
  }
}
