import { useState } from 'react'

const COURSE_CATEGORIES = [
  { id: 'all', label: 'Visi kursai', icon: '📚' },
  { id: 'emotions', label: 'Emocijos', icon: '😊' },
  { id: 'confidence', label: 'Pasitikėjimas', icon: '💪' },
  { id: 'adhd', label: 'ADHD', icon: '🧠' },
  { id: 'creativity', label: 'Kūrybiškumas', icon: '🎨' },
  { id: 'learning', label: 'Mokymasis', icon: '📖' },
  { id: 'social', label: 'Socialiniai', icon: '🤝' },
]

const COURSES = [
  { id: 1, title: 'Emocijų ABC', description: 'Išmok atpažinti ir valdyti savo jausmus! 10 pamokų su iliustracijomis, pratimais ir žaidimais.', emoji: '😊', category: 'emotions', age_group: '3-7', difficulty: 'Pradedantiems', is_free: true, bg: 'linear-gradient(135deg, #FF6B8A, #FFD166)', lesson_count: 10, free_lesson_count: 10 },
  { id: 2, title: 'Pasitikėjimo mokykla', description: 'Kursas, padedantis vaikams tapti drąsesniems. Afirmacijos, pratybos ir istorijos apie drąsą.', emoji: '💪', category: 'confidence', age_group: '5-10', difficulty: 'Pradedantiems', is_free: false, bg: 'linear-gradient(135deg, #6C63FF, #9B5DE5)', lesson_count: 8, free_lesson_count: 2 },
  { id: 3, title: 'ADHD superherojus', description: 'Specialus kursas vaikams su ADHD. Mokymasis susikaupti, planuoti laiką ir naudoti energiją teisingai.', emoji: '🧠', category: 'adhd', age_group: '6-12', difficulty: 'Vidutinis', is_free: false, bg: 'linear-gradient(135deg, #4CC9F0, #06D6A0)', lesson_count: 10, free_lesson_count: 2 },
  { id: 4, title: 'Kūrybiškas piešimas', description: 'Piešimo pamokos vaikams! Nuo paprastų formų iki nuostabių paveikslų.', emoji: '🎨', category: 'creativity', age_group: '4-10', difficulty: 'Pradedantiems', is_free: true, bg: 'linear-gradient(135deg, #FF6B35, #FFD166)', lesson_count: 8, free_lesson_count: 8 },
  { id: 5, title: 'Matematika per žaidimą', description: 'Skaičiavimas, formos, logika – viskas per linksmus žaidimus ir iššūkius!', emoji: '🔢', category: 'learning', age_group: '5-8', difficulty: 'Pradedantiems', is_free: true, bg: 'linear-gradient(135deg, #FFD166, #FF6B35)', lesson_count: 10, free_lesson_count: 10 },
  { id: 6, title: 'Draugystės pamokos', description: 'Socialiniai įgūdžiai: kaip susirasti draugų, spręsti konfliktus ir būti geru draugu.', emoji: '🤝', category: 'social', age_group: '5-10', difficulty: 'Pradedantiems', is_free: false, bg: 'linear-gradient(135deg, #9B5DE5, #FF6B8A)', lesson_count: 7, free_lesson_count: 2 },
  { id: 7, title: 'Ramybės ir kvėpavimo pratimai', description: 'Mindfulness vaikams: kaip nurimti, kvėpuoti ir susikaupti. 15 trumpų pamokų.', emoji: '🧘', category: 'adhd', age_group: '4-12', difficulty: 'Pradedantiems', is_free: false, bg: 'linear-gradient(135deg, #06D6A0, #4CC9F0)', lesson_count: 15, free_lesson_count: 2 },
  { id: 8, title: 'Lietuvių kalbos nuotykiai', description: 'Raidės, žodžiai ir sakiniai per žaidimus! Tinka priešmokyklinukams.', emoji: '📝', category: 'learning', age_group: '5-7', difficulty: 'Pradedantiems', is_free: true, bg: 'linear-gradient(135deg, #FF6B8A, #9B5DE5)', lesson_count: 10, free_lesson_count: 10 },
]

