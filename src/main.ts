import Vue from 'vue'
import './plugins/fontawesome'
import App from './App.vue'
import { library } from '@fortawesome/fontawesome-svg-core'
import { faUserSecret } from '@fortawesome/free-solid-svg-icons'
import { FontAwesomeIcon } from '@fortawesome/vue-fontawesome'
import Modal from '@/components/Modal.vue'

library.add(faUserSecret)
Vue.component('FontAwesome', FontAwesomeIcon)
Vue.component('Modal', Modal)

Vue.config.productionTip = false

new Vue({
  render: h => h(App),
}).$mount('#app')
