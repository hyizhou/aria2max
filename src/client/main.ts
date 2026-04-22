import { createApp } from 'vue'
import { createPinia } from 'pinia'
import '@fortawesome/fontawesome-free/css/all.css'
import './assets/mobile-reset.css'
import App from './App.vue'
import router from './router'
import i18n from './i18n'
import { startNetworkMonitoring } from './services/networkMonitor'

const app = createApp(App)

app.use(createPinia())
app.use(router)
app.use(i18n)

// 启动网络监控服务，在页面标题中显示网速
startNetworkMonitoring()

app.mount('#app')