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
          colorPrimary: '#E11D48',
          colorInfo: '#2563EB',
          colorSuccess: '#059669',
          colorWarning: '#D97706',
          colorError: '#DC2626',
          colorTextBase: '#0F172A',
          colorBgBase: '#FFFFFF',
          colorBgLayout: '#F8FAFC',
          colorBorderSecondary: '#E2E8F0',
          borderRadius: 10,
          fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
          fontSize: 14,
        },
        components: {
          Button: {
            borderRadius: 8,
            controlHeight: 36,
            fontWeight: 500,
          },
          Card: {
            borderRadiusLG: 14,
            headerFontSize: 15,
          },
          Table: {
            borderRadius: 12,
            headerBg: '#F8FAFC',
            headerColor: '#475569',
            rowHoverBg: '#FFF1F2',
          },
          Menu: {
            itemBorderRadius: 8,
            itemHoverBg: '#FFF1F2',
            itemHoverColor: '#E11D48',
            itemSelectedBg: '#FFE4E6',
            itemSelectedColor: '#BE123C',
          },
          Tag: {
            borderRadiusSM: 6,
          },
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
