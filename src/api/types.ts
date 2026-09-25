export type InstanceState = {
  stateInstance?: string
  status?: boolean
  reason?: string
}

export type ContactLookup = {
  exist: boolean
  chatId: string
  username?: string
  phoneNumber?: number
  fromCache?: boolean
}

export type AccountChat = {
  chatId: string
  name?: string
  type?: 'user' | 'bot' | 'group' | 'supergroup' | 'channel'
  phoneNumber?: number
  username?: string
}

export type PhoneBookContact = {
  chatId: string
  name?: string
  contactName?: string
  type?: 'user'
  phoneNumber?: number
  username?: string
}

export type ContactInfo = {
  avatar?: string
  name?: string
  contactName?: string
  chatId?: string
  chatType?: 'user' | 'bot' | 'group' | 'supergroup' | 'channel'
  lastSeen?: number
  phoneNumber?: number
  username?: string
  isPremium?: boolean
  isVerified?: boolean
  isScam?: boolean
  description?: string
}

export type ChatHistoryMessage = {
  type: 'incoming' | 'outgoing'
  idMessage: string
  timestamp: number
  typeMessage: string
  chatId: string
  textMessage?: string
  statusMessage?: string
  isDeleted?: boolean
}

export type IncomingNotification = {
  receiptId: number
  body: {
    typeWebhook?: string
    timestamp?: number
    idMessage?: string
    chatId?: string
    status?: 'sent' | 'delivered' | 'read' | 'failed' | 'noAccount'
    description?: string
    senderData?: {
      chatId?: string
      sender?: string
      chatName?: string
      senderName?: string
      senderContactName?: string
      username?: string
      senderPhoneNumber?: number
    }
    messageData?: {
      typeMessage?: string
      textMessageData?: {
        textMessage?: string
      }
    }
  }
}
