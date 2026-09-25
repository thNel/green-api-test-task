import {
  createGreenApiClient,
  type GreenApiClient,
} from './greenApi'
import type { ConnectionCredentials } from '../domain/types'

const clients = new Map<string, GreenApiClient>()

export const registerGreenApiClient = (
  sessionId: string,
  credentials: ConnectionCredentials,
) => {
  clients.set(sessionId, createGreenApiClient(credentials))
}

export const getGreenApiClient = (sessionId: string) => {
  const client = clients.get(sessionId)
  if (!client) throw new Error('Сессия GREEN-API завершена')
  return client
}

export const unregisterGreenApiClient = (sessionId: string) => {
  clients.delete(sessionId)
}
