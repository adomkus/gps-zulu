# 🧪 GPS SISTEMOS END-TO-END TESTAVIMO SCENARIJUS

## 📋 Testavimo sąlygos
- Serveris veikia `localhost:3000`
- PostgreSQL duomenų bazė sujungta
- ENV kintamieji nustatyti: `SESSION_SECRET`, `DB_PASSWORD`, `ALLOWED_ORIGINS`

## 🔍 Testavimo etapai

### 1️⃣ Sistemos startas ir konfigūracija
```bash
# Patikrinti serverio startą
npm start
# Tikėtina: Serveris startuoja, Socket.IO veikia, DB prisijungia
```

### 2️⃣ Autentifikacijos srautas
```bash
# 1. Registracija
curl -X POST http://localhost:3000/register \
  -H "Content-Type: application/json" \
  -d '{"username": "testuser", "password": "testpass123"}' \
  -c cookies.txt

# 2. Prisijungimas
curl -X POST http://localhost:3000/login \
  -H "Content-Type: application/json" \
  -d '{"username": "testuser", "password": "testpass123"}' \
  -c cookies.txt

# 3. Sesijos tikrinimas
curl http://localhost:3000/session -b cookies.txt
```

### 3️⃣ Pokalbių sistema
```bash
# 1. Gauti pokalbių sąrašą
curl http://localhost:3000/my-chats -b cookies.txt

# 2. Gauti žinutes iš kambario
curl http://localhost:3000/rooms/1/messages -b cookies.txt

# 3. Siųsti žinutę (per Socket.IO)
# Testuoti per naršyklę
```

### 4️⃣ Socket.IO funkcionalumas
```bash
# Patikrinti Socket.IO prisijungimą
# Testuoti per naršyklę:
# - Prisijungimas prie socket
# - Žinučių siuntimas
# - "Mark messages read" funkcionalumas
# - Vietovės atnaujinimas
```

### 5️⃣ UI funkcionalumas
```bash
# Testuoti per naršyklę:
# - Pokalbių sąrašas
# - Žinučių rašymas
# - Nustatymų keitimas
# - Žemėlapio veikimas
# - Pranešimų sistema
```

## ✅ Tikėtini rezultatai

### Backend
- ✅ Serveris startuoja be klaidų
- ✅ DB prisijungimas sėkmingas
- ✅ Sesijos veikia su slapukais
- ✅ API endpoint'ai grąžina teisingus duomenis
- ✅ Socket.IO prisijungimas sėkmingas

### Frontend
- ✅ DOM elementai rasti (visi ID atitinka)
- ✅ API užklausos sėkmingos
- ✅ Socket.IO ryšys nustatytas
- ✅ UI perjungimai veikia
- ✅ Žinučių sistema funkcionuoja

## 🚨 Galimos problemos ir sprendimai

### 1. CORS klaidos
- Patikrinti `ALLOWED_ORIGINS` ENV
- Patikrinti `credentials: 'include'` klientui

### 2. DB prisijungimo klaidos
- Patikrinti `DB_PASSWORD` ENV
- Patikrinti PostgreSQL serviso veikimą

### 3. Socket.IO prisijungimo klaidos
- Patikrinti `SESSION_SECRET` ENV
- Patikrinti sesijos middleware

### 4. DOM elementų neradimas
- Patikrinti HTML ID atitiktis su JavaScript
- Patikrinti script'ų įkėlimo tvarką

## 📊 Testavimo rezultatų matrica

| Funkcionalumas | Backend | Frontend | Integracija | Statusas |
|----------------|---------|----------|-------------|----------|
| Autentifikacija | ⬜ | ⬜ | ⬜ | Pending |
| Pokalbiai | ⬜ | ⬜ | ⬜ | Pending |
| Socket.IO | ⬜ | ⬜ | ⬜ | Pending |
| UI/UX | ⬜ | ⬜ | ⬜ | Pending |
| Žemėlapis | ⬜ | ⬜ | ⬜ | Pending |
| Pranešimai | ⬜ | ⬜ | ⬜ | Pending |

## 🎯 Kiti testavimo punktai

### Saugumas
- [ ] Rate limiting veikia
- [ ] CORS politika teisinga
- [ ] Sesijos saugumas
- [ ] SQL injection apsauga

### Produktyvumas
- [ ] Žinučių cache'ingas
- [ ] Statinių failų optimizacija
- [ ] Socket.IO reconnection logika
- [ ] DB užklausų optimizacija

### Prieinamumas
- [ ] Mobilusis dizainas
- [ ] Pranešimų sistema
- [ ] Fono režimas
- [ ] Offline funkcionalumas
