Bocal
===

Bocal is a secure flat-file archive management system working along with [fonio](https://github.com/medialab/fonio), a decentralized collaborative scholarly editor allowing students and researchers to build rich website. 

It allows to :

* register existing fonio instances and enrich them with metadata
* fetch stories from these instances and download their contents
* tag stories with custom categories
* publish static websites combining collections of websites

# Installation prerequisites

* install [git software](https://git-scm.com/) to be able to download this source code
* install node.js engine : it is recommanded to use [node version manager](https://github.com/nvm-sh/nvm) to install node.js, in order to be able to switch between versions (see tutorial on the project's page). Bocal project has been tested successfully with node v9.

# Install

Open a terminal/bash window in the folder in which you wish to install the software, then paste the following instructions :

```
git clone https://github.com/medialab/quinoa-bocal
cd quinoa-bocal
npm run data:bootstrap
```

# Development

In a terminal/bash window located in the `quinoa-bocal` folder, paste the following instruction :

```
npm run dev
```

In development, the default password for accessing the interface is `admin`.

# Deployment

Quinoa project is currently not set for deployment on a server. TODO ...


