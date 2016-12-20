FROM mhart/alpine-node:6.9.2

RUN mkdir /app
ADD . /app
WORKDIR /app

RUN npm install yarn -g
RUN yarn install --ignore-engines --pure-lockfile
