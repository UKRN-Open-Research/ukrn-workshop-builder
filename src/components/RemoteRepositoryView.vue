<template>
    <div>
        <b-collapse aria-role="list"
                    class="repository-view card"
                    animation="slide"
                    :open="isOpen"
                    @open="$emit('open', repo.url)"
        >
            <template #trigger="props" >
                <div type="is-primary"
                     role="button"
                     class="card-header topic-button"
                     @click="doLookup"
                >
                    <p>
                        {{ repo.ownerLogin }}/<strong>{{ repo.name }}</strong>
                        <b-icon :icon="props.open ? 'menu-up' : 'menu-down'"/>
                    </p>
                    <div class="topics">
                        <div class="topic has-background-light"
                             v-for="t in repo.topics.filter(x => x !== 'ukrn-open-research')"
                             :key="`${repo.url}-${t}`"
                        >{{ t }}</div>
                    </div>
                </div>
            </template>
            <div class="card-content">
                <div class="content">
                    <div v-if="repo.episodes.length">
                        <b-button icon-right="plus"
                                  label="Add items to stash"
                                  type="is-success"
                                  expanded
                                  @click="$emit('selectRepo', repo.episodes)"
                        />
                    </div>
                    <b-message v-else-if="!repo.busyFlag()">
                        <em>No episodes found for this repository.</em>
                    </b-message>
                    <ul>
                        <li aria-role="listitem"
                            v-for="episode in repo.episodes"
                            :key="episode.url"
                            :focusable="false"
                            disabled
                        >
                            <EpisodeName :episode="episode" :include-repo="false"/>
                        </li>
                    </ul>
                    <div v-if="repo.busyFlag()" :focusable="false">
                        <b-skeleton v-for="i in 3" :key="i" size="is-small" animated :active="repo.busyFlag()"/>
                    </div>
                </div>
            </div>
        </b-collapse>
    </div>
</template>

<script>
    import EpisodeName from "./EpisodeName";
    export default {
        name: 'RemoteRepositoryView',
        components: {EpisodeName},
        props: {
            repo: {type: Object, required: true},
            isOpen: {type: Boolean, required: false, default: false}
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
        text-align: left;
        margin: .5em 0;
        user-select: none;
    }
    .topic-button {
        align-items: center;
        justify-content: space-between;
        p { margin: 1em;}
    }
    .topics {
        display: flex;
        margin-right: 1em;
        .topic {
            margin: .25em;
            border-radius: .5em;
            padding: 0 .5em;
        }
    }
    ul {
        display: flex;
        flex-wrap: wrap;
        justify-content: center;
        margin-bottom: 2em;
        li {
            display: flex;
            align-items: center;
            justify-content: center;
            width: 15em;
            margin-right: 1em;
            list-style: none;
            border-radius: .5em;
            padding: .25em;
            background-color: whitesmoke;
            span.episode-name {
                display: flex;
                align-items: center;
                span {text-align: center;}
            }
        }
    }
</style>
