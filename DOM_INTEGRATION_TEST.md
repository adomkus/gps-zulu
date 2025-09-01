# 🔗 DOM INTEGRACIJOS TESTAVIMO SCENARIJUS

## 📋 Testavimo tikslas
Patikrinti, ar visi JavaScript moduliai teisingai naudoja `window.el` DOM referencių struktūrą ir ar nėra `getElementById` klaidų.

## 🧪 Testavimo etapai

### 1️⃣ DOM inicializacijos patikrinimas
```javascript
// Naršyklės konsolėje:
console.log('window.el:', window.el);
console.log('window.el.authContainer:', window.el.authContainer);
console.log('window.el.appContainer:', window.el.appContainer);
console.log('window.el.chatView:', window.el.chatView);
console.log('window.el.messagesList:', window.el.messagesList);

// Tikėtina: visi elementai rasti, ne null
```

### 2️⃣ Modulių DOM naudojimo patikrinimas
```javascript
// Patikrinti, ar moduliai naudoja window.el
// views.js
console.log('Views module DOM usage:');
console.log('switchView function:', typeof window.switchView);

// chat.js
console.log('Chat module DOM usage:');
console.log('showChat function:', typeof window.Chat.showChat);

// auth.js
console.log('Auth module DOM usage:');
console.log('login function:', typeof window.Auth.login);
```

### 3️⃣ Elementų prieinamumo testas
```javascript
// Patikrinti, ar visi reikalingi elementai egzistuoja
const requiredElements = [
    'authContainer', 'appContainer', 'loginForm', 'registerForm',
    'chatView', 'messagesList', 'messageForm', 'messageInput',
    'backToMainBtn', 'chatBackBtn', 'usersList', 'mapView',
    'settingsView', 'soundToggle', 'vibrateToggle', 'themeToggle'
];

requiredElements.forEach(id => {
    const element = window.el[id];
    console.log(`${id}:`, element ? '✅ Rastas' : '❌ Nerastas');
});
```

### 4️⃣ Event listener'ų testas
```javascript
// Patikrinti, ar event listener'ai veikia
if (window.el.loginForm) {
    console.log('Login form event listeners:', window.el.loginForm.onclick);
}

if (window.el.messageForm) {
    console.log('Message form event listeners:', window.el.messageForm.onsubmit);
}
```

## 🚨 Galimos problemos

### 1. Elementų neradimas
- **Symptomas:** `window.el.elementName` grąžina `null`
- **Priežastis:** HTML trūksta elemento arba ID nesutampa
- **Sprendimas:** Patikrinti HTML struktūrą ir DOM ID

### 2. Modulių DOM naudojimo nesutapimas
- **Symptomas:** Kai kurie moduliai vis dar naudoja `getElementById`
- **Priežastis:** Moduliai nebuvo atnaujinti
- **Sprendimas:** Atnaujinti modulius su `window.el` struktūra

### 3. Event listener'ų problemos
- **Symptomas:** UI neveikia (mygtukai, formos)
- **Priežastis:** Event listener'ai nepridėti arba elementai nerasti
- **Sprendimas:** Patikrinti event listener'ų pridėjimą

## 📊 Testavimo rezultatų matrica

| Modulis | DOM naudojimas | Event listener'ai | Statusas |
|----------|----------------|-------------------|----------|
| views.js | ⬜ | ⬜ | Pending |
| chat.js | ⬜ | ⬜ | Pending |
| auth.js | ⬜ | ⬜ | Pending |
| settings.js | ⬜ | ⬜ | Pending |
| events.js | ⬜ | ⬜ | Pending |

## 🎯 Kiti testavimo punktai

### DOM struktūros patikrinimas
- [ ] Visi reikalingi elementai egzistuoja HTML
- [ ] ID atitinka tarp HTML ir JavaScript
- [ ] Elementų hierarchija teisinga

### Modulių integracija
- [ ] Core moduliai inicializuojasi teisingai
- [ ] UI moduliai naudoja teisingą DOM struktūrą
- [ ] Event handling veikia su window.el

### Klaidų prevencija
- [ ] Nėra console.error pranešimų
- [ ] Nėra "Cannot read property of null" klaidų
- [ ] Nėra "getElementById is not a function" klaidų

## 🔧 Pataisymai (jei reikia)

### 1. Pridėti trūkstamus elementus į dom.js
```javascript
// Pridėti į window.el objektą
missingElement: document.getElementById('missing-element-id'),
```

### 2. Atnaujinti modulius su window.el
```javascript
// Vietoj:
const element = document.getElementById('element-id');

// Naudoti:
const element = window.el && window.el.elementName ? 
    window.el.elementName : document.getElementById('element-id');
```

### 3. Patikrinti HTML ID atitiktis
```html
<!-- Užtikrinti, kad ID atitinka dom.js -->
<div id="element-id">...</div>
```

## 📝 Išvados

### Sėkmės
- ✅ DOM struktūra sukurta su window.el
- ✅ Core moduliai atnaujinti
- ✅ Settings ir chat moduliai naudoja window.el

### Darbai progrese
- 🔄 Views modulio atnaujinimas
- 🔄 Auth modulio atnaujinimas
- 🔄 Kitių modulių atnaujinimas

### Ateities planai
- 🎯 Visų modulių atnaujinimas
- 🎯 Event listener'ų optimizacija
- 🎯 DOM caching strategijos

---

**Testavimą parengė:** AI Assistant  
**Data:** 2025-01-28  
**Statusas:** 🔄 PROGRESE - DOM integracija atnaujinama
