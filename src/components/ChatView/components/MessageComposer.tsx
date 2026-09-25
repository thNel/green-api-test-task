import { PaperPlaneTiltIcon } from '@phosphor-icons/react'
import { useComposer } from '../hooks/useComposer'
import styles from './MessageComposer.module.css'

type MessageComposerProps = {
  sendError: string
  onSend: (text: string) => Promise<void>
}

export function MessageComposer({ sendError, onSend }: MessageComposerProps) {
  const { draft, setDraft, submit, handleKeyDown } = useComposer(onSend)

  return (
    <footer className={styles.area}>
      {sendError && <div className={styles.error} role="alert">{sendError}</div>}
      <form className={styles.form} onSubmit={submit}>
        <label className={styles.srOnly} htmlFor="message-input">Сообщение</label>
        <textarea
          id="message-input"
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Сообщение"
          rows={1}
          maxLength={4096}
        />
        <button
          className={styles.send}
          type="submit"
          disabled={!draft.trim()}
          aria-label="Отправить сообщение"
        >
          <PaperPlaneTiltIcon size={23} weight="fill" />
        </button>
      </form>
    </footer>
  )
}
