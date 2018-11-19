import React, { Component } from 'react';
import trunc from 'unicode-byte-truncate';
import {Helmet} from "react-helmet";
import Tooltip from 'react-tooltip';
import { injectMessageManager } from 'react-message-manager';
import {csvFormat} from 'd3-dsv';
import {
  uniq,
  partition
} from 'lodash';

import {
  getAllInstances, 
  getTags,
  updateStoryTags,
  getStoryData,
  updateInstancesList,
  requestOperation,
  requestArchiveDownload,
} from './helpers/client';

import download from './helpers/downloadFile';

import PreviewWrapper from './components/PreviewWrapper';
import SearchInput from './components/SearchInput';
import StoryCard from './components/StoryCard';
import ElasticList from './components/ElasticList';
import StoryMetadataTable from './components/StoryMetadataTable';
import UpdateModal from './components/UpdateModal';
import DownloadModal from './components/DownloadModal';
import TagsManager from './components/TagsManager';

import {
  Button,
  StretchedLayoutContainer,
  StretchedLayoutItem,
  Level,
  Column,
  ModalCard,
} from 'quinoa-design-library/components';

import './App.css';
import 'quinoa-design-library/themes/millet/style.css';
// import 'font-awesome/css/font-awesome.css';
import { library } from '@fortawesome/fontawesome-svg-core'
import {
  faSearch, 
  faTags,
  faPencilAlt,
  faEye,
  faCopy
} from '@fortawesome/free-solid-svg-icons'

library.add(faSearch)
library.add(faTags)
library.add(faPencilAlt)
library.add(faEye)
library.add(faCopy)

const FILTER_KEYS = {
  'year': 'année',
  'semester' : 'semestre', 
  'campus': 'campus', 
  'courseName': 'nom du cours', 
  // 'instanceSlug' : 'nom de l\'instance', 
  'teacher' : 'enseignant', 
  'tags': 'étiquettes'
};

const INSTANCES_TABLE_COLUMNS = [
  {key: 'instanceUrl' , label: 'URL de l\'instance'},
  {key: 'year'  , label: 'Année scolaire'},
  {key: 'semester', label: 'Semestre'},
  {key: 'campus'  , label: 'campus'},
  {key: 'courseName'  , label: 'Nom du cours'},
  {key: 'teacher' , label: 'Enseignant.e'},
];

const formatInstanceForCsv = i => ({
  'campus': i.campus,
  'cours': i.courseName,
  url: i.instanceUrl,
  'semestre': i.semester,
  'enseignant.e': i.teacher,
  'année': i.year,
  'nombre de récits': i.stories.length,
  'dernière récupération': new Date(+i.lastFetchAt).toLocaleString(),
  'dernière récupération (ISO)': new Date(+i.lastFetchAt).toISOString(),
})


const formatStoryForCsv = story => {
  const {metadata} = story;
  const csvMetadata = {
    titre: metadata.title,
    'sous-titre': metadata.subtitle,
    auteurs: metadata.authors.sort().join(),
    'année': metadata.year,
    semestre: metadata.semester.join(),
    campus: metadata.campus.sort().join(),
    cours: metadata.courseName.sort().join(),
    instance: metadata.instanceSlug,
    'étiquettes': metadata.tags.sort().join(),
    'résumé': metadata.abstract,
    'dernière récupération': new Date(metadata.lastFetchAt).toLocaleString(),
    'dernière récupération (ISO)': new Date(metadata.lastFetchAt).toISOString(),
  };

  return {
    ...csvMetadata,
    'dernière modification': new Date(story.lastUpdateAt).toLocaleString(),
    'dernière modification (ISO)': new Date(story.lastUpdateAt).toISOString()
  };
}


const abbrev = (str = '', maxLength = 10) => {
  if (str.length > maxLength) {
   return trunc(str, maxLength) + '...';
  }
  return str;
};


