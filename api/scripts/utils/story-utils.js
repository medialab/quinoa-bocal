/**
 * This module consumes the restory of a quinoa story
 * to bundle the content of an all-in-one html file
 * ========
 * @module quinoa-server/services/storyBundler
 */
const fs = require('fs-extra');
const slugify = require('slugify')
const path = require('path');
const draft = require('draft-js');
const genId = require('uuid').v4;
// const sizeOf = require('image-size');
const stateToHTML = require('draft-js-export-html').stateToHTML;
const archiver = require('archiver');
const base64ToImage = require('base64-to-image');

const convertFromRaw = draft.convertFromRaw;
const buildPath = path.resolve(__dirname + '../../../resources/playerBuild.js');

const bundle = fs.readFileSync(buildPath, 'utf8').replace(/(^\/\/.*$)/gm, '');

// const tempFolderPath = path.resolve(__dirname + '/../../../temp');
// const dataPath = path.resolve(__dirname + '/../../../data');
// const readmeFrPath = path.resolve(__dirname + '/../../../resources/export-readmes/README.fr.md');
// const readmeEnPath = path.resolve(__dirname + '/../../../resources/export-readmes/README.en.md');

const slugifyStory = story => {
  return `${slugify(story.metadata.title.toLowerCase().replace(/\W/g, '-'))}-${story.id.split('-').pop()}`
}


const statifyStory = story => {
  return Object.assign(story, {
    resources: Object.keys(story.resources).reduce((res, resourceId) => {
      const resource = story.resources[resourceId];
      let newResource;
      if (resource.data && resource.data.filePath) {
        const filePath = resource.data.filePath.split('/').slice(2).join('/')
        newResource = Object.assign(resource, {
          data: Object.assign(resource.data, {
            filePath,
            src: filePath
          })
        })
      } else newResource = resource;
      return Object.assign(res, {
        [resourceId]: newResource
      })
    }, {})
  })
}

/**
 * Builds simple html code aimed at being parsed by indexing robots (to prevent the "black box" effect of js-related-only content)
 * @param {object} story - the story to parse
 * @return {string} html - the resulting html
 */
const buildSEOHTML = (story = {metadata: {}}) => {
  const title = story.metadata.title || 'Quinoa story';
  const description = story.metadata.abstract || '';
  let contents = '';
  try {
    contents = story.sectionsOrder.map(sectionId => {
      const section = story.sections[sectionId];
      // htmlify notes
      const notes = Object.keys(section.notes)
        .map(noteId => {
          const note = section.notes[noteId];
          return stateToHTML(convertFromRaw(note.editorState));
        });
      // htmlify main content
      const theseContents = section.contents;
      const contentState = convertFromRaw(theseContents);
      // return everything
      return stateToHTML(contentState).concat(notes);
    }).join('\n \n');
  } catch(e) {
    console.error(e);
  }
    

  return `
<h1>${title}</h1>
<p>
${description}
</p>
<div>
${contents}
</div>
`;
};

/**
 * Builds metadata for the head of the html output
 * @param {object} story - the story to parse
 * @return {string} html - the resulting html
 */
const buildMeta = (story = {metadata: {}}) => {
  const title = story.metadata.title ? `
    <title>${story.metadata.title}</title>
    <meta name="DC.Title" content="${story.metadata.title}"/>
    <meta name="twitter:title" content="${story.metadata.title}" />
    <meta property="og:title" content="${story.metadata.title}" />
  ` :  '<title>Quinoa story</title>';
  const description = story.metadata.abstract ? `
    <meta name="description" content="${story.metadata.abstract}"/>
    <meta name="DC.Description" content="${story.metadata.abstract}"/>
    <meta property="og:description" content="${story.metadata.abstract}" />
    <meta name="twitter:description" content="${story.metadata.abstract}" />
  ` :  '';
  const authors = story.metadata.authors && story.metadata.authors.length
                  ?
                  story.metadata.authors.map(author => `
    <meta name="DC.Creator" content="${author}" />
    <meta name="author" content="${author}" />`
  )
                  : '';
  // const covers = buildCoverMeta(story);
  return `
  <meta name = "DC.Format" content = "text/html">
  <meta name = "DC.Type" content = "data story">
  <meta name = "twitter:card" content="summary" />
  <meta property = "og:type" content="website" />
  ${title}
  ${authors}
  ${description}
`;
}

