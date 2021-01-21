<template>
  <section class="workshop">
    <header><h2><TextEditable v-model="workshopName"/></h2></header>
    <div v-if="status.content" :class="status.class">
      <p>{{ status.content }}</p>
      <p>{{ status.details }}</p>
    </div>
    <div>
      <button @click="refreshTemplate">Refresh workshop template details</button>
    </div>
    <div v-if="findingWorkshops">Fetching workshop list <font-awesome-icon icon="spinner" class="fa-spin"/></div>
    <div v-else>
      <label for="selectWorkshop">Workshop topic:</label>
      <select v-model="workshop" id="selectWorkshop" :disabled="workshop !== null">
        <option v-if="!workshopList.length" disabled>Fetching workshop list</option>
        <option v-for="ws in workshopList" v-bind:value="ws.value" v-bind:key="ws.value">
          {{ ws.name }}
        </option>
      </select>
      <CustomiseWorkshop v-if="workshop && template" :template="template" :workshop="workshop"/>
    </div>
  </section>
</template>

<script>
  import CustomiseWorkshop from "./CustomiseWorkshop";
  import TextEditable from "./TextEditable";
  import { FontAwesomeIcon } from '@fortawesome/vue-fontawesome'
export default {
  components: {
    CustomiseWorkshop,
    TextEditable,
    FontAwesomeIcon
  },
  name: 'SelectWorkshop',
  props: {
    // templateDetails should be {owner: string, repository: string} for navigating GitHub
    templateDetails: {type: Object, required: true}
  },
  data: function() {
    return {
      status: {content: "Fetching Workshop Template details...", class: "info", details: null},
      template: null,
      workshop: null,
      workshopList: [],
      workshopName: "New workshop",
      findingWorkshops: false
    }
  },
  computed: {},
  methods: {
    refreshTemplate: function() {
      if(this.findingWorkshops)
        return;
      this.findingWorkshops = true;
      fetch(`https://api.github.com/repos/${this.templateDetails.owner}/${this.templateDetails.repository}/contents/_config.yml`)
              .then(r => r.json())
              .then(j => atob(j.content))
              .then(c => {
                this.findingWorkshops = false;
                this.template = c;
                this.status = {content: null};
                this.findWorkshops();
              })
              .catch(e => {
                this.findingWorkshops = false;
                this.status = {content: "Error fetching template details.", class: "error", details: e}
              });
    },
    findWorkshops: function() {
      const text = /#: WORKSHOP TOPICS :#\n(.+\n)+#\/#/g.exec(this.template)[0];
      const _list = [];
      const re = /\n# (.+)/g;
      let m;
      do {
        m = re.exec(text);
        if (m) {
          const value = m[1];
          const name = value.split('-')
                  // Capitalize
                  .map(x => x.replace(/\w\S*/g, s => s.charAt(0).toUpperCase() + s.substr(1)))
                  .join(' ');
          _list.push({name, value});
        }
      } while (m);
      this.workshopList = _list;
    }
  },
  created() {
    this.refreshTemplate();
  }
}
</script>

<!-- Add "scoped" attribute to limit CSS to this component only -->
<style lang="scss" scoped>
  $colour-workshop-main: #c4ffe1;
  $colour-workshop-dark: darkgreen;

  .workshop {
    background-color: $colour-workshop-main;
    border: .25em solid $colour-workshop-dark;
    margin: 1em auto;
  }

</style>
