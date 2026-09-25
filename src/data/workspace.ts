import {
  createEntityAdapter,
  createSelector,
  type EntityState,
} from '@reduxjs/toolkit'
import type { Chat, ChatMessage } from '../domain/types'
import type {
  AccountChat,
  ContactInfo,
  IncomingNotification,
  PhoneBookContact,
} from '../api/types'
import {
  mergeContactInfo,
  mergePhoneBookContact,
  toChatFromAccount,
  toChatFromContact,
  toNotificationEvent,
} from './chatModel'

export type LoadStatus = 'loading' | 'loaded' | 'failed'

export type WorkspaceData = {
  chats: EntityState<Chat, string>
  chatIds: string[]
  contactIds: string[]
  messages: EntityState<ChatMessage, string>
  messageIdsByChat: Record<string, string[]>
  historyStatus: Record<string, LoadStatus>
  historyErrors: Record<string, string>
  contactInfoResolved: Record<string, true>
  chatListStatus: LoadStatus
  chatListError: string
  contactsStatus: LoadStatus
  contactsError: string
  pollingError: string
  sendError: string
  pendingMessageFailures: Record<string, { chatId?: string; reason: string }>
}

const messageKey = (message: ChatMessage) => `${message.chatId}:${message.id}`

export const chatAdapter = createEntityAdapter<Chat, string>({
  selectId: (chat) => chat.chatId,
})
export const messageAdapter = createEntityAdapter<ChatMessage, string>({
  selectId: messageKey,
})

const getErrorMessage = (error: unknown, fallback: string) =>
  error instanceof Error
    ? error.message
    : error && typeof error === 'object' && 'message' in error &&
        typeof error.message === 'string'
      ? error.message
      : fallback

export const createWorkspace = (
  accountChats: AccountChat[] | null,
  phoneBookContacts: PhoneBookContact[] | null,
  errors: { chats?: unknown; contacts?: unknown } = {},
): WorkspaceData => {
  let chats = chatAdapter.getInitialState()
  const messages = messageAdapter.getInitialState()
  const chatIds: string[] = []
  const contactIds: string[] = []

  for (const rawChat of accountChats ?? []) {
    const chat = toChatFromAccount(rawChat)
    if (!chat) continue
    chats = chatAdapter.upsertOne(chats, chat)
    if (!chatIds.includes(chat.chatId)) chatIds.push(chat.chatId)
  }

  for (const rawContact of phoneBookContacts ?? []) {
    const contact = toChatFromContact(rawContact)
    if (!contact) continue
    if (contactIds.includes(contact.chatId)) continue
    const existing = chats.entities[contact.chatId]
    chats = chatAdapter.upsertOne(
      chats,
      existing ? mergePhoneBookContact(existing, contact) : contact,
    )
    contactIds.push(contact.chatId)
  }

  return {
    chats,
    chatIds,
    contactIds,
    messages,
    messageIdsByChat: {},
    historyStatus: {},
    historyErrors: {},
    contactInfoResolved: {},
    chatListStatus: errors.chats
      ? accountChats === null ? 'failed' : 'loaded'
      : 'loaded',
    chatListError: errors.chats
      ? getErrorMessage(errors.chats, 'Не удалось восстановить список чатов')
      : '',
    contactsStatus: errors.contacts
      ? phoneBookContacts === null ? 'failed' : 'loaded'
      : 'loaded',
    contactsError: errors.contacts
      ? getErrorMessage(errors.contacts, 'Не удалось загрузить контакты')
      : '',
    pollingError: '',
    sendError: '',
    pendingMessageFailures: {},
  }
}

export const selectChats = createSelector(
  [
    (workspace: WorkspaceData) => workspace.chats.entities,
    (workspace: WorkspaceData) => workspace.chatIds,
  ],
  (entities, ids) =>
    ids.flatMap((id) => {
      const chat = entities[id]
      return chat ? [chat] : []
    }),
)

export const selectContacts = createSelector(
  [
    (workspace: WorkspaceData) => workspace.chats.entities,
    (workspace: WorkspaceData) => workspace.contactIds,
  ],
  (entities, ids) =>
    ids.flatMap((id) => {
      const chat = entities[id]
      return chat ? [chat] : []
    }),
)

export const selectMessages = (workspace: WorkspaceData, chatId: string) =>
  (workspace.messageIdsByChat[chatId] ?? []).flatMap((id) => {
    const message = workspace.messages.entities[id]
    return message ? [message] : []
  })

export const upsertChat = (workspace: WorkspaceData, chat: Chat) => {
  workspace.chats = chatAdapter.upsertOne(workspace.chats, chat)
  if (!workspace.chatIds.includes(chat.chatId)) workspace.chatIds.unshift(chat.chatId)
}

