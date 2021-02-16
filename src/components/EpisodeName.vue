<template>
    <span>
        <span v-if="typeof episode.yaml !== 'object'" class="is-danger">
            INVALID OBJECT
        </span>
        <b-tooltip v-else-if="!Object.keys(episode.yaml).length"
                   dashed
                   type="is-warning"
                   label="This episode has invalid an invalid YAML header, so its details cannot be read."
                   position="is-bottom"
                   multilined
        >
            {{ episode.path }}
        </b-tooltip>
        <b-tooltip v-else-if="!episode.yaml.title"
                   dashed
                   type="is-info"
                   label="This episode has no 'title' set in its YAML header."
                   position="is-bottom"
                   multilined
        >
            {{ episode.path }}
        </b-tooltip>
        <span v-else>{{episode.yaml.title}}</span>
    </span>
</template>

<script>
    export default {
        name: 'EpisodeName',
        components: {},
        props: {
            episode: {type: Object, required: true}
        }
    }
</script>

<!-- Add "scoped" attribute to limit CSS to this component only -->
<style lang="scss" scoped>
    .load-icon {padding-left: 1em;}
</style>
