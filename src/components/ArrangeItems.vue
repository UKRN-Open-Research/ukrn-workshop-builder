<template>
  <draggable
          :list="items"
          @start="drag=true"
          @end="drag=false"
          @change="change"
          group="items"
          class="episodeList"
  >
    <CustomiseItem v-for="item in items"
                   :key="item.url"
                   :item="item"
                   @remove="remove"
    />
  </draggable>
</template>

<script>
import draggable from "vuedraggable"
import CustomiseItem from "./CustomiseItem";
export default {
  name: 'ArrangeItems',
  components: {
    CustomiseItem,
    draggable},
  props: {
    items: {type: Array, required: true}, // list of episodes selected
    dayId: {type: Number, required: false, default: null}
  },
  data: function() {
    return {}
  },
  computed: {},
  methods: {
    change(evt) {
      // Only monitor add events because the store will handle removals
      if(!evt.added && !evt.moved)
        return;
      const E = evt.added || evt.moved;
      const prevOrder = E.newIndex !== 0?
              this.items[E.newIndex - 1].yaml.order : null;
      const nextOrder = E.newIndex !== this.items.length - 1?
              this.items[E.newIndex + 1].yaml.order : null;
      const safeOrder = o => typeof o !== 'number' || isNaN(o)? null : o;
      this.$emit('assignItem', {
        item: E.element,
        dayId: this.dayId,
        prevOrder: safeOrder(prevOrder),
        nextOrder: safeOrder(nextOrder)
      });
    },
    remove(item) {this.$emit('assignItem', {item: item, dayId: ''})}
  }
}
</script>

<!-- Add "scoped" attribute to limit CSS to this component only -->
<style lang="scss" scoped>
  .episodeList {user-select: none;}
</style>
