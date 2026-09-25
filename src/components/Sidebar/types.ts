import type { Chat } from '../../domain/types'

export type SidebarProps = {
  chats: Chat[]
  contacts: Chat[]
  activeChatId: string | null
  isLoadingChats: boolean
  chatListError: string
  isLoadingContacts: boolean
  contactsError: string
  isCreatingChat: boolean
  createChatError: string
  onCreateChat: (query: string) => Promise<boolean>
  onRetryLoadChats: () => void
  onRetryLoadContacts: () => void
  onRequestContactInfo: (chatId: string, type?: Chat['type']) => void
  onStartContactChat: (contact: Chat) => void
  onSelectChat: (chatId: string) => void
  onDisconnect: () => void
}

export type SidebarMode = 'chats' | 'contacts'