const resolveMetadata = ({instance, story, tags = {}}) => {
  const fields = ['campus', 'courseName', 'semester', 'teacher', 'year'];

  // get metadata base based on instance-level metadata
  const instanceMetadata = fields.reduce((res, fieldKey) => {
    return {
      ...res,
      [fieldKey]: instance[fieldKey]
    }
  }, {});
  
  const initialTags = tags[story.id] || [];
  const tagsGroups = partition(initialTags, t => t.indexOf('metadata:') === 0);

  let tagsMetadata = {};
  if (tagsGroups[0].length) {
    tagsMetadata = tagsGroups[0]
    .map(t => t.split(':'))
    .filter(t => t.length === 3)
    .reduce((res, t) => {
      const key = t[1];
      const newValue = t[2];
      const oldValue = res[key] || [];
      return {
        ...res,
        [key]: uniq([...oldValue, newValue])
      }
    }, {});
  }
    

  const finalMetadata = fields.reduce((res, fieldKey) => {
    const tagsValue = tagsMetadata[fieldKey] || [];
    if (tagsValue.length) {
      return {
        ...res,
        [fieldKey]: tagsValue
      }
    } else return {
      ...res,
      [fieldKey]: [instanceMetadata[fieldKey]]
    }
  }, {})

  const storyTags = tagsGroups[1];

  const metadata = {
    ...finalMetadata,
    slug: instance.slug,
    storyTags
  };
  
  return metadata;
  // {campus, courseName, semester, slug, teacher, year, storyTags}
}


class App extends Component {

  constructor(props) {
    super(props);
    this.state = {
      authenticated: false,
      password: undefined,
      instances: [],
      storiesDict: {},
      operations: [],
      operationsStatus: 'inactive',
      moreInfoStoryId: undefined,
      tagModalStoryId: undefined,
      activeStory: undefined,
      updateViewVisible: false,
      updateViewMode: 'instances',
      activeFilters: Object.keys(FILTER_KEYS).reduce((res, key) => ({
        ...res,
        [key]: []
      }), {})
    }

    this.passwordInput = React.createRef();
  }

  hydrate = () => {
    getTags(this.state.password)
      .then(tags => {
        this.setState({
          tags
        })
      })
      .catch(() => {
        this.props.messageManager.showErrorMessage('La liste des étiquettes n\'a pas pu être chargée')
      })

    getAllInstances(this.state.password)
      .then(instances => {
        const storiesDict = instances.reduce((res, instance ) => {
          return {
            ...res,
            ...(instance.stories || []).reduce((res2, story) => {
              return {
                ...res2,
                [story.id]: {
                  ...story.metadata,
                  instanceSlug: instance.slug,
                  campus: instance.campus, 
                  courseName: instance.courseName, 
                  semester: instance.semester, 
                  teacher: instance.teacher, 
                  year: instance.year,
                  id: story.id
                }
              }
            }, {})
          }
        }, {});
        const first = storiesDict[Object.keys(storiesDict)[0]];
        this.setState({
          instances,
          editedInstances: [...instances],
          storiesDict
        });
        if (first) {
          this.setActiveStory({storyId: first.id, instanceId: first.instanceSlug});          
        }
      });
  }

  setActiveStory = ({instanceId, storyId}) => {
    getStoryData({storyId, instanceId}, this.state.password)
          .then(story => {
            this.setState({
              activeStory: {
                ...story,
                metadata: {
                  ...story.metadata,
                  instanceSlug: instanceId
                }
              }
            })
          })
  }

  handleSearchTermChange = newSearchTerm => {
    this.setState({
      searchTerm: newSearchTerm
    })
  }

  processOperation = (operation) => {
    const {type, payload} = operation;
    return new Promise((resolve, reject) => {
      switch(type) {
        case 'discover-instance':
          requestOperation({operation}, this.state.password)
            .then(({instances, stories = [], tags}) => {
              const newOperations = stories.map(story => ({
                type: 'archive-story',
                payload: {
                  instanceUrl: payload.instanceUrl,
                  storyId: story.id,
                  storyTitle: story.metadata.title,
                }
              }));
              resolve({instances, newOperations, tags})
            })
          break;
        case 'archive-story':
          requestOperation({operation}, this.state.password)
            .then(({instances, tags}) => {
              resolve({instances, newOperations: [], tags})
            })
          break;
        default:
          resolve({});
          break;
      }
    })
      
  }

  processOperationList = () => {
    const {operations = []} = this.state;
    if (operations.length) {
      this.setState({
        operationsStatus: 'processing'
      });
      const firstOperation = operations[0];
      setTimeout(() => {
        this.processOperation(firstOperation)
          .then(({instances, newOperations, tags}) => {
            if (instances) {
              this.setState({
                instances,
                editedInstances: instances
              })
            }
            if (tags) {
              this.setState({tags});
            }
            let updatedOperations = operations.slice(1);
            if (newOperations && newOperations.length) {
              updatedOperations = [...updatedOperations, ...newOperations];
            }
            if (updatedOperations.length) {
              this.setState({
                operations: updatedOperations
              });
              setTimeout(() => this.processOperationList());
            } else {
              this.setState({
                operationsStatus: 'inactive'
              });
              this.props.messageManager.showSuccessMessage('Toutes les opérations d\'archivage ont été effectuées !')
            }
          })
          .catch(error => {
            this.props.messageManager.showErrorMessage('Oh non ! il y a eu une erreur: ' + error);
          })
      })
        
    }
  }

