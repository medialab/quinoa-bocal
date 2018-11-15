
import React, { Component } from 'react';
import PropTypes from 'prop-types';

import Preview from 'quinoa-story-player';

import {apiUri} from '../config/default';

export default class PreviewWrapper extends Component {

  static childContextTypes = {
    getResourceDataUrl: PropTypes.func
  }

  getChildContext = () => ( {
    getResourceDataUrl: this.getResourceDataUrl
  } )

  getResourceDataUrl = ( data ) => {
    return `${apiUri}static/${this.props.story.metadata.instanceSlug}/${data.filePath}`;
  }

  render = () => {
    const { story } = this.props;
    return <Preview story={story} />
  }
}
