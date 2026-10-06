import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import React from 'react'
import ReactDOM from 'react-dom/client'
import { WagmiProvider } from 'wagmi'
import App from './App'
import { DataRefresh } from './lib/data'
import { config } from './wagmi'
import './styles.css'

const queryClient = new QueryClient({
  defaultOptions: { queries: { refetchOnWindowFocus: false, staleTime: 30_000, retry: 1 } },
})

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
  <React.StrictMode>
    <WagmiProvider config={config}>
      <QueryClientProvider client={queryClient}>
        <DataRefresh />
        <App />
      </QueryClientProvider>
    </WagmiProvider>
  </React.StrictMode>,
)
