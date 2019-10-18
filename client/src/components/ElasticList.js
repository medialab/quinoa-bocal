import React from 'react';

const HEIGHT_OF_EMPTY = 5;

const ElasticList = ({
  filterValues = {},
  filterKeys = {},
  activeFilters = {},
  onToggleFilter,
}) => {
  return (
    <div
      className="elastic-list-container"
    >
      {
        Object.keys(filterValues)
        .map((filterValueKey, index) => {
          const label = filterKeys[filterValueKey];
          const data = filterValues[filterValueKey];
          const values = Object.keys(data).map(key => ({
            key,
            count: data[key].count
          }));
          const totalCount = values.reduce((sum, val) => sum + (val.count), 0);
          const numberOfEmpty = values.filter(v => !v.count).length;
          return (
            <div 
              key={index}
              className="elastic-list-column"
            >
              <div className="header">
                {label}
              </div>
              <div className="values">
                {
                  values
                  .filter((a, b) => {
                    if ('' + a.value > '' + b.value) {
                      return 1;
                    }
                    return -1;
                  })
                  .map((value, index2) => {
                    const handleClick = (e) => {
                      e.stopPropagation();
                      onToggleFilter(filterValueKey, value.key);
                    }
                    const isActive = activeFilters[filterValueKey] && activeFilters[filterValueKey].includes(value.key);
                    const height = value.count ? (value.count / totalCount) * (100 - numberOfEmpty * HEIGHT_OF_EMPTY) 
                    : HEIGHT_OF_EMPTY;
                    return (
                      <div 
                        key={index2}
                        className={`elastic-list-item ${isActive ? 'is-active': ''} ${value.count === 0 ? 'is-empty': ''}`}
                        style={{
                          height: height + '%'
                        }}
                        onClick={handleClick}
                      >
                        {value.key} ({value.count})
                      </div>
                    );
                  })
                }
              </div>
            </div>
          )
        })
      }
    </div>
  );
}

export default ElasticList;