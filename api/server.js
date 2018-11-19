const express = require('express');
const cors = require('cors');
const path = require('path');
const config = require('config');
const serverPassword = config.password;
const {
  readFile,
  writeFile,
  ensureDir,
  exists,
} = require('fs-extra');

const {dataPath, PORT = 3001} = require('config');
const dataBasePath = path.resolve(__dirname, dataPath);
const tagsPath = `${dataBasePath}/tags.json`
const bodyParser = require('body-parser');

const {discoverInstance, archiveStory} = require('./scripts/client');

let index = [];

ensureDir(dataBasePath)
  .then(() => {
    return exists(`${dataBasePath}/index.json`);
  })
  .then(exists => {
    if (!exists) {
      index = [];
      return writeFile(`${dataBasePath}/index.json`, '[]', 'utf8')
    } else {
      readFile(`${dataBasePath}/index.json`, 'utf8')
        .then(str => {
          index = JSON.parse(str)
        })
    }
  })

const app = express();
app.use(cors());

const comparePassword = (password, oPwd) => {
  return new Promise((resolve, reject) => {
    if (password === oPwd ){// bcrypt.compare(password, hash); 
      resolve();
    } else reject();
  })

}

const server = require('http').createServer(app);
server.listen(PORT, () => console.log(`Listening on ${ PORT }`));


app.use('/api/static', express.static(`${dataPath}/instances`));

app.use(bodyParser.json());

const apiRoutes = express.Router();

/**
 * Password middleware for all following protected routes
 */
app.use((req, res, next) => {
  const pwd = req.headers.authorization;
  if (pwd) {
    comparePassword(serverPassword, pwd)
      .then(() => {
        next();
      })
      .catch(() => {
        res.status(401).send('wrong password');
      })
  } else {
    res.status(401).send('password required')
  }
})
app.use('/api', apiRoutes);

/**
 * Get map of tags (keys = story id, values = array of strings)
 */
apiRoutes.get('/tags/', (req, res) => {
  exists(tagsPath)
    .then(exists => {
      if (exists) {
        readFile(tagsPath, 'utf8')
          .then(str => {
            try{
              const tags = JSON.parse(str);
              res.json(tags);
            } catch(e) {
              res.status(500).send('bad tags JSON');
            }
          })
      } else {
        res.json({})
      }
    })
})

/**
 * Update tags list for a specific story
 */
apiRoutes.put('/tags/:storyId', (req, res) => {
  let tags;
  const {body = {}} = req;
  const {tags: storyTags = []} = body;
  const {storyId} = req.params;
  exists(tagsPath)
    .then(exists => {
      return new Promise((resolve, reject) => {
        if (exists) {
          readFile(tagsPath, 'utf8')
            .then(str => {
              try{
                tags = JSON.parse(str);
                return resolve();
              } catch(e) {
                res.status(500).send('bad tags JSON');
              }
            })
        } else {
          tags = {};
          return resolve();
        }
      })
        
    })
    .then(() => {
      tags[storyId] = storyTags;
      return writeFile(tagsPath, JSON.stringify(tags), 'utf8')
    })
    .then(() => {
      res.json(tags);
    })
    .catch(error => {
      res.status(500).send('error while writing');
    })
})

/**
 * Get a story JSON
 */
apiRoutes.use('/instance/:instanceId/story/:storyId', (req, res) => {
  const instanceId = req.params.instanceId;
  const storyId = req.params.storyId;
  const storyPath = `${dataBasePath}/instances/${instanceId}/${storyId}/${storyId}.json`;
  exists(storyPath)
    .then(exists => {
      if (exists) {
        return readFile(storyPath, 'utf8')
      } else {
        return res.status(404).send('no such story archived');
      }
    })
    .then(str => {
      try{
        const index = JSON.parse(str);
        res.json(index);
      } catch(e) {
        res.status(500).send(e);
      }
    })
    .catch((error) => {
      console.error('error', error);
      res.status(500).send(error);
    })
});

