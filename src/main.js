import Vue from 'vue'
import VueRouter from 'vue-router'
import App from './App.vue'
import mavonEditor from 'mavon-editor'
import 'mavon-editor/dist/css/index.css'
Vue.use(mavonEditor);

Vue.config.productionTip = false;
Vue.use(VueRouter);

new Vue({
  render: h => h(App),
}).$mount('#app')
