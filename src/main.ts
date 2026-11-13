import { createApp, watch } from 'vue'
import 'vuetify/styles'
import './assets/css/local_fonts.css'
import './assets/css/chinese_fonts.css'
import './styles/index.scss'
import App from './App.vue'
import router from './router'
import vuetify from './plugins/vuetify'
import { useLocale } from './composables/useLocale'

const { locale } = useLocale()
watch(locale, value => { vuetify.locale.current.value = value }, { immediate: true })
const app = createApp(App)
app.use(router)
app.use(vuetify)
await router.isReady()
app.mount('#app')
