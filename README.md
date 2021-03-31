[![DOI](https://zenodo.org/badge/331747772.svg)](https://zenodo.org/badge/latestdoi/331747772) [![Netlify Status](https://api.netlify.com/api/v1/badges/e38e5eae-c1e1-434e-85a7-b761c0d40806/deploy-status)](https://app.netlify.com/sites/ukrn-wb/deploys)
# UKRN Workshop Builder Tool

## About

The [UK Reproducibility Network (UKRN)](https://ukrn.org/) is an organisation that promotes open research practices in the United Kingdom. 
As part of its operations, it runs a train-the-trainer Open Research Workshop programme in which researchers familiar with a specific open research practice design and build workshops which will equip their colleagues with the necessary skills to embed the open research practice in their own workflows.
This localised approach is designed to overcome the difficulties of adapting general open research materials to the specific needs of particular research fields.

The **Workshop Builder Tool** has two primary purposes:
* Make workshop construction more efficient by providing an easy-to-use interface to GitHub Pages website development
* Allow discovery and sharing of similar workshop components built by others

The Workshop Builder generates websites based on a [workshop template](https://github.com/UKRN-Open-Research/workshop-template) adapted from [The Carpentries'](https://carpentries.org/) workshop template.
It is designed to work in companionship with the [UKRN Open Research Resources Browser](https://ukrn-orr.netlify.app/), which allows course participants to find resources to include in their workshops. 

## How it works

The Workshop Builder requires that users sign in with a GitHub account.

Once this is done, users can create workshops and customise their metadata, including the topic, title, instructors and their contact details, etc.
This step creates a GitHub repository for the user based on the [template](https://github.com/UKRN-Open-Research/workshop-template), tags it with the `ukrn-open-research` topic so it shows up in searches, and saves the metadata to `_config.yml`.

The workshop can then be populated by searching for existing lessons (in repositories with the `ukrn-open-research` topic).
All workshops with the same open research topic as the existing workshop will show up in the resource list, and their lessons can be added by adding them to the stash and then dragging them into a schedule timeline.

When a lesson is placed in the timeline it can be installed - doing this copies it from its existing location into the `_episodes/` directory, and copies any images linked with markdown syntax (`![img alt text](img-link)`) into the `fig/` directory with a subdirectory path of the original repository.
Once installed, a lesson's metadata and content can be edited.
New lessons cannot be created from scratch, but there are [barebones templates](https://github.com/UKRN-Open-Research/ukrn-wb-lesson-templates) which can be used for this.

Several non-lesson files can also be edited, such as the workshop instructor notes (`./notes.md`) and the introductory text.

As files are edited, changes are made to the locally cached versions. 
Files changes can then be pushed to GitHub individually or collectively committed or discarded.
Triggering GitHub commits schedules a check on the build status to occur in the next few minutes, allowing users to see that their changes have been published on their workshop website.

## Local development

This project's dependencies are managed by npm. 
To get started, fork this repository and then navigate to the project directory and follow the instructions below:

### Project setup
To install the project dependencies run:
```
npm install
```

#### `.env` and `.env.local` files
The project is powered by its connectivity to the GitHub API, via the UKRN Workshop Builder OAuth app. 
For local development, you will need to create your own OAuth app on GitHub.
The app's Client ID should be listed in `.env` with the key `VUE_APP_GITHUB_ID`.
The app's Client Secret should be listed in `.env.local` with the key `GITHUB_APP_SECRET`.
The app should be configured to redirect to your local server, e.g. `http://localhost:8080/`.

The Workshop Builder also has the user keep track of an encrypted version of their GitHub authorisation token, which is sent to the user with each GitHub interaction. 
The key for this encryption can be anything you like, but you must include it in your `.env.local` file as `GITHUB_TOKEN_ENCRYPTION_KEY`, e.g.: `GITHUB_TOKEN_ENCRYPTION_KEY=ThisIsOnlyAnExample`.

#### Serve for local testing
Uses webpack compiling and supports hot-reloading of files.
```
npm run serve
```

#### Compiles and minifies for production
```
npm run build
```

#### Lints and fixes files
```
npm run lint
```

#### Customize configuration
See [Configuration Reference](https://cli.vuejs.org/config/).

### Component Guides
The project is built on several core components.
If you run into difficulty with them, more information can be found at:
* [VueJS](https://vuejs.org/)
* [VueX](https://vuex.vuejs.org/)
* [Bulma](https://bulma.io/) / [Buefy](https://buefy.org/)
* [Mavon editor](https://github.com/hinesboy/mavonEditor/blob/master/README-EN.md)
* [GitHub API](https://docs.github.com/en/rest)
* [Netlify](https://docs.netlify.com/)

## License
This project is licensed under the [MIT license](https://github.com/UKRN-Open-Research/ukrn-workshop-builder/blob/master/LICENSE.txt).