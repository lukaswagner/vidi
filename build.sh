#!/bin/sh
curl -sL https://deb.nodesource.com/setup_14.x | bash -
apt install -y nodejs
npm i
npm build
