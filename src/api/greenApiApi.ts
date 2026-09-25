import { createApi, fakeBaseQuery } from '@reduxjs/toolkit/query/react'
import { getGreenApiClient } from './clientRegistry'
import type { Chat, ChatMessage } from '../domain/types'
import type {
  AccountChat,
  ContactInfo,
  IncomingNotification,
  PhoneBookContact,
} from './types'
import {
  toChatMessages,
} from '../data/chatModel'
import {
  applyNotification,
  createWorkspace,
  failHistory,
  failSentMessage,
  loadHistory,
  markContactInfoResolved,
  mergeContactInfoIntoWorkspace,
  reconcileSentMessage,
  upsertChat,
  upsertMessage,
  type WorkspaceData,
} from '../data/workspace'

type ApiFailure = { message: string }
const CONTACT_INFO_ATTEMPTS = 3

const getMessage = (error: unknown, fallback: string) =>
  error instanceof Error
    ? error.message
    : error && typeof error === 'object' && 'message' in error &&
        typeof error.message === 'string'
      ? error.message
      : fallback

const getRejectedPayload = (error: unknown) =>
  error && typeof error === 'object' && 'error' in error ? error.error : error

const pause = (milliseconds: number, signal: AbortSignal) =>
  new Promise<void>((resolve) => {
    if (signal.aborted) {
      resolve()
      return
    }

    const timer = globalThis.setTimeout(() => {
      signal.removeEventListener('abort', abort)
      resolve()
    }, milliseconds)
    const abort = () => {
      globalThis.clearTimeout(timer)
      resolve()
    }
    signal.addEventListener('abort', abort, { once: true })
  })

const updateWorkspace = (
  dispatch: (action: unknown) => unknown,
  sessionId: string,
  recipe: (draft: WorkspaceData) => void,
) => dispatch(greenApiApi.util.updateQueryData('getWorkspace', sessionId, recipe))

