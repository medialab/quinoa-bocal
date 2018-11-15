import React from 'react';
import Tooltip from 'react-tooltip';

import {
  ModalCard,
  Tabs,
  TabList,
  Column,
  Tab,
  TabLink,
  Button,
} from 'quinoa-design-library/components';

const OperationCard = ({operation, allowCancel=false, active, onCancel}) => {
  let asideActions = [];
  if (allowCancel) {
    asideActions = [{
      label: 'Annuler',
      id:'cancel'
    }]
  }
  let header;
  switch(operation.type) {
    case 'discover-instance':
      header = (<h3 className="title is-4">Découverte de l'instance {operation.payload.instanceUrl}</h3>);
      break;
    case 'archive-story':
      header = (<h3 className="title is-4">Archivage du récit "{operation.payload.storyTitle || 'inconnu'}"</h3>);
      break;
    default:
      header = (<h3 className="title is-4">Opération inconnue</h3>)
      break;
  }
  return (
      <div
        className={`card`}
      >
        <div style={{
          padding: '1rem',
          fontWeight: active ? 800 : 400,
          color: active ? 'darkblue': 'inherit',
          display: 'flex',
          flexFlow: 'row nowrap',
          justifyContent: 'stretch'
        }}>
          <span style={{flex: 1}}>{header}</span>
          {allowCancel &&
          <span>
            <Button onClick={onCancel}>
              Annuler
            </Button>
          </span>
          }
        </div>
      </div>
  )
}

const Table = ({
  data = [],
  columns = [],
  onChange
}) => {
  const onCellChange = ({
    key,
    value,
    datumIndex,
  }) => {
    const newData = data.map((datum, index) => {
      if (index === datumIndex) {
        return {
          ...datum,
          [key]: value
        }
      }
      return datum;
    });
    onChange(newData);
  }
  const handleAdd = () => {
    const defaultObj = columns.reduce((res, column) => ({
      ...res,
      [column.key]: ''
    }), {});
    onChange([
      ...data,
      defaultObj
    ])
  }
  return (
    <table className="table">
      <thead>
        <tr>
          {
            columns.map((column, index) => {
              return (
                <th key={index}>
                  {column.label}
                </th>
              )
            })
          }
        </tr>
      </thead>
      <tbody>
        {
          data.map((datum, datumIndex) => {
            const onDelete = () => {
              const newData = data.filter((datum, index) => {
                return index !== datumIndex;
              });
              onChange(newData);
            };
            return (
              <tr key={datumIndex}>
                {
                  columns.map((column, columnIndex) => {
                    const {key} = column;
                    const value = datum[key];
                    const handleChange = e => {
                      const newValue = e.target.value;
                      onCellChange({
                        datumIndex,
                        datum,
                        key,
                        value: newValue
                      })
                    }
                    return (
                      <td key={columnIndex}>
                        <input 
                          className="input"
                          value={value || ''} 
                          onChange={handleChange} 
                        />
                      </td>
                    )
                  })
                }
                <td>
                  <Button
                    onClick={onDelete}
                    isColor="danger"
                  >
                    <span
                      data-for="tooltip"
                      data-tip="Note: les récits archivés précédemment ne seront pas supprimés du serveur"
                    >
                      Supprimer l'instance
                    </span>
                  </Button>
                </td>
              </tr>
            )
          })
        }
        <tr>
          <td>
            <Button isColor="info" onClick={handleAdd}>
              Ajouter une instance à archiver
            </Button>
          </td>
        </tr>
      </tbody>
    </table>
  )
}

const UpdateModal = ({
  updateViewVisible,
  updateViewMode = 'instances',
  instancesColumns,
  data,
  instances,
  onSetVisible,
  onSetMode,
  onUpdateInstances,
  onUpdateInstanceListRequest,
  operations,
  addOperation,
  cancelOperation,
  operationsStatus,
}) => {
  return (
    <ModalCard
      isActive={updateViewVisible}
      onClose={() => onSetVisible(false)}
      headerContent={<span>Mise à jour</span>}
      style={{width: '90%'}}
      mainContent={
        <div>
          <Tabs>
            <TabList>
              <Tab onClick={() => onSetMode('instances')} isActive={updateViewMode === 'instances'}>
                <TabLink>
                  Liste des instances
                </TabLink>
              </Tab>
              <Tab onClick={() => onSetMode('stories')} isActive={updateViewMode === 'stories'}>
                <TabLink>
                  Récupération des travaux étudiants
                </TabLink>
              </Tab>
            </TabList>
          </Tabs>
          <div>
            {
              updateViewMode === 'instances' ?
              <div>
                <Table
                  data={data}
                  columns={instancesColumns}
                  onChange={onUpdateInstances}
                />
                <Button
                  isColor="primary"
                  onClick={onUpdateInstanceListRequest}
                >
                  Mettre à jour la liste des instances
                </Button>
              </div>
              :
              <div>
                <table className="table">
                  <thead>
                    <tr>
                      <th>
                        Instance
                      </th>
                      <th>
                        Enseignant.e
                      </th>
                      <th>
                        Période
                      </th>
                      <th>
                        Cours
                      </th>
                      <th>
                        Dernière récupération
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {
                      instances.map((instance, instanceIndex) => {
                        const handleClick = () => {
                          addOperation({
                            type: 'discover-instance',
                            payload: {
                              instanceUrl: instance.instanceUrl
                            }
                          })
                        }
                        return (
                          <tr key={instanceIndex}>
                            <td >
                              <b><a target="blank" href={instance.instanceUrl}>{instance.slug}</a></b>
                            </td>
                            <td>
                              {instance.teacher}
                            </td>
                            <td>
                              {instance.year} semestre {instance.semester}
                            </td>
                            <td>
                              {instance.courseName}
                            </td>
                            <td>
                              {instance.lastFetchAt ? new Date(instance.lastFetchAt).toLocaleString() : 'Jamais encore'}
                            </td>
                            <td>
                              <Button isColor={'info'} onClick={handleClick}>
                                Mettre à jour
                              </Button>
                            </td>
                          </tr>
                        )
                      })
                    }
                  </tbody>
                </table>
                {operationsStatus === 'processing' && operations.length &&
                  <Column>
                    <h3 className="title is-3">
                      Opération en cours
                    </h3>
                    <OperationCard
                      operation={operations[0]}
                      active={true}
                    />
                  </Column>
                }
                {operations.length > 1
                  &&
                  <Column>
                    <h3 className="title is-3">
                      Opérations à venir
                    </h3>
                    <ul>
                      {
                        operations.slice(1)
                        .map((operation, index) => {
                          const handleCancel = () => {
                            cancelOperation(index + 1);
                          }
                          return (
                            <li key={index}>
                              <OperationCard
                                operation={operation}
                                allowCancel={true}
                                onCancel={handleCancel}
                              />
                            </li>
                          )
                        })
                      }
                    </ul>
                  </Column>
                }
              </div>
            }
          </div>
          <Tooltip id="tooltip" />
        </div>
      }
    />
  )
}

export default UpdateModal;