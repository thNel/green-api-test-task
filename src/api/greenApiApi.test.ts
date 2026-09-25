import { configureStore } from '@reduxjs/toolkit'
import { waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { registerGreenApiClient, unregisterGreenApiClient } from './clientRegistry'
import { greenApiApi } from './greenApiApi'
import { selectMessages } from '../data/workspace'

const credentials = {
  apiUrl: 'https://api.green-api.com',
  idInstance: 'test-instance',
  apiTokenInstance: 'test-token',
}

const makeResponse = (data: unknown, status = 200) => new Response(JSON.stringify(data), {
  status,
  headers: { 'Content-Type': 'application/json' },
})

describe('workspace notification queue lifecycle', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('processes a notification once and stops when deletion is not confirmed', async () => {
    const sessionId = `test-session-${Date.now()}`
    const requests: string[] = []
    let delivered = false
    const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = new URL(input.toString())
      const method = init?.method ?? 'GET'
      const endpoint = url.pathname.includes('/deleteNotification/')
        ? 'deleteNotification'
        : url.pathname.split('/').at(-2)
      requests.push(`${method} ${endpoint}`)

      if (endpoint === 'getChats') return makeResponse([])
      if (endpoint === 'getContacts') return makeResponse([])
      if (endpoint === 'receiveNotification') {
        if (delivered) return makeResponse(null)
        delivered = true
        return makeResponse({
          receiptId: 41,
          body: {
            typeWebhook: 'incomingMessageReceived',
            timestamp: 1_800_000_000,
            idMessage: 'incoming-1',
            senderData: { chatId: 'chat-1', senderName: 'Nell' },
            messageData: {
              typeMessage: 'textMessage',
              textMessageData: { textMessage: 'Queue message' },
            },
          },
        })
      }
      if (endpoint === 'deleteNotification') {
        return makeResponse({ result: false, reason: 'not acknowledged' })
      }
      throw new Error(`Unexpected GREEN-API request: ${method} ${url.pathname}`)
    })
    vi.stubGlobal('fetch', fetchMock)
    registerGreenApiClient(sessionId, credentials)

    const store = configureStore({
      reducer: { [greenApiApi.reducerPath]: greenApiApi.reducer },
      middleware: (getDefaultMiddleware) =>
        getDefaultMiddleware().concat(greenApiApi.middleware),
    })
    const subscription = store.dispatch(greenApiApi.endpoints.getWorkspace.initiate(sessionId))

    try {
      await waitFor(() => {
        const state = greenApiApi.endpoints.getWorkspace.select(sessionId)(store.getState())
        expect(state.data?.pollingError).toContain('Чтение очереди остановлено')
      })

      const workspace = greenApiApi.endpoints.getWorkspace.select(sessionId)(store.getState()).data
      expect(workspace).toBeDefined()
      expect(selectMessages(workspace!, 'chat-1')).toEqual([
        expect.objectContaining({ id: 'incoming-1', text: 'Queue message' }),
      ])
      expect(requests.filter((item) => item.includes('receiveNotification') || item.includes('deleteNotification')))
        .toEqual(['GET receiveNotification', 'DELETE deleteNotification'])
    } finally {
      subscription.unsubscribe()
      store.dispatch(greenApiApi.util.resetApiState())
      unregisterGreenApiClient(sessionId)
    }
  })
})

