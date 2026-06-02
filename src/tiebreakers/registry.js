import { createStubTieBreaker } from './createStub'
import { cazaSobresTieBreaker } from './cazaSobres'
import { billeteCatchTieBreaker } from './billeteCatch'
import { operacionMaletinTieBreaker } from './operacionMaletin'
import { twerkingChallengeTieBreaker } from './twerkingChallenge'

/** Ordenados por numero de desempate (#1-#4). */
const TIE_BREAKERS_LIST = [
  createStubTieBreaker(1, 'Desempate #1', 'Reservado — tu compañero lo implementará aquí.', '1️⃣'),
  twerkingChallengeTieBreaker,
  operacionMaletinTieBreaker,
  cazaSobresTieBreaker,
]

/** Extras / legacy, no aparecen en el selector principal salvo que los anadas. */
export const EXTRA_TIE_BREAKERS = [billeteCatchTieBreaker]

export const TIE_BREAKERS = TIE_BREAKERS_LIST

/** Desempate por defecto al empatar (cambiar aquí o pasar id desde UI). */
export const DEFAULT_TIE_BREAKER_ID = 'operacion-maletin'

const byId = new Map(
  [...TIE_BREAKERS_LIST, ...EXTRA_TIE_BREAKERS].map((tb) => [tb.id, tb]),
)

/**
 * @param {string} id
 * @returns {import('./types.js').TieBreakerDefinition | undefined}
 */
export function getTieBreaker(id) {
  return byId.get(id)
}

export function getImplementedTieBreakers() {
  return TIE_BREAKERS.filter((tb) => tb.implemented)
}

/**
 * Registrar un desempate nuevo.
 * @param {import('./types.js').TieBreakerDefinition} definition
 * @param {number} [slot] - indice 0-3 en la lista principal
 */
export function registerTieBreaker(definition, slot) {
  if (slot != null && slot >= 0 && slot < TIE_BREAKERS_LIST.length) {
    TIE_BREAKERS_LIST[slot] = definition
  } else {
    TIE_BREAKERS_LIST.push(definition)
  }
  byId.set(definition.id, definition)
}
