<template>
  <div>
    <button v-on:click="checkAuth">
      Call backend
    </button>
  </div>
</template>

<script>
export default {
  name: 'CheckAuth',
  props: {
    code: {type: String, default: ""}
  },
  methods: {
    checkAuth: async function() {
      fetch(
              '/.netlify/functions/backend',
              {method: "POST", body: JSON.stringify({code: this.code})}
      )
              .then(r => r.json())
              .then(r => console.log(r))
              .catch(e => console.error(e))
    }
  }
}
</script>

<!-- Add "scoped" attribute to limit CSS to this component only -->
<style scoped>
h3 {
  margin: 40px 0 0;
}
ul {
  list-style-type: none;
  padding: 0;
}
li {
  display: inline-block;
  margin: 0 10px;
}
a {
  color: #42b983;
}
</style>
