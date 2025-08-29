# ---- 1 Etapas: Statymas (Builder) ----
# Naudojame pilną Node.js versiją, kad įdiegtume priklausomybes
FROM node:18 AS builder

# Nustatome darbo aplanką konteinerio viduje
WORKDIR /usr/src/app

# Nukopijuojame package.json ir package-lock.json failus
COPY package*.json ./

# Įdiegiame aplikacijos priklausomybes
RUN npm install

# Nukopijuojame likusį aplikacijos kodą
COPY . .

# ---- 2 Etapas: Gamyba (Production) ----
# Naudojame lengvesnę Node.js versiją galutiniam rezultatui
FROM node:18-slim

# Nustatome darbo aplanką konteinerio viduje
WORKDIR /usr/src/app

# Nukopijuojame priklausomybes iš "builder" etapo
COPY --from=builder /usr/src/app/node_modules ./node_modules

# Nukopijuojame aplikacijos kodą iš "builder" etapo
COPY --from=builder /usr/src/app .

# Nurodome, kad konteineris veiks per 3000 portą (kaip nurodyta server.js)
EXPOSE 3000

# Komanda, kuri bus įvykdyta paleidus konteinerį
CMD [ "node", "server.js" ]