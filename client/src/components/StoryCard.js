import React from 'react';
import PropTypes from 'prop-types';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'


import {abbrev as abbrevString} from '../helpers/misc';


const InlineIcon = ({
  icon
}) => (
  <FontAwesomeIcon icon={icon} />
);

const StoryCard = ({
  story,
  tagsCount,
  onAction,
  isActive,
  onClick,
}) => {
  const {
    metadata: {
      publicationConsent
    }
  } = story;
  const MAX_STR_LEN = 30;
  const translate = t => t;

  const actions = [
  {
    label: <span><InlineIcon icon="pencil-alt" /> {translate('aperçu')}</span>,
    isColor: 'primary',
    id: 'preview',
  },
  {
    label: <span><InlineIcon icon="tags" />{translate('étiquettes')} ({tagsCount})</span>,
    id: 'tags',
  },
  {
    label: <span><InlineIcon icon="copy" />{translate('infos')}</span>,
    id: 'infos',
  }
  ];
  const tipContent = `
    <div>
      <h3>${story.metadata.title}</h3>
      ${story.metadata.subtitle ? 
        `<h4>${story.metadata.subtitle}</h4>`
        : ''}
      <p>
        <i>
          ${story.metadata.authors ? story.metadata.authors.join(', ') : ''}
        </i>
      </p>
      <p>
        ${story.metadata.abstract ? story.metadata.abstract : ''}
      </p>
    </div>
  `
  return (
    <div onClick={onClick} className={`story-card card ${isActive ? 'is-active': ''}`}>
      <b
        data-tip={tipContent}
        data-html={true}
        data-for="card-tooltip"
      >{abbrevString(story.metadata.title, MAX_STR_LEN)}</b>
      <span 
        data-tip={publicationConsent ? 'publication autorisée' : 'publication non autorisée'}
        data-for="card-tooltip"
        className={`tag ${publicationConsent ? 'is-primary': 'is-warning'} is-rounded`}
      >
        P
      </span>
      {
        actions.map(action => {
          const handleClick = () => {
            onAction(action.id);
          }
          return (
            <span className="button" key={action.id} onClick={handleClick}>
              {action.label}
            </span>
          )
        })
      }
    </div>
  );
};

StoryCard.propTypes = {
  story: PropTypes.object,
  onAction: PropTypes.func,
};

export default StoryCard;