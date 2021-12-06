<template>
  <draggable
          :list="items"
          @start="drag=true"
          @end="drag=false"
          @change="change"
          group="items"
          class="episodeList"
          :disabled="$store.state.editingItem"
  >
    <CustomiseItem v-for="i in items.length"
                   :key="items[i - 1].url"
                   :item="items[i - 1]"
                   :start="times? times[i - 1].start : null"
                   :end="times? times[i - 1].end : null"
                   @remove="remove"
    />
  </draggable>
</template>

<script>
import draggable from "vuedraggable"
import CustomiseItem from "./CustomiseItem";


/**
 * @description The ArrangeItems component uses vue-draggable to enable CustomiseItem components to be rearranged.
 * @vue-prop {Array} items List of episodes in the draggable box.
 * @vue-prop {Number} [dayId=null] The id of the day that this component represents.
 *
 * @vue-computed times {Array<{start: Number, end: Number}>} The start and end times for each item.
 *
 * @vue-event assignItem {{item: HTMLElement, dayId: Number, prevOrder: Number, nextOrder: Number}} Emit a command to move an HTMLElement to a particular slot on a particular day.
 * @vue-event removeItem {{item: CustomiseItem, dayId: string}} Emit a command to remove an item from this component.
 */
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
  computed: {
    times() {
      if(!this.dayId)
        return null;
      const config = this.$store.getters['workshop/Repository']().config;
      let times;
      if(config.yaml.start_times.length > this.dayId - 1) {
        times = config.yaml.start_times[this.dayId - 1].split('|');
      } else
        times = config.yaml.start_times[0].split('|');
      const start = parseInt(times[0]) * 60;
      let elapsed = parseInt(times[1]);

      return this.items.map(i => {
        const out = {
          start: [Math.floor((start + elapsed) / 60), (start + elapsed) % 60]
        };
        elapsed += parseInt(i.yaml.duration || "0") +
                parseInt(i.yaml.teaching || "0") +
                parseInt(i.yaml.exercises || "0");
        out.end = [Math.floor((start + elapsed) / 60), (start + elapsed) % 60];
        return out;
      });
    }
  },
  methods: {
    /**
     * Check a draggable event and process any updates needed.
     * @param evt {{added: Array<Object>, moved: Array<Object>}} Draggable drop event.
     */
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
    /**
     * Remove an child item from the component.
     * @param item {Object} Item to remove.
     */
    remove(item) {this.$emit('assignItem', {item: item, dayId: ''})}
  }
}
</script>

<!-- Add "scoped" attribute to limit CSS to this component only -->
<style lang="scss" scoped>
  .episodeList {user-select: none;}
</style>
