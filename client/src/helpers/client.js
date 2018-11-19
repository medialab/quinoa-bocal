import {get, put, post} from 'axios';
import {apiUri} from '../config/default';
import download from './downloadFile';

export const getAllInstances = (pwd) =>
  get(`${apiUri}`, {headers: {authorization: pwd}})
    .then(({data}) => Promise.resolve(data))

export const getTags = (pwd) =>
  get(`${apiUri}tags`, {headers: {authorization: pwd}})
    .then(({data}) => Promise.resolve(data))

export const updateStoryTags = ({storyId, tags}, pwd) =>
  put(`${apiUri}tags/${storyId}`, {tags}, {headers: {authorization: pwd}})
    .then(({data}) => Promise.resolve(data))

export const getInstanceData = ({instanceId}, pwd) =>
  get(`${apiUri}/instance/${instanceId}`, {headers: {authorization: pwd}})
    .then(({data}) => Promise.resolve(data))

export const getStoryData = ({instanceId, storyId}, pwd) =>
  get(`${apiUri}/instance/${instanceId}/story/${storyId}`, {headers: {authorization: pwd}})
    .then(({data}) => Promise.resolve(data))


export const updateInstancesList = ({instancesList}, pwd) => 
  put(`${apiUri}`, {instancesList}, {headers: {authorization: pwd}})
    .then(({data}) => Promise.resolve(data))

export const requestOperation = ({operation}, pwd) => 
  post(`${apiUri}operation`, {operation}, {headers: {authorization: pwd}})
    .then(({data}) => Promise.resolve(data))

export const requestArchiveDownload = (data, pwd) =>
  post(`${apiUri}archive`, data, {
      headers: {authorization: pwd},
      responseType: 'blob',
    })
    .then(function(response) {
      download(response.data, 'zip', `${data.fileName}`, 'application/zip');
    });