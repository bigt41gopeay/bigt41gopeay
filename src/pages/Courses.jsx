import { useState, useEffect } from 'react'
import { api } from '../api'

const COURSE_CATEGORIES = [
  { id: 'all', label: 'Visi kursai', icon: '📚' },
  { id: 'emotions', label: 'Emocijos', icon: '😊' },
  { id: 'confidence', label: 'Pasitikėjimas', icon: '💪' },
  { id: 'adhd', label: 'ADHD', icon: '🧠' },
  { id: 'creativity', label: 'Kūrybiškumas', icon: '🎨' },
  { id: 'learning', label: 'Mokymasis', icon: '📖' },
  { id: 'social', label: 'Socialiniai', icon: '🤝' },
]

// Extract YouTube video ID from various URL formats
function getYouTubeId(url) {
  if (!url) return null
  const patterns = [
    /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([a-zA-Z0-9_-]{11})/,
    /youtube\.com\/shorts\/([a-zA-Z0-9_-]{11})/,
  ]
  for (const p of patterns) {
    const m = url.match(p)
    if (m) return m[1]
  }
  return null
}

// Simple markdown-to-HTML renderer (supports headings, bold, italic, lists, code)
function renderMarkdown(text) {
  if (!text) return ''
  let html = text
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    // Headings
    .replace(/^### (.+)$/gm, '<h3 style="margin: 20px 0 10px; font-size: 1.2rem;">$1</h3>')
    .replace(/^## (.+)$/gm, '<h2 style="margin: 24px 0 12px; font-size: 1.4rem;">$1</h2>')
    .replace(/^# (.+)$/gm, '<h1 style="margin: 28px 0 14px; font-size: 1.6rem;">$1</h1>')
    // Bold / italic
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.+?)\*/g, '<em>$1</em>')
    // Inline code
    .replace(/`(.+?)`/g, '<code style="padding: 2px 6px; border-radius: 4px; background: #F5F5F5; font-family: monospace;">$1</code>')
    // Lists
    .replace(/^\d+\. (.+)$/gm, '<li>$1</li>')
    .replace(/^- (.+)$/gm, '<li>$1</li>')
    // Line breaks
    .replace(/\n\n/g, '</p><p style="margin: 12px 0; line-height: 1.8; color: #636E72;">')

  // Wrap list items in <ul>
  html = html.replace(/(<li>.*?<\/li>(?:\s*<li>.*?<\/li>)*)/gs, '<ul style="padding-left: 24px; line-height: 2; color: #636E72; margin: 12px 0;">$1</ul>')

  return `<p style="margin: 12px 0; line-height: 1.8; color: #636E72;">${html}</p>`
}

export default function Courses({ user, onLogin }) {
  const [category, setCategory] = useState('all')
  const [courses, setCourses] = useState([])
  const [loading, setLoading] = useState(true)
  const [selectedCourse, setSelectedCourse] = useState(null)
  const [selectedLesson, setSelectedLesson] = useState(null)
  const [lessonLoading, setLessonLoading] = useState(false)

  useEffect(() => {
    api.getCourses()
      .then(setCourses)
      .catch(() => setCourses([]))
      .finally(() => setLoading(false))
  }, [user])

  const filtered = category === 'all'
    ? courses
    : courses.filter(c => c.category === category)

  const openCourse = async (courseId) => {
    try {
      const course = await api.getCourse(courseId)
      setSelectedCourse(course)
    } catch (err) {
      alert('Klaida: ' + err.message)
    }
  }

  const openLesson = async (lessonId, requiresAuth) => {
    if (requiresAuth && !user) {
      onLogin?.()
      return
    }
    setLessonLoading(true)
    try {
      const lesson = await api.getLesson(lessonId)
      setSelectedLesson(lesson)
    } catch (err) {
      if (err.message.includes('prisijunk')) {
        onLogin?.()
      } else if (err.message.includes('nariams') || err.message.includes('narystės')) {
        alert('Ši pamoka prieinama tik nariams. Pasirinkite narystės planą!')
      } else {
        alert('Klaida: ' + err.message)
      }
    } finally {
      setLessonLoading(false)
    }
  }

  const handleComplete = async () => {
    if (!user || !selectedLesson) return
    try {
      await api.completeLesson(selectedLesson.id)
      setSelectedLesson({ ...selectedLesson, completed: 1 })
      // Refresh course to update progress
      if (selectedCourse) {
        const updated = await api.getCourse(selectedCourse.id)
        setSelectedCourse(updated)
      }
    } catch (err) {
      alert('Klaida: ' + err.message)
    }
  }

  // ========== LESSON VIEW ==========
  if (selectedLesson) {
    const videoId = getYouTubeId(selectedLesson.video_url)
    const isCompleted = !!selectedLesson.completed

    return (
      <div className="section">
        <div className="container">
          <button onClick={() => setSelectedLesson(null)} style={styles.backBtn}>
            ← Grįžti į kursą
          </button>

          <div style={styles.lessonView}>
            <div style={styles.lessonHeader}>
              <span style={{ fontSize: '2rem' }}>{selectedCourse?.emoji || '📖'}</span>
              <div>
                <p style={{ color: '#636E72', fontSize: '0.85rem' }}>{selectedLesson.course_title}</p>
                <h2>{selectedLesson.title}</h2>
                <div style={styles.lessonMeta}>
                  <span>⏱️ {selectedLesson.duration_min} min.</span>
                  {selectedLesson.is_free ? <span>🆓 Nemokama</span> : <span>🔒 Premium</span>}
                  {isCompleted && <span style={{ color: '#06D6A0' }}>✅ Baigta</span>}
                </div>
              </div>
            </div>

            <div style={styles.lessonContent}>
              {/* Video player */}
              {videoId ? (
                <div style={styles.videoWrapper}>
                  <iframe
                    src={`https://www.youtube.com/embed/${videoId}?rel=0&modestbranding=1`}
                    title={selectedLesson.title}
                    frameBorder="0"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                    style={styles.videoIframe}
                  />
                </div>
              ) : selectedLesson.video_url ? (
                <div style={styles.videoWrapper}>
                  <video src={selectedLesson.video_url} controls style={styles.videoIframe} />
                </div>
              ) : (
                <div style={styles.videoPlaceholder}>
                  <span style={{ fontSize: '4rem' }}>📖</span>
                  <p style={{ color: '#636E72', marginTop: '12px', fontWeight: 700 }}>
                    Tekstinė pamoka
                  </p>
                </div>
              )}

              {/* Lesson content (markdown) */}
              <div
                style={styles.lessonText}
                dangerouslySetInnerHTML={{ __html: renderMarkdown(selectedLesson.content) }}
              />

              {/* Complete button */}
              {user ? (
                <button
                  onClick={handleComplete}
                  disabled={isCompleted}
                  style={{
                    ...styles.completeBtn,
                    ...(isCompleted ? styles.completedBtn : {}),
                  }}
                >
                  {isCompleted ? '✅ Pamoka baigta!' : '✓ Pažymėti kaip baigtą'}
                </button>
              ) : (
                <button onClick={onLogin} style={styles.completeBtn}>
                  🔑 Prisijunkite, kad pažymėtumėte progresą
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    )
  }

  // ========== COURSE DETAIL VIEW ==========
  if (selectedCourse) {
    const progress = selectedCourse.completed_count || 0
    const totalLessons = selectedCourse.lessons?.length || 0
    const progressPercent = totalLessons > 0 ? (progress / totalLessons) * 100 : 0

    return (
      <div className="section">
        <div className="container">
          <button onClick={() => setSelectedCourse(null)} style={styles.backBtn}>
            ← Visi kursai
          </button>

          <div style={{ ...styles.courseDetailHeader, background: selectedCourse.bg }}>
            <span style={{ fontSize: '4rem' }}>{selectedCourse.emoji}</span>
            <h1 style={{ color: 'white', marginTop: '12px' }}>{selectedCourse.title}</h1>
            <p style={{ color: 'rgba(255,255,255,0.9)', marginTop: '8px', maxWidth: '600px' }}>
              {selectedCourse.description}
            </p>
            <div style={styles.courseInfo}>
              <span>👶 {selectedCourse.age_group} m.</span>
              <span>📝 {totalLessons} pamokos</span>
              {selectedCourse.is_free ? <span>🆓 Nemokamas</span> : <span>⭐ Premium</span>}
            </div>
          </div>

          {user && progressPercent > 0 && (
            <div style={styles.progressBar}>
              <div style={styles.progressLabel}>
                <span>Jūsų progresas: {progress}/{totalLessons}</span>
                <strong>{Math.round(progressPercent)}%</strong>
              </div>
              <div style={styles.progressTrack}>
                <div style={{ ...styles.progressFill, width: `${progressPercent}%` }} />
              </div>
            </div>
          )}

          <div style={styles.lessonsList}>
            <h3 style={{ marginBottom: '16px' }}>📚 Pamokos</h3>
            {selectedCourse.lessons?.map((lesson, idx) => {
              const locked = !lesson.is_free && !selectedCourse.is_free && (!user || user.membership === 'free')
              return (
                <div key={lesson.id} style={styles.lessonItem}>
                  <span style={styles.lessonNum}>{idx + 1}</span>
                  <div style={{ flex: 1 }}>
                    <strong>{lesson.title}</strong>
                    <div style={styles.lessonItemMeta}>
                      <span>⏱️ {lesson.duration_min} min.</span>
                      {lesson.is_free && <span style={{ color: '#06D6A0' }}>🆓 Nemokama</span>}
                      {lesson.completed && <span style={{ color: '#06D6A0' }}>✅ Baigta</span>}
                    </div>
                  </div>
                  <button
                    onClick={() => openLesson(lesson.id, locked)}
                    disabled={lessonLoading}
                    style={{ ...styles.playBtn, opacity: locked ? 0.6 : 1 }}
                  >
                    {locked ? '🔒 Premium' : lesson.completed ? '🔄 Peržiūrėti' : '▶️ Žiūrėti'}
                  </button>
                </div>
              )
            })}
          </div>
        </div>
      </div>
    )
  }

  // ========== COURSES LIST ==========
  return (
    <div className="section">
      <div className="container">
        <div style={{ marginBottom: '32px' }}>
          <h1 style={{ fontSize: '2.5rem' }}>🎓 Mokymai</h1>
          <p style={{ color: '#636E72', marginTop: '8px', fontSize: '1.1rem' }}>
            Interaktyvūs kursai vaikams – pasitikėjimo ugdymas, emocijos, mokymasis ir daugiau
          </p>
        </div>

        <div style={styles.categories}>
          {COURSE_CATEGORIES.map(c => (
            <button
              key={c.id}
              onClick={() => setCategory(c.id)}
              style={{ ...styles.catBtn, ...(category === c.id ? styles.catBtnActive : {}) }}
            >
              {c.icon} {c.label}
            </button>
          ))}
        </div>

        {loading ? (
          <div style={{ textAlign: 'center', padding: '80px 0' }}>
            <span style={{ fontSize: '2rem' }}>⏳</span>
            <p style={{ color: '#636E72', marginTop: '12px' }}>Kraunami kursai...</p>
          </div>
        ) : filtered.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '60px 0' }}>
            <span style={{ fontSize: '3rem' }}>📭</span>
            <p style={{ color: '#636E72', marginTop: '12px' }}>Kursų šioje kategorijoje nėra</p>
          </div>
        ) : (
          <div className="grid-3">
            {filtered.map(course => (
              <div key={course.id} className="card" style={styles.courseCard} onClick={() => openCourse(course.id)}>
                <div style={{ ...styles.courseCover, background: course.bg }}>
                  <span style={{ fontSize: '3.5rem' }}>{course.emoji}</span>
                  {course.is_free ? (
                    <span style={styles.freeBadge}>🆓 Nemokamas</span>
                  ) : (
                    <span style={styles.premiumBadge}>⭐ Premium</span>
                  )}
                </div>
                <div style={styles.courseInfo2}>
                  <h3>{course.title}</h3>
                  <p style={styles.courseDesc}>{course.description}</p>
                  <div style={styles.courseStats}>
                    <span>📝 {course.lesson_count} pamokos</span>
                    <span>👶 {course.age_group} m.</span>
                  </div>
                  {user && course.completed_count > 0 && (
                    <div style={styles.miniProgress}>
                      <div style={{ ...styles.miniProgressFill, width: `${(course.completed_count / course.lesson_count) * 100}%` }} />
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

const styles = {
  categories: {
    display: 'flex',
    gap: '8px',
    marginBottom: '32px',
    flexWrap: 'wrap',
  },
  catBtn: {
    padding: '10px 20px',
    borderRadius: '12px',
    border: '2px solid #E8ECF1',
    background: 'white',
    fontSize: '0.9rem',
    fontWeight: 700,
    color: '#636E72',
    cursor: 'pointer',
    fontFamily: 'var(--font)',
  },
  catBtnActive: {
    background: '#6C63FF',
    color: 'white',
    borderColor: '#6C63FF',
  },
  courseCard: {
    borderRadius: '20px',
    overflow: 'hidden',
    cursor: 'pointer',
  },
  courseCover: {
    height: '180px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  freeBadge: {
    position: 'absolute',
    top: '12px',
    right: '12px',
    padding: '6px 14px',
    borderRadius: '20px',
    background: 'rgba(6, 214, 160, 0.95)',
    color: 'white',
    fontSize: '0.8rem',
    fontWeight: 800,
  },
  premiumBadge: {
    position: 'absolute',
    top: '12px',
    right: '12px',
    padding: '6px 14px',
    borderRadius: '20px',
    background: 'rgba(255, 107, 53, 0.95)',
    color: 'white',
    fontSize: '0.8rem',
    fontWeight: 800,
  },
  courseInfo2: {
    padding: '20px',
    display: 'flex',
    flexDirection: 'column',
    gap: '10px',
  },
  courseDesc: {
    color: '#636E72',
    fontSize: '0.9rem',
    lineHeight: 1.6,
  },
  courseStats: {
    display: 'flex',
    gap: '16px',
    fontSize: '0.85rem',
    color: '#636E72',
    fontWeight: 600,
  },
  miniProgress: {
    height: '6px',
    background: '#E8ECF1',
    borderRadius: '3px',
    overflow: 'hidden',
    marginTop: '8px',
  },
  miniProgressFill: {
    height: '100%',
    background: 'linear-gradient(135deg, #06D6A0, #4CC9F0)',
    transition: 'width 0.3s',
  },
  backBtn: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '8px',
    padding: '10px 20px',
    borderRadius: '12px',
    border: '2px solid #E8ECF1',
    background: 'white',
    fontSize: '0.95rem',
    fontWeight: 700,
    color: '#636E72',
    cursor: 'pointer',
    fontFamily: 'var(--font)',
    marginBottom: '24px',
  },
  courseDetailHeader: {
    padding: '48px',
    borderRadius: '24px',
    textAlign: 'center',
    marginBottom: '32px',
  },
  courseInfo: {
    display: 'flex',
    justifyContent: 'center',
    gap: '24px',
    marginTop: '20px',
    color: 'white',
    fontWeight: 700,
    fontSize: '0.9rem',
  },
  progressBar: {
    padding: '20px 24px',
    background: 'white',
    borderRadius: '16px',
    marginBottom: '32px',
    boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
  },
  progressLabel: {
    display: 'flex',
    justifyContent: 'space-between',
    marginBottom: '10px',
    fontSize: '0.9rem',
    color: '#2D3436',
    fontWeight: 700,
  },
  progressTrack: {
    height: '10px',
    background: '#E8ECF1',
    borderRadius: '5px',
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    background: 'linear-gradient(135deg, #6C63FF, #9B5DE5)',
    borderRadius: '5px',
    transition: 'width 0.3s',
  },
  lessonsList: {
    background: 'white',
    borderRadius: '20px',
    padding: '32px',
    boxShadow: '0 2px 12px rgba(0,0,0,0.04)',
  },
  lessonItem: {
    display: 'flex',
    alignItems: 'center',
    gap: '16px',
    padding: '16px',
    borderRadius: '12px',
    marginBottom: '8px',
    background: '#F9FAFB',
    border: '1px solid #E8ECF1',
  },
  lessonNum: {
    width: '36px',
    height: '36px',
    borderRadius: '50%',
    background: 'linear-gradient(135deg, #6C63FF, #9B5DE5)',
    color: 'white',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontWeight: 900,
    flexShrink: 0,
  },
  lessonItemMeta: {
    display: 'flex',
    gap: '12px',
    marginTop: '4px',
    fontSize: '0.8rem',
    color: '#636E72',
    fontWeight: 600,
  },
  playBtn: {
    padding: '10px 18px',
    borderRadius: '10px',
    background: 'linear-gradient(135deg, #6C63FF, #9B5DE5)',
    color: 'white',
    border: 'none',
    fontSize: '0.85rem',
    fontWeight: 800,
    cursor: 'pointer',
    fontFamily: 'var(--font)',
  },
  lessonView: {
    background: 'white',
    borderRadius: '20px',
    padding: '32px',
    boxShadow: '0 2px 12px rgba(0,0,0,0.04)',
  },
  lessonHeader: {
    display: 'flex',
    alignItems: 'flex-start',
    gap: '16px',
    marginBottom: '24px',
    paddingBottom: '20px',
    borderBottom: '2px solid #F5F5F5',
  },
  lessonMeta: {
    display: 'flex',
    gap: '16px',
    marginTop: '8px',
    fontSize: '0.85rem',
    color: '#636E72',
    fontWeight: 700,
  },
  lessonContent: {
    display: 'flex',
    flexDirection: 'column',
    gap: '24px',
  },
  videoWrapper: {
    position: 'relative',
    paddingBottom: '56.25%',
    height: 0,
    overflow: 'hidden',
    borderRadius: '16px',
    background: '#000',
  },
  videoIframe: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: '100%',
    height: '100%',
    border: 'none',
  },
  videoPlaceholder: {
    textAlign: 'center',
    padding: '48px',
    borderRadius: '16px',
    background: 'linear-gradient(135deg, rgba(108, 99, 255, 0.05), rgba(255, 107, 138, 0.05))',
    border: '2px dashed #E8ECF1',
  },
  lessonText: {
    padding: '8px 0',
  },
  completeBtn: {
    padding: '16px 32px',
    borderRadius: '14px',
    background: 'linear-gradient(135deg, #6C63FF, #9B5DE5)',
    color: 'white',
    border: 'none',
    fontSize: '1rem',
    fontWeight: 800,
    cursor: 'pointer',
    fontFamily: 'var(--font)',
    alignSelf: 'center',
    marginTop: '16px',
  },
  completedBtn: {
    background: 'linear-gradient(135deg, #06D6A0, #4CC9F0)',
    cursor: 'default',
  },
}
