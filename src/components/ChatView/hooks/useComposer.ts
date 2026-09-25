import { useCallback, useState, type FormEvent, type KeyboardEvent } from 'react'

export function useComposer(onSend: (text: string) => Promise<void>) {
  const [draft, setDraft] = useState('')

  const submit = useCallback((event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const text = draft.trim()
    if (!text) return
    setDraft('')
    void onSend(text)
  }, [draft, onSend])

  const handleKeyDown = useCallback((event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault()
      event.currentTarget.form?.requestSubmit()
    }
  }, [])

  return { draft, setDraft, submit, handleKeyDown }
}