export const upsertMessage = (workspace: WorkspaceData, message: ChatMessage) => {
  const key = messageKey(message)
  const existing = workspace.messages.entities[key]
  if (existing) return

  workspace.messages = messageAdapter.addOne(workspace.messages, message)
  const ids = workspace.messageIdsByChat[message.chatId] ?? []
  const insertAt = ids.findIndex((id) => {
    const other = workspace.messages.entities[id]
    return other && other.timestamp > message.timestamp
  })
  if (insertAt < 0) ids.push(key)
  else ids.splice(insertAt, 0, key)
  workspace.messageIdsByChat[message.chatId] = ids
}

export const loadHistory = (
  workspace: WorkspaceData,
  chatId: string,
  messages: ChatMessage[],
) => {
  for (const message of messages) upsertMessage(workspace, message)
  workspace.historyStatus[chatId] = 'loaded'
  delete workspace.historyErrors[chatId]
}

export const failHistory = (workspace: WorkspaceData, chatId: string, error: unknown) => {
  workspace.historyStatus[chatId] = 'failed'
  workspace.historyErrors[chatId] = getErrorMessage(
    error,
    'Не удалось загрузить историю сообщений',
  )
}

export const applyNotification = (
  workspace: WorkspaceData,
  notification: IncomingNotification,
) => {
  const event = toNotificationEvent(notification)
  if (!event) return

  if (event.type === 'incoming') {
    if (!workspace.chats.entities[event.chat.chatId]) upsertChat(workspace, event.chat)
    else if (!workspace.chatIds.includes(event.chat.chatId)) {
      workspace.chatIds.unshift(event.chat.chatId)
    }
    upsertMessage(workspace, event.message)
    workspace.pollingError = ''
    return
  }

  const messageKeyValue = event.chatId
    ? `${event.chatId}:${event.messageId}`
    : Object.keys(workspace.messages.entities).find((key) =>
        key.endsWith(`:${event.messageId}`),
      )
  const message = messageKeyValue
    ? workspace.messages.entities[messageKeyValue]
    : undefined

  if (message && (!event.chatId || message.chatId === event.chatId)) {
    message.status = 'failed'
    message.failureReason = event.reason
    return
  }

  workspace.pendingMessageFailures[event.messageId] = {
    chatId: event.chatId,
    reason: event.reason,
  }
  const pendingIds = Object.keys(workspace.pendingMessageFailures)
  if (pendingIds.length > 100) {
    delete workspace.pendingMessageFailures[pendingIds[0]]
  }
}

export const reconcileSentMessage = (
  workspace: WorkspaceData,
  chatId: string,
  localId: string,
  serverId: string,
) => {
  const localKey = `${chatId}:${localId}`
  const serverKey = `${chatId}:${serverId}`
  const localMessage = workspace.messages.entities[localKey]
  if (!localMessage) return

  const failure = workspace.pendingMessageFailures[serverId]
  delete workspace.pendingMessageFailures[serverId]
  if (serverId === localId) {
    localMessage.status = failure ? 'failed' : 'sent'
    localMessage.failureReason = failure?.reason
    return
  }
  const existingServerMessage = workspace.messages.entities[serverKey]
  const message = existingServerMessage ?? localMessage

  if (!existingServerMessage) {
    workspace.messages = messageAdapter.removeOne(workspace.messages, localKey)
    workspace.messages = messageAdapter.addOne(
      workspace.messages,
      { ...message, id: serverId },
    )
  } else {
    workspace.messages = messageAdapter.removeOne(workspace.messages, localKey)
  }

  const ids = workspace.messageIdsByChat[chatId] ?? []
  const localIndex = ids.indexOf(localKey)
  if (localIndex >= 0) ids.splice(localIndex, 1)
  if (!ids.includes(serverKey)) {
    const insertAt = ids.findIndex((id) => {
      const other = workspace.messages.entities[id]
      return other && other.timestamp > message.timestamp
    })
    if (insertAt < 0) ids.push(serverKey)
    else ids.splice(insertAt, 0, serverKey)
  }

  const sentMessage = workspace.messages.entities[serverKey]
  if (sentMessage) {
    sentMessage.status = failure ? 'failed' : 'sent'
    sentMessage.failureReason = failure?.reason
  }
}

export const failSentMessage = (
  workspace: WorkspaceData,
  chatId: string,
  localId: string,
  error: unknown,
) => {
  const message = workspace.messages.entities[`${chatId}:${localId}`]
  if (!message) return
  message.status = 'failed'
  message.failureReason = getErrorMessage(error, 'Сообщение не отправлено')
  workspace.sendError = message.failureReason
}

export const mergeContactInfoIntoWorkspace = (
  workspace: WorkspaceData,
  chatId: string,
  info: ContactInfo,
) => {
  const chat = workspace.chats.entities[chatId]
  if (!chat) return
  workspace.chats = chatAdapter.upsertOne(
    workspace.chats,
    mergeContactInfo(chat, info),
  )
}

export const markContactInfoResolved = (
  workspace: WorkspaceData,
  chatId: string,
) => {
  workspace.contactInfoResolved[chatId] = true
}
