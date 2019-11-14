const slugify = require('slugify')

const searchScript = `

function debounce(func, wait, immediate) {
  var timeout;
  return function() {
    var context = this, args = arguments;
    var later = function() {
      timeout = null;
      if (!immediate) func.apply(context, args);
    };
    var callNow = immediate && !timeout;
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
    if (callNow) func.apply(context, args);
  };
};

var foundIndex = 0;
var found = []
var search = debounce(function(evt) {
  var val = evt.target.value.toLowerCase();
  if (val.length > 2 || val.length === 0) {
    var aTags = document.getElementsByTagName("a");
    found = [];
    foundIndex = 0;

    for (var i = 0; i < aTags.length; i++) {
      if (aTags[i].textContent.toLowerCase().includes(val)) {
        found.push(aTags[i]);
      }
    }
    if (found.length) {
      found[foundIndex].scrollIntoView({behavior: 'smooth', block: 'center', inline: 'center'});
    }
  } else {
    found = [];
    foundIndex = 0;
  }
}, 300);

var onEnter = function(evt) {
  if (evt.keyCode === 13) {
    foundIndex ++;
    if (foundIndex > found.length - 1) {
      foundIndex = 0;
    }
    if (found[foundIndex]) {
      found[foundIndex].scrollIntoView({behavior: 'smooth', block: 'center', inline: 'center'});
    }
  }
};

const searchInput = document.getElementById('search')

searchInput.addEventListener('input', search);
searchInput.addEventListener('keyup', onEnter);`;

const indexStyle = `
body{
  font-family: "Merriweather", serif;
  background: #fdfff8;
}


header{
  position: fixed;
  left: 1rem;
  top: 2.3rem;
  padding-top: 1rem;
  max-width: calc(30% - 1rem);
  padding-right: 2rem;
  box-sizing: content-box;
}

header h1 {
  font-size: 1.6rem;
}
header h2 {
  font-size: 1rem;
  font-style: italic;
  color: darkgrey;
}

header #description {
  font-size: .9rem;
}

header input{
  width: calc(100% - 3rem);
  width: 100%;
  padding: .5rem;
  outline: none;
  border: 1px solid lightgrey;
  font-family: "Merriweather", serif;
}
header input:focus{
  border : 1px solid darkgrey;
}
main {
  left: 30%;
  width: 70%;
  position: relative;
  padding-top: 1rem;
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
  margin: 1rem;
  margin-right: 2rem;
  adow: 0px 3px 1px -2px rgba(0, 0, 0, 0.2), 0px 2px 2px 0px rgba(0, 0, 0, 0.14), 0px 1px 5px 0px rgba(0, 0, 0, 0.12);
}

li a{
  text-decoration: none;
  color: inherit;
}

h3{
  font-size: 1.5rem;
}

@media (max-width: 800px) {
  header{
    max-width: 100%;
    min-width: 100%;
    top: 0;
    background: #fdfff8;
    z-index: 2;
    padding: .5rem;
    padding-right: 3rem;
    box-sizing: content-box;
  }
  header #description{
    display: none;
  }
  header input{
    width: calc(100% - 4rem);
  }
  main{
    top: 35%;
    max-width: 100%;
    width: 100%;
    left: 0;
  }
}
`

function linkify(inputText, replacementText) {
  var replacedText, replacePattern1, replacePattern2, replacePattern3;

  //URLs starting with http://, https://, or ftp://
  replacePattern1 = /(\b(https?|ftp):\/\/[-A-Z0-9+&@#\/%?=~_|!:,.;]*[-A-Z0-9+&@#\/%=~_|])/gim;
  replacedText = inputText.replace(replacePattern1, replacementText ? `<a href="$1" rel="noopener" target="_blank">${replacementText}</a>` : '<a href="$1" rel="noopener" target="_blank">$1</a>');

  //URLs starting with "www." (without // before it, or it'd re-link the ones done above).
  replacePattern2 = /(^|[^\/])(www\.[\S]+(\b|$))/gim;
  replacedText = replacedText.replace(replacePattern2, replacementText ? `$1<a href="http://$2" target="_blank">${replacementText}</a>'` : '$1<a href="http://$2" target="_blank">$2</a>');

  //Change email addresses to mailto:: links.
  replacePattern3 = /(([a-zA-Z0-9\-\_\.])+@[a-zA-Z\_]+?(\.[a-zA-Z]{2,6})+)/gim;
  replacedText = replacedText.replace(replacePattern3, '<a href="mailto:$1">$1</a>');

  return replacedText;
}

const slugifyStory = story => {
  return `${slugify(story.metadata.title.toLowerCase().replace(/\W/g, '-'))}-${story.id.split('-').pop()}`
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
  instance.
  stories
  .sort((storyA, storyB) => {
    if (storyA.metadata.title > storyB.metadata.title) {
      return 1;
    }
    return -1;
  })
  .map(story => {
    const slug = slugifyStory(story)
    let teacher = tags[story.id].find(t => t.indexOf('metadata:teacher:') === 0)
    teacher = teacher && teacher.split('metadata:teacher:')[1]
    return `
      <li>
        <a target="blank" rel="noopener" href="${slug}/index.html">
          <h3>
              ${story.metadata.title}${story.metadata.subtitle ? ' - ' + story.metadata.subtitle : ''}
          </h3>
            ${story.metadata.authors.length > 0 ? `<p>Auteur.e.s : ${story.metadata.authors.join(', ')}</p>` : ''}
            ${teacher && `<p>Enseignant.e : ${teacher}</p>`}
        </a>
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

  // return index.map(instance => {
    return `
<ul>
${
stories
.sort((storyA, storyB) => {
  if (storyA.metadata.title > storyB.metadata.title) {
    return 1;
  }
  return -1;
})
.map(story => {
  const slug = slugifyStory(story)
  let teacher = tags[story.id].find(t => t.indexOf('metadata:teacher:') === 0)
  teacher = teacher && teacher.split('metadata:teacher:')[1]
  return `
    <li>
      <a target="blank" rel="noopener" href="${slug}/index.html">
        <h3>
            ${story.metadata.title}${story.metadata.subtitle ? ' - ' + story.metadata.subtitle : ''}
        </h3>
          ${story.metadata.authors.length > 0 ? `<p>Auteur.e.s : ${story.metadata.authors.join(', ')}</p>` : ''}
          ${teacher && `<p>Enseignant.e : ${teacher}</p>`}
      </a>
    </li>
    `
}).join('\n')
}
</ul>
`
// }).join('\n')
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

  <meta charset="UTF-8">
  <title>${title}</title>
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

  <link href="https://fonts.googleapis.com/css?family=Merriweather:400,400i,700&display=swap" rel="stylesheet">

  <style>
      ${indexStyle}
    </style>
</head>
<body>
  <header>
    <h1>${title}</h1>
    <h2>${subtitle}</h2>
    <input id="search" type="text" placeholder="chercher un récit"></input>
    <div id="description">
      <p>
      ${
        linkify(description, 'lien')
        .trim()
        .replace(/\n/g, '</p><p>')
      }
      </p>
    </div>
  </header>
  <main>
    <section>
      ${main}
    </section>
  </main>
</body>
<script>
${searchScript}
</script>
<script src="bundle.js"></script>
</html>
`
}

module.exports = buildArchiveIndex
