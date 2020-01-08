import React, {useState, useEffect} from 'react';
import Tooltip from 'react-tooltip';

import {
  ModalCard,
  Button,
  StretchedLayoutContainer,
  StretchedLayoutItem,
  Field,
  Label,
  Control,
  Level,
} from 'quinoa-design-library/components';

const buildDefaultTitle = data => {
  if (data.filter) {
    if (data.filter.type === 'tag') {
      return `Les enquêtes du tag ${data.filter.payload.tag}`
    } else if (data.filter.type === 'instance') {
      return `Les enquêtes de l'instance ${data.filter.payload.instanceSlug}`
    } 
  } else {
    return 'Une belle assiette de quinoa'
  }
  
}


const WebsiteModal = ({
  isActive,
  onClose,
  data: inputData,
  onDownload,
}) => {
  // const [data, setData] = useState(inputData)
  const [formData, setFormData] = useState({})
  const [consentedOnly, setConsentedOnly] = useState(false);

  const {
    archiveName = '',
    title = '',
    subtitle = '',
    abstract = '',
    publicationUrl = ''
  } = formData;

  const setFormField = (key, value) => {
    setFormData({
      ...formData,
      [key]: value
    })
  }
  const handleFieldChange = (e, key) => {
    setFormField(key, e.target.value)
  }
  const handleTitleChange = e => handleFieldChange(e, 'title')
  const handleSubtitleChange = e => handleFieldChange(e, 'subtitle')
  const handleArchiveNameChange = e => handleFieldChange(e, 'archiveName')
  const handleAbstractChange = e => handleFieldChange(e, 'abstract')
  const handlePublicationUrlChange = e => handleFieldChange(e, 'publicationUrl')
  useEffect(() => {
    if (inputData.fileName) {
      setFormField('archiveName', inputData.fileName)
    }
    setFormField('title', buildDefaultTitle(inputData))
  }, [inputData])
  const handleDownload = () => {
    let data = inputData;
    if (consentedOnly) {
      data = data.filter(d => d.metadata.publicationConsent)
    }
    onDownload(data, formData)
  }
  return (
    <ModalCard
      isActive={!!isActive}
      onClose={onClose}
      headerContent={<span>Fabriquer un site web</span>}
      style={{width: '90%'}}
      mainContent={
        <div>
          <div>
            <form onSubmit={e => {e.preventDefault();handleDownload()}}>
              <StretchedLayoutContainer style={{width: '100%'}}>
              
                <Field>
                  <Label>
                    Titre
                  </Label>
                  <Control>
                    <input value={title} onChange={handleTitleChange} className="input" type="text" />
                  </Control>
                </Field>
                <Field>
                  <Label>
                    Sous-titre
                  </Label>
                  <Control>
                    <input value={subtitle} onChange={handleSubtitleChange} className="input" type="text" />
                  </Control>
                </Field>
                <Field>
                  <Label>
                    Présentation
                  </Label>
                  <Control>
                    <textarea value={abstract} onChange={handleAbstractChange} className="textarea" type="text" />
                  </Control>
                </Field>
                {/* <Field>
                  <Label>
                    URL de la publication
                  </Label>
                  <Control>
                    <input value={publicationUrl} onChange={handlePublicationUrlChange} className="input" type="text" />
                  </Control>
                </Field>
                <Field>
                  <Label>
                    Nom de l'archive
                  </Label>
                  <Control>
                    <input value={archiveName} onChange={handleArchiveNameChange} className="input" type="text" />
                  </Control>
                </Field> */}
              </StretchedLayoutContainer>
            </form>
            <Field style={{display: 'flex'}}>
                  <Control>
                    <input 
                      type="radio" 
                      checked={consentedOnly}
                      onClick={() => setConsentedOnly(!consentedOnly)}  
                    />
                  </Control>
                  <Label>
                  Intégrer uniquement les récits dont la publication a été consentie
                  </Label>
                  
                </Field>
            <StretchedLayoutContainer isDirection="horizontal">
              <StretchedLayoutItem isFlex={1}>
                <Button isFullWidth onClick={() => handleDownload()} isColor="primary">
                  Fabrique donc !
                </Button>
              </StretchedLayoutItem>
              <StretchedLayoutItem isFlex={1}>
                <Button isFullWidth onClick={() => onClose()} isColor="warning">
                  Annuler
                </Button>
              </StretchedLayoutItem>
            </StretchedLayoutContainer>
          </div>
        </div>
      }
    />
  )
}

export default WebsiteModal;