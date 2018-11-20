import {
  uniq,
  partition
} from 'lodash';
import trunc from 'unicode-byte-truncate';

export const formatInstanceForCsv = i => ({
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


export const formatStoryForCsv = story => {
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


export const abbrev = (str = '', maxLength = 10) => {
  if (str.length > maxLength) {
   return trunc(str, maxLength) + '...';
  }
  return str;
};


export const resolveMetadata = ({instance, story, tags = {}}) => {
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