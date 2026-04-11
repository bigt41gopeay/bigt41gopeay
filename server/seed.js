import db from './db.js'
import bcrypt from 'bcryptjs'

console.log('Seeding database...')

// === ADMIN USER ===
const adminExists = db.prepare('SELECT id FROM users WHERE email = ?').get('admin@mazujupasaulis.lt')
if (!adminExists) {
  const hash = bcrypt.hashSync('admin123', 10)
  db.prepare('INSERT INTO users (name, email, password, role, membership) VALUES (?, ?, ?, ?, ?)').run(
    'Administratorius', 'admin@mazujupasaulis.lt', hash, 'admin', 'premium'
  )
  console.log('  Admin user created')
}

// === PRODUCTS ===
const productCount = db.prepare('SELECT COUNT(*) as c FROM products').get().c
if (productCount === 0) {
  const products = [
    // Knygos
    { title: 'Drąsusis liūtukas', description: 'Autorinis leidinys! Istorija apie mažą liūtuką, kuris mokosi būti drąsus, įveikia baimes ir atranda savo vidinę jėgą. Su interaktyviomis užduotimis kiekviename puslapyje.', price: 12.99, category: 'books', type: 'physical', emoji: '🦁', badge: 'Mūsų knyga!', bg: 'linear-gradient(135deg, #FFD166, #FF6B35)' },
    { title: 'Aš galiu viską!', description: 'Autorinis leidinys! Knyga, kuri moko vaikus, kad jie gali pasiekti bet ką – su afirmacijomis, užduotimis ir drąsinančiomis istorijomis.', price: 10.99, category: 'books', type: 'physical', emoji: '🌟', badge: 'Mūsų knyga!', bg: 'linear-gradient(135deg, #6C63FF, #9B5DE5)' },
    { title: 'Mano jausmai – mano super galia', description: 'Emocijų pažinimo knyga su spalvingomis iliustracijomis. Padeda vaikams suprasti ir įvardinti savo jausmus.', price: 11.99, category: 'books', type: 'physical', emoji: '😊', badge: 'Greitai!', bg: 'linear-gradient(135deg, #FF6B8A, #FF6B35)' },
    { title: 'Mano smegenys – superherojus!', description: 'Knyga vaikams su ADHD, kuri paaiškina, kad jų smegenys yra ypatingos. Su ramybės pratimais ir susikaupimo technikomis.', price: 13.99, category: 'books', type: 'physical', emoji: '🧠', badge: 'ADHD draugiškas', bg: 'linear-gradient(135deg, #4CC9F0, #6C63FF)' },
    { title: 'Vėžliuko ramybės paslaptis', description: 'Apie vėžliuką, kuris mokosi sustoti, kvėpuoti ir susikaupti. Paprasta technika vaikams su dėmesio sunkumais.', price: 10.99, category: 'books', type: 'physical', emoji: '🐢', badge: 'ADHD draugiškas', bg: 'linear-gradient(135deg, #06D6A0, #4CC9F0)' },
    { title: 'Augti drąsiai – praktinė knyga', description: 'Praktinė knyga su 30 užduočių, kurios padeda vaikams ugdyti pasitikėjimą savimi, drąsą ir atsparumą.', price: 12.99, category: 'books', type: 'physical', emoji: '🌱', badge: 'Su užduotimis', bg: 'linear-gradient(135deg, #06D6A0, #FFD166)' },
    { title: 'Spalvink savo jausmus', description: 'Spalvinimo ir piešimo knyga, kurioje kiekvienas puslapis susijęs su emocija. Terapinė veikla vaikams.', price: 8.99, category: 'books', type: 'physical', emoji: '🎨', badge: 'Kūrybinė', bg: 'linear-gradient(135deg, #FFD166, #FF6B8A)' },
    { title: 'Ramybės minutės', description: 'Trumpi mindfulness pratimai ir kvėpavimo technikos vaikams. Ypač naudinga ADHD ir nerimaujantiems vaikams.', price: 11.99, category: 'books', type: 'physical', emoji: '🧘', badge: 'Mindfulness', bg: 'linear-gradient(135deg, #9B5DE5, #4CC9F0)' },

    // Rinkiniai
    { title: 'Starto rinkinys "Drąsus vaikas"', description: '2 spausdintos knygos (Drąsusis liūtukas + Aš galiu viską!) + Emocijų kortelių rinkinys.', price: 29.99, original_price: 37.97, category: 'bundles', type: 'physical', emoji: '📦', badge: '-21%', bg: 'linear-gradient(135deg, #6C63FF, #9B5DE5)' },
    { title: 'ADHD draugiškas rinkinys', description: '2 knygos + ramybės kortelės + vizualus laikmatis + sensorinis fidget žaislas.', price: 34.99, original_price: 49.99, category: 'bundles', type: 'physical', emoji: '🎁', badge: 'ADHD', bg: 'linear-gradient(135deg, #4CC9F0, #06D6A0)' },
    { title: 'Viskas viename MEGA', description: '2 knygos + emocijų kortelės + spalvinimo rinkinys + dienotvarkės lenta + apdovanojimų lipdukai.', price: 44.99, original_price: 69.99, category: 'bundles', type: 'physical', emoji: '🌟', badge: '-36%', bg: 'linear-gradient(135deg, #FFD166, #FF6B35)' },

    // Fiziniai
    { title: 'Emocijų kortelių rinkinys', description: '36 spalvingos kortelės su emocijomis lietuvių kalba. Padeda vaikams atpažinti ir įvardinti jausmus.', price: 14.99, category: 'physical', type: 'physical', emoji: '😊', badge: 'Bestseleris', bg: 'linear-gradient(135deg, #FF6B8A, #FFD166)' },
    { title: 'Pasiekimų lipdukai (200 vnt.)', description: 'Motyvuojantys lipdukai: žvaigždutės, medaliai, šypsenėlės. Už gerus darbus, mokymąsi, tvarką.', price: 7.99, category: 'physical', type: 'physical', emoji: '⭐', badge: 'Pigu!', bg: 'linear-gradient(135deg, #FFD166, #FF6B35)' },
    { title: 'Sensorinis fidget žaislas', description: 'Tylus, spalvingas sensorinis žaislas, padedantis susikaupti. Idealus mokyklai ir namams.', price: 9.99, category: 'physical', type: 'physical', emoji: '🧸', badge: 'ADHD draugiškas', bg: 'linear-gradient(135deg, #06D6A0, #4CC9F0)' },
    { title: 'Vizualus laikmatis vaikams', description: 'Spalvotas smėlio tipo laikmatis (15 min.). Padeda suprasti laiko tėkmę.', price: 12.99, category: 'physical', type: 'physical', emoji: '⏱️', badge: 'ADHD būtinas', bg: 'linear-gradient(135deg, #9B5DE5, #FF6B8A)' },
    { title: 'Dienotvarkės magnetinė lenta', description: 'Magnetinė lenta su 40 magnetukų: rytas, mokykla, namų darbai, žaidimas, miegas.', price: 19.99, category: 'physical', type: 'physical', emoji: '🧲', badge: 'Naujiena', bg: 'linear-gradient(135deg, #6C63FF, #4CC9F0)' },

    // PDF
    { title: 'Darbo kortelės: raidės ir skaičiai', description: '60 spausdinamų darbo lapų: raidžių rašymas, skaičiavimas, spalvinimas.', price: 6.99, category: 'digital', type: 'digital', emoji: '📋', badge: 'PDF', bg: 'linear-gradient(135deg, #FF6B35, #FFD166)' },
    { title: 'Spalvinimo puslapiai: emocijos', description: '30 unikalių spalvinimo puslapių, kiekvienas susietas su emocija.', price: 4.99, category: 'digital', type: 'digital', emoji: '🎨', badge: 'PDF', bg: 'linear-gradient(135deg, #FF6B8A, #9B5DE5)' },
    { title: 'Vaiko dienotvarkė / rutinos planas', description: 'Spausdinama vizuali dienotvarkė su paveikslėliais. Ypač naudinga ADHD vaikams.', price: 3.99, category: 'digital', type: 'digital', emoji: '📅', badge: 'ADHD', bg: 'linear-gradient(135deg, #06D6A0, #FFD166)' },
    { title: 'Elgesio žvaigždučių lentelė', description: 'Spausdinama motyvacijos lentelė. Teigiamo elgesio skatinimas per žvaigždučių rinkimą.', price: 3.99, category: 'digital', type: 'digital', emoji: '🏆', badge: 'PDF', bg: 'linear-gradient(135deg, #FFD166, #FF6B35)' },
    { title: 'Ramybės pratimai vaikams', description: '20 iliustruotų ramybės ir kvėpavimo pratimų kortelių. Spausdink ir naudok.', price: 5.99, category: 'digital', type: 'digital', emoji: '🧘', badge: 'Mindfulness', bg: 'linear-gradient(135deg, #9B5DE5, #4CC9F0)' },
  ]

  const stmt = db.prepare(`INSERT INTO products (title, description, price, original_price, category, type, emoji, badge, bg) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`)
  for (const p of products) {
    stmt.run(p.title, p.description, p.price, p.original_price || null, p.category, p.type, p.emoji, p.badge, p.bg)
  }
  console.log(`  ${products.length} products seeded`)
}