/**
 * Get list of instances
 */
apiRoutes.get('', (req, res) => {
  res.json(index)
});

/**
 * Update instances list data (without related stories)
 */
apiRoutes.put('', (req, res) => {
  const {body} = req;
  const {instancesList} = body;

  const instancesPath = `${dataBasePath}/instances.json`;
  let index;
  readFile(`${dataBasePath}/index.json`, 'utf8')
    .then(str => {
      try{
        index = JSON.parse(str);
        const newIndex = instancesList.map((instance) => {
          const {slug} = instance;
          const existing = index.find(i => i.slug === slug);
          if (existing) {
            return {
              ...existing,
              ...instance,
            }
          }
          return {
            ...instance,
            stories: []
          }
        });
        return writeFile(`${dataBasePath}/index.json`, JSON.stringify(newIndex), 'utf8')
      } catch(e) {
        return Promise.reject(e);
      }
    })
    .then(() => writeFile(instancesPath, JSON.stringify(instancesList), 'utf8'))
    .then(() => {
      res.json({
        status: 'success',
        data: {
          instancesList
        }
      })
    })
    .catch(error => {
      res.status(500).send(error);
    });  
});

/**
 * Perform an archiving operation
 */
apiRoutes.post('/operation', (req, res) => {
  const {body = {}} = req;
  const {operation} = body;
  if (operation) {
    let instances;
    readFile(`${dataBasePath}/index.json`, 'utf8')
      .then(str => {
        try{
          instances = JSON.parse(str);
        } catch(e) {
          res.status(500).send('index corrupted');
        }
      })
      .then(() => {
        switch(operation.type) {
          case 'discover-instance':
            let stories;
            discoverInstance(operation.payload.instanceUrl)
              .then(storiesMap => {
                stories = Object.keys(storiesMap)
                  .map(key => storiesMap[key])
                instances = instances.map(instance => {
                  if (instance.instanceUrl === operation.payload.instanceUrl) {
                    // fetch deleted stories
                    // to prevent data loss
                    const deletedStories = (instance.stories || [])
                      .filter(story => stories.find(
                        oStory => oStory.id === story.id
                      ) === undefined);
                    return {
                      ...instance,
                      lastFetchAt: new Date().getTime(),
                      stories: [...deletedStories, ...stories],
                    }
                  }
                  return instance;
                });
                return writeFile(`${dataBasePath}/index.json`, JSON.stringify(instances), 'utf8')
              })
              .then(() => {
                res.json({instances, stories});                
              });
            break;
          case 'archive-story':
            let story;
            const instance = instances.find(i => i.instanceUrl === operation.payload.instanceUrl);

            ensureDir(`${dataPath}/instances/${instance.slug}/${operation.payload.storyId}`)
              /**
               * Save as JSON
               */
              .then(() => archiveStory(operation.payload.instanceUrl, operation.payload.storyId, 'json'))
              .then(storyJSON => {
                story = storyJSON;
                return writeFile(`${dataPath}/instances/${instance.slug}/${operation.payload.storyId}/${operation.payload.storyId}.json`, JSON.stringify(story), 'utf8')
              })
              /**
               * Save as HTML
               */
              .then(() => archiveStory(operation.payload.instanceUrl, operation.payload.storyId, 'html'))
              .then(storyHTML => {
                return writeFile(`${dataPath}/instances/${instance.slug}/${operation.payload.storyId}/${operation.payload.storyId}.html`, storyHTML, 'utf8')
              })
              /**
               * Return JSON
               */
              .then(() => {
                console.log('done archiving story');
                res.json({instances, story});                
              });
            break;
          default:
            console.log('unhandled operation:', operation);
            res.status(401).send('unhandled operation')
            // res.json({instances});
            break;
        }
      })
      .catch(e => {
        console.error('an error occured', e);
        res.status(500).send('error')
      })
  } else {
    res.status(400).send('no operation provided');
  }
})