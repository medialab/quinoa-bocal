/**
 * =========================
 * DEPENDENCIES
 * =========================
 */
const express = require('express')
const cors = require('cors')
const path = require('path')
const config = require('config')
const archiver = require('archiver')
const { v4: genId } = require('uuid')
const { csvFormat } = require('d3-dsv')
const serverPassword = config.password;

const {
  readFile,
  writeFile,
  ensureDir,
  createWriteStream,
  remove,
  copy,
  exists
} = require('fs-extra')

const { dataPath, PORT = 3003, tempPath } = require('config')
const dataBasePath = path.resolve(__dirname, dataPath)
const tempBasePath = path.resolve(__dirname, tempPath)
const tagsPath = `${dataBasePath}/tags.json`
const bodyParser = require('body-parser')

const { discoverInstance, archiveStory } = require('./scripts/utils/client')
const buildArchiveIndex = require('./scripts/utils/build-archive-index')

/**
 * =========================
 * UTILS
 * =========================
 */
const readIndex = () =>
  new Promise((resolve, reject) => {
    let index
    ensureDir(dataBasePath)
      .then(() => {
        return exists(`${dataBasePath}/index.json`)
      })
      .then(exists => {
        if (!exists) {
          index = []
          writeFile(`${dataBasePath}/index.json`, '[]', 'utf8')
        } else {
          readFile(`${dataBasePath}/index.json`, 'utf8')
            .then(str => {
              index = JSON.parse(str)
              resolve(index)
            })
        }
      })
      .catch(reject)
  })

const readTags = () =>
  new Promise((resolve, reject) => {
    readFile(tagsPath, 'utf8')
      .then(str => {
        try {
          const tags = JSON.parse(str)
          resolve(tags)
        } catch (e) {
          reject(e)
        }
      })
  })

const updateStoryTags = ({
  storyTags,
  storyId,
  overrideExistingTags = true
}) => {
  let tags
  return new Promise((resolve, reject) => {
    exists(tagsPath)
      .then(exists => {
        return new Promise((resolve, reject) => {
          if (exists) {
            readTags()
              .then(theseTags => {
                tags = theseTags
                resolve()
              })
              .catch(reject)
          } else {
            tags = {}
            return resolve()
          }
        })
      })
      .then(() => {
        if (overrideExistingTags) {
          tags[storyId] = storyTags
        } else {
        // merge new tags with old tags
          tags[storyId] = [
            ...(tags[storyId] || []),
            ...storyTags.filter(t => !(tags[storyId] || []).includes(t))
          ]
        }
        return writeFile(tagsPath, JSON.stringify(tags), 'utf8')
      })
      .then(() => resolve(tags))
      .catch(reject)
  })
}
/**
 * Note: this is wrapped inside a promise
 * in case we want to encrypt passwords on one or both sides
 */
const comparePassword = (password, oPwd) => {
  return new Promise((resolve, reject) => {
    if (password === oPwd) {
      resolve()
    } else reject(new Error('invalid password'))
  })
}

/**
 * =========================
 * MIDDLEWARE HANDLERS
 * =========================
 */
const passwordMiddleware = (req, res, next) => {
  const pwd = req.headers.authorization
  if (pwd) {
    comparePassword(serverPassword, pwd)
      .then(() => {
        next()
      })
      .catch(() => {
        res.status(401).send('wrong password')
      })
  } else {
    res.status(401).send('password required')
  }
}
/**
 * =========================
 * ROUTE HANDLERS
 * =========================
 */
const getInstancesListHandler = (req, res) => {
  readIndex()
    .then(index => {
      res.json(index)
    })
    .catch(error => {
      console.error('error', error)
      res.status(500).send(error)
    })
}

const getStoryHandler = (req, res) => {
  const instanceId = req.params.instanceId
  const storyId = req.params.storyId
  const storyPath = `${dataBasePath}/instances/${instanceId}/${storyId}/${storyId}.json`
  exists(storyPath)
    .then(exists => {
      if (exists) {
        return readFile(storyPath, 'utf8')
      } else {
        return res.status(404).send('no such story archived')
      }
    })
    .then(str => {
      try {
        const index = JSON.parse(str)
        res.json(index)
      } catch (e) {
        res.status(500).send(e)
      }
    })
    .catch((error) => {
      console.error('error', error)
      res.status(500).send(error)
    })
}

