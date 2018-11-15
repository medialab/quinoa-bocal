const {get} = require('axios');

const discoverInstance = instanceUrl => {
  const uri = `${instanceUrl}/quinoa/api/stories/`;

  return new Promise((resolve, reject) => {
    get(uri)
      .then(({data}) => {
        resolve(data);
      })
      .catch(error => {
        reject(error);
      })
  })
}

const archiveStory = (instanceUrl, storyId) => {
  const uri = `${instanceUrl}/quinoa/api/stories/${storyId}?edit=false&format=json`;

  return new Promise((resolve, reject) => {
    get(uri)
      .then(({data}) => {
        resolve(data);
      })
      .catch(error => {
        reject(error);
      })
  })
}

module.exports = {
  discoverInstance,
  archiveStory
}