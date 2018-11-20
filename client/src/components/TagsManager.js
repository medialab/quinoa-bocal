import React, {Component} from 'react';

import {
  Button,
  StretchedLayoutContainer,
  StretchedLayoutItem,
  Column,
  Tag,
  Level,
  Delete,
} from 'quinoa-design-library/components';

export default class TagsManager extends Component {
  constructor(props) {
    super(props);
    this.state = {
      tags: []
    };
    this.newTagInput = React.createRef();
  }

  componentDidMount = () => {
    this.updateTags(this.props);
  }

  componentWillReceiveProps = (nextProps) => {
    this.updateTags(nextProps);
  }

  updateTags = props => {
    const {tagsMap, storyId} = props;
    const tags = tagsMap[storyId] || [];
    this.setState({
      tags
    });
  }

  handleSubmit = () => {
    const {tags} = this.state;
    const finalTags = tags.filter(t => t.trim().length);
    this.props.onUpdate(finalTags);
    this.props.onClose();
  }

  render = () => {
    const {
      stories,
      storyId,
      onClose,
      tagsMap = {},
    } = this.props;
    const {
      tags = []
    } = this.state;

    const {
      handleSubmit
    } = this;

    let allTags = Object.keys(tagsMap).reduce((result, thatStoryId) => {
      const storyTags = tagsMap[thatStoryId];
      return storyTags.reduce((result2, tag) => {
        return {
          ...result2,
          [tag]: result2[tag] === undefined ? 1 : result2[tag] + 1
        }
      }, result)
    }, {});

    allTags = Object.keys(allTags).reduce((result, name) => {
      const count = allTags[name];
      return [
      ...result,
      {name, count}
      ]
    }, []);
    const otherTags = allTags.filter(tag => !tags.includes(tag.name));

    const story = stories[storyId] || {};
    const {title} = story;

    const handleNewTagSubmit = e => {
      e.preventDefault();
      const newTag = this.newTagInput.current.value;
      if (!tags.includes(newTag)) {
         this.newTagInput.current.value = '';
        this.setState({
          tags: [...tags, newTag]
        })
      }
    }

    return (
      <div>
        <p>
          Vous éditez les étiquettes pour le récit "{title || 'inconnu'}"
        </p>
        <Level/>

        <StretchedLayoutContainer isDirection="horizontal">
          <StretchedLayoutItem isFlex="1">
            <h3 className="title is-5">Étiquettes de ce récit</h3>
            <div>
              <Column>
              {
                tags.map((tag, tagIndex) => {
                  const handleDelete = () => {
                    const newtags = tags.filter((t, i) => i !== tagIndex);
                    this.setState({
                      tags: newtags
                    })
                  }
                  return (
                    <Tag isColor={tag.indexOf('metadata') === 0 ? 'success': 'black'} key={tagIndex}>
                      {tag}
                      <Delete onClick={handleDelete} />
                    </Tag>
                  )
                })
              }
              </Column>
              <Column>
              <form onSubmit={handleNewTagSubmit}>
                <input
                  type="text"
                  className="input"
                  ref={this.newTagInput}
                  placeholder="nouvelle étiquette"
                />
                <input
                  className="button"
                  type="submit"
                />
              </form>
              </Column>
            </div>
          </StretchedLayoutItem>
          <StretchedLayoutItem isFlex="1">
            <h3 className="title is-5">Autres étiquettes utilisées</h3>
            <div>
              {
                otherTags.map((otherTag, tagIndex) => {
                  const handleClick = () => {
                    const newTags = [...this.state.tags, otherTag.name];
                    this.setState({
                      tags: newTags
                    })
                  }
                  return (
                    <Tag style={{cursor: 'pointer'}} isColor={otherTag.name.indexOf('metadata') === 0 ? 'warning': 'light'} key={tagIndex} onClick={handleClick}>
                      {otherTag.name} ({otherTag.count})
                    </Tag>
                  )
                })
              }
            </div>
          </StretchedLayoutItem>
        </StretchedLayoutContainer>

        <StretchedLayoutContainer isDirection="horizontal">
          <StretchedLayoutItem isFlex={1}>
            <Button onClick={handleSubmit} isColor="info">
              Sauvegarder
            </Button>
          </StretchedLayoutItem>
          <StretchedLayoutItem>
            <Button onClick={onClose} isColor="warning">
              Annuler
            </Button>
          </StretchedLayoutItem>
        </StretchedLayoutContainer>
      </div>
    )
  }
}