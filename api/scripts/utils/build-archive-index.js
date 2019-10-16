const slugify = require('slugify')

const slugifyStory = story => {
  return `${slugify(story.metadata.title.toLowerCase())}-${story.id.split('-').pop()}`
}

const buildInstanceHeader = instance => `
<h3><a href="${instance.instanceUrl}">Instance "${instance.slug}"</a></h3>
<ul>
  <li>
    année : ${instance.year}
  </li>
  <li>
    semestre : ${instance.semester}
  </li>
  <li>
    enseignant : ${instance.teacher}
  </li>
  <li>
    campus : ${instance.campus}
  </li>
  <li>
    cours : ${instance.courseName}
  </li>
</ul>
`

const buildInstanceArchive = ({ index, tags, instanceSlug }) => {
const instance = index.find(i => i.slug === instanceSlug)
return `
<div className="instance-container">
<div className="instance-header">
  ${buildInstanceHeader(instance)}
</div>
<p>
  Récits archivés pour cette instance:
</p>
<ul>
  ${
instance.stories.map(story => {
  const slug = slugifyStory(story)
  return `
      <li>
        <a href="${slug}/index.html">${story.metadata.title}${story.metadata.subtitle ? ' - ' + story.metadata.subtitle : ''}</a> - par ${story.metadata.authors.join()}
      </li>
      `
}).join('\n')
}
</ul>
</div>
`
}

const buildTagArchive = ({ index, tags, tag }) => {
const stories = index.reduce((result, instance) => {
  const relevantStories = instance.stories.filter(story => {
    const storyId = story.id
    const storyTags = tags[storyId]
    if (storyTags) {
      return storyTags.includes(tag)
    }
  })
    .map(s => Object.assign(s, { instanceSlug: instance.slug }))

  return [...result, ...relevantStories]
}, [])
return index.map(instance => {
  return `
<ul>
${
stories.map(story => {
  const slug = slugifyStory(story)
  return `
    <li>
      <a href="${slug}/index.html">${story.metadata.title}${story.metadata.subtitle ? ' - ' + story.metadata.subtitle : ''}</a> - par ${story.metadata.authors.join()} (instance "${story.instanceSlug}")
    </li>
    `
}).join('\n')
}
</ul>
`
})
}

const buildWholeArchive = ({ index, tags }) => {
return index.map(instance => {
  return `
<div className="instance-container">
<div className="instance-header">
  ${buildInstanceHeader(instance)}
</div>
<p>
  Récits archivés pour cette instance:
</p>
<ul>
  ${
instance.stories.map(story => {
  const slug = slugifyStory(story)
  return `
      <li>
        <a href="archive/instances/${instance.slug}/${slug}/index.html">${story.metadata.title}${story.metadata.subtitle ? ' - ' + story.metadata.subtitle : ''}</a> - par ${story.metadata.authors.join()}
      </li>
      `
}).join('\n')
}
</ul>
</div>
`
})
}

const buildArchiveIndex = ({
filter,
index,
tags,
formData
}) => {
let main
if (!filter) {
  main = buildWholeArchive({ index, tags })
} else if (filter.type === 'instance') {
  main = buildInstanceArchive({ index, tags, instanceSlug: filter.payload.instanceSlug })
} else if (filter.type === 'tag') {
  main = buildTagArchive({ index, tags, tag: filter.payload.tag })
}

let title = ''
if (formData.title) {
  title = formData.title
} else if (!filter) {
  title = `Archive complète, récupérée le ${new Date().toLocaleString()}`
} else if (filter.type === 'instance') {
  title = `Archive de l'instance ${filter.payload.instanceSlug}, récupérée le ${new Date().toLocaleString()}`
} else if (filter.type === 'tag') {
  title = `Archive des récits pour l'étiquette ${filter.payload.tag}, récupérée le ${new Date().toLocaleString()}`
}
const description = formData.abstract || 'an archive of website made with fonio, a scholarly dissertations editor allowing to build standalone HTML webpages'
const subtitle = formData.subtitle || 'Un projet porté par FORCCAST et le médialab SciencesPo';
return `
<html>
<head>
  <!-- META DUBLIN CORE -->
  <meta name="DC.Title" lang="fr" content="${title}" />
  <meta name="DC.Date.created" scheme="W3CDTF" content="2017-09-01" />
  <meta name="DC.subject" xml:lang="en-GB" content="rich content edition" />
  <!-- END META DUBLIN CORE -->

  <!-- REGULAR META -->
  <meta name="author" content="médialab Sciences Po" />
  <meta name="description" content="${description}" />
  <meta name="viewport" content="user-scalable=no,width=device-width" />
  <!-- END REGULAR META -->

  <!-- META TWITTER -->
  <meta name="twitter:card" value="summary" />
  <meta name="twitter:title" content="${title}" />
  <meta name="twitter:description" content="${description}" />
  <!-- todo : Twitter Summary card images must be at least 200x200px -->
  <!-- end meta twitter-->

  <!-- META GOOGLE + -->
  <meta itemprop="name" content="${title}" />
  <meta itemprop="description" content="${description}" />
  <!-- END META GOOGLE + -->

  <!-- META OPEN GRAPH / FACEBOOK -->
  <meta property="og:title" content="${title}" />
  <meta property="og:type" content="website" />
  <meta property="og:description" content="${description}" />
  <!-- END META OPEN GRAPH / FACEBOOK -->
  <style>
      body{
        display: flex;
        flex-flow: column nowrap;
        align-items: center;
        font-family: sans-serif;
      }
      section,header{
        max-width: 500px;
      }
      ul{
        list-style: none;
        padding: 0;
        width: 100%;
      }
      li{
        background: #333;
        color: white;
        margin-bottom: 1rem;
        padding: 1rem;
      }

      li a{
        color: white;
        display: block;
        font-size: 2rem;
        margin-bottom: 1rem;
      }
    </style>
</head>
<body>
  <header>
    <h1>${title}</h1>
    <h2>${subtitle}</h2>
  </header>
  <section>
      ${description}
  </section>
  <main>
    <section>
      ${main}
    </section>
  </main>
</body>
</html>
`
}

module.exports = buildArchiveIndex