const buildIndex = story => {
  const meta = buildMeta(story);
  const locale = 'fr' // options.locale || 'en';
    // build html for indexing purpose
    const seoHTML = buildSEOHTML(story);

    // render html
    const html = `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
       ${meta}

       <link href="https://fonts.googleapis.com/css?family=Roboto:400,400i,500,500i" rel="stylesheet">
<link href="https://fonts.googleapis.com/css?family=Merriweather:400,400i,700,700i" rel="stylesheet">

      <style>
        body{
          position: absolute;
          padding: 0;
          margin: 0;
          left: 0;
          top: 0;
          width: 100%;
          height: 100%;
          font-family: Source Sans Pro, sans serif;
        }
        .shadow-content
        {
          display: none;
        }
        .loader-wrapper
        {
          background: #353635;
          color: #f4f4f4;
          width: 100%;
          height: 100%;
          position: absolute;
          display: flex;
          flex-flow: row nowrap;
          justify-content: center;
          align-items: center;
          left: 0;
          top: 0;
        }
        .loader-container
        {
          display: flex;
          flex-flow: column nowrap;
          justify-content: center;
          align-items: center;
        }
        a,a:visited,a:active,a:hover{
          color: inherit;
          text-decoration: none;
        }
        .loader-container h1
        {
          font-size: 6rem;
        }
      </style>
    </head>
    <body>
      <div class="shadow-content">
        ${seoHTML}
      </div>
      <div class="loader-wrapper">
        <div class="loader-container">
          <h3>Fonio - by <a href="http://www.medialab.sciences-po.fr/fr/" target="blank">médialab sciences po</a></h3>
          <h1>${story.metadata.title || 'Quinoa story'}</h1>
          <p>Loading ...</p>
        </div>
      </div>
      <div id="mount"></div>
      <script>
        window.__locale = "${locale}";
        
        function loadJS(url, location){
          //url is URL of external file, implementationCode is the code
          //to be called from the file, location is the location to 
          //insert the <script> element

          var scriptTag = document.createElement('script');
          scriptTag.src = url;
          location.appendChild(scriptTag);
      };
      function loadJSON(URL, callback) {   

        var xobj = new XMLHttpRequest();
            xobj.overrideMimeType("application/json");
        xobj.open('GET', URL, true); // Replace 'my_data' with the path to your file
        xobj.onreadystatechange = function () {
              if (xobj.readyState == 4 && xobj.status == "200") {
                // Required use of an anonymous callback as .open will NOT return a value but simply returns undefined in asynchronous mode
                callback(xobj.responseText);
              }
        };
        xobj.send(null);  
     }
     function prepareStory(story, prefix) {
       return Object.assign(story, {
         resources: Object.keys(story.resources).reduce(function(res, resourceId) {
            var resource = story.resources[resourceId];
            var newResource;
            if (resource.data && resource.data.filePath) {
              newResource = Object.assign(resource, {
                data: Object.assign(resource.data, {
                  src: prefix + resource.data.filePath,
                  filePath: prefix + resource.data.filePath
                })
              })
            } else newResource = resource;
            return Object.assign(res, {
              [resourceId]: newResource
            })
         }, {})
       })
     }
      var urlPrefix = window.location.href.split('/').reverse().slice(1).reverse().join('/')  + '/';
    
      window.__urlPrefix = urlPrefix;
      /**
       * Dynamically loading the JSON data
       */
      loadJSON(urlPrefix + 'story.json', function(story) {
        window.__story = prepareStory(JSON.parse(story), urlPrefix);
        /**
         * Dynamically loading the html bundle 
         */
        var bundleURL = urlPrefix + 'bundle.js';
        loadJS(bundleURL, document.body);
      })
      
      </script>
    </body>
    </html>
    `;
    return html;
}

const outputImage = ({base64, outputPath, fileName, ext}) => {
  try {
    base64ToImage(base64, outputPath, {'fileName': fileName, 'type':ext})
  } catch(e) {
    console.error('issue with base 64 creation');
    console.log(base64.substr(0, 100))
    console.log(e)
  }
}

const buildStaticStory = ({
  jobBase: inputJobBase,
  dataPath,
}) => {
  return new Promise((resolve, reject) => {
    console.log('build static story from', dataPath)
    const story = JSON.parse(fs.readFileSync(dataPath))
    const imagesToCreate = []
    const jobBase = `${inputJobBase}/${slugifyStory(story)}`
    Object.keys(story.resources)
    .forEach(resourceId => {
      const resource = story.resources[resourceId]
      if (resource.metadata.type === 'image') {
        // const outputFile = `${jobBase}/resources/${resource.id}.${resource.metadata.ext}`;
        story.resources[resourceId].data.src = `resources/${resource.id}.${resource.metadata.ext}`;
        imagesToCreate.push({
          base64: story.resources[resourceId].data.base64,
          outputPath: `${jobBase}/resources/`, 
          fileName: `${resource.id}.${resource.metadata.ext}`, 
          ext: resource.metadata.ext
        })
        delete story.resources[resourceId].data.base64;
      }
    })
    fs.ensureDir(`${jobBase}/resources`)
    .then(() => {
      imagesToCreate.forEach(outputImage)
    })
    .then(() => fs.writeFile(`${jobBase}/index.html`, buildIndex(story), 'utf8'))
    .then(() => fs.writeFile(`${jobBase}/story.json`, JSON.stringify(story), 'utf8'))
    .then(() => fs.writeFile(`${jobBase}/bundle.js`, bundle), 'utf8')
    .then(() => {
      console.log('done for static story from', dataPath)
      resolve()
    })
    .catch(reject)
  })
}

module.exports = {
  buildStaticStory,
}