export const greenApiApi = createApi({
  reducerPath: 'greenApiApi',
  baseQuery: fakeBaseQuery<ApiFailure>(),
  keepUnusedDataFor: 0,
  endpoints: (builder) => ({
    getWorkspace: builder.query<WorkspaceData, string>({
      async queryFn(sessionId, { signal }) {
        try {
          const client = getGreenApiClient(sessionId)
          const [chatsResult, contactsResult] = await Promise.allSettled([
            client.getChats(signal),
            client.getContacts(signal),
          ])
          const chats = chatsResult.status === 'fulfilled'
            ? Array.isArray(chatsResult.value) ? chatsResult.value : []
            : null
          const contacts = contactsResult.status === 'fulfilled'
            ? Array.isArray(contactsResult.value) ? contactsResult.value : []
            : null

          return {
            data: createWorkspace(chats, contacts, {
              chats: chatsResult.status === 'rejected' ? chatsResult.reason : undefined,
              contacts: contactsResult.status === 'rejected'
                ? contactsResult.reason
                : undefined,
            }),
          }
        } catch (error) {
          return { error: { message: getMessage(error, 'Не удалось загрузить рабочее пространство') } }
        }
      },
      async onCacheEntryAdded(sessionId, {
        cacheDataLoaded,
        cacheEntryRemoved,
        updateCachedData,
      }) {
        const controller = new AbortController()
        void cacheEntryRemoved.then(() => controller.abort())

        try {
          await cacheDataLoaded
          const client = getGreenApiClient(sessionId)

          while (!controller.signal.aborted) {
            let notification: IncomingNotification | null
            try {
              notification = await client.receiveNotification(controller.signal)
              updateCachedData((draft) => {
                draft.pollingError = ''
                if (notification) applyNotification(draft, notification)
              })
            } catch (error) {
              if (controller.signal.aborted) break
              updateCachedData((draft) => {
                draft.pollingError = getMessage(error, 'Не удалось получить новые сообщения')
              })
              await pause(1800, controller.signal)
              continue
            }

            if (!notification) continue

            try {
              const deletion = await client.deleteNotification(
                notification.receiptId,
                controller.signal,
              )
              if (!deletion?.result) {
                updateCachedData((draft) => {
                  draft.pollingError = deletion?.reason
                    ? `Уведомление получено, но не удалено: ${deletion.reason}. Чтение очереди остановлено.`
                    : 'Уведомление получено, но GREEN-API не подтвердил удаление. Чтение очереди остановлено.'
                })
                break
              }
            } catch (error) {
              if (controller.signal.aborted) break
              updateCachedData((draft) => {
                draft.pollingError = `Уведомление получено, но не удалось подтвердить удаление: ${getMessage(error, 'ошибка API')}. Чтение очереди остановлено.`
              })
              break
            }
          }
        } catch {
          // The cache entry can be removed before the initial directory request completes.
        }
      },
    }),

    reloadWorkspace: builder.mutation<{
      chats: AccountChat[] | null
      contacts: PhoneBookContact[] | null
      chatError?: unknown
      contactsError?: unknown
    }, string>({
      async queryFn(sessionId, { signal }) {
        try {
          const client = getGreenApiClient(sessionId)
          const [chatsResult, contactsResult] = await Promise.allSettled([
            client.getChats(signal),
            client.getContacts(signal),
          ])
          return {
            data: {
              chats: chatsResult.status === 'fulfilled' ? chatsResult.value : null,
              contacts: contactsResult.status === 'fulfilled' ? contactsResult.value : null,
              chatError: chatsResult.status === 'rejected' ? chatsResult.reason : undefined,
              contactsError: contactsResult.status === 'rejected'
                ? contactsResult.reason
                : undefined,
            },
          }
        } catch (error) {
          return { error: { message: getMessage(error, 'Не удалось обновить списки') } }
        }
      },
      async onQueryStarted(sessionId, { dispatch, queryFulfilled }) {
        try {
          const { data } = await queryFulfilled
          updateWorkspace(dispatch, sessionId, (draft) => {
            if (data.chats) {
              const restored = createWorkspace(data.chats, [], {})
              for (const id of restored.chatIds) {
                const chat = restored.chats.entities[id]
                if (!chat) continue
                const existing = draft.chats.entities[id]
                draft.chats.entities[id] = existing ? { ...existing, ...chat } : chat
              }
              draft.chatIds = [
                ...restored.chatIds,
                ...draft.chatIds.filter((id) => !restored.chatIds.includes(id)),
              ]
              draft.chatListStatus = 'loaded'
              draft.chatListError = ''
            } else {
              draft.chatListStatus = 'failed'
              draft.chatListError = getMessage(
                data.chatError,
                'Не удалось восстановить список чатов',
              )
            }

            if (data.contacts) {
              const restored = createWorkspace([], data.contacts, {})
              for (const id of restored.contactIds) {
                const contact = restored.chats.entities[id]
                if (!contact) continue
                const existing = draft.chats.entities[id]
                draft.chats.entities[id] = existing ? { ...existing, ...contact } : contact
              }
              draft.contactIds = restored.contactIds
              draft.contactsStatus = 'loaded'
              draft.contactsError = ''
            } else {
              draft.contactsStatus = 'failed'
              draft.contactsError = getMessage(
                data.contactsError,
                'Не удалось загрузить контакты',
              )
            }
          })
        } catch (error) {
          updateWorkspace(dispatch, sessionId, (draft) => {
            const message = getMessage(
              getRejectedPayload(error),
              'Не удалось обновить списки',
            )
            draft.chatListStatus = 'failed'
            draft.chatListError = message
            draft.contactsStatus = 'failed'
            draft.contactsError = message
          })
        }
      },
    }),

    getContactInfo: builder.query<
      ContactInfo | null,
      { sessionId: string; chatId: string }
    >({
      keepUnusedDataFor: 300,
      async queryFn({ sessionId, chatId }, { signal }) {
        try {
          const client = getGreenApiClient(sessionId)
          let lastError: unknown

          for (let attempt = 0; attempt < CONTACT_INFO_ATTEMPTS; attempt += 1) {
            if (signal.aborted) break
            try {
              return { data: await client.getContactInfo(chatId, signal) }
            } catch (error) {
              lastError = error
              if (signal.aborted || attempt === CONTACT_INFO_ATTEMPTS - 1) break
              await pause(250 * (attempt + 1), signal)
            }
          }

          if (signal.aborted) {
            return {
              error: {
                message: getMessage(lastError, 'Загрузка данных контакта отменена'),
              },
            }
          }

          return { data: null }
        } catch (error) {
          if (signal.aborted) {
            return {
              error: {
                message: getMessage(error, 'Загрузка данных контакта отменена'),
              },
            }
          }
          return { data: null }
        }
      },
      async onQueryStarted({ sessionId, chatId }, { dispatch, queryFulfilled }) {
        try {
          const { data } = await queryFulfilled
          updateWorkspace(dispatch, sessionId, (draft) => {
            markContactInfoResolved(draft, chatId)
            if (data) mergeContactInfoIntoWorkspace(draft, chatId, data)
          })
        } catch {
          // Aborted requests are not recorded as resolved.
        }
      },
    }),

    createOrFindChat: builder.mutation<Chat, { sessionId: string; query: string }>({
      async queryFn({ sessionId, query }, { signal }) {
        const trimmed = query.trim()
        const chatIdMatch = trimmed.match(/^chatid:(-?\d+)$/i)
        if (trimmed.toLowerCase().startsWith('chatid:') && !chatIdMatch) {
          return { error: { message: 'После chatId: укажите числовой идентификатор чата' } }
        }
        if (!chatIdMatch && !trimmed.startsWith('@') && !/^[+\d\s()-]+$/.test(trimmed)) {
          return { error: { message: 'Введите телефон, @username или chatId:идентификатор' } }
        }

        try {
          if (chatIdMatch) {
            const chatId = chatIdMatch[1]
            return {
              data: {
                chatId,
                title: chatId,
                subtitle: 'Telegram · chatId',
                type: chatId.startsWith('-') ? undefined : 'user',
              },
            }
          }

          const account = await getGreenApiClient(sessionId).checkAccount(trimmed, signal)
          if (!account.exist || !account.chatId) {
            return { error: { message: 'Контакт не найден в Telegram' } }
          }

          return {
            data: {
              chatId: account.chatId,
              title: account.username || trimmed,
              subtitle: account.phoneNumber ? `+${account.phoneNumber}` : 'Telegram',
              type: 'user',
            },
          }
        } catch (error) {
          return { error: { message: getMessage(error, 'Не удалось создать чат') } }
        }
      },
      async onQueryStarted({ sessionId }, { dispatch, queryFulfilled }) {
        try {
          const { data } = await queryFulfilled
          updateWorkspace(dispatch, sessionId, (draft) => upsertChat(draft, data))
        } catch {
          // The mutation result carries the user-facing error.
        }
      },
    }),

    loadChatHistory: builder.mutation<
      ChatMessage[],
      { sessionId: string; chatId: string }
    >({
      async queryFn({ sessionId, chatId }, { signal }) {
        try {
          const history = await getGreenApiClient(sessionId).getChatHistory(chatId, 100, signal)
          return { data: toChatMessages(chatId, Array.isArray(history) ? history : []) }
        } catch (error) {
          return { error: { message: getMessage(error, 'Не удалось загрузить историю сообщений') } }
        }
      },
      async onQueryStarted({ sessionId, chatId }, { dispatch, queryFulfilled }) {
        updateWorkspace(dispatch, sessionId, (draft) => {
          draft.historyStatus[chatId] = 'loading'
          delete draft.historyErrors[chatId]
        })
        try {
          const { data } = await queryFulfilled
          updateWorkspace(dispatch, sessionId, (draft) => loadHistory(draft, chatId, data))
        } catch (error) {
          updateWorkspace(dispatch, sessionId, (draft) => {
            failHistory(draft, chatId, getRejectedPayload(error))
          })
        }
      },
    }),

    sendMessage: builder.mutation<
      { idMessage: string },
      { sessionId: string; chatId: string; text: string }
    >({
      async queryFn({ sessionId, chatId, text }, { signal }) {
        try {
          return {
            data: await getGreenApiClient(sessionId).sendMessage(chatId, text, signal),
          }
        } catch (error) {
          return { error: { message: getMessage(error, 'Сообщение не отправлено') } }
        }
      },
      async onQueryStarted({ sessionId, chatId, text }, { dispatch, queryFulfilled }) {
        const localId = `local-${globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random()}`}`
        const optimisticMessage = {
          id: localId,
          chatId,
          direction: 'outgoing' as const,
          text,
          timestamp: Date.now(),
          status: 'sending' as const,
        }
        updateWorkspace(dispatch, sessionId, (draft) => {
          draft.sendError = ''
          upsertMessage(draft, optimisticMessage)
        })

        try {
          const { data } = await queryFulfilled
          updateWorkspace(dispatch, sessionId, (draft) => {
            reconcileSentMessage(draft, chatId, localId, data.idMessage || localId)
          })
        } catch (error) {
          updateWorkspace(dispatch, sessionId, (draft) => {
            failSentMessage(draft, chatId, localId, getRejectedPayload(error))
          })
        }
      },
    }),
  }),
})

export const {
  useGetWorkspaceQuery,
  useReloadWorkspaceMutation,
  useCreateOrFindChatMutation,
  useLoadChatHistoryMutation,
  useSendMessageMutation,
} = greenApiApi
