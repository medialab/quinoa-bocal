const { get } = require('axios')

const discoverInstance = instanceUrl => {
  const uri = `${instanceUrl}/quinoa/api/stories/`

  return new Promise((resolve, reject) => {
    get(uri)
      .then(({ data }) => {
        resolve(data)
      })
      .catch(error => {
        reject(error)
      })
  })
}

const archiveStory = (instanceUrl, storyId, format = 'json') => {
  const uri = `${instanceUrl}/quinoa/api/stories/${storyId}?edit=false&format=${format}`

  return new Promise((resolve, reject) => {
    get(uri)
      .then(({ data }) => {
        resolve(data)
      })
      .catch(error => {
        console.log('archive error');
        console.log('rejecting archive promise');
        reject(error)
      })
  })
}

module.exports = {
  discoverInstance,
  archiveStory
}
