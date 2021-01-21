<template>
  <div class="lesson-list">
    <p>Choose a lesson to add from the list below:</p>
    <div v-for="lesson in lessonList" :key="lesson.id" class="lesson" :title="lesson.details.description" :data-lesson-id="lesson.id" @click="chooseLesson">
      {{ lesson.title }}
    </div>
    <div @click="chooseLesson" data-lesson-id="NaN" class="lesson back">Back</div>
  </div>
</template>

<script>
export default {
  name: 'AddLesson',
  props: {
    lessonList: {type: Array, required: true}
  },
  methods: {
    chooseLesson: function(e) {
      this.$emit('addLesson', e.target.dataset.lessonId);
    }
  }
}
</script>

<!-- Add "scoped" attribute to limit CSS to this component only -->
<style lang="scss" scoped>
  .lesson-list {
    position: absolute;
    bottom: 0;
    background-color: white;
    border: .25em solid black;
    padding: 1em;
  }
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

    &.back {background-color: dodgerblue; width: 5em; margin-left: 0; margin-top: .5em;}
  }
</style>
