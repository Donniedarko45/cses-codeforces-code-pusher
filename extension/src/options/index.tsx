import { createRoot } from 'react-dom/client'

export const OptionsPage = () => (
  <main style={{ fontFamily: 'sans-serif', padding: 24 }}>
    <h1>CP Auto Sync Settings</h1>
    <p>Primary settings are available inside the popup UI.</p>
  </main>
)

createRoot(document.getElementById('root')!).render(<OptionsPage />)
