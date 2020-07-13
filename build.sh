#!/bin/sh
apt update
apt install -y curl
curl -sL https://deb.nodesource.com/setup_14.x | bash -
apt install -y nodejs
npm i
npm run build