// === COURSES ===
const courseCount = db.prepare('SELECT COUNT(*) as c FROM courses').get().c
if (courseCount === 0) {
  const courses = [
    { title: 'Emocijų ABC', description: 'Išmok atpažinti ir valdyti savo jausmus! 10 pamokų su iliustracijomis, pratimais ir žaidimais. Tinka 3-7 metų vaikams.', emoji: '😊', category: 'emotions', age_group: '3-7', difficulty: 'beginner', is_free: 1, bg: 'linear-gradient(135deg, #FF6B8A, #FFD166)' },
    { title: 'Pasitikėjimo mokykla', description: 'Kursas, padedantis vaikams tapti drąsesniems. Afirmacijos, pratybos ir istorijos apie drąsą.', emoji: '💪', category: 'confidence', age_group: '5-10', difficulty: 'beginner', is_free: 0, bg: 'linear-gradient(135deg, #6C63FF, #9B5DE5)' },
    { title: 'ADHD superherojus', description: 'Specialus kursas vaikams su ADHD. Mokymasis susikaupti, planuoti laiką ir naudoti savo energiją teisingai.', emoji: '🧠', category: 'adhd', age_group: '6-12', difficulty: 'intermediate', is_free: 0, bg: 'linear-gradient(135deg, #4CC9F0, #06D6A0)' },
    { title: 'Kūrybiškas piešimas', description: 'Piešimo pamokos vaikams! Nuo paprastų formų iki nuostabių paveikslų. Kiekviena pamoka – naujas projektas.', emoji: '🎨', category: 'creativity', age_group: '4-10', difficulty: 'beginner', is_free: 1, bg: 'linear-gradient(135deg, #FF6B35, #FFD166)' },
    { title: 'Matematika per žaidimą', description: 'Skaičiavimas, formos, logika – viskas per linksmus žaidimus ir iššūkius!', emoji: '🔢', category: 'learning', age_group: '5-8', difficulty: 'beginner', is_free: 1, bg: 'linear-gradient(135deg, #FFD166, #FF6B35)' },
    { title: 'Draugystės pamokos', description: 'Socialiniai įgūdžiai: kaip susirasti draugų, spręsti konfliktus ir būti geru draugu.', emoji: '🤝', category: 'social', age_group: '5-10', difficulty: 'beginner', is_free: 0, bg: 'linear-gradient(135deg, #9B5DE5, #FF6B8A)' },
    { title: 'Ramybės ir kvėpavimo pratimai', description: 'Mindfulness vaikams: kaip nurimti, kvėpuoti ir susikaupti. 15 trumpų pamokų.', emoji: '🧘', category: 'adhd', age_group: '4-12', difficulty: 'beginner', is_free: 0, bg: 'linear-gradient(135deg, #06D6A0, #4CC9F0)' },
    { title: 'Lietuvių kalbos nuotykiai', description: 'Raidės, žodžiai ir sakiniai per žaidimus! Tinka priešmokyklinukams ir pirmos klasės mokiniams.', emoji: '📝', category: 'learning', age_group: '5-7', difficulty: 'beginner', is_free: 1, bg: 'linear-gradient(135deg, #FF6B8A, #9B5DE5)' },
  ]

  const courseStmt = db.prepare('INSERT INTO courses (title, description, emoji, category, age_group, difficulty, is_free, bg) VALUES (?, ?, ?, ?, ?, ?, ?, ?)')
  const lessonStmt = db.prepare('INSERT INTO lessons (course_id, title, content, sort_order, is_free, duration_min) VALUES (?, ?, ?, ?, ?, ?)')

  for (const c of courses) {
    const result = courseStmt.run(c.title, c.description, c.emoji, c.category, c.age_group, c.difficulty, c.is_free, c.bg)
    const courseId = result.lastInsertRowid

    // Generate sample lessons for each course
    const lessonCount = 5 + Math.floor(Math.random() * 6) // 5-10 lessons
    for (let i = 1; i <= lessonCount; i++) {
      const isLessonFree = c.is_free || i <= 2 // first 2 lessons always free
      lessonStmt.run(
        courseId,
        `${i} pamoka: ${getLessonTitle(c.category, i)}`,
        getLessonContent(c.category, i),
        i,
        isLessonFree ? 1 : 0,
        3 + Math.floor(Math.random() * 8) // 3-10 min
      )
    }
    console.log(`  Course "${c.title}" with ${lessonCount} lessons`)
  }
}

