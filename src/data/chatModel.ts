import type {
  AccountChat,
  ChatHistoryMessage,
  ContactInfo,
  IncomingNotification,
  PhoneBookContact,
} from '../api/types'
import type { Chat, ChatMessage } from '../domain/types'

const chatTypeLabels: Record<NonNullable<AccountChat['type']>, string> = {
  user: 'Пользователь Telegram',
  bot: 'Бот Telegram',
  group: 'Группа',
  supergroup: 'Супергруппа',
  channel: 'Канал',
}

const getPhoneNumber = (phoneNumber?: number) =>
  phoneNumber && phoneNumber > 0 ? `+${phoneNumber}` : ''

export const toChatFromAccount = (accountChat: AccountChat): Chat | null => {
  const chatId = accountChat.chatId?.trim()
  if (!chatId) return null

  const name = accountChat.name?.trim()
  const username = accountChat.username?.trim()
  const phoneNumber = getPhoneNumber(accountChat.phoneNumber)

  return {
    chatId,
    title: name || username || phoneNumber || chatId,
    subtitle:
      (username && username !== name ? username : '') ||
      phoneNumber ||
      (accountChat.type ? chatTypeLabels[accountChat.type] : 'Telegram'),
    type: accountChat.type,
  }
}

export const toChatFromContact = (contact: PhoneBookContact): Chat | null => {
  const chatId = contact.chatId?.trim()
  if (!chatId) return null

  const contactName = contact.contactName?.trim()
  const name = contact.name?.trim()
  const username = contact.username?.trim()
  const phoneNumber = getPhoneNumber(contact.phoneNumber)
  const title = contactName || name || username || phoneNumber || chatId
  const subtitle = [...new Set([
    username && username !== title ? username : '',
    phoneNumber,
    name && name !== title ? name : '',
  ].filter(Boolean))].join(' · ')

  return {
    chatId,
    title,
    subtitle: subtitle || 'Контакт Telegram',
    searchTerms: [contactName, name, username, phoneNumber, chatId]
      .filter(Boolean)
      .join(' '),
    type: contact.type || 'user',
  }
}

export const mergeContactInfo = (chat: Chat, info: ContactInfo): Chat => {
  const contactName = info.contactName?.trim()
  const name = info.name?.trim()
  const username = info.username?.trim()
  const phoneNumber = getPhoneNumber(info.phoneNumber)
  const title = contactName || name || chat.title
  const details = [
    username && username !== title ? username : '',
    phoneNumber,
  ].filter(Boolean)

  return {
    ...chat,
    title,
    subtitle: details.join(' · ') || chat.subtitle,
    searchTerms: [chat.searchTerms, contactName, name, username, phoneNumber]
      .filter(Boolean)
      .join(' '),
    avatar: info.avatar?.trim() || chat.avatar,
    type: info.chatType || chat.type,
  }
}

export const mergePhoneBookContact = (chat: Chat, contact: Chat): Chat => ({
  ...chat,
  title: contact.title || chat.title,
  subtitle: contact.subtitle || chat.subtitle,
  searchTerms: [chat.searchTerms, contact.searchTerms]
    .filter(Boolean)
    .join(' '),
  type: contact.type || chat.type,
})

export const toChatMessages = (
  chatId: string,
  history: ChatHistoryMessage[],
): ChatMessage[] => history.flatMap((item) => {
  if (
    item.chatId !== chatId ||
    item.typeMessage !== 'textMessage' ||
    item.isDeleted ||
    !item.idMessage ||
    typeof item.textMessage !== 'string'
  ) {
    return []
  }

  return [{
    id: item.idMessage,
    chatId,
    direction: item.type,
    text: item.textMessage,
    timestamp: item.timestamp * 1000,
    status: item.type === 'outgoing' ? 'sent' as const : undefined,
  }]
}).sort((left, right) => left.timestamp - right.timestamp)

export type NotificationEvent =
  | { type: 'incoming'; chat: Chat; message: ChatMessage }
  | {
      type: 'outgoing-failure'
      messageId: string
      chatId?: string
      reason: string
    }
  | null

export const toNotificationEvent = (
  notification: IncomingNotification,
): NotificationEvent => {
  const { body } = notification

  if (body.typeWebhook === 'outgoingMessageStatus') {
    const isFailure = body.status === 'failed' || body.status === 'noAccount'
    if (!body.idMessage || !isFailure) return null

    return {
      type: 'outgoing-failure',
      messageId: body.idMessage,
      chatId: body.chatId,
      reason:
        body.description ||
        (body.status === 'noAccount'
          ? 'У получателя не найден аккаунт Telegram или номер скрыт настройками приватности.'
          : 'GREEN-API не смог отправить сообщение в Telegram.'),
    }
  }

  if (
    body.typeWebhook !== 'incomingMessageReceived' ||
    body.messageData?.typeMessage !== 'textMessage'
  ) return null

  const chatId = body.senderData?.chatId
  const text = body.messageData.textMessageData?.textMessage
  if (!chatId || typeof text !== 'string' || !text) return null

  const title =
    body.senderData?.senderContactName ||
    body.senderData?.senderName ||
    body.senderData?.username ||
    chatId
  const messageId = body.idMessage ?? `incoming-${notification.receiptId}`

  return {
    type: 'incoming',
    chat: { chatId, title, subtitle: 'Входящий чат' },
    message: {
      id: messageId,
      chatId,
      direction: 'incoming',
      text,
      timestamp: (body.timestamp ?? Math.floor(Date.now() / 1000)) * 1000,
    },
  }
}