const SAMPLE_LESSONS = {
  1: [
    { id: 1, title: '1 pamoka: Kas yra jausmai?', is_free: true, duration_min: 5, completed: false },
    { id: 2, title: '2 pamoka: Džiaugsmas ir liūdesys', is_free: true, duration_min: 7, completed: false },
    { id: 3, title: '3 pamoka: Pyktis – ne priešas', is_free: true, duration_min: 6, completed: false },
    { id: 4, title: '4 pamoka: Baimė ir drąsa', is_free: true, duration_min: 8, completed: false },
    { id: 5, title: '5 pamoka: Pavydas ir dėkingumas', is_free: true, duration_min: 5, completed: false },
  ],
  2: [
    { id: 10, title: '1 pamoka: Kas aš esu?', is_free: true, duration_min: 5, completed: false },
    { id: 11, title: '2 pamoka: Mano stiprybės', is_free: true, duration_min: 7, completed: false },
    { id: 12, title: '3 pamoka: Klaidos – tai gerai!', is_free: false, duration_min: 6, completed: false },
    { id: 13, title: '4 pamoka: Aš drąsus!', is_free: false, duration_min: 8, completed: false },
  ],
  3: [
    { id: 20, title: '1 pamoka: Mano ypatingos smegenys', is_free: true, duration_min: 6, completed: false },
    { id: 21, title: '2 pamoka: Energijos valdymas', is_free: true, duration_min: 8, completed: false },
    { id: 22, title: '3 pamoka: Susikaupimo triukai', is_free: false, duration_min: 7, completed: false },
    { id: 23, title: '4 pamoka: Laiko planavimas', is_free: false, duration_min: 10, completed: false },
  ],
}