function getLessonTitle(category, num) {
  const titles = {
    emotions: ['Kas yra jausmai?', 'Džiaugsmas ir liūdesys', 'Pyktis – ne priešas', 'Baimė ir drąsa', 'Pavydas ir dėkingumas', 'Nuostaba ir susidomėjimas', 'Gėda ir pasididžiavimas', 'Meilė ir rūpestis', 'Nusivylimas ir viltis', 'Emocijų žurnalas'],
    confidence: ['Kas aš esu?', 'Mano stiprybės', 'Klaidos – tai gerai!', 'Aš drąsus!', 'Afirmacijų galia', 'Mano svajonės', 'Tikėjimas savimi', 'Iššūkiai stiprina', 'Aš ypatingas', 'Mano planas'],
    adhd: ['Mano ypatingos smegenys', 'Energijos valdymas', 'Susikaupimo triukai', 'Laiko planavimas', 'Organizuojuosi!', 'Ramybės technikos', 'Mokymosi strategijos', 'Emocijų valdymas', 'Draugystė su ADHD', 'Mano supergalios'],
    creativity: ['Linijos ir formos', 'Spalvų pasaulis', 'Piešiame gyvūnus', 'Gamtos stebuklai', 'Portretas', 'Fantazijos pasaulis', 'Koliažas', 'Piešimas muzikai', 'Mano šedevras', 'Paroda!'],
    learning: ['Skaičiai aplink mus', 'Sudėtis ir atimtis', 'Formos ir dydžiai', 'Loginės sekos', 'Galvosūkiai', 'Skaičiavimo triukai', 'Matavimas', 'Laiko sąvoka', 'Pinigų pamokos', 'Matematikos žaidimai'],
    social: ['Pasisveikinimas', 'Klausymasis', 'Dalijimasis', 'Komandinis darbas', 'Konfliktų sprendimas', 'Empatija', 'Pagalba kitiems', 'Mandagumas', 'Draugystės taisyklės', 'Geras draugas'],
  }
  return (titles[category] || titles.emotions)[num - 1] || `${num}-oji pamoka`
}

