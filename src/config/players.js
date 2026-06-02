export const PLAYER_PROFILES = {
  avalos: {
    id: 'avalos',
    name: 'Avalos',
    avatar: '/images/avalos.png',
  },
  koldo: {
    id: 'koldo',
    name: 'Koldo',
    avatar: '/images/koldo.png',
  },
}

export const DEFAULT_ROSTER = {
  player1: PLAYER_PROFILES.avalos,
  player2: PLAYER_PROFILES.koldo,
}

/** @param {{ player1: typeof PLAYER_PROFILES.avalos, player2: typeof PLAYER_PROFILES.koldo }} roster */
export function rosterToGameNames(roster) {
  return {
    player1: roster.player1.name,
    player2: roster.player2.name,
    player1Avatar: roster.player1.avatar,
    player2Avatar: roster.player2.avatar,
    player1Id: roster.player1.id,
    player2Id: roster.player2.id,
  }
}

export function swapRosterSides(roster) {
  return { player1: roster.player2, player2: roster.player1 }
}
