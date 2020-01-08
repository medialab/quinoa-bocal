import React, {useState} from 'react';
import Tooltip from 'react-tooltip';

import {
  ModalCard,
  Button,
  StretchedLayoutContainer,
  StretchedLayoutItem,
  Level,
} from 'quinoa-design-library/components';


const DownloadModal = ({
  isActive,
  onClose,
  instances = [],
  tags = [],
  onDownload,
}) => {
  const [consentedOnly, setConsentedOnly] = useState(false);
  return (
    <ModalCard
      isActive={isActive}
      onClose={onClose}
      headerContent={<span>Téléchargements</span>}
      style={{width: '90%'}}
      mainContent={
        <div>
          
          <div>
            <h3 className="title is-5">
              Télécharger toutes les instances
            </h3>
            <StretchedLayoutContainer>
              <StretchedLayoutItem>
                <Button onClick={() => onDownload({items: 'instances', format: 'table'})} isColor="primary">
                  Télécharger le tableau des instances
                </Button>
                <Button onClick={() => onDownload({items: 'stories', format: 'table'})} isColor="info">
                  Télécharger le tableau de tous les récits
                </Button>
                <Button onClick={() => onDownload({items: 'stories', format: 'archive'})} isColor="warning">
                  Télécharger l'archive de tous les récits
                </Button>
              </StretchedLayoutItem>
            </StretchedLayoutContainer>
          </div>
          <Level/>
          <div>
            {instances.length > 0 &&
              <h3 className="title is-5">
                Télécharger les données d'une instance particulière
              </h3>
            }
            <table className="table flexed">
              <tbody>
              {
                instances.map((instance) => {
                  return (
                    <tr key={instance.slug}>
                      <td>
                        <a target="blank"
                          href={instance.instanceUrl}
                        >
                          {instance.slug}
                        </a>
                      </td>
                      <td>
                        <Button onClick={() => onDownload({items: 'stories', consentedOnly, format: 'table', filter: {type: 'instance', payload: {instanceSlug: instance.slug}}})} isColor="info">
                          Télécharger la liste des récits
                        </Button>
                      </td>
                      <td>
                        <Button onClick={() => onDownload({items: 'stories', consentedOnly, format: 'archive', filter: {type: 'instance', payload: {instanceSlug: instance.slug}}})} isColor="warning">
                          Télécharger l'archive
                        </Button>
                      </td>
                      <td>
                        <Button onClick={() => onDownload({items: 'stories', consentedOnly, format: 'website', filter: {type: 'instance', payload: {instanceSlug: instance.slug}}})} isColor="primary">
                          Fabriquer un site ...
                        </Button>
                      </td>
                    </tr>
                  )
                })
              }
              </tbody>
            </table>
          </div>
          <Level/>
          <div>
            {tags.length> 0 &&
              <h3 className="title is-5">
                Télécharger les récits attachés à une étiquette
              </h3>
            }
            <table className="table flexed">
              <tbody>
              {
                tags.map((tag) => {
                  return (
                    <tr key={tag}>
                      <td>
                          {tag}
                      </td>
                      <td>
                        <Button onClick={() => onDownload({items: 'stories', format: 'table', filter: {type: 'tag', payload: {tag}}})} isColor="info">
                          Télécharger la liste des récits
                        </Button>
                      </td>
                      <td>
                        <Button onClick={() => onDownload({items: 'stories', format: 'archive', filter: {type: 'tag', payload: {tag}}})} isColor="warning">
                          Télécharger l'archive
                        </Button>
                      </td>
                      <td>
                        <Button onClick={() => onDownload({items: 'stories', format: 'website', filter: {type: 'tag', payload: {tag}}})} isColor="primary">
                          Fabriquer un site ...
                        </Button>
                      </td>
                    </tr>
                  )
                })
              }
              </tbody>
            </table>
          </div>
          <div>
            <div className="field">
              <input 
                type="radio" 
                checked={consentedOnly}
                onClick={() => setConsentedOnly(!consentedOnly)}  
              />
              <label style={{marginLeft: '1rem'}}>
                Intégrer uniquement les récits dont la publication a été consentie
              </label>
            </div>
          </div>
          <Tooltip id="tooltip" />
        </div>
      }
    />
  )
}

export default DownloadModal;