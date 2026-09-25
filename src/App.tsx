import { ChatWorkspace } from './components/ChatWorkspace/ChatWorkspace'
import { ConnectionScreen } from './components/ConnectionScreen/ConnectionScreen'
import { useGreenApiSession } from './app/hooks/useGreenApiSession'

function App() {
  const session = useGreenApiSession()

  if (!session.sessionId) {
    return (
      <ConnectionScreen
        error={session.connectionError}
        isConnecting={session.isConnecting}
        onConnect={session.connect}
      />
    )
  }

  return (
    <ChatWorkspace
      sessionId={session.sessionId}
      onDisconnect={session.disconnect}
    />
  )
}

export default App
