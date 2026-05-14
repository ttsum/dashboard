import { createApp } from 'vue'
import App from './App.vue'
import { ACTIVE_PROVINCE } from './constants/provinceDashboard'
import './style.css'
import 'element-plus/es/components/button/style/css'
import 'element-plus/es/components/checkbox/style/css'
import 'element-plus/es/components/checkbox-group/style/css'
import 'element-plus/es/components/icon/style/css'
import 'element-plus/es/components/input-number/style/css'
import 'element-plus/es/components/radio/style/css'
import 'element-plus/es/components/radio-group/style/css'
import 'element-plus/es/components/slider/style/css'

if (typeof document !== 'undefined') {
  document.title = ACTIVE_PROVINCE.title
}

createApp(App).mount('#app')
