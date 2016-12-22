FROM library/node:6.9.2

RUN apt-get update && apt-get install ocaml libelf-dev -y
RUN mkdir /app
ADD . /app
WORKDIR /app

RUN npm install yarn -g
RUN yarn install --ignore-engines --pure-lockfile