describe('contact info retries', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  const createStore = () => configureStore({
    reducer: { [greenApiApi.reducerPath]: greenApiApi.reducer },
    middleware: (getDefaultMiddleware) =>
      getDefaultMiddleware().concat(greenApiApi.middleware),
  })

  const pendingUntilAbort = (signal?: AbortSignal | null) => new Promise<Response>((_resolve, reject) => {
    const abort = () => reject(new DOMException('Request aborted', 'AbortError'))
    if (signal?.aborted) {
      abort()
      return
    }
    signal?.addEventListener('abort', abort, { once: true })
  })

  it('retries transient failures up to three attempts and applies contact info on success', async () => {
    const sessionId = `contact-info-success-${Date.now()}`
    let contactInfoAttempts = 0
    const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = new URL(input.toString())
      const endpoint = url.pathname.split('/').at(-2)

      if (endpoint === 'getChats') return makeResponse([])
      if (endpoint === 'getContacts') {
        return makeResponse([{ chatId: 'user-1', contactName: 'Saved Name', username: 'saved' }])
      }
      if (endpoint === 'getContactInfo') {
        contactInfoAttempts += 1
        if (contactInfoAttempts < 3) return makeResponse({ message: 'Temporary failure' }, 503)
        return makeResponse({ chatId: 'user-1', contactName: 'API Name', avatar: 'https://example.com/avatar.png' })
      }
      if (endpoint === 'receiveNotification') return pendingUntilAbort(init?.signal)
      throw new Error(`Unexpected GREEN-API request: ${url.pathname}`)
    })
    vi.stubGlobal('fetch', fetchMock)
    registerGreenApiClient(sessionId, credentials)

    const store = createStore()
    const workspaceSubscription = store.dispatch(
      greenApiApi.endpoints.getWorkspace.initiate(sessionId),
    )

    try {
      await waitFor(() => {
        expect(greenApiApi.endpoints.getWorkspace.select(sessionId)(store.getState()).data?.contactsStatus)
          .toBe('loaded')
      })

      const contactInfo = await store.dispatch(greenApiApi.endpoints.getContactInfo.initiate(
        { sessionId, chatId: 'user-1' },
        { subscribe: false },
      )).unwrap()
      expect(contactInfo).toMatchObject({
        chatId: 'user-1',
        contactName: 'API Name',
        avatar: 'https://example.com/avatar.png',
      })

      await waitFor(() => {
        const workspace = greenApiApi.endpoints.getWorkspace.select(sessionId)(store.getState()).data
        expect(workspace?.chats.entities['user-1']).toMatchObject({
          title: 'API Name',
          avatar: 'https://example.com/avatar.png',
        })
        expect(workspace?.contactInfoResolved['user-1']).toBe(true)
      })

      expect(contactInfoAttempts).toBe(3)
    } finally {
      workspaceSubscription.unsubscribe()
      store.dispatch(greenApiApi.util.resetApiState())
      unregisterGreenApiClient(sessionId)
    }
  })

  it('keeps getContacts data unchanged after all three attempts fail', async () => {
    const sessionId = `contact-info-failure-${Date.now()}`
    let contactInfoAttempts = 0
    const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = new URL(input.toString())
      const endpoint = url.pathname.split('/').at(-2)

      if (endpoint === 'getChats') return makeResponse([])
      if (endpoint === 'getContacts') {
        return makeResponse([{ chatId: 'user-2', contactName: 'Phonebook Name', username: 'phonebook' }])
      }
      if (endpoint === 'getContactInfo') {
        contactInfoAttempts += 1
        return makeResponse({ message: 'Unavailable' }, 503)
      }
      if (endpoint === 'receiveNotification') return pendingUntilAbort(init?.signal)
      throw new Error(`Unexpected GREEN-API request: ${url.pathname}`)
    })
    vi.stubGlobal('fetch', fetchMock)
    registerGreenApiClient(sessionId, credentials)

    const store = createStore()
    const workspaceSubscription = store.dispatch(
      greenApiApi.endpoints.getWorkspace.initiate(sessionId),
    )

    try {
      await waitFor(() => {
        expect(greenApiApi.endpoints.getWorkspace.select(sessionId)(store.getState()).data?.contactsStatus)
          .toBe('loaded')
      })

      const result = await store.dispatch(greenApiApi.endpoints.getContactInfo.initiate(
        { sessionId, chatId: 'user-2' },
        { subscribe: false },
      )).unwrap()

      const workspace = greenApiApi.endpoints.getWorkspace.select(sessionId)(store.getState()).data
      expect(result).toBeNull()
      expect(contactInfoAttempts).toBe(3)
      expect(workspace?.contactInfoResolved['user-2']).toBe(true)
      expect(workspace?.chats.entities['user-2']).toMatchObject({
        title: 'Phonebook Name',
        subtitle: 'phonebook',
      })
      expect(workspace?.chats.entities['user-2']?.avatar).toBeUndefined()

      await store.dispatch(greenApiApi.endpoints.getContactInfo.initiate(
        { sessionId, chatId: 'user-2' },
        { subscribe: false },
      )).unwrap()
      expect(contactInfoAttempts).toBe(3)
    } finally {
      workspaceSubscription.unsubscribe()
      store.dispatch(greenApiApi.util.resetApiState())
      unregisterGreenApiClient(sessionId)
    }
  })
})
