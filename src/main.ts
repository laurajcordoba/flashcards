import { mount } from 'svelte'
import './app.css'
import App from './App.svelte'

// Ask the browser not to evict our IndexedDB data under storage pressure.
navigator.storage?.persist?.().catch(() => {})

const app = mount(App, {
  target: document.getElementById('app')!,
})

export default app