function getLessonContent(category, num) {
  return `
## Pamokos turinys

Sveiki atvykę į ${num}-ąją pamoką! 🌟

### Ko išmoksime?
Šioje pamokoje aptarsime svarbias temas ir atliksime linksmas užduotis.

### Užduotis
1. Perskaityk tekstą ir pagalvok apie klausimus
2. Atlik praktinę užduotį
3. Pasidalink su tėvais, ką išmokai

### Refleksija
- Kas tau labiausiai patiko?
- Ką naujo sužinojai?
- Kaip tai panaudosi kasdienybėje?

---
*Šaunu, kad mokytis! Iki kitos pamokos!* ⭐
  `.trim()
}

// === COUPONS ===
const couponCount = db.prepare('SELECT COUNT(*) as c FROM coupons').get().c
if (couponCount === 0) {
  const coupons = [
    { code: 'STARTAS2026', description: 'Atidarymo akcija – 20% nuolaida', discount_type: 'percent', discount_value: 20, min_order: 20, max_uses: 100 },
    { code: 'WELCOME10', description: 'Sveikinimas – 10% naujiems klientams', discount_type: 'percent', discount_value: 10, min_order: 15, max_uses: 0 },
    { code: 'ADHD5', description: 'ADHD rinkiniams – €5 nuolaida', discount_type: 'fixed', discount_value: 5, min_order: 25, max_uses: 50 },
    { code: 'SUPER30', description: 'Super pasiūlymas – 30% visam rinkiniui', discount_type: 'percent', discount_value: 30, min_order: 40, max_uses: 20 },
  ]
  const stmt = db.prepare('INSERT INTO coupons (code, description, discount_type, discount_value, min_order, max_uses) VALUES (?, ?, ?, ?, ?, ?)')
  for (const c of coupons) {
    stmt.run(c.code, c.description, c.discount_type, c.discount_value, c.min_order, c.max_uses)
  }
  console.log(`  ${coupons.length} coupons seeded`)
}

console.log('Database seeded successfully!')