  addOperation = operation => {
    this.setState({
      operations: [
        ...this.state.operations,
        operation
      ]
    });
    setTimeout(() => this.processOperationList());
  }

  cancelOperation = operationIndex => {
    this.setState({
      operations: this.state.operations.filter((o, i) => i !== operationIndex)
    })
  }

  render() {
    const {
      instances = [],
      tags = {},
      tagModalStoryId,
      editedInstances = [],
      authenticated,
      activeStory,
      searchTerm,
      activeFilters,
      storiesDict,
      moreInfoStoryId,
      updateViewVisible,
      updateViewMode,
      operations,
      operationsStatus,
      downloadOptionsVisible,
    } = this.state;
    const {
      messageManager,
    } = this.props;
    const {
      handleSearchTermChange,
      addOperation,
      cancelOperation,
    } = this;
    const stories = instances.reduce((res, instance) => {

      return [
          ...res,
          ...(instance.stories || []).map(story => {
            const {
              campus, courseName, semester, slug, teacher, year, storyTags
            } = resolveMetadata({instance, story, tags});
            return {
              ...story,
              metadata: {
                ...story.metadata,
                campus, 
                courseName, 
                semester, 
                instanceSlug: slug, 
                teacher, 
                year,
                tags: storyTags,
                lastFetchAt: instance.lastFetchAt
              }
            }
          })
      ]
    }, []);

    const tagsList = uniq(
      Object.keys(tags).reduce((mappe, storyId) => [
      ...mappe,
      ...tags[storyId]], [])
    )
    .filter(t => t.indexOf('metadata:') !== 0);

    const visibleStories = Object.keys(activeFilters).reduce((filteredStories, filterKey) => {
      const filterValues = activeFilters[filterKey];
      let newFilteredStories = filteredStories;
      if (filterValues.length) {
        newFilteredStories = filteredStories.filter(story => {
          const val = story.metadata[filterKey];
          // return filterValues.includes(val + '');
          return filterValues.filter(fVal => val.includes(fVal)).length;
        })
      }
      return newFilteredStories;
    } , stories)
    .filter(story => {
      if (searchTerm && searchTerm.length) {
        const meta = JSON.stringify(story.metadata).toLowerCase();
        return meta.includes(searchTerm.toLowerCase());
      }
      return true;
    })

    const filterValues = Object.keys(FILTER_KEYS).reduce((result, filterKey) => ({
      ...result,
      [filterKey]: stories.reduce((result2, story) => {
        let newCount;

        const storyValues = story.metadata[filterKey];        

        return storyValues.reduce((result3, value) => {
          
          const existingCount = result2[value] && result2[value].count;
          if (visibleStories.find(s => s.id === story.id)) {
            newCount = existingCount ? existingCount + 1 : 1;
          } else {
            newCount = existingCount || 0;
          }

          return {
            ...result3,
            [value]: {
              count: newCount
            }
          }
        }, result2)
      }, {})
    }), {});

    const handleTogglerFilter = (domain, value) => {
      const domainFilters = activeFilters[domain];
      let newDomainFilter;
      if (domainFilters.includes(value)) {
        newDomainFilter = domainFilters.filter(v => v !== value);
      } else {
        newDomainFilter = [...domainFilters, value];
      }
      this.setState({
        activeFilters: {
          ...activeFilters,
          [domain]: newDomainFilter
        }
      })
    };

    let moreInfoMetadata;
    if (moreInfoStoryId) {
      moreInfoMetadata = storiesDict[moreInfoStoryId];
    }

    const enrichInstances = instances => instances.map(instance => ({
      ...instance,
      slug: instance.instanceUrl.replace(/\/$/, '').replace(/https?:\/\//, '').replace(/\W/g, '_') // instance.instanceUrl.split('/').filter(p => p.trim().length).pop()
    }))
     

    const handleUpdateInstancesListRequest = () => {
      messageManager.showSuccessMessage('Demande de mise à jour...');
      updateInstancesList({instancesList: enrichInstances(editedInstances)}, this.state.password)
        .then((data) => {
          messageManager.showSuccessMessage('Mis à jour avec succès');
          const {data: {instancesList}} = data;
          this.setState({
            instances: instancesList,
            editedInstances: instancesList
          })
        })
        .catch(e => {
          messageManager.showErrorMessage('Oh non ... ça n\'a pas marché. Erreur: ' + e.toString())
        })
    }
    const handlePasswordSubmit = e => {
      e.preventDefault();
      const pwd = this.passwordInput.current.value;
      getAllInstances(pwd)
        .then(() => {
          this.setState({
            authenticated: true,
            password: pwd
          })
          this.hydrate();
        })
        .catch(() => {
          this.props.messageManager.showErrorMessage('Mot de passe invalide')
        })
    }

    const handleUpdateTags = (tags) => {
      updateStoryTags({storyId: tagModalStoryId, tags}, this.state.password)
      .then(tags => {
        this.setState({
          tags
        })
      })
    }

    const handleDownload = ({items, format, filter}) => {
      let data;
      let fileName;
      if (items === 'instances') {
        data = instances.map(formatInstanceForCsv);
        fileName = new Date().toISOString() + ' - toutes les instances quinoa';
      } else if (items === 'stories') {
        if (filter) {
          let filteredStories;
          let suf = '';
          if (filter.type === 'instance') {
            const instanceSlug = filter.payload.instanceSlug;
            filteredStories = stories.filter(s => s.metadata.instanceSlug === instanceSlug);
            suf = ` pour l'instance ${instanceSlug}`;
            fileName = new Date().toISOString() + ' - récits quinoa' + suf;
            data = filteredStories.map(formatStoryForCsv);
          } else if (filter.type === 'tag') {
            const tag = filter.payload.tag;
            filteredStories = stories.filter(s => s.metadata.tags.includes(tag));
            suf = ` pour le tag ${tag}`;
            fileName = new Date().toISOString() + ' - récits quinoa' + suf;
            data = filteredStories.map(formatStoryForCsv);
          }
        } else {
          data = stories.map(formatStoryForCsv);
          fileName = new Date().toISOString() + ' - tous les récits quinoa';
        }
      }
      if (format === 'table') {
        const csv = csvFormat(data);
        download(csv, 'csv', fileName);
      } else if (format === 'archive') {
        requestArchiveDownload({data, items, format, filter, fileName}, this.state.password);
      }
    }
    return !authenticated ?
      <ModalCard
        isActive={!authenticated}
        headerContent={<span>Bocal - Mot de passe requis</span>}
        mainContent={
          <div>
            <p>
              Un mot de passe est requis pour accéder à cette application.
            </p>
            <form onSubmit={handlePasswordSubmit}>
              <input placeholder="entrez le mot de passe ici" className="input" type="password"  ref={this.passwordInput} />
              <input type="submit" className="button" />
            </form>
          </div>
        }
      />
    : (
        <StretchedLayoutContainer style={{width: '100%', height: '100%', position: 'absolute', left: 0, top: 0}} isDirection="horizontal">
          <Helmet>
            <title>Bocal | administration des archives quinoa</title>
          </Helmet>
          <StretchedLayoutItem isFlex={1} style={{height: '100%'}} >
            <StretchedLayoutContainer style={{height: '100%'}}>
              <StretchedLayoutItem>
                <header className="header">
                  <h1 className="title is-1">Bocal</h1>
                  <h2 className="title is-5">Administration des archives quinoa</h2>
                </header>
              </StretchedLayoutItem>
              <StretchedLayoutItem isFlex={1}>
                <ElasticList
                  filterValues={filterValues}
                  filterKeys={FILTER_KEYS}
                  activeFilters={activeFilters}
                  onToggleFilter={handleTogglerFilter}
                />
              </StretchedLayoutItem>
              <StretchedLayoutItem className="stories-list-container" isFlex={1}>
                {
                  visibleStories.map(story => {
                    const handleAction = action => {
                      switch(action) {
                        case 'infos': 
                          this.setState({
                            moreInfoStoryId: story.id
                          })
                          break;
                        case 'tags':
                          this.setState({
                            tagModalStoryId: story.id
                          })
                          break;
                        default:
                          break;
                      }
                    }
                    const handleClick = () => {
                      this.setActiveStory({instanceId: story.metadata.instanceSlug, storyId: story.id})
                    }
                    const isActive = activeStory && story.id === activeStory.id;
                    const tagsCount = (tags[story.id] || []).filter(t => t.indexOf('metadata') !== 0).length;
                    return (
                      <Level
                        key={story.id}
                      >
                        <Column style={{paddingTop: 0, paddingBottom: 0}}>
                          <StoryCard
                            story={story}
                            tagsCount={tagsCount}
                            isActive={isActive}
                            onAction={handleAction}
                            onClick={handleClick}
                          />
                        </Column>
                      </Level>
                    )
                  })
                }
              </StretchedLayoutItem>
              <StretchedLayoutItem>
                <StretchedLayoutContainer style={{padding: '1rem'}} isDirection={'horizontal'}>
                  <StretchedLayoutItem isFlex={1}>
                    <SearchInput value={searchTerm} onUpdate={handleSearchTermChange} placeholder={'chercher un récit'} />
                  </StretchedLayoutItem>
                  <StretchedLayoutItem>
                    {visibleStories.length}/{stories.length} travaux visibles
                  </StretchedLayoutItem>
                  <StretchedLayoutItem>
                    <Button 
                      onClick={() => this.setState({updateViewVisible: true})} 
                      isColor={operationsStatus === 'inactive' ? 'primary' : 'warning'}>
                      Mettre à jour...
                    </Button>
                    <Button 
                      onClick={() => this.setState({downloadOptionsVisible: true})} 
                      isColor={'info'}>
                      Télécharger...
                    </Button>
                  </StretchedLayoutItem>
                </StretchedLayoutContainer>
              </StretchedLayoutItem>
            </StretchedLayoutContainer>
          </StretchedLayoutItem>
          <StretchedLayoutItem isFlex={1} style={{height: '100%', position: 'relative'}} >
            <StretchedLayoutContainer className="preview-container" isDirection={'vertical'}>
              <StretchedLayoutItem className="preview-header"> 
                Aperçu
              </StretchedLayoutItem>
              <StretchedLayoutItem isFlex={1}>
                {
                  activeStory &&
                  <PreviewWrapper story={activeStory} />
                }
              </StretchedLayoutItem>
            </StretchedLayoutContainer>
          </StretchedLayoutItem>
          <ModalCard
            isActive={tagModalStoryId !== undefined}
            headerContent={<span>Éditer les tags</span>}
            mainContent={
              <TagsManager
                storyId={tagModalStoryId}
                tagsMap={tags}
                stories={storiesDict}
                onUpdate={handleUpdateTags}
                onClose={() => {
                  this.setState({
                    tagModalStoryId: undefined
                  })
                }}
              />
            }
            onClose={() => {
              this.setState({
                tagModalStoryId: undefined
              })
            }}
          />
          <ModalCard
            headerContent={
              <span>
              {
                moreInfoMetadata && 
                abbrev(moreInfoMetadata.title, 50)
              }
              </span>
            }
            isActive={moreInfoStoryId !== undefined}
            mainContent={
              <div>
                {
                  moreInfoMetadata
                  && moreInfoMetadata.abstract
                  && 
                  <p>
                    {moreInfoMetadata.abstract}
                  </p>
                }
                <StoryMetadataTable
                 metadata={moreInfoMetadata}
                />
              </div>
            }
            onClose={
              () => {
                this.setState({
                  moreInfoStoryId: undefined
                })
              }
            }
          />
          <UpdateModal
            updateViewVisible={updateViewVisible}
            updateViewMode={updateViewMode}
            instancesColumns={INSTANCES_TABLE_COLUMNS}
            data={editedInstances}
            instances={instances}
            operations={operations}
            addOperation={addOperation}
            cancelOperation={cancelOperation}
            operationsStatus={operationsStatus}
            onSetVisible={visible => {
              this.setState({
                updateViewVisible: visible
              })
            }}
            onSetMode={mode => {
              this.setState({
                updateViewMode: mode
              })
            }}
            onUpdateInstances={editedInstances => {
              this.setState({
                editedInstances
              })
            }}
            onUpdateInstanceListRequest={handleUpdateInstancesListRequest}
          />
          <DownloadModal
            isActive={downloadOptionsVisible}
            instances={instances}
            tags={tagsList}
            onDownload={handleDownload}
            onClose={() => {
              this.setState({
                downloadOptionsVisible: false
              })
            }}
          />
          <Tooltip id="tooltip" />
        </StretchedLayoutContainer>
    );
  }
}
export default injectMessageManager(App);
