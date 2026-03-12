import { createApp } from 'vue'
import { createPinia } from 'pinia'
import router from './router'
import App from './App.vue'
import { setupPressFeedback } from './utils/pressFeedback'
import { useSettingsStore } from './stores/settings'

import '@/assets/styles/variables.css'
import '@/assets/styles/global.css'
import '@/assets/styles/components.css'

const app = createApp(App)
const pinia = createPinia()

app.use(pinia)
app.use(router)

useSettingsStore(pinia)

app.mount('#app')
setupPressFeedback()