export default function Courses({ user, onLogin }) {
  const [category, setCategory] = useState('all')
  const [selectedCourse, setSelectedCourse] = useState(null)
  const [selectedLesson, setSelectedLesson] = useState(null)
  const [completedLessons, setCompletedLessons] = useState(new Set())

  const filtered = category === 'all'
    ? COURSES
    : COURSES.filter(c => c.category === category)

  const handleCompleteLesson = (lessonId) => {
    setCompletedLessons(prev => new Set([...prev, lessonId]))
  }

  // Lesson view
  if (selectedLesson) {
    const course = COURSES.find(c => c.id === selectedCourse)
    const isCompleted = completedLessons.has(selectedLesson.id)

    return (
      <div className="section">
        <div className="container">
          <button onClick={() => setSelectedLesson(null)} style={styles.backBtn}>
            ← Grįžti į kursą
          </button>
          <div style={styles.lessonView}>
            <div style={styles.lessonHeader}>
              <span style={{ fontSize: '2rem' }}>{course?.emoji}</span>
              <div>
                <p style={{ color: '#636E72', fontSize: '0.85rem' }}>{course?.title}</p>
                <h2>{selectedLesson.title}</h2>
              </div>
            </div>

            <div style={styles.lessonContent}>
              <div style={styles.lessonVideo}>
                <span style={{ fontSize: '4rem' }}>🎬</span>
                <p style={{ color: '#636E72', marginTop: '12px' }}>Video pamoka (ateityje)</p>
              </div>

              <div style={styles.lessonText}>
                <h3>Pamokos turinys</h3>
                <p style={{ color: '#636E72', lineHeight: 1.8, marginTop: '12px' }}>
                  Sveiki atvykę į pamoką! 🌟
                </p>
                <h4 style={{ marginTop: '20px' }}>Ko išmoksime?</h4>
                <p style={{ color: '#636E72', lineHeight: 1.8 }}>
                  Šioje pamokoje aptarsime svarbias temas ir atliksime linksmas užduotis.
                </p>
                <h4 style={{ marginTop: '20px' }}>Užduotis</h4>
                <ol style={{ color: '#636E72', lineHeight: 2, paddingLeft: '20px' }}>
                  <li>Perskaityk tekstą ir pagalvok apie klausimus</li>
                  <li>Atlik praktinę užduotį</li>
                  <li>Pasidalink su tėvais, ką išmokai</li>
                </ol>
                <h4 style={{ marginTop: '20px' }}>Refleksija</h4>
                <ul style={{ color: '#636E72', lineHeight: 2, paddingLeft: '20px' }}>
                  <li>Kas tau labiausiai patiko?</li>
                  <li>Ką naujo sužinojai?</li>
                  <li>Kaip tai panaudosi kasdienybėje?</li>
                </ul>
              </div>

              <button
                onClick={() => handleCompleteLesson(selectedLesson.id)}
                style={{
                  ...styles.completeBtn,
                  ...(isCompleted ? styles.completedBtn : {}),
                }}
                disabled={isCompleted}
              >
                {isCompleted ? '✅ Pamoka baigta!' : '✓ Pažymėti kaip baigtą'}
              </button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  // Course detail view
  if (selectedCourse) {
    const course = COURSES.find(c => c.id === selectedCourse)
    const lessons = SAMPLE_LESSONS[selectedCourse] || SAMPLE_LESSONS[1]
    const completedCount = lessons.filter(l => completedLessons.has(l.id)).length
    const progress = lessons.length > 0 ? Math.round((completedCount / lessons.length) * 100) : 0

    return (
      <div className="section">
        <div className="container">
          <button onClick={() => setSelectedCourse(null)} style={styles.backBtn}>
            ← Grįžti į kursus
          </button>

          <div style={{ ...styles.courseDetailHeader, background: course.bg }}>
            <span style={{ fontSize: '4rem' }}>{course.emoji}</span>
            <h1 style={{ color: 'white', fontSize: '2rem' }}>{course.title}</h1>
            <p style={{ color: 'rgba(255,255,255,0.85)', maxWidth: '600px' }}>{course.description}</p>
            <div style={styles.courseMeta2}>
              <span style={styles.metaTag}>📅 {course.age_group} metai</span>
              <span style={styles.metaTag}>📊 {course.difficulty}</span>
              <span style={styles.metaTag}>📖 {course.lesson_count} pamokos</span>
              {course.is_free && <span style={styles.metaTag}>🆓 Nemokamas</span>}
            </div>
          </div>

          {/* Progress */}
          {completedCount > 0 && (
            <div style={styles.progressSection}>
              <div style={styles.progressHeader}>
                <span>🏆 Tavo progresas:</span>
                <span style={{ fontWeight: 900, color: '#6C63FF' }}>{progress}%</span>
              </div>
              <div style={styles.progressBar}>
                <div style={{ ...styles.progressFill, width: `${progress}%` }} />
              </div>
              <p style={{ fontSize: '0.85rem', color: '#636E72' }}>{completedCount} iš {lessons.length} pamokų baigta</p>
            </div>
          )}

          {/* Lessons list */}
          <div style={styles.lessonsContainer}>
            <h3 style={{ marginBottom: '20px' }}>📖 Pamokos</h3>
            {lessons.map((lesson, i) => {
              const isLocked = !lesson.is_free && !user
              const isCompleted = completedLessons.has(lesson.id)

              return (
                <div key={lesson.id} style={{
                  ...styles.lessonCard,
                  ...(isCompleted ? styles.lessonCompleted : {}),
                  ...(isLocked ? styles.lessonLocked : {}),
                }}>
                  <div style={styles.lessonNum}>{isCompleted ? '✅' : isLocked ? '🔒' : i + 1}</div>
                  <div style={{ flex: 1 }}>
                    <h4 style={{ fontSize: '1rem' }}>{lesson.title}</h4>
                    <div style={styles.lessonMeta}>
                      <span>⏱️ {lesson.duration_min} min.</span>
                      {lesson.is_free && <span className="badge badge-free">Nemokama</span>}
                      {!lesson.is_free && <span className="badge badge-popular">Nariams</span>}
                    </div>
                  </div>
                  {isLocked ? (
                    <button onClick={onLogin} style={styles.lockBtn}>Prisijungti</button>
                  ) : (
                    <button
                      onClick={() => setSelectedLesson(lesson)}
                      style={styles.startBtn}
                    >
                      {isCompleted ? 'Peržiūrėti' : 'Pradėti →'}
                    </button>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      </div>
    )
  }

  // Course list view
  return (
    <div className="section">
      <div className="container">
        <div style={styles.header}>
          <h1 style={{ fontSize: '2.5rem' }}>🎓 Mokymai vaikams</h1>
          <p style={{ color: '#636E72', marginTop: '8px', fontSize: '1.1rem' }}>
            Interaktyvūs kursai, padedantys vaikams augti, mokytis ir tobulėti
          </p>
        </div>

        {/* Categories */}
        <div style={styles.categories}>
          {COURSE_CATEGORIES.map(c => (
            <button
              key={c.id}
              onClick={() => setCategory(c.id)}
              style={{
                ...styles.catBtn,
                ...(category === c.id ? styles.catBtnActive : {}),
              }}
            >
              {c.icon} {c.label}
            </button>
          ))}
        </div>

        {/* Courses Grid */}
        <div className="grid-2">
          {filtered.map(course => (
            <div key={course.id} className="card" style={styles.courseCard}>
              <div style={{ ...styles.courseCover, background: course.bg }}>
                <span style={{ fontSize: '3.5rem' }}>{course.emoji}</span>
                <div style={styles.courseCoverInfo}>
                  <span style={styles.courseType}>{course.difficulty}</span>
                  {course.is_free && <span style={styles.courseFree}>🆓 Nemokamas</span>}
                </div>
              </div>
              <div style={styles.courseInfo}>
                <h3>{course.title}</h3>
                <p style={styles.courseDesc}>{course.description}</p>
                <div style={styles.courseMeta}>
                  <span style={styles.courseMetaItem}>📅 {course.age_group} m.</span>
                  <span style={styles.courseMetaItem}>📖 {course.lesson_count} pamokos</span>
                  {!course.is_free && (
                    <span style={styles.courseMetaItem}>🆓 {course.free_lesson_count} nemokamos</span>
                  )}
                </div>
                <button
                  onClick={() => setSelectedCourse(course.id)}
                  style={{ ...styles.courseBtn, background: course.bg }}
                >
                  📖 Pradėti mokytis
                </button>
              </div>
            </div>
          ))}
        </div>

        {/* Info banner */}
        <div style={styles.infoBanner}>
          <div style={styles.infoBannerContent}>
            <span style={{ fontSize: '2.5rem' }}>🌟</span>
            <div>
              <h3>Kaip veikia mokymai?</h3>
              <p style={{ color: '#636E72', marginTop: '8px' }}>
                Kiekvienas kursas turi <strong>nemokamas pamokas</strong>, kad galėtumėte išbandyti.
                Norint pasiekti visas pamokas, reikia <strong>Šeimos</strong> arba <strong>Premium</strong> narystės.
                Kursai pritaikyti skirtingoms amžiaus grupėms ir interesams.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

const styles = {
  header: { marginBottom: '32px' },
  backBtn: {
    display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '10px 20px',
    borderRadius: '12px', border: '2px solid #E8ECF1', background: 'white',
    fontSize: '0.95rem', fontWeight: 700, color: '#636E72', cursor: 'pointer', fontFamily: 'var(--font)', marginBottom: '24px',
  },
  categories: { display: 'flex', gap: '8px', marginBottom: '32px', flexWrap: 'wrap' },
  catBtn: {
    padding: '10px 20px', borderRadius: '12px', border: '2px solid #E8ECF1', background: 'white',
    fontSize: '0.9rem', fontWeight: 700, color: '#636E72', cursor: 'pointer', fontFamily: 'var(--font)', transition: 'all 0.2s ease',
  },
  catBtnActive: { background: '#6C63FF', color: 'white', borderColor: '#6C63FF' },
  courseCard: { borderRadius: '20px', overflow: 'hidden', display: 'flex', flexDirection: 'column' },
  courseCover: {
    height: '180px', display: 'flex', flexDirection: 'column', alignItems: 'center',
    justifyContent: 'center', position: 'relative', gap: '12px',
  },
  courseCoverInfo: { display: 'flex', gap: '12px' },
  courseType: { color: 'white', fontWeight: 700, fontSize: '0.8rem', padding: '6px 16px', borderRadius: '20px', background: 'rgba(255,255,255,0.2)' },
  courseFree: { color: 'white', fontWeight: 700, fontSize: '0.8rem', padding: '6px 16px', borderRadius: '20px', background: 'rgba(255,255,255,0.25)' },
  courseInfo: { padding: '24px', display: 'flex', flexDirection: 'column', gap: '12px', flex: 1 },
  courseDesc: { color: '#636E72', fontSize: '0.95rem', lineHeight: 1.6 },
  courseMeta: { display: 'flex', gap: '16px', flexWrap: 'wrap' },
  courseMetaItem: { fontSize: '0.85rem', fontWeight: 700, color: '#636E72' },
  courseBtn: {
    padding: '14px 28px', borderRadius: '14px', color: 'white', border: 'none',
    fontSize: '1rem', fontWeight: 800, cursor: 'pointer', fontFamily: 'var(--font)', marginTop: '8px',
    boxShadow: '0 4px 15px rgba(0,0,0,0.15)', transition: 'all 0.3s ease',
  },
  courseDetailHeader: {
    borderRadius: '24px', padding: '48px', textAlign: 'center',
    display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px', marginBottom: '32px',
  },
  courseMeta2: { display: 'flex', gap: '12px', flexWrap: 'wrap', marginTop: '8px' },
  metaTag: { padding: '6px 16px', borderRadius: '20px', background: 'rgba(255,255,255,0.2)', color: 'white', fontWeight: 700, fontSize: '0.85rem' },
  progressSection: {
    padding: '24px', borderRadius: '16px', background: 'rgba(108, 99, 255, 0.04)',
    border: '2px solid rgba(108, 99, 255, 0.1)', marginBottom: '32px',
  },
  progressHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px', fontWeight: 700 },
  progressBar: { height: '8px', borderRadius: '4px', background: '#E8ECF1', overflow: 'hidden', marginBottom: '8px' },
  progressFill: { height: '100%', borderRadius: '4px', background: 'linear-gradient(135deg, #6C63FF, #9B5DE5)', transition: 'width 0.5s ease' },
  lessonsContainer: {
    background: 'white', borderRadius: '20px', padding: '32px',
    boxShadow: '0 2px 12px rgba(0,0,0,0.04)',
  },
  lessonCard: {
    display: 'flex', alignItems: 'center', gap: '16px', padding: '16px 20px',
    borderRadius: '14px', border: '2px solid #E8ECF1', marginBottom: '8px', transition: 'all 0.2s ease',
  },
  lessonCompleted: { borderColor: '#06D6A0', background: 'rgba(6, 214, 160, 0.03)' },
  lessonLocked: { opacity: 0.6 },
  lessonNum: {
    width: '40px', height: '40px', borderRadius: '50%', background: '#F5F5F5',
    display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 900, fontSize: '1rem', flexShrink: 0,
  },
  lessonMeta: { display: 'flex', gap: '12px', alignItems: 'center', marginTop: '4px', fontSize: '0.8rem', color: '#636E72' },
  startBtn: {
    padding: '8px 20px', borderRadius: '10px',
    background: 'linear-gradient(135deg, #6C63FF, #9B5DE5)', color: 'white', border: 'none',
    fontSize: '0.85rem', fontWeight: 700, cursor: 'pointer', fontFamily: 'var(--font)', whiteSpace: 'nowrap',
  },
  lockBtn: {
    padding: '8px 20px', borderRadius: '10px', background: '#F5F5F5', color: '#636E72',
    border: 'none', fontSize: '0.85rem', fontWeight: 700, cursor: 'pointer', fontFamily: 'var(--font)', whiteSpace: 'nowrap',
  },
  lessonView: {},
  lessonHeader: { display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '24px' },
  lessonContent: {
    background: 'white', borderRadius: '20px', padding: '32px', boxShadow: '0 2px 12px rgba(0,0,0,0.04)',
  },
  lessonVideo: {
    height: '250px', borderRadius: '16px', background: '#F9FAFB', display: 'flex',
    flexDirection: 'column', alignItems: 'center', justifyContent: 'center', marginBottom: '32px',
    border: '2px dashed #E8ECF1',
  },
  lessonText: { lineHeight: 1.8 },
  completeBtn: {
    width: '100%', padding: '16px', borderRadius: '14px',
    background: 'linear-gradient(135deg, #06D6A0, #4CC9F0)', color: 'white', border: 'none',
    fontSize: '1rem', fontWeight: 800, cursor: 'pointer', fontFamily: 'var(--font)', marginTop: '32px',
  },
  completedBtn: { background: '#E8ECF1', color: '#636E72', cursor: 'default' },
  infoBanner: {
    marginTop: '48px', padding: '32px', borderRadius: '20px',
    background: 'rgba(108, 99, 255, 0.04)', border: '2px solid rgba(108, 99, 255, 0.1)',
  },
  infoBannerContent: { display: 'flex', alignItems: 'flex-start', gap: '20px' },
}
