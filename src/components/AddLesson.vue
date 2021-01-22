<template>
  <v-easy-dialog :value="show" class="lesson-chooser">
    <div>
      <header><p>Choose a lesson to add from the list below:</p></header>
      <div class="body">
        <div v-for="lesson in lessonList" :key="lesson.id" class="lesson" :title="lesson.details.description" :data-lesson-id="lesson.id" @click="chooseLesson">
          {{ lesson.title }}
        </div>
      </div>
      <footer @click="chooseLesson" data-lesson-id="NaN" class="lesson back">Back</footer>
    </div>
  </v-easy-dialog>
</template>

<script>
  import VEasyDialog from 'v-easy-dialog'
export default {
  name: 'AddLesson',
  components: {VEasyDialog},
  props: {
    lessonList: {type: Array, required: true},
    name: {type: String, required: true},
    show: {type: Boolean, required: true}
  },
  data: function() {
    return {
      resizeable: true
    }
  },
  computed: {},
  methods: {
    chooseLesson: function(e) {
      this.$emit('addLesson', e.target.dataset.lessonId);
    }
  }
}
</script>

<!-- Add "scoped" attribute to limit CSS to this component only -->
<style lang="scss" scoped>
  header {font-weight: bold; margin-top: -1em; font-size: 1.2em;}
  .body {overflow-y: auto;}
  .lesson {
    display: flex;
    justify-content: space-between;
    align-items: center;
    border-radius: .25em;
    padding: .5em;
    background-color: whitesmoke;
    margin: .25em auto;
    width: 20em;
    text-align: left;
    user-select: none;
    cursor: pointer;
    &:first-child {margin-top: 0;}
    &:last-child {margin-bottom: 0;}
    &:hover {background-color: lightblue}

    &.back {
      background-color: dodgerblue;
      width: 5em;
      margin-left: 0;
      margin-top: .5em;
      &:hover {background-color: lightcoral;}
    }
  }
</style>
