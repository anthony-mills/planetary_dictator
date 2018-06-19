# Planetary Dictator

### Description

An electron based filemanger in the style of Norton Commander or Filezilla for managing the filestore of an IPFS ( Interplanetary Filesystem ) node.

### Prebuilt Downloads

Just want to start using the application with haviing to build it yourself?
Download one of the following prebuilt application images.

**Linux**

* [.deb release](https://github.com/anthony-mills/planetary_dictator/releases/download/0.0.1/planetary-dictator_0.0.1_amd64.deb) - for 64 bit Linux systems running a Debian based distro ( Ubuntu, Linux Mint etc )
* [.AppImage release](https://github.com/anthony-mills/planetary_dictator/releases/download/0.0.1/planetary-dictator-0.0.1-x86_64.AppImage) - Generic AppImage based binary for 64 bit Linux systems.

### Getting started

* _npm install_ To get the required dependencies
* In a terminal run the _gulp_ task so any changes to the SASS stylesheet is reflected in the app.
* _npm start_ to start an instance of Planetary Dictator

### Immediate Roadmap

A lot of work is required, this software is currently sub Alpha. Some of the more immediate tasks are:

* Making the interface somewhat presentable
* Sorting out how to present objects from directories in the IPFS view

# Screenshots

![Loading screen while IPFS node is starting](/img/screenshots/loading.png?raw=true "IPFS Node Starting")

![Main interface looking at a file on the local filesystem](/img/screenshots/interface_1.png?raw=true "Main interface looking at a file on the local filesystem")

![Information about an IPFS object](/img/screenshots/interface_2.png?raw=true "Information about an IPFS object")

![Connected peers to the local IPFS node](/img/screenshots/interface_3.png?raw=true "Connected peers to the local IPFS node")

### Credits

This project is built on a lot of previous hard work by others. Lets stop and give thanks to the following projects:

* [Electron](https://electronjs.org/)
* [Interplanetary File System IPFS](https://ipfs.io/)
* [js-ipfsd-ctl](https://github.com/ipfs/js-ipfsd-ctl)
* [js-ipfs-api](https://github.com/ipfs/js-ipfs-api)

### Licence

Copyright (C) 2018 [Anthony Mills](http://www.anthony-mills.com)

This program is free software: you can redistribute it and/or modify
it under the terms of the GNU General Public License as published by
the Free Software Foundation, either version 3 of the License, or
(at your option) any later version.

This program is distributed in the hope that it will be useful,
but WITHOUT ANY WARRANTY; without even the implied warranty of
MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
GNU General Public License for more details.

You should have received a copy of the GNU General Public License
along with this program.  If not, see <http://www.gnu.org/licenses/>.


