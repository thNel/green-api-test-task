import { useMemo, useState } from 'react'
import type { Chat } from '../../../domain/types'
import type { SidebarMode } from '../types'

export function useSidebarUi(contacts: Chat[]) {
  const [isComposerOpen, setComposerOpen] = useState(false)
  const [listMode, setListMode] = useState<SidebarMode>('chats')
  const [query, setQuery] = useState('')
  const [contactQuery, setContactQuery] = useState('')
  const normalizedContactQuery = contactQuery.trim().toLocaleLowerCase()
  const filteredContacts = useMemo(() => contacts.filter((contact) =>
    `${contact.title} ${contact.subtitle} ${contact.searchTerms ?? ''}`
      .toLocaleLowerCase()
      .includes(normalizedContactQuery),
  ), [contacts, normalizedContactQuery])

  return {
    contactQuery,
    filteredContacts,
    isComposerOpen,
    listMode,
    query,
    setComposerOpen,
    setContactQuery,
    setListMode,
    setQuery,
  }
}
