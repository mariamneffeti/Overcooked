import type { AppProps } from 'next/app'
import '../styles/globals.css'
import AppHeader from '../components/AppHeader'
import LiveTicker from '../components/LiveTicker'

export default function App({ Component, pageProps }: AppProps) {
  return (
    <div className="min-h-screen flex flex-col">
      <AppHeader />
      <div className="flex-1 flex flex-col min-w-0">
        <Component {...pageProps} />
      </div>
      <LiveTicker />
    </div>
  )
}
