import { useSidebarUi } from './hooks/useSidebarUi'
import { SidebarHeader } from './components/SidebarHeader'
import { SidebarTools } from './components/SidebarTools'
import { NewChatForm } from './components/NewChatForm'
import { ContactSearch } from './components/ContactSearch'
import { ChatListPane } from './components/ChatListPane'
import { ContactListPane } from './components/ContactListPane'
import styles from './Sidebar.module.css'
import type { SidebarProps } from './types'

export function Sidebar({
  chats,
  contacts,
  activeChatId,
  isLoadingChats,
  chatListError,
  isLoadingContacts,
  contactsError,
  isCreatingChat,
  createChatError,
  onCreateChat,
  onRetryLoadChats,
  onRetryLoadContacts,
  onRequestContactInfo,
  onStartContactChat,
  onSelectChat,
  onDisconnect,
}: SidebarProps) {
  const ui = useSidebarUi(contacts)

  const handleCreateChat = async (value: string) => {
    const created = await onCreateChat(value)
    if (created) {
      ui.setQuery('')
      ui.setComposerOpen(false)
    }
    return created
  }

  const handleStartContactChat = (contact: typeof contacts[number]) => {
    onStartContactChat(contact)
    ui.setListMode('chats')
    ui.setComposerOpen(false)
    ui.setQuery('')
  }

  return (
    <aside className={styles.root}>
      <SidebarHeader onDisconnect={onDisconnect} />
      <SidebarTools
        mode={ui.listMode}
        isComposerOpen={ui.isComposerOpen}
        onModeChange={ui.setListMode}
        onToggleComposer={() => ui.setComposerOpen((value) => !value)}
      />
      {ui.isComposerOpen && (
        <NewChatForm
          value={ui.query}
          isCreating={isCreatingChat}
          error={createChatError}
          onValueChange={ui.setQuery}
          onSubmit={handleCreateChat}
        />
      )}
      {ui.listMode === 'contacts' && (
        <ContactSearch value={ui.contactQuery} onChange={ui.setContactQuery} />
      )}
      <nav
        className={styles.list}
        aria-label={ui.listMode === 'chats' ? 'Список чатов' : 'Список контактов'}
      >
        {ui.listMode === 'chats' ? (
          <ChatListPane
            chats={chats}
            activeChatId={activeChatId}
            isLoading={isLoadingChats}
            error={chatListError}
            onRetry={onRetryLoadChats}
            onSelect={onSelectChat}
            onRequestContactInfo={onRequestContactInfo}
          />
        ) : (
          <ContactListPane
            contacts={ui.filteredContacts}
            hasContacts={contacts.length > 0}
            activeChatId={activeChatId}
            isLoading={isLoadingContacts}
            error={contactsError}
            onRetry={onRetryLoadContacts}
            onSelect={handleStartContactChat}
            onRequestContactInfo={onRequestContactInfo}
          />
        )}
      </nav>
    </aside>
  )
}
