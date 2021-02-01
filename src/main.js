import Vue from 'vue'
import App from './App.vue'
import Buefy from 'buefy'
// import 'buefy/dist/buefy.css'
import mavonEditor from 'mavon-editor'
import 'mavon-editor/dist/css/index.css'

Vue.use(mavonEditor);
Vue.use(Buefy);

Vue.config.productionTip = false;

new Vue({
  render: h => h(App),
}).$mount('#app')
