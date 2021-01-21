<template>
  <div class="workshop-content">
    <div>
      <details>
        <summary>Edit template <font-awesome-icon icon="cog"/></summary>
        <mavon-editor v-model="currentTemplate" language="en" defaultOpen="edit"/>
      </details>
    </div>
    <div v-if="lessonSearchInProgress">Fetching lesson list <font-awesome-icon icon="spinner" class="fa-spin"/></div>
    <ChooseLessons v-else v-model="lessons" :lessons-available="lessonsAvailable"/>
  </div>
</template>

<script>
import { FontAwesomeIcon } from '@fortawesome/vue-fontawesome'
import ChooseLessons from "./ChooseLessons";
export default {
  name: 'CustomiseWorkshop',
  components: {
    ChooseLessons,
    FontAwesomeIcon
  },
  props: {
    template: {type: String, required: true},
    workshop: {type: String, required: true}
  },
  data: function() {
    return {
      currentTemplate: this.template,
      lessons: [],
      lessonsAvailable: [],
      lessonSearchInProgress: false
    }
  },
  computed: {},
  methods: {
    /**
     * Make a lesson out of a seed string
     * @param s {string} seed string
     * @return {object}
     */
    makeLesson: function(s) {
      const lesson = {};
      s.replace(/ {2+}/g, " ")
              .split('\n')
              .forEach(x => {
                const colonIndex = x.search(/:/);
                const key = x.substring(0, colonIndex).replace(/^ */g, '');
                const value = x.substr(colonIndex + 1);
                lesson[key] = value.replace(/^ ['"]+(.*)['"]$/, "$1");
              });
      return {
        workshops: lesson.workshops.split("\"")
                .filter(x => /^[a-zA-Z0-9-]+$/.test(x))
                .map(x => x.replace(/^\W*/g, '').replace(/\W*$/, '')),
        title: lesson.title,
        link: lesson.link,
        details: {}
      };
    },
    processLessons: function(lessons, starting_id = 0) {
      this.lessonsAvailable.push(...lessons.map(L => {
        return {
          id: starting_id++,
          workshops: L.topics,
          title: L.full_name,
          link: L.html_url,
          details: L
        }
      }));
    },
    updateLessonLists: function(newLists) {
      this.lessons = newLists.lessons;
      this.lessonsAvailable = newLists.lessonsAvailable;
    },
    refreshLessonList: function() {
      // Update lessons
      if(!this.template || !this.workshop || this.lessonSearchInProgress)
        return;
      // Extract lessons from the template directly
      this.lessons = []; // Clear selected lessons
      const lessons = [];
      const lessonList = /workshop-lessons:([\n\w\W]*?)\n[^ ]/g.exec(this.template)[1];
      const re = /([\w\W]+?)\n(?: {2}-|\n)/g;
      let m;
      let i = 0;
      do {
        m = re.exec(lessonList);
        if (m)
          lessons.push({...this.makeLesson(m[1]), ...{id: i++}});
      } while (m);
      this.lessonsAvailable = lessons.filter(L => L.workshops.filter(w => w === this.workshop).length);
      // Query GitHub for lesson repositories with the appropriate tags
      if(!this.lessonSearchInProgress) {
        this.lessonSearchInProgress = true;
        fetch(`https://api.github.com/search/repositories?q=fork:true+${encodeURI(`topic:"ukrn-open-research"+topic:"${this.workshop}"`)}`, {
          headers: {"Accept": "application/vnd.github.mercy-preview+json"}
        })
                .then(r => r.json())
                .then(r => {this.lessonSearchInProgress = false; return this.processLessons(r.items, i++)})
                .catch(e => {this.lessonSearchInProgress = false; console.error(e)})
      }
    }
  },
  watch: {},
  created() {
    this.refreshLessonList();
  }
}
</script>

<!-- Add "scoped" attribute to limit CSS to this component only -->
<style lang="scss" scoped>
  .workshop-content > div {
    margin: 1em auto;
  }
  .lessonList {
    min-height: 3em;
    align-items: center;
    justify-content: center;
    display: flex;
    flex-direction: column;
    .placeholder {
      color: lightgrey;
      font-style: italic;
      user-select: none;
    }
    .lesson {
      display: flex;
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
        a {display: inline-flex;}
        svg {
          font-size: 1.25em;
          margin: auto .25em;
          color: black;
          &:hover {color: white;}
          cursor: pointer;
        }
      }
    }
  }

</style>
