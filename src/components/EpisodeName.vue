<template>
    <span class="episode-name">
        <span v-if="includeRepo && owner_repo" class="repository has-background-white-ter">
            {{ owner_repo.owner }} / {{ owner_repo.repo }}
        </span>
        <span v-if="typeof episode.yaml !== 'object'" class="has-text-danger">
            INVALID OBJECT
        </span>
        <b-tooltip v-else-if="!Object.keys(episode.yaml).length"
                   dashed
                   type="is-warning"
                   label="This lesson has invalid an invalid YAML header, so its details cannot be read."
                   position="is-bottom"
        >
            {{ episode.path }}
        </b-tooltip>
        <b-tooltip v-else-if="!episode.yaml.title"
                   dashed
                   type="is-info"
                   label="This lesson has no 'title' set in its YAML header."
                   position="is-bottom"
        >
            {{ episode.path }}
        </b-tooltip>
        <span v-else>
            <b-icon v-if="episode.yaml.missingDependencies && episode.yaml.missingDependencies.length"
                    icon="alert"
                    type="is-warning"
                    title="This lesson has missing dependencies. You can fix this by going to 'edit properties'."
            />
            {{episode.yaml.title}}
        </span>
    </span>
</template>

<script>
    export default {
        name: 'EpisodeName',
        components: {},
        props: {
            episode: {type: Object, required: true},
            includeRepo: {type: Boolean, required: false, default: true}
        },
        computed: {
            owner_repo() {
                try {
                    const match = /^https:\/\/api\.github\.com\/repos\/([^/]+)\/([^/]+)/
                        .exec(this.episode.url);
                    return {owner: match[1], repo: match[2]}
                } catch(e) {return ""}
            }
        }
    }
</script>

<!-- Add "scoped" attribute to limit CSS to this component only -->
<style lang="scss" scoped>
    .episode-name {
        display: inline-flex;
        flex-direction: column;
        align-items: flex-start;
        width: 100%;
    }
    span {
        text-align: left;
        user-select: inherit;
    }
    .repository {
        display: inline-block;
        font-size: .75em;
        vertical-align: top;
        margin-bottom: .75em;
        padding: .1em .25em;
    }
</style>
