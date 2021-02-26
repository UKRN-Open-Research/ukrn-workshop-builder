<template>
    <div>
        <b-dropdown aria-role="list"
                    class="repository-view"
                    @active-change="doLookup"
        >
            <template #trigger="{ active }" >
                <b-button type="is-primary"
                          :icon-right="active ? 'menu-up' : 'menu-down'"
                >
                    {{ repo.owner }}/{{ repo.name }}
                </b-button>
            </template>

            <b-dropdown-item v-if="repo.episodes.length" custom>
                <b-button icon-right="plus"
                          label="Add items to stash"
                          type="is-success"
                          expanded
                          @click="$emit('selectRepo', repo.episodes)"
                />
            </b-dropdown-item>
            <b-dropdown-item v-else-if="!repo.busyFlag()">
                <em>No episodes found for this repository.</em>
            </b-dropdown-item>
            <b-dropdown-item aria-role="listitem"
                             v-for="episode in repo.episodes"
                             :key="episode.url"
                             :focusable="false"
                             disabled
            >
                <EpisodeName :episode="episode" :include-repo="false"/>
            </b-dropdown-item>
            <b-dropdown-item v-if="repo.busyFlag()" :focusable="false" custom>
                <b-skeleton v-for="i in 3" :key="i" size="is-small" animated :active="repo.busyFlag()"/>
            </b-dropdown-item>
        </b-dropdown>
    </div>
</template>

<script>
    import EpisodeName from "./EpisodeName";
    export default {
        name: 'RemoteRepositoryView',
        components: {EpisodeName},
        props: {
            repo: {type: Object, required: true}
        },
        data: function() {
            return {}
        },
        computed: {},
        methods: {
            doLookup() {
                if(!this.repo.episodes.length)
                    this.$store.dispatch(
                        'workshop/findRepositoryFiles',
                        {url: this.repo.url}
                    )
                        // Remove day and order properties
                        .then(R => R.episodes.forEach(E => {
                            this.$store.dispatch('workshop/setFileContentFromYAML', {
                                ...E, yaml: {...E.yaml, day: '', order: ''}
                            })
                        }))
            }
        }
    }

</script>

<!-- Add "scoped" attribute to limit CSS to this component only -->
<style lang="scss" scoped>
    .repository-view {
        padding: .5em;
        text-align: left;
    }
</style>
