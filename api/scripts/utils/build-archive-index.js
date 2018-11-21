
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
    return `
        <li>
          <a href="stories/${story.id}/${story.id}.html">${story.metadata.title}${story.metadata.subtitle ? ' - ' + story.metadata.subtitle : ''}</a> - par ${story.metadata.authors.join()}
        </li>
        `
  })
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
    return `
      <li>
        <a href="stories/${story.id}/${story.id}.html">${story.metadata.title}${story.metadata.subtitle ? ' - ' + story.metadata.subtitle : ''}</a> - par ${story.metadata.authors.join()} (instance "${story.instanceSlug}")
      </li>
      `
  })
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
    return `
        <li>
          <a href="archive/instances/${instance.slug}/${story.id}/${story.id}.html">${story.metadata.title}${story.metadata.subtitle ? ' - ' + story.metadata.subtitle : ''}</a> - par ${story.metadata.authors.join()}
        </li>
        `
  })
}
  </ul>
</div>
`
  })
}

const buildArchiveIndex = ({
  filter,
  index,
  tags
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
  if (!filter) {
    title = `Archive complète, récupérée le ${new Date().toLocaleString()}`
  } else if (filter.type === 'instance') {
    title = `Archive de l'instance ${filter.payload.instanceSlug}, récupérée le ${new Date().toLocaleString()}`
  } else if (filter.type === 'tag') {
    title = `Archive des récits pour l'étiquette ${filter.payload.tag}, récupérée le ${new Date().toLocaleString()}`
  }

  return `
<html>
  <head>
  </head>
  <body>
    <header>
      <h1>Archive quinoa</h1>
      <h2>Un projet porté par FORCCAST et le médialab SciencesPo</h2>
      <h3>${title}</h3>
    </header>
    <section>
      ${main}
    </section>
  </body>
</html>
`
}

module.exports = buildArchiveIndex