const updateInstancesListHandler = (req, res) => {
  const { body } = req
  const { instancesList } = body

  const instancesPath = `${dataBasePath}/instances.json`
  let index
  readFile(`${dataBasePath}/index.json`, 'utf8')
    .then(str => {
      try {
        index = JSON.parse(str)
        const newIndex = instancesList.map((instance) => {
          const { slug } = instance
          const existing = index.find(i => i.slug === slug)
          if (existing) {
            return {
              ...existing,
              ...instance
            }
          }
          return {
            ...instance,
            stories: []
          }
        })
        return writeFile(`${dataBasePath}/index.json`, JSON.stringify(newIndex), 'utf8')
      } catch (e) {
        return Promise.reject(e)
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
      res.status(500).send(error)
    })
}
const archiveHandler = (req, res) => {
  const { body = {} } = req
  const { data, format, filter, fileName } = body
  const jobId = genId()
  const jobBase = `${tempBasePath}/${jobId}`
  const outputPath = `${jobBase}/archive/${fileName}.zip`
  let index
  let tags
  if (format === 'archive') {
    readIndex()
      .then((thatIndex) => {
        index = thatIndex
        return readTags()
      })
      .then((theseTags) => {
        tags = theseTags
        return ensureDir(`${jobBase}/data`)
      })
      .then(() => ensureDir(`${jobBase}/data`))
      .then(() => ensureDir(`${jobBase}/archive`))
      .then(() => {
        if (!filter) {
          return copy(dataBasePath, `${jobBase}/data/archive`)
        } else if (filter.type === 'instance') {
          const instanceSlug = filter.payload.instanceSlug
          const folderPath = `${dataBasePath}/instances/${instanceSlug}`
          return copy(folderPath, `${jobBase}/data/stories`)
        } else if (filter.type === 'tag') {
          const tag = filter.payload.tag
          const folders = index.reduce((result, instance) => {
            const storiesIds = instance.stories.map(s => s.id)
              .filter(sId => tags[sId] && tags[sId].includes(tag))
            return [
              ...result,
              ...storiesIds.map(storyId => ({
                instanceSlug: instance.slug,
                storyId
              }))
            ]
          }, [])
          return Promise.all(
            folders.map(({ instanceSlug, storyId }) =>
              copy(`${dataBasePath}/instances/${instanceSlug}/${storyId}`, `${jobBase}/data/stories/${storyId}`)
            )
          )
        }
      })
      .then(() => {
        const html = buildArchiveIndex({
          filter,
          index,
          tags
        })
        return writeFile(`${jobBase}/data/index.html`, html, 'utf8')
      })
      .then(() => {
        return writeFile(`${jobBase}/data/data.csv`, csvFormat(data), 'utf8')
      })
      .then(() => {
        return new Promise((resolve, reject) => {
          const output = createWriteStream(outputPath)
          const archive = archiver('zip', {
            zlib: { level: 9 } // Sets the compression level.
          })

          // good practice to catch warnings (ie stat failures and other non-blocking errors)
          archive.on('warning', function (err) {
            if (err.code === 'ENOENT') {
              // log warning
              console.warn(err)
            } else {
              // throw error
              res.status(500).send(err)
              reject(err)
            }
          })

          // good practice to catch this error explicitly
          archive.on('error', function (err) {
            res.status(500).send(err)
            reject(err)
          })

          // pipe archive data to the file
          archive.pipe(output)

          const dirPath = `${tempPath}/${jobId}/data`
          archive.directory(dirPath, fileName)

          // finalize the archive (ie we are done appending files but streams have to finish yet)
          // 'close', 'end' or 'finish' may be fired right after calling this method so register to them beforehand
          archive.finalize()
          // listen for all archive data to be written
          // 'close' event is fired only when a file descriptor is involved
          output.on('close', function () {
            console.log(archive.pointer() + ' total bytes')
            console.log('archiver has been finalized and the output file descriptor has closed.')
            resolve()
          })

          // This event is fired when the data source is drained no matter what was the data source.
          // It is not part of this library but rather from the NodeJS Stream API.
          // @see: https://nodejs.org/api/stream.html#stream_event_end
          output.on('end', function () {
            console.log('Data has been drained')
            resolve()
          })
        })
      })
      .then(() => {
        return new Promise((resolve, reject) => {
          res.setHeader('Content-Type', 'application/zip')
          res.sendFile(outputPath, `${fileName}.zip`, err => {
            if (err) {
              reject(err)
            } else {
              resolve()
            }
          })
        })
      })
      .then(() => remove(jobBase))
      .catch(console.error)
  }
}

const getTagsHandler = (req, res) => {
  exists(tagsPath)
    .then(exists => {
      if (exists) {
        readTags()
          .then(tags => {
            res.json(tags)
          })
          .catch(e => {
            res.status(500).send('bad tags JSON')
          })
      } else {
        res.json({})
      }
    })
}

const updateStoryTagsHandler = (req, res) => {
  const { body = {} } = req
  const { tags: storyTags = [] } = body
  const { storyId } = req.params
  updateStoryTags({ storyTags, storyId })
    .then((tags) => {
      res.json(tags)
    })
    .catch(error => {
      res.status(500).send('error while writing', error)
    })
}

const operationHandler = (req, res) => {
  const { body = {} } = req
  const { operation } = body;
  console.log('handle operation', operation.type, operation);
  if (operation) {
    let instances
    readFile(`${dataBasePath}/index.json`, 'utf8')
      .then(str => {
        try {
          instances = JSON.parse(str)
        } catch (e) {
          res.status(500).send('index corrupted')
        }
      })
      .then(() => {
        switch (operation.type) {
          case 'discover-instance':
            let stories
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
                      ) === undefined)

                    return {
                      ...instance,
                      lastFetchAt: new Date().getTime(),
                      stories: [...deletedStories, ...stories]
                    }
                  }
                  return instance
                })
                return writeFile(`${dataBasePath}/index.json`, JSON.stringify(instances), 'utf8')
              })
              /**
               * Return instances
               */
              .then(() => {
                res.json({ instances, stories })
              })
            break
          case 'archive-story':
            let story
            const instance = instances.find(i => i.instanceUrl === operation.payload.instanceUrl)

            ensureDir(`${dataPath}/instances/${instance.slug}/${operation.payload.storyId}`)
              /**
               * Save as JSON
               */
              // .then(() => archiveStory(operation.payload.instanceUrl, operation.payload.storyId, 'json'))
              .then(() => {
                return new Promise((res, rej) => {

                  archiveStory(operation.payload.instanceUrl, operation.payload.storyId, 'json')
                    .then(storyHSON => res(storyHSON))
                    .catch(e => {
                      console.log('catched archive error');
                      rej(e);
                    })
                })
              })
              .then(storyJSON => {
                story = storyJSON
                return writeFile(`${dataPath}/instances/${instance.slug}/${operation.payload.storyId}/${operation.payload.storyId}.json`, JSON.stringify(story), 'utf8')
              })
              /**
               * Save as HTML
               */
              .then(() => {
                return new Promise((res, rej) => {

                  archiveStory(operation.payload.instanceUrl, operation.payload.storyId, 'html')
                    .then(storyHTML => res(storyHTML))
                    .catch(e => {
                      console.log('catched archive error');
                      rej(e);
                    })
                })
              })
              .then(storyHTML => {
                return writeFile(`${dataPath}/instances/${instance.slug}/${operation.payload.storyId}/${operation.payload.storyId}.html`, storyHTML, 'utf8')
              })
              /**
               * Auto-tag with instance metadata (to allow for more fine-grained metadata)
               */
              .then(() => {
                const instanceMetaFields = ['teacher', 'courseName', 'campus', 'year', 'semester'].reduce((res, key) => {
                  return [
                    ...res,
                    `metadata:${key}:${instance[key]}`
                  ]
                }, [])

                return updateStoryTags({
                  storyId: operation.payload.storyId,
                  storyTags: instanceMetaFields,
                  overrideExistingTags: false
                })
              })
              /**
               * Return JSON
               */
              .then((tags) => {
                console.log('done');
                res.json({ instances, story, tags });
              })
              .catch(e => {
                console.error('an error occured', e)
                res.status(500).send('error')
              })
            break
          default:
            console.log('unhandled operation:', operation)
            res.status(401).send('unhandled operation')
            // res.json({instances});
            break
        }
      })
      .catch(e => {
        console.error('an error occured', e)
        res.status(500).send('error')
      })
  } else {
    res.status(400).send('no operation provided')
  }
}
/**
 * =========================
 * EXPRESS SERVER CONFIG
 * =========================
 */
const app = express()
const server = require('http').createServer(app)
server.listen(PORT, () => console.log(`Listening on ${PORT}`))
app.use(cors())
app.use('/api/static', express.static(`${dataPath}/instances`))
app.use(bodyParser.json())
const apiRoutes = express.Router()
/**
 * Password middleware for all following protected routes
 */
app.use(passwordMiddleware)
app.use('/api', apiRoutes)
/**
 * Get list of instances
 */
apiRoutes.get('', getInstancesListHandler)
/**
 * Update instances list data (without related stories)
 */
apiRoutes.put('', updateInstancesListHandler)
/**
 * Get a story JSON
 */
apiRoutes.use('/instance/:instanceId/story/:storyId', getStoryHandler)
/**
 * Get map of tags (keys = story id, values = array of strings)
 */
apiRoutes.get('/tags/', getTagsHandler)
/**
 * Update tags list for a specific story
 */
apiRoutes.put('/tags/:storyId', updateStoryTagsHandler)
/**
 * Download a complex archive
 */
apiRoutes.post('/archive', archiveHandler)
/**
 * Perform an archiving operation
 */
apiRoutes.post('/operation', operationHandler)
