import Vue from 'vue'
import VueRouter from 'vue-router'
import App from './App.vue'
import mavonEditor from 'mavon-editor'
import 'mavon-editor/dist/css/index.css'
Vue.use(mavonEditor);
Vue.use(VueRouter);

Vue.config.productionTip = false;

new Vue({
  render: h => h(App),
}).$mount('#app')
