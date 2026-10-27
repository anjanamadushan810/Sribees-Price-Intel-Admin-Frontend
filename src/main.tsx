import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { App as AntApp, ConfigProvider } from 'antd'
import enGB from 'antd/locale/en_GB'
import dayjs from 'dayjs'
import 'dayjs/locale/en-gb'
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import App from './App'
import { AuthProvider } from './auth/AuthContext'
import './styles.css'

dayjs.locale('en-gb')

const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: 1, refetchOnWindowFocus: false } },
})

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ConfigProvider
      locale={enGB}
      theme={{
        token: {
          colorPrimary: '#b4530f',
          borderRadius: 8,
          fontFamily: "system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif",
        },
      }}
    >
      <AntApp>
        <QueryClientProvider client={queryClient}>
          <BrowserRouter>
            <AuthProvider>
              <App />
            </AuthProvider>
          </BrowserRouter>
        </QueryClientProvider>
      </AntApp>
    </ConfigProvider>
  </StrictMode>,
)
