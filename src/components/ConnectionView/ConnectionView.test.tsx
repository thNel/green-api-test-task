import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { ConnectionView } from './ConnectionView'

describe('ConnectionView', () => {
  it('submits the instance credentials and can reveal the token', async () => {
    const user = userEvent.setup()
    const onConnect = vi.fn(async () => true)
    render(<ConnectionView error="" isConnecting={false} onConnect={onConnect} />)

    await user.clear(screen.getByRole('textbox', { name: /API URL/ }))
    await user.type(screen.getByRole('textbox', { name: /API URL/ }), 'https://example.green-api.com')
    await user.type(screen.getByRole('textbox', { name: /ID Instance/ }), '123456789')
    const tokenInput = screen.getByLabelText(/API Token Instance/)
    await user.type(tokenInput, 'secret-token')
    await user.click(screen.getByRole('button', { name: 'Показать токен' }))

    expect(tokenInput.getAttribute('type')).toBe('text')
    await user.click(screen.getByRole('button', { name: 'Подключиться' }))

    expect(onConnect).toHaveBeenCalledWith({
      apiUrl: 'https://example.green-api.com',
      idInstance: '123456789',
      apiTokenInstance: 'secret-token',
    })
  })
})
