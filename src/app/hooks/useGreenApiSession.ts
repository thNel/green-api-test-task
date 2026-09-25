import { useCallback, useState } from 'react'
import { createGreenApiClient } from '../../api/greenApi'
import { registerGreenApiClient, unregisterGreenApiClient } from '../../api/clientRegistry'
import { greenApiApi } from '../../api/greenApiApi'
import { useAppDispatch } from './useAppDispatch'
import type { ConnectionCredentials } from '../../domain/types'

const getErrorMessage = (error: unknown, fallback: string) =>
  error instanceof Error ? error.message : fallback

export function useGreenApiSession() {
  const dispatch = useAppDispatch()
  const [sessionId, setSessionId] = useState<string | null>(null)
  const [isConnecting, setIsConnecting] = useState(false)
  const [connectionError, setConnectionError] = useState('')

  const connect = useCallback(async (credentials: ConnectionCredentials) => {
    setIsConnecting(true)
    setConnectionError('')

    const normalizedCredentials = {
      apiUrl: credentials.apiUrl.trim().replace(/\/+$/, ''),
      idInstance: credentials.idInstance.trim(),
      apiTokenInstance: credentials.apiTokenInstance.trim(),
    }

    try {
      const client = createGreenApiClient(normalizedCredentials)
      const state = await client.getState()
      if (state.status === false || (state.stateInstance && state.stateInstance !== 'authorized')) {
        throw new Error(state.reason || 'Инстанс Telegram не авторизован')
      }

      const nextSessionId = globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random()}`
      registerGreenApiClient(nextSessionId, normalizedCredentials)
      setSessionId(nextSessionId)
      return true
    } catch (error) {
      setConnectionError(getErrorMessage(error, 'Не удалось проверить подключение'))
      return false
    } finally {
      setIsConnecting(false)
    }
  }, [])

  const disconnect = useCallback(() => {
    if (sessionId) unregisterGreenApiClient(sessionId)
    dispatch(greenApiApi.util.resetApiState())
    setSessionId(null)
  }, [dispatch, sessionId])

  return { sessionId, isConnecting, connectionError, connect, disconnect }
}
