import type { ConnectionCredentials } from '../domain/types'
import type {
  AccountChat,
  ChatHistoryMessage,
  ContactInfo,
  ContactLookup,
  IncomingNotification,
  InstanceState,
  PhoneBookContact,
} from './types'

type ApiErrorBody = {
  reason?: string
  message?: string
  error?: string
}

export class GreenApiError extends Error {
  status: number

  constructor(message: string, status: number) {
    super(message)
    this.name = 'GreenApiError'
    this.status = status
  }
}

const normalizeApiUrl = (value: string) => {
  const trimmed = value.trim().replace(/\/+$/, '')
  if (!/^https:\/\//i.test(trimmed)) {
    throw new GreenApiError('API URL должен начинаться с https://', 0)
  }
  return trimmed
}

const formatApiError = (body: ApiErrorBody | null, status: number) => {
  const message = body?.reason || body?.message || body?.error
  return message || `GREEN-API вернул ошибку ${status}`
}

export const createGreenApiClient = (credentials: ConnectionCredentials) => {
  const apiUrl = normalizeApiUrl(credentials.apiUrl)
  const instancePath = `${apiUrl}/waInstance${encodeURIComponent(credentials.idInstance.trim())}`
  const token = encodeURIComponent(credentials.apiTokenInstance.trim())

  const request = async <T>(
    method: 'GET' | 'POST' | 'DELETE',
    endpoint: string,
    options: { body?: unknown; signal?: AbortSignal; suffix?: string } = {},
  ): Promise<T> => {
    const response = await fetch(
      `${instancePath}/${endpoint}/${token}${options.suffix ?? ''}`,
      {
      method,
      signal: options.signal,
      headers: options.body ? { 'Content-Type': 'application/json' } : undefined,
      body: options.body ? JSON.stringify(options.body) : undefined,
      },
    )

    if (response.status === 204) return null as T

    const text = await response.text()
    let data: unknown = null

    if (text) {
      try {
        data = JSON.parse(text)
      } catch {
        data = { message: text }
      }
    }

    if (!response.ok) {
      throw new GreenApiError(
        formatApiError(data as ApiErrorBody | null, response.status),
        response.status,
      )
    }

    return data as T
  }

  return {
    getState: (signal?: AbortSignal) =>
      request<InstanceState>('GET', 'getStateInstance', { signal }),

    getChats: (signal?: AbortSignal) =>
      request<AccountChat[]>('GET', 'getChats', { signal }),

    getContacts: (signal?: AbortSignal) =>
      request<PhoneBookContact[]>('GET', 'getContacts', { signal }),

    getContactInfo: (chatId: string, signal?: AbortSignal) =>
      request<ContactInfo>('POST', 'getContactInfo', {
        body: { chatId },
        signal,
      }),

    checkAccount: (query: string, signal?: AbortSignal) => {
      const value = query.trim()
      const body = value.startsWith('@')
        ? { username: value }
        : { phoneNumber: Number(value.replace(/\D/g, '')) }

      return request<ContactLookup>('POST', 'checkAccount', { body, signal })
    },

    sendMessage: (chatId: string, message: string, signal?: AbortSignal) =>
      request<{ idMessage: string }>('POST', 'sendMessage', {
        body: { chatId, message },
        signal,
      }),

    getChatHistory: (chatId: string, count = 100, signal?: AbortSignal) =>
      request<ChatHistoryMessage[]>('POST', 'getChatHistory', {
        body: { chatId, count },
        signal,
      }),

    receiveNotification: (signal?: AbortSignal) =>
      request<IncomingNotification | null>('GET', 'receiveNotification', {
        signal,
        suffix: '?receiveTimeout=5',
      }),

    deleteNotification: (receiptId: number, signal?: AbortSignal) =>
      request<{ result: boolean; reason?: string }>(
        'DELETE',
        'deleteNotification',
        { signal, suffix: `/${receiptId}` },
      ),
  }
}

export type GreenApiClient = ReturnType<typeof createGreenApiClient>
