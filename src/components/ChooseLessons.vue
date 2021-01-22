<template>
  <section class="lesson-list">
    <header><h2>Lessons:</h2></header>
    <draggable v-model="lessons" @start="drag=true" @end="drag=false" group="lessons" class="lessonList">
      <div v-for="lesson in lessons" :key="lesson.id" class="lesson" :title="lesson.details.description">
        <span>{{ lesson.title }}</span>
        <div class="action-icons">
          <font-awesome-icon icon="cog" title="Edit lesson settings" />
          <a :href="lesson.link" target="_blank" title="Open lesson website in a new tab"><font-awesome-icon icon="link" /></a>
          <font-awesome-icon icon="minus-circle" title="Remove this lesson" class="delete" @click="dropLesson(lesson.id)"/>
        </div>
      </div>
    </draggable>
    <div>
      <button @click="beginAddLesson">Add a new item <font-awesome-icon icon="plus-circle"/></button>
      <AddLesson name="add-lesson" @addLesson="addLesson" :show="addingLesson" :lessonList="lessonsAvailableToAdd"/>
    </div>
  </section>
</template>

<script>
import draggable from "vuedraggable"
import AddLesson from "./AddLesson";
import { FontAwesomeIcon } from '@fortawesome/vue-fontawesome'
export default {
  name: 'ChooseLessons',
  components: {draggable, FontAwesomeIcon, AddLesson},
  props: {
    value: {type: Array, required: true}, // list of lessons selected
    lessonsAvailable: {type: Array, required: true}
  },
  data: function() {
    return {
      lessonSearchInProgress: false,
      addingLesson: false
    }
  },
  computed: {
    lessons: {
      get: function() {return this.value;},
      set: function(newValue) {this.$emit('input', newValue);}
    },
    lessonsAvailableToAdd: function() {
      return this.lessonsAvailable.filter(L => !this.lessons.includes(L));
    }
  },
  methods: {
    beginAddLesson: function() {
      this.addingLesson = true;
    },
    addLesson: function(lesson_id) {
      const id = parseInt(lesson_id);
      this.addingLesson = false;
      this.lessons.push(...this.lessonsAvailable.filter(L => L.id === id));
    },
    dropLesson: function (lesson_id) {
      const id = parseInt(lesson_id);
      this.lessons = this.lessons.filter(L => L.id !== id);
    }
  },
  watch: {}
}
</script>

<!-- Add "scoped" attribute to limit CSS to this component only -->
<style lang="scss" scoped>
  section {
    background-color: #f8d695;
  }
  .lessonList {
    align-items: center;
    justify-content: center;
    display: flex;
    flex-direction: column;
    .lesson {
      display: flex;
      align-items: center;
      justify-content: space-between;
      border-radius: .25em;
      padding: .5em;
      background-color: lightblue;
      margin: .25em auto;
      width: 20em;
      line-height: 1.5em;
      text-align: left;
      user-select: none;
      cursor: grab;
      &.sortable-chosen {
        opacity: 0.5;
      }

      .action-icons {
        display: flex;
        margin-right: 0;
        a {display: inline-flex;}
        svg {
          font-size: 1.25em;
          margin: auto .25em;
          color: black;
          cursor: pointer;
          &:hover {color: white;}
          &.delete:hover{color: red;}
        }
      }
    }
  }

</style>
