const path = require('path');
const {dataPath} = require('config');
const Ajv = require('ajv');
const ajv = new Ajv();
const {
  readdir,
  ensureDir,
  lstatSync,
  existsSync,
  readFile,
  writeFile,
} = require('fs-extra');
const instanceIndexSchema = require('../schemas/instanceIndex');

const instancesPath = path.resolve(`${dataPath}/instances`);

const indexPath = `${dataPath}/index.json`;
const validateInstanceIndex = ajv.compile(instanceIndexSchema);

const retrieveStoriesList = dirPath =>
  new Promise((resolve, reject) => {
    readdir(dirPath)
      .then(files => {
        const dirs = files
        .filter(f => lstatSync(`${dirPath}/${f}`).isDirectory())

        const jsons = dirs.map(dirName => `${dirPath}/${dirName}/${dirName}.json`);

        return Promise.all(
          jsons.map(jsonPath => readFile(jsonPath, 'utf8'))
        )
      })
      .then(strs => {
        const stories = strs.map(str => {
          try{
            const story = JSON.parse(str);
            return {
              metadata: story.metadata,
              id: story.id
            }
          } catch(e) {
            console.error('story is badly formatted', e);
            reject(e);
          }
        });
        resolve(stories);
      })
      .catch(reject)
  })

ensureDir(instancesPath)
  .then(() => readdir(instancesPath))
  .then(files => {
    // list instances dirs
    const dirs = files
    .map(f => `${instancesPath}/${f}`)
    .filter(f => lstatSync(f).isDirectory())
    // verify that all have an index.json
    .filter(f => {
      const index  = `${f}/index.json`;
      const exists = existsSync(index);
      if (exists) {
        return true;
      } else {
        console.warn('no index.json in %s, it will not be indexed', f);
        return false
      }
    });
    return Promise.all(
      dirs.map(dir => {
        return new Promise((resolve, reject) => {
          readFile(`${dir}/index.json`, 'utf8')
          .then(str => {
            try {
              const structured = JSON.parse(str);
              const valid = validateInstanceIndex(structured);
              if (valid) {

                retrieveStoriesList(dir)
                  .then(stories => {
                    resolve(Object.assign(structured, {stories}))
                  })
                  .catch(reject); 

              } else {
                console.error('%s is badly formatted (does not comply to instance index schema)', `${dir}/index.json`);
                console.log('errors: ', validateInstanceIndex.errors);
                reject();
              }
            } catch(e) {
              console.error('%s is badly formatted (wrong json)', `${dir}/index.json`);
              reject(e);
            }
          })
          .catch(reject)
        })
        
      })
    )
  })
  .then(dirs => {
    return writeFile(indexPath, JSON.stringify(dirs), 'utf8')
  })
  .then(() => console.log('index built !'))
  .catch(console.error)