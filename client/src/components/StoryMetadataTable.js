import React from 'react';

const StoryMetadataTable = ({
  metadata={},
}) => {
  const form = {
    Titre: metadata.title,
    'Sous-titre': metadata.subtitle,
    Auteurs: (metadata.authors || []).join(', '),
    // 'Date de création': new Date(+metadata.createdAt).toLocaleString(),
    // 'Dernière modification': new Date(+metadata.lastUpdateAt).toLocaleString(),
    'Instance fonio': metadata.instanceUrl,
    Campus: metadata.campus, 
    'Cours': metadata.courseName, 
    Semestre: metadata.semester, 
    'Enseignant.e': metadata.teacher, 
    'Année scolaire': metadata.year,
  }
  return (
    <table className="table">
      <tbody>
        {
          Object.keys(form)
          .map(formKey => (
            <tr key={formKey}
            >
              <td>{formKey}</td>
              <td>
                {form[formKey]}
              </td>
            </tr>
          ))
        }
      </tbody>
    </table>
  )
}

export default StoryMetadataTable;