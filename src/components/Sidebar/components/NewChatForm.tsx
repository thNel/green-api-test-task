import type { FormEvent } from 'react'
import { UserPlusIcon } from '@phosphor-icons/react'
import styles from './NewChatForm.module.css'

type NewChatFormProps = {
  value: string
  isCreating: boolean
  error: string
  onValueChange: (value: string) => void
  onSubmit: (value: string) => Promise<boolean>
}

export function NewChatForm({
  value,
  isCreating,
  error,
  onValueChange,
  onSubmit,
}: NewChatFormProps) {
  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    await onSubmit(value)
  }

  return (
    <form className={styles.form} onSubmit={handleSubmit}>
      <label htmlFor="contact-query">Телефон, @username или chatId</label>
      <div className={styles.inputRow}>
        <input
          id="contact-query"
          value={value}
          onChange={(event) => onValueChange(event.target.value)}
          placeholder="@durov, +79991234567 или chatId:356316286"
          autoFocus
          required
        />
        <button
          className={styles.submit}
          type="submit"
          disabled={isCreating}
          aria-label="Найти контакт"
        >
          <UserPlusIcon size={20} weight="bold" />
        </button>
      </div>
      <small>Для chatId укажите префикс chatId:</small>
      {error && (
        <div className={styles.error} role="alert">{error}</div>
      )}
    </form>
  )
}
