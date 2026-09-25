export type ConnectionCredentials = {
  apiUrl: string
  idInstance: string
  apiTokenInstance: string
}

export type ChatType = 'user' | 'bot' | 'group' | 'supergroup' | 'channel'

export type Chat = {
  chatId: string
  title: string
  subtitle: string
  searchTerms?: string
  avatar?: string
  type?: ChatType
}

export type MessageStatus = 'sending' | 'sent' | 'failed'

export type ChatMessage = {
  id: string
  chatId: string
  direction: 'incoming' | 'outgoing'
  text: string
  timestamp: number
  status?: MessageStatus
  failureReason?: string
}
