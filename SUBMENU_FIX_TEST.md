# 🔧 SUBMENIU PATAISYMŲ TESTAVIMO SCENARIJUS

## 📋 Problema
Kai pasirenkate submeniu punktą, submeniu dingsta ir langas lieka tuščias.

## 🔍 Identifikuotos problemos
1. **Submeniu mygtukai neturėjo event listener'ų**
2. **Trūko DOM referencių `window.el` objekte**
3. **`renderUnreadChats` funkcija neegzistavo**

## ✅ Atlikti pataisymai

### 1. Pridėti event listener'ai submeniu mygtukams
**Failas:** `public/js/ui/events.js`
- ✅ Pridėti `showUsersListBtn` event listener
- ✅ Pridėti `showGeneralChatBtn` event listener (su general chat setup)
- ✅ Pridėti `showMyChatsBtn` event listener (su pokalbių kraunimu)
- ✅ Pridėti `showUnreadChatsBtn` event listener

### 2. Pridėti DOM referencės
**Failas:** `public/js/core/dom.js`
- ✅ `showUsersListBtn` - querySelector('[data-view="users-list-sub-view"]')
- ✅ `showGeneralChatBtn` - querySelector('[data-view="general-chat-sub-view"]')
- ✅ `showMyChatsBtn` - querySelector('[data-view="my-chats-sub-view"]')
- ✅ `showUnreadChatsBtn` - querySelector('[data-view="unread-chats-sub-view"]')

### 3. Pridėta `renderUnreadChats` funkcija
**Failas:** `public/js/ui/views.js`
- ✅ Funkcija filtruoja pokalbius pagal `unread_count > 0`
- ✅ Rodo neperskaitytų pokalbių skaičių
- ✅ Pridėta į `window.UIModule` eksportą

## 🧪 TESTAVIMO INSTRUKCIJOS

### 1. Pradinis testavimas
1. **Atidaryti naršyklę** → `http://localhost:3000`
2. **Prisijungti** prie sistemos
3. **Patikrinti pagrindinį meniu** → "Vartotojai" (turėtų būti aktyvus)

### 2. Submeniu testavimas

#### A. Vartotojų sąrašas
1. **Paspausti** "Vartotojai" → submeniu
2. **Patikrinti:** Ar rodomas vartotojų sąrašas
3. **Rezultatas:** ✅ Turi rodyti prisijungusius vartotojus

#### B. Bendras čatas
1. **Paspausti** "Bendras čatas" → submeniu  
2. **Patikrinti:** Ar atsiranda bendro čato sritis
3. **Patikrinti:** Ar galima rašyti žinutes
4. **Rezultatas:** ✅ Turi veikti žinučių siuntimas

#### C. Mano pokalbiai
1. **Paspausti** "Mano pokalbiai" → submeniu
2. **Patikrinti:** Ar kraunami privatūs pokalbiai
3. **Rezultatas:** ✅ Turi rodyti pokalbių sąrašą arba "Nėra pokalbių"

#### D. Neperskaitytos žinutės
1. **Paspausti** "Neperskaitytos" → submeniu
2. **Patikrinti:** Ar filtruojami tik neperskaityti pokalbiai
3. **Rezultatas:** ✅ Turi rodyti tik pokalbius su neperskaitytomis žinutėmis

### 3. Integracijos testavimas

#### A. Perpjungimas tarp submeniu
1. **Paspausti** "Vartotojai"
2. **Paspausti** "Bendras čatas"
3. **Paspausti** "Mano pokalbiai"
4. **Paspausti** "Neperskaitytos"
5. **Rezultatas:** ✅ Visi submeniu turi veikti be klaidų

#### B. Grįžimas į pagrindinį meniu
1. **Paspausti** "Žemėlapis" viršutiniame meniu
2. **Grįžti** į "Vartotojai"
3. **Patikrinti:** Ar submeniu vis dar veikia
4. **Rezultatas:** ✅ Submeniu turi išlikti funkcionalus

## 🔍 DEBUG INSTRUKCIJOS

### Jei submeniu neveikia:

1. **Atidaryti Developer Tools** (F12)
2. **Eiti į Console**
3. **Patikrinti klaidas:**
   ```javascript
   // Patikrinti ar DOM elementai egzistuoja
   console.log('showUsersListBtn:', window.el.showUsersListBtn);
   console.log('showGeneralChatBtn:', window.el.showGeneralChatBtn);
   console.log('Views:', window.Views);
   console.log('Chat:', window.Chat);
   ```

4. **Patikrinti event listener'us:**
   ```javascript
   // Bandyti iškviesti funkcijas rankiniu būdu
   window.Views.switchSecondaryView('general-chat-sub-view');
   window.Views.renderMyChats();
   ```

### Galimos klaidos:
- ❌ `window.el.showUsersListBtn is null` → DOM elementas nerastas
- ❌ `Views.switchSecondaryView is not a function` → Modulis neįkeltas
- ❌ `Cannot read property 'setupGeneralChat'` → Chat modulis neįkeltas

## 📊 TIKĖTINI REZULTATAI

✅ **Sėkmės kriterijai:**
- Visi submeniu mygtukai reaguoja į paspaudimą
- Turinys keičiasi pagal pasirinktą submeniu
- Nėra JavaScript klaidų console
- Plūdrus perpjungimas tarp skirtingų peržiūrų

❌ **Klaidos, kurios turėtų būti išspręstos:**
- Submeniu dingimas
- Tuščias langas po submeniu pasirinkimo
- Event listener'ų nebuvimas
- DOM referencių trūkumas
