const GESTURE_ALIASES = {
  rock: 'rock',
  piedra: 'rock',
  closed_fist: 'rock',
  
  paper: 'paper',
  papel: 'paper',
  open_palm: 'paper',
  
  scissors: 'scissors',
  tijera: 'scissors',
  tijeras: 'scissors',
  victory: 'scissors',
}

export const GESTURE_EMOJI = {
  rock: '✊',
  paper: '✋',
  scissors: '✌️',
}

export const GESTURE_LABEL_ES = {
  rock: 'Piedra',
  paper: 'Papel',
  scissors: 'Tijera',
}

export function normalizeGesture(categoryName) {
  if (!categoryName) return null
  const key = categoryName.toLowerCase().trim()
  if (GESTURE_ALIASES[key]) return GESTURE_ALIASES[key]
  if (key.includes('rock') || key.includes('piedra')) return 'rock'
  if (key.includes('paper') || key.includes('papel')) return 'paper'
  if (key.includes('scissor') || key.includes('tijera')) return 'scissors'
  return null
}

export function parseGesture(gesture, minScore = 0.8) {
  if (!gesture) return null
  const score = gesture.score ?? 0
  if (score <= minScore) return null
  return normalizeGesture(gesture.categoryName)
}

/**
 * @returns {'player1' | 'player2' | 'tie' | null}
 */
export function determineWinner(g1, g2) {
  if (!g1 || !g2) return null
  if (g1 === g2) return 'tie'
  const wins = {
    rock: 'scissors',
    scissors: 'paper',
    paper: 'rock',
  }
  if (wins[g1] === g2) return 'player1'
  if (wins[g2] === g1) return 'player2'
  return 'tie'
}
