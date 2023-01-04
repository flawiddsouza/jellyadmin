import { createApp } from 'vue'
import { createPinia } from 'pinia'
import './styles/variables.css'
import './styles/functional.css'
import './styles/base-elements.css'
import './styles/ids.css'
import './styles/classes.css'
import App from './App.vue'
import { router } from './router.js'

createApp(App)
.use(router)
.use(createPinia())
.directive('focus', {
    mounted(element) {
        element.focus()
    }
})
.mount('#app')
