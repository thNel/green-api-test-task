import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { greenApiApi, useGetWorkspaceQuery } from '../../../api/greenApiApi'
import { useAppDispatch } from '../../../app/hooks/useAppDispatch'
import type { Chat } from '../../../domain/types'
import {
  selectChats,
  selectContacts,
  selectMessages,
  upsertChat,
} from '../../../data/workspace'

export function useChatWorkspace(sessionId: string) {
  const dispatch = useAppDispatch()
  const query = useGetWorkspaceQuery(sessionId)
  const workspace = query.currentData ?? null
  const [activeChatId, setActiveChatId] = useState<string | null>(null)
  const [isMobileChatOpen, setMobileChatOpen] = useState(false)
  const historyRequests = useRef(new Set<string>())
  const loadedHistoryChatIds = useRef(new Set<string>())
  const resolvedContactInfo = useRef(workspace?.contactInfoResolved ?? {})
  useEffect(() => {
    resolvedContactInfo.current = workspace?.contactInfoResolved ?? {}
  }, [workspace?.contactInfoResolved])
  const [createChat, createChatState] = greenApiApi.useCreateOrFindChatMutation()
  const [loadChatHistory] = greenApiApi.useLoadChatHistoryMutation()
  const [sendMessage] = greenApiApi.useSendMessageMutation()
  const [reloadWorkspace] = greenApiApi.useReloadWorkspaceMutation()

  const chats = useMemo(() => workspace ? selectChats(workspace) : [], [workspace])
  const contacts = useMemo(() => workspace ? selectContacts(workspace) : [], [workspace])
  const activeChat = chats.find((chat) => chat.chatId === activeChatId) ?? null
  const messages = useMemo(
    () => workspace && activeChatId ? selectMessages(workspace, activeChatId) : [],
    [activeChatId, workspace],
  )

  const loadHistory = useCallback((chatId: string, force = false) => {
    if (
      historyRequests.current.has(chatId) ||
      (!force && loadedHistoryChatIds.current.has(chatId))
    ) return
    historyRequests.current.add(chatId)
    void loadChatHistory({ sessionId, chatId })
      .unwrap()
      .then(() => loadedHistoryChatIds.current.add(chatId))
      .catch(() => {})
      .finally(() => historyRequests.current.delete(chatId))
  }, [loadChatHistory, sessionId])

  const activateChat = useCallback((chatId: string) => {
    setActiveChatId(chatId)
    setMobileChatOpen(true)
    void dispatch(greenApiApi.util.updateQueryData('getWorkspace', sessionId, (draft) => {
      draft.sendError = ''
    }))
    loadHistory(chatId)
  }, [dispatch, loadHistory, sessionId])

  const startContactChat = useCallback((contact: Chat) => {
    dispatch(greenApiApi.util.updateQueryData('getWorkspace', sessionId, (draft) => {
      const exists = Boolean(draft.chats.entities[contact.chatId])
      draft.chats.entities[contact.chatId] = {
        ...draft.chats.entities[contact.chatId],
        ...contact,
      }
      if (!exists) draft.chats.ids.unshift(contact.chatId)
      if (!draft.chatIds.includes(contact.chatId)) draft.chatIds.unshift(contact.chatId)
    }))
    activateChat(contact.chatId)
  }, [activateChat, dispatch, sessionId])

  const createChatByQuery = useCallback(async (value: string) => {
    try {
      if (!query.isSuccess) {
        await dispatch(greenApiApi.endpoints.getWorkspace.initiate(
          sessionId,
          { subscribe: false },
        )).unwrap()
      }
      const chat = await createChat({ sessionId, query: value }).unwrap()
      dispatch(greenApiApi.util.updateQueryData('getWorkspace', sessionId, (draft) => {
        upsertChat(draft, chat)
      }))
      activateChat(chat.chatId)
      return true
    } catch {
      return false
    }
  }, [activateChat, createChat, dispatch, query.isSuccess, sessionId])

  const requestContactInfo = useCallback((chatId: string, type?: Chat['type']) => {
    if (resolvedContactInfo.current[chatId]) return
    if ((type && type !== 'user' && type !== 'bot') || (!type && chatId.startsWith('-'))) return
    void dispatch(greenApiApi.endpoints.getContactInfo.initiate(
      { sessionId, chatId },
      { subscribe: false },
    ))
  }, [dispatch, sessionId])

  const send = useCallback(async (text: string) => {
    if (!activeChatId) return
    try {
      await sendMessage({ sessionId, chatId: activeChatId, text }).unwrap()
    } catch {
      // The mutation lifecycle records the failure beside the optimistic message.
    }
  }, [activeChatId, sendMessage, sessionId])

  const reload = useCallback(() => {
    dispatch(greenApiApi.util.updateQueryData('getWorkspace', sessionId, (draft) => {
      draft.chatListStatus = 'loading'
      draft.chatListError = ''
      draft.contactsStatus = 'loading'
      draft.contactsError = ''
    }))
    void reloadWorkspace(sessionId)
  }, [dispatch, reloadWorkspace, sessionId])

  return {
    activeChat,
    activeChatId,
    chatListError: workspace?.chatListError ?? '',
    chatListLoading: !workspace || workspace.chatListStatus === 'loading',
    chatListStatus: workspace?.chatListStatus ?? 'loading',
    chats,
    contacts,
    contactsError: workspace?.contactsError ?? '',
    contactsLoading: !workspace || workspace.contactsStatus === 'loading',
    createChat: createChatByQuery,
    createChatError: typeof createChatState.error === 'object' && createChatState.error &&
      'message' in createChatState.error && typeof createChatState.error.message === 'string'
      ? createChatState.error.message
      : '',
    isCreatingChat: createChatState.isLoading,
    historyError: activeChatId ? workspace?.historyErrors[activeChatId] ?? '' : '',
    historyLoading: activeChatId ? workspace?.historyStatus[activeChatId] === 'loading' : false,
    isMobileChatOpen,
    messages,
    pollingError: workspace?.pollingError ?? '',
    reload,
    requestContactInfo,
    retryHistory: () => activeChatId && loadHistory(activeChatId, true),
    selectChat: activateChat,
    send,
    sendError: workspace?.sendError ?? '',
    setMobileChatOpen,
    startContactChat,
    contactsStatus: workspace?.contactsStatus ?? 'loading',
  }
}
