import React, { Component } from 'react';
import {Helmet} from "react-helmet";
import Tooltip from 'react-tooltip';
import { injectMessageManager } from 'react-message-manager';
import {csvFormat} from 'd3-dsv';
import {
  uniq,
} from 'lodash';

import {
  Button,
  StretchedLayoutContainer,
  StretchedLayoutItem,
  Level,
  Column,
  ModalCard,
} from 'quinoa-design-library/components';

import { library as fontAwesomeLibrary } from '@fortawesome/fontawesome-svg-core'
import {
  faSearch, 
  faTags,
  faPencilAlt,
  faEye,
  faCopy
} from '@fortawesome/free-solid-svg-icons'

import 'quinoa-design-library/themes/millet/style.css';
import './App.css';


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
import {
  abbrev,
  formatInstanceForCsv,
  formatStoryForCsv,
  resolveMetadata,
} from './helpers/misc';

import PreviewWrapper from './components/PreviewWrapper';
import SearchInput from './components/SearchInput';
import StoryCard from './components/StoryCard';
import ElasticList from './components/ElasticList';
import StoryMetadataTable from './components/StoryMetadataTable';
import UpdateModal from './components/UpdateModal';
import DownloadModal from './components/DownloadModal';
import WebsiteModal from './components/WebsiteModal';
import TagsManager from './components/TagsManager';

fontAwesomeLibrary.add(faSearch)
fontAwesomeLibrary.add(faTags)
fontAwesomeLibrary.add(faPencilAlt)
fontAwesomeLibrary.add(faEye)
fontAwesomeLibrary.add(faCopy)

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
      operationalErrors: [],
      updateViewVisible: false,
      websiteModalVisible: false,
      websiteModalData: {},
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
        this.props.messageManager.showErrorMessage(`La liste des étiquettes n'a pas pu être chargée`)
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

  /**
   * process an operation and behave accordingly
   */
  processOperation = (operation) => {
    const {type, payload} = operation;
    return new Promise((resolve, reject) => {
      switch(type) {
        // case : list stories for a given instance
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
            .catch(e => {
              const message = `Impossible de récupérer les récits de l'instance ${payload.instanceUrl}`;
              this.props.messageManager.showErrorMessage(message);
              this.setState({
                operationalErrors: [
                  ...this.state.operationalErrors,
                  {
                    message,
                    operation,
                  }
                ]
              });
              reject(e);
            })
          break;
        // case : ask for download of the json and html of a story
        case 'archive-story':
          requestOperation({operation}, this.state.password)
            .then(({instances, tags}) => {
              resolve({instances, newOperations: [], tags})
            })
            .catch(e => {
              const message = `Impossible de récupérer le récit de ${payload.storyTitle} (instance: ${payload.instanceUrl} - id: ${payload.storyId})`;
              this.props.messageManager.showErrorMessage(message);
              this.setState({
                operationalErrors: [
                  ...this.state.operationalErrors,
                  {
                    message,
                    operation
                  }
                ]
              });
              reject(e);
              
            })
          break;
        default:
          resolve({});
          break;
      }
    })
      
  }

  /**
   * Unstack the queue of operations to ask to the server
   */
  processOperationList = () => {
    const {operations = []} = this.state;
    // if operation queue is not empty
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
            console.error('an error occured', error);
            let updatedOperations = operations.slice(1);
            this.setState({
                operations: updatedOperations
              });
              setTimeout(() => this.processOperationList());

            this.props.messageManager.showErrorMessage('Oh non ! il y a eu une erreur: ' + error);
          })
      })
        
    }
  }

  /**
   * Add an operation to the queue of operations to ask to the server
   * and run the operations list
   */
  addOperation = (operation, refresh = true) => {
    this.setState({
      operations: [
        ...this.state.operations,
        operation
      ]
    });
    if (refresh) {
      setTimeout(() => this.processOperationList());
    }
  }
  addOperations = (operations, refresh = true) => {
    this.setState({
      operations: [
        ...this.state.operations,
        ...operations
      ]
    });
    if (refresh) {
      setTimeout(() => this.processOperationList());
    }
  }

  /**
   * Cancel an operation in the queue of operations to ask to the server
   */
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
      websiteModalVisible,
      websiteModalData = {},
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
      operationalErrors= [],
    } = this.state;
    const {
      messageManager,
    } = this.props;
    const {
      handleSearchTermChange,
      addOperation,
      addOperations,
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
      slug: instance.instanceUrl.replace(/\/$/, '').replace(/https?:\/\//, '').replace(/\W/g, '_')
    }));

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

    const handleDownloadWebsite = ({data, items, format, filter}, formData) => {
      requestArchiveDownload({data, items, format: 'archive', filter, formData}, this.state.password);
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
      } else if (format === 'website') {
        this.setState({
          websiteModalVisible: true,
          websiteModalData: {data, items, format, filter, fileName}
        })
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
              <StretchedLayoutItem style={{maxHeight: '30vh'}} isFlex={1}>
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
                <StretchedLayoutContainer style={{padding: '1rem', alignItems: 'center'}} isDirection={'horizontal'}>
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
            addOperations={addOperations}
            cancelOperation={cancelOperation}
            operationalErrors={operationalErrors}
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
          <WebsiteModal
            isActive={websiteModalVisible}
            data={websiteModalData}
            onDownload={handleDownloadWebsite}
            onClose={() => {
              this.setState({
                websiteModalVisible: false,
                websiteModalData: {}
              })
            }}
          />
          <Tooltip id="tooltip" />
        </StretchedLayoutContainer>
    );
  }
}
export default injectMessageManager(App);
