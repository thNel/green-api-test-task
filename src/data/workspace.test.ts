import { createNextState } from '@reduxjs/toolkit'
import { describe, expect, it } from 'vitest'
import type { IncomingNotification } from '../api/types'
import type { ChatMessage } from '../domain/types'
import { toChatMessages } from './chatModel'
import {
  applyNotification,
  createWorkspace,
  loadHistory,
  reconcileSentMessage,
  selectChats,
  selectContacts,
  selectMessages,
  upsertMessage,
} from './workspace'

describe('workspace mapping and runtime merge', () => {
  it('normalizes chats and contacts by chatId and keeps contact display data', () => {
    const workspace = createWorkspace(
      [
        { chatId: 'user-1', name: 'Account Name', type: 'user' },
        { chatId: 'user-1', username: 'someone' },
      ],
      [
        { chatId: 'user-1', contactName: 'Phonebook Name', username: 'someone' },
        { chatId: 'user-2', contactName: 'Another Contact' },
        { chatId: 'user-2', contactName: 'Duplicate Contact' },
      ],
    )

    expect(selectChats(workspace).map(({ chatId }) => chatId)).toEqual(['user-1'])
    expect(selectContacts(workspace).map(({ chatId }) => chatId)).toEqual(['user-1', 'user-2'])
    expect(workspace.chats.entities['user-1']?.title).toBe('Phonebook Name')
    expect(workspace.chats.entities['user-2']?.title).toBe('Another Contact')
  })

  it('deduplicates messages arriving from both the queue and chat history', () => {
    const workspace = createWorkspace([], [])
    const notification: IncomingNotification = {
      receiptId: 9,
      body: {
        typeWebhook: 'incomingMessageReceived',
        timestamp: 1_800_000_000,
        idMessage: 'message-1',
        senderData: { chatId: 'chat-1', senderName: 'Nell' },
        messageData: {
          typeMessage: 'textMessage',
          textMessageData: { textMessage: 'Привет' },
        },
      },
    }

    const history = toChatMessages('chat-1', [{
      type: 'incoming',
      idMessage: 'message-1',
      timestamp: 1_800_000_000,
      typeMessage: 'textMessage',
      chatId: 'chat-1',
      textMessage: 'Привет',
    }])
    const withNotification = createNextState(workspace, (draft) => {
      applyNotification(draft, notification)
    })
    const withHistory = createNextState(withNotification, (draft) => {
      loadHistory(draft, 'chat-1', history)
    })

    expect(selectMessages(withHistory, 'chat-1')).toHaveLength(1)
    expect(selectChats(withHistory)[0]?.title).toBe('Nell')
  })

  it('promotes a known phone-book contact to the chat list on incoming messages', () => {
    const workspace = createWorkspace([], [
      { chatId: 'chat-1', contactName: 'Phonebook Name' },
    ])
    const result = createNextState(workspace, (draft) => {
      applyNotification(draft, {
        receiptId: 11,
        body: {
          typeWebhook: 'incomingMessageReceived',
          timestamp: 1_800_000_001,
          idMessage: 'message-2',
          senderData: { chatId: 'chat-1', senderName: 'Telegram Name' },
          messageData: {
            typeMessage: 'textMessage',
            textMessageData: { textMessage: 'Есть кто?' },
          },
        },
      })
    })

    expect(selectChats(result).map(({ chatId }) => chatId)).toEqual(['chat-1'])
    expect(selectChats(result)[0]?.title).toBe('Phonebook Name')
  })

  it('applies a failure status that arrives before the send response', () => {
    const workspace = createWorkspace([], [])
    const optimisticMessage: ChatMessage = {
      id: 'local-1',
      chatId: 'chat-1',
      direction: 'outgoing',
      text: 'Hello',
      timestamp: 1,
      status: 'sending',
    }
    const result = createNextState(workspace, (draft) => {
      upsertMessage(draft, optimisticMessage)
      applyNotification(draft, {
        receiptId: 10,
        body: {
          typeWebhook: 'outgoingMessageStatus',
          idMessage: 'server-1',
          chatId: 'chat-1',
          status: 'failed',
          description: 'Recipient unavailable',
        },
      })
      reconcileSentMessage(draft, 'chat-1', 'local-1', 'server-1')
    })

    expect(selectMessages(result, 'chat-1')).toEqual([
      expect.objectContaining({
        id: 'server-1',
        status: 'failed',
        failureReason: 'Recipient unavailable',
      }),
    ])
    expect(result.pendingMessageFailures).toEqual({})
  })

  it('keeps a message when the send response does not contain an id', () => {
    const workspace = createWorkspace([], [])
    const result = createNextState(workspace, (draft) => {
      upsertMessage(draft, {
        id: 'local-1',
        chatId: 'chat-1',
        direction: 'outgoing',
        text: 'Hello',
        timestamp: 1,
        status: 'sending',
      })
      reconcileSentMessage(draft, 'chat-1', 'local-1', 'local-1')
    })

    expect(selectMessages(result, 'chat-1')).toEqual([
      expect.objectContaining({ id: 'local-1', status: 'sent' }),
    ])
  })
})
