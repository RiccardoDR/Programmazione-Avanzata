FROM node:18

WORKDIR /usr/app

COPY package*.json .

RUN npm install

WORKDIR /usr/app/src

COPY src/. .

CMD [ "npm", "start" ]