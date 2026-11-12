import { useState, useEffect, useRef, useCallback } from 'react'
import Head from 'next/head'

// ─── MUSIC SECTIONS ──────────────────────────────────────────────────────────
// Each section triggers a crossfade to its song at the calculated offset.
const MUSIC_SECTIONS = [
  { id: 'hero',               song: '/music/earned-it.mp3',        startAt: 48,  title: 'Earned It',         artist: 'The Weeknd' },
  { id: 'te-amo',             song: '/music/die-for-you.mp3',       startAt: 52,  title: 'Die For You',       artist: 'The Weeknd' },
  { id: 'tu-belleza',         song: '/music/often.mp3',             startAt: 20,  title: 'Often',             artist: 'The Weeknd' },
  { id: 'lo-que-despiertas',  song: '/music/the-hills.mp3',         startAt: 12,  title: 'The Hills',         artist: 'The Weeknd' },
  { id: 'nuestras-noches',    song: '/music/call-out-my-name.mp3',  startAt: 28,  title: 'Call Out My Name',  artist: 'The Weeknd' },
  { id: 'el-fuego',           song: '/music/blinding-lights.mp3',   startAt: 43,  title: 'Blinding Lights',   artist: 'The Weeknd' },
  { id: 'mas-que-todo',       song: '/music/save-your-tears.mp3',   startAt: 40,  title: 'Save Your Tears',   artist: 'The Weeknd' },
  { id: 'para-siempre',       song: '/music/die-for-you.mp3',       startAt: 70,  title: 'Die For You',       artist: 'The Weeknd' },
]

const SYMBOLS = ['🌹','🖤','🌸','✨','💫','🌺','🌷','💕','🖤','🌹']

export default function Home() {
  const [started, setStarted]       = useState(false)
  const [currentIdx, setCurrentIdx] = useState(0)
  const [progress, setProgress]     = useState(0)
  const [muted, setMuted]           = useState(false)

  const audiosRef      = useRef([null, null])
  const activeRef      = useRef(0)
  const lastIdxRef     = useRef(-1)
  const fadeTimerRef   = useRef(null)
  const progressTimer  = useRef(null)
  const mutedRef       = useRef(false)

  // ── Init audio pair ─────────────────────────────────────────────────────
  const initAudio = useCallback(() => {
    if (audiosRef.current[0]) return
    const a = new Audio(); a.volume = 0
    const b = new Audio(); b.volume = 0
    audiosRef.current = [a, b]
  }, [])

  // ── Crossfade to new section song ───────────────────────────────────────
  const crossfadeTo = useCallback((sec) => {
    const audios = audiosRef.current
    if (!audios[0]) return

    const idx = activeRef.current
    const current = audios[idx]
    const next    = audios[1 - idx]

    // Setup next track
    next.pause()
    next.src = sec.song
    next.currentTime = sec.startAt
    next.volume = 0
    next.onended = () => {
      next.currentTime = sec.startAt
      next.play().catch(() => {})
    }
    if (!mutedRef.current) next.play().catch(() => {})

    // Clear ongoing fade
    if (fadeTimerRef.current) clearInterval(fadeTimerRef.current)

    const TARGET  = mutedRef.current ? 0 : 0.85
    const STEPS   = 50   // 50 steps
    const STEP_MS = 60   // 60ms each = 3s total crossfade
    let step = 0

    fadeTimerRef.current = setInterval(() => {
      step++
      const t = step / STEPS
      // ease-in-out cubic
      const e = t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2

      current.volume = Math.max(0, TARGET * (1 - e))
      next.volume    = Math.min(TARGET, TARGET * e)

      if (step >= STEPS) {
        clearInterval(fadeTimerRef.current)
        current.pause()
        current.onended = null
        activeRef.current = 1 - idx
      }
    }, STEP_MS)
  }, [])

  // ── Progress bar ticker ──────────────────────────────────────────────────
  const startProgressTick = useCallback((sec) => {
    if (progressTimer.current) clearInterval(progressTimer.current)
    progressTimer.current = setInterval(() => {
      const audio = audiosRef.current[activeRef.current]
      if (!audio || !audio.duration) return
      const pct = ((audio.currentTime - sec.startAt) / (audio.duration - sec.startAt)) * 100
      setProgress(Math.min(100, Math.max(0, pct)))
    }, 500)
  }, [])

  // ── Handle section change (from IntersectionObserver) ───────────────────
  const handleSectionChange = useCallback((secIdx) => {
    if (secIdx === lastIdxRef.current) return
    lastIdxRef.current = secIdx
    setCurrentIdx(secIdx)
    const sec = MUSIC_SECTIONS[secIdx]
    crossfadeTo(sec)
    startProgressTick(sec)
  }, [crossfadeTo, startProgressTick])

  // ── IntersectionObserver: section music triggers ─────────────────────────
  useEffect(() => {
    if (!started) return
    const els = document.querySelectorAll('[data-music-section]')
    const observer = new IntersectionObserver((entries) => {
      // Find the most visible section
      let best = null, bestRatio = 0
      entries.forEach(e => {
        if (e.isIntersecting && e.intersectionRatio > bestRatio) {
          bestRatio = e.intersectionRatio
          best = e
        }
      })
      if (best && bestRatio >= 0.25) {
        const idx = parseInt(best.target.dataset.musicSection)
        handleSectionChange(idx)
      }
    }, { threshold: [0, 0.1, 0.25, 0.5, 0.75] })

    els.forEach(el => observer.observe(el))
    return () => observer.disconnect()
  }, [started, handleSectionChange])

  // ── IntersectionObserver: text reveals ──────────────────────────────────
  useEffect(() => {
    const revealEls = document.querySelectorAll('.reveal, .reveal-left, .reveal-right, .reveal-scale, .line-reveal')
    const revealObs = new IntersectionObserver((entries) => {
      entries.forEach(e => {
        if (e.isIntersecting) {
          e.target.classList.add('visible')
          revealObs.unobserve(e.target)
        }
      })
    }, { threshold: 0.1, rootMargin: '0px 0px -60px 0px' })
    revealEls.forEach(el => revealObs.observe(el))
    return () => revealObs.disconnect()
  }, [])

  // ── Floating petals ──────────────────────────────────────────────────────
  useEffect(() => {
    const container = document.getElementById('floaters')
    if (!container) return
    const mk = () => {
      const el = document.createElement('span')
      el.className = 'floater'
      el.textContent = SYMBOLS[Math.floor(Math.random() * SYMBOLS.length)]
      el.style.left = Math.random() * 100 + 'vw'
      el.style.fontSize = (Math.random() * 1.1 + .6) + 'rem'
      const dur = Math.random() * 16 + 10
      el.style.animationDuration = dur + 's'
      el.style.animationDelay = (Math.random() * 2) + 's'
      container.appendChild(el)
      setTimeout(() => el.remove(), (dur + 3) * 1000)
    }
    const iv = setInterval(mk, 1100)
    for (let i = 0; i < 8; i++) setTimeout(mk, i * 300)
    return () => clearInterval(iv)
  }, [])

  // ── First interaction handler ────────────────────────────────────────────
  function handleStart() {
    initAudio()
    setStarted(true)
    lastIdxRef.current = -1 // reset so first section triggers
    setTimeout(() => handleSectionChange(0), 100)
  }

  // ── Mute toggle ─────────────────────────────────────────────────────────
  function toggleMute() {
    mutedRef.current = !mutedRef.current
    setMuted(mutedRef.current)
    const audio = audiosRef.current[activeRef.current]
    if (audio) audio.volume = mutedRef.current ? 0 : 0.85
  }

  // ── Cleanup ──────────────────────────────────────────────────────────────
  useEffect(() => () => {
    if (fadeTimerRef.current) clearInterval(fadeTimerRef.current)
    if (progressTimer.current) clearInterval(progressTimer.current)
    audiosRef.current.forEach(a => { if (a) { a.pause(); a.src = '' } })
  }, [])

  const sec = MUSIC_SECTIONS[currentIdx]

  return (
    <>
      <Head>
        <title>Para Ti — Amor sin límite</title>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </Head>

      {/* Floaters */}
      <div className="floaters" id="floaters" />

      {/* ════════════════════════════════════════════════════════════════
          SECTION 0 · HERO
      ═══════════════════════════════════════════════════════════════ */}
      <section id="hero" data-music-section="0">
        <div className="ghost" style={{top:'50%',left:'50%',transform:'translate(-50%,-50%)'}}>AMOR</div>

        <span className="hero-rose reveal">🌹</span>

        <p className="hero-pre reveal d1">Una carta para ti</p>

        <h1 className="hero-title reveal d2">
          Te<br/>amo.
        </h1>

        <p className="hero-sub reveal d3">
          Esto no es un poema.<br/>
          Esto es todo lo que soy<br/>
          puesto en palabras para que lo tengas para siempre.
        </p>

        <div className="reveal d4" style={{marginTop:'1rem'}}>
          {!started ? (
            <button className="start-btn" onClick={handleStart}>
              🎵 Iniciar la experiencia
            </button>
          ) : (
            <div className="scroll-indicator">
              <div className="wheel" />
              <span>Haz scroll</span>
            </div>
          )}
        </div>

        {started && (
          <div className="reveal d5" style={{marginTop:'4rem'}}>
            <div className="scroll-indicator">
              <div className="wheel" />
              <span>Haz scroll</span>
            </div>
          </div>
        )}
      </section>

      {/* Marquee between hero and section 1 */}
      <div className="marquee-wrap" style={{position:'relative',zIndex:2}}>
        <div className="marquee-track">
          {[...Array(2)].map((_, j) => (
            <span key={j}>
              te amo <span className="dot">🌹</span> &nbsp; para siempre <span className="dot">🖤</span> &nbsp; eres todo <span className="dot">✨</span> &nbsp; solo tú <span className="dot">🌸</span> &nbsp; te necesito <span className="dot">🌹</span> &nbsp; te amo <span className="dot">🖤</span> &nbsp; sin ti no puedo <span className="dot">✨</span> &nbsp; eres mi todo <span className="dot">🌸</span> &nbsp;
            </span>
          ))}
        </div>
      </div>

      {/* ════════════════════════════════════════════════════════════════
          SECTION 1 · TE AMO
      ═══════════════════════════════════════════════════════════════ */}
      <section id="te-amo" data-music-section="1">
        <div className="ghost" style={{top:'5%',right:'-5%'}}>TUYO</div>

        <div className="inner">
          <span className="section-num reveal">I — Die For You</span>

          <h2 className="section-title reveal d1">
            Te <em>amo</em><br/>
            <span className="gold">de verdad.</span>
          </h2>

          <div className="body-text">
            <p className="reveal d2 dropcap">
              Hay palabras que se usan tanto que pierden el peso que deberían tener.
              <span className="accent"> "Te quiero"</span> se dice de paso,
              al colgar el teléfono, como despedida de cortesía.
              Pero yo no te lo digo de paso.
              Te lo digo con todo el peso que caben en dos sílabas,
              con la misma intensidad del primer día
              y con una raíz más profunda que entonces.
            </p>

            <div className="quote-block reveal d2">
              <p>Amarte no es algo que decidí.<br/>
              Es algo que me pasó,<br/>
              y lo más honesto que puedo decir<br/>
              es que no quiero que pare.</p>
            </div>

            <div className="two-col">
              <div className="reveal-left d2">
                <p>
                  Hay días en que solo pensar en ti
                  cambia la temperatura de todo lo que me rodea.
                  En que tu nombre aparece en mi cabeza
                  sin que yo lo haya llamado,
                  simplemente porque es el que más cabe ahí.
                </p>
                <p>
                  Te amo de esa manera silenciosa
                  que no siempre sabe cómo decirse en voz alta,
                  pero que está ahí en cada momento
                  en que elijo quedarme,
                  en cada vez que pienso en el futuro
                  y tú apareces en él sin que yo lo fuerze.
                </p>
              </div>
              <div className="reveal-right d3">
                <p>
                  Te amo incluso en los días difíciles,
                  en los que ninguno de los dos
                  está siendo su mejor versión.
                  Te amo cuando no sé cómo demostrarlo.
                  Te amo incluso cuando el ruido de mi cabeza
                  me impide decírtelo como mereces escucharlo.
                </p>
                <p>
                  Eso es lo que hace que sea real.
                  Que no depende de las condiciones.
                  Que no tiene fecha de caducidad.
                  Que no se va cuando todo se complica.
                </p>
              </div>
            </div>

            <div className="divider reveal">
              <div className="divider-line" /><span className="divider-sym">🌹</span><div className="divider-line" />
            </div>

            <div className="declaration reveal">
              <p className="big">
                "Moriría por ti.<br/>
                Pero sobre todo<br/>
                viviría para ti."
              </p>
              <p className="small">— y lo digo en serio</p>
            </div>

            <p className="reveal d2">
              Elegirte no me cuesta.
              No es un sacrificio ni un esfuerzo.
              Elegirte es lo que hace que todo lo demás tenga sentido.
              Eres la única cosa de la que estoy completamente seguro
              en un mundo donde casi nada lo es.
            </p>

            <p className="pull reveal d3">
              «Eres la persona por la que merece la pena ser mejor.»
            </p>
          </div>
        </div>
      </section>

      {/* ════════════════════════════════════════════════════════════════
          SECTION 2 · TU BELLEZA
      ═══════════════════════════════════════════════════════════════ */}
      <section id="tu-belleza" data-music-section="2">
        <div className="ghost" style={{bottom:'10%',left:'-4%'}}>BELLA</div>

        <div className="inner">
          <span className="section-num reveal">II — Often</span>

          <h2 className="section-title reveal d1">
            Eres<br/>
            <em>todo lo que</em><br/>
            <span className="gold">quisiera mirar</span>
          </h2>

          <div className="body-text">
            <p className="reveal d2">
              No sé si sabes el efecto que produces cuando entras a un sitio.
              Cómo el espacio cambia a tu alrededor sin que tú lo percibas.
              Cómo los ojos van hacia ti como si no pudieran hacer otra cosa,
              como si hubiera una ley física que lo obligara.
            </p>

            <div className="quote-block reveal d2" style={{borderColor:'var(--rose)'}}>
              <p>
                Hay una forma en que te mueves<br/>
                que hace que el tiempo parezca más lento.<br/>
                No sé si lo haces aposta.<br/>
                Sospecho que no.<br/>
                Eso lo hace todavía más irresistible.
              </p>
            </div>

            <div className="two-col">
              <div className="reveal-left d2">
                <p>
                  Tus ojos son el primer sitio
                  al que siempre vuelvo.
                  Tienen esa profundidad de las cosas
                  que no se explican del todo,
                  que se sienten pero no se describen,
                  y que sin embargo te hacen querer quedarte ahí
                  el mayor tiempo posible.
                </p>
                <p>
                  Tu boca cuando sonríes
                  hace algo con mi pecho
                  que no tiene nombre médico
                  pero que yo conozco bien.
                  Una especie de apretón suave
                  que solo pasa contigo.
                </p>
              </div>
              <div className="reveal-right d3">
                <p>
                  Hay algo en tu cuerpo
                  que va más allá de lo físico.
                  Hay una energía, una presencia,
                  algo que no se puede ver en una foto
                  pero que se siente en la misma habitación.
                  Eres magnética sin intentarlo.
                  Peligrosa sin saberlo.
                </p>
                <p>
                  Y aun así te miro y lo primero que pienso
                  no es en lo bonita que eres,
                  sino en lo mucho que te quiero.
                  La belleza es lo de menos.
                  Lo que eres por dentro la convierte en algo
                  completamente diferente.
                </p>
              </div>
            </div>

            <div className="divider reveal">
              <div className="divider-line" /><span className="divider-sym">🌸</span><div className="divider-line" />
            </div>

            <div className="declaration reveal">
              <p className="big">
                «Eres el tipo de belleza<br/>
                que se queda.»
              </p>
            </div>

            <p className="reveal d2">
              La que no depende de la luz,
              ni del ángulo, ni del día.
              La que está ahí cuando te despiertas
              y no has dormido bien
              y sin embargo sigues siendo
              exactamente lo que más quiero ver.
            </p>

            <p className="pull reveal d3">
              «Cuando te tengo cerca, el mundo se convierte en un lugar más fácil de habitar.»
            </p>
          </div>
        </div>
      </section>

      {/* ════════════════════════════════════════════════════════════════
          SECTION 3 · LO QUE ME DESPIERTAS
      ═══════════════════════════════════════════════════════════════ */}
      <section id="lo-que-despiertas" data-music-section="3">
        <div className="ghost" style={{top:'15%',right:'-3%'}}>DESEO</div>

        <div className="inner">
          <span className="section-num reveal">III — The Hills</span>

          <h2 className="section-title reveal d1">
            Lo que<br/>
            <em>me haces</em><br/>
            <span className="gold">sentir</span>
          </h2>

          <div className="body-text">
            <p className="reveal d2 dropcap">
              Hay algo en cómo me miras a veces
              que me deja sin ningún pensamiento que no seas tú.
              Un tipo de mirada que va directa al centro de algo,
              que no pide permiso,
              que sabe exactamente lo que hace.
              Y yo me quedo ahí,
              intentando mantener algo de compostura
              y fallando completamente.
            </p>

            <div className="quote-block reveal d2" style={{borderColor:'var(--crimson)'}}>
              <p>
                Me despiertas de una manera<br/>
                que no tiene que ver solo con el cuerpo.<br/>
                Aunque el cuerpo también lo nota.<br/>
                Y mucho.
              </p>
            </div>

            <div className="two-col">
              <div className="reveal-left d2">
                <p>
                  Hay momentos en que estás cerca
                  y el aire cambia de temperatura.
                  En que el espacio entre nosotros
                  se vuelve algo tangible,
                  algo con peso y textura,
                  algo que pide ser cruzado.
                </p>
                <p>
                  Me gusta la tensión de antes.
                  El momento en que los dos sabemos
                  lo que va a pasar
                  pero ninguno lo acelera todavía.
                  Ese segundo suspendido
                  que me pone el mundo patas arriba.
                </p>
              </div>
              <div className="reveal-right d3">
                <p>
                  Me despiertas algo oscuro y hermoso
                  al mismo tiempo.
                  Ese tipo de deseo que no es urgencia
                  sino necesidad profunda,
                  que no es capricho
                  sino algo que va al hueso.
                </p>
                <p>
                  Quiero todo de ti.
                  Tu risa y tu silencio,
                  tus manos y tu mente,
                  tu piel y lo que hay debajo de ella.
                  Todo lo que eres y lo que produces en mí
                  cuando decidiste quedarte.
                </p>
              </div>
            </div>

            <div className="divider reveal">
              <div className="divider-line" /><span className="divider-sym">🌹</span><div className="divider-line" />
            </div>

            <p className="pull reveal d2">
              «Tu piel es el único idioma<br/>que aprendo sin esfuerzo.»
            </p>

            <div className="declaration reveal">
              <p className="big" style={{fontSize:'clamp(1.6rem,3.5vw,2.8rem)'}}>
                Cuando te tengo cerca<br/>
                no existe ningún otro sitio<br/>
                donde quisiera estar.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ════════════════════════════════════════════════════════════════
          SECTION 4 · NUESTRAS NOCHES
      ═══════════════════════════════════════════════════════════════ */}
      <section id="nuestras-noches" data-music-section="4">
        <div className="ghost" style={{top:'40%',left:'-5%',transform:'translateY(-50%)'}}>NOCHES</div>

        <div className="inner">
          <span className="section-num reveal">IV — Call Out My Name</span>

          <h2 className="section-title reveal d1">
            Nuestras<br/>
            <em>noches</em>
          </h2>

          <div className="body-text">
            <p className="reveal d2 dropcap">
              Las noches contigo tienen un lenguaje propio.
              Uno que no se habla, que se respira,
              que existe en el espacio exacto
              entre lo que decimos y lo que hacemos.
              Un idioma hecho de piel
              y de oscuridad cómoda
              y de ese calor que solo existe
              cuando dos personas se quieren de verdad.
            </p>

            <div className="quote-block reveal d2" style={{borderColor:'var(--lavender)'}}>
              <p>
                Hay una versión de ti que solo existe de noche.<br/>
                Más honesta. Más libre. Más tuya.<br/>
                Y esa versión me pertenece un poco,<br/>
                y eso me hace el hombre más afortunado del mundo.
              </p>
            </div>

            <div className="two-col">
              <div className="reveal-left d2">
                <p>
                  Me gusta cuando la luz se apaga
                  y de repente los dos nos volvemos
                  solo tacto y voz y respiración.
                  Cuando todo lo que sobra desaparece
                  y lo único que queda somos nosotros,
                  sin filtros,
                  sin nada que proteger.
                </p>
                <p>
                  Me encanta saber cómo te mueves en la oscuridad.
                  El sonido de tu respiración cambiando.
                  La forma en que tu cuerpo habla
                  cuando ya no necesita palabras.
                  Hay noches en que podría vivir solo en ese momento.
                </p>
              </div>
              <div className="reveal-right d3">
                <p>
                  Cuando te tengo tan cerca que ya no hay separación,
                  cuando somos la misma temperatura,
                  cuando tu nombre sale de mí
                  sin que yo lo decida
                  y tú respondes de esa manera tuya
                  que me hace perder el norte completamente,
                  en esos momentos entiendo
                  que esto no es de este mundo.
                </p>
                <p>
                  Hay una intimidad que va más allá del cuerpo.
                  Un tipo de desnudez que no tiene que ver con la ropa.
                  El hecho de que me dejes verte así,
                  sin armadura,
                  me parece el regalo más grande
                  que me has hecho.
                </p>
              </div>
            </div>

            <div className="divider reveal">
              <div className="divider-line" /><span className="divider-sym">🖤</span><div className="divider-line" />
            </div>

            <div className="declaration reveal">
              <p className="big">
                «En nuestras noches<br/>
                aprendí lo que es<br/>
                estar completamente.»
              </p>
              <p className="small">— contigo, en todos los sentidos</p>
            </div>

            <div className="two-col" style={{marginTop:'3rem'}}>
              <div className="reveal-left d2">
                <p>
                  Hay una forma en que me pides que me quede,
                  sin palabras,
                  solo con el cuerpo,
                  que hace que ya no haya ningún sitio en el mundo
                  al que quisiera ir más que aquí.
                  Esa forma silenciosa de necesitarme
                  que me rompe un poco por dentro de lo bonito que es.
                </p>
              </div>
              <div className="reveal-right d3">
                <p>
                  Y cuando por fin los dos nos quedamos quietos,
                  ya sin urgencia,
                  solo respirando al mismo ritmo,
                  es el único momento del día
                  en que el ruido de mi cabeza
                  se calla completamente.
                  Solo existes tú.
                  Solo existimos nosotros.
                </p>
              </div>
            </div>

            <p className="pull reveal d3">
              «Tu piel tiene el sabor de lo que se sueña pero rara vez se encuentra.»
            </p>
          </div>
        </div>
      </section>

      {/* ════════════════════════════════════════════════════════════════
          SECTION 5 · EL FUEGO
      ═══════════════════════════════════════════════════════════════ */}
      <section id="el-fuego" data-music-section="5">
        <div className="ghost" style={{bottom:'10%',right:'-4%'}}>FUEGO</div>

        <div className="inner">
          <span className="section-num reveal">V — Blinding Lights</span>

          <h2 className="section-title reveal d1">
            El <em>fuego</em><br/>
            que eres<br/>
            <span className="gold">para mí</span>
          </h2>

          <div className="body-text">
            <p className="reveal d2">
              Te deseo de esa manera que no tiene apagado.
              De esa forma que no distingue entre el día y la noche,
              entre las ganas de antes
              y las de ahora
              que siguen siendo exactamente iguales.
            </p>

            <div className="quote-block reveal d2" style={{borderColor:'var(--rose)'}}>
              <p>
                No es costumbre.<br/>
                No es rutina.<br/>
                Es que eres tú,<br/>
                y eso nunca pierde intensidad.
              </p>
            </div>

            <p className="reveal d2">
              Hay noches en que necesito recorrerte
              como si fuera la primera vez,
              despacio, sin prisa,
              aprendiendo de nuevo
              lo que ya sé de memoria.
              Tu cuello. Tu espalda.
              La forma exacta en que encajas
              cuando los dos nos decidimos a no pensar en nada más.
            </p>

            <div className="two-col">
              <div className="reveal-left d2">
                <p>
                  Me gusta cómo cambias.
                  Hay una versión de ti que solo aparece ahí,
                  cuando ya no hay nada que demostrar,
                  cuando eres puro instinto y confianza.
                  Esa versión que me dejas ver
                  me hace sentir que soy el lugar más seguro que tienes.
                  Y no hay nada que me importe más que ser eso.
                </p>
              </div>
              <div className="reveal-right d3">
                <p>
                  Cuando dices mi nombre así,
                  de esa manera concreta que no tiene nombre,
                  cuando tus manos me encuentran
                  antes de que yo llegue a buscarte,
                  cuando el mundo entero deja de tener importancia
                  y la única realidad es esta,
                  en ese momento eres lo más poderoso que existe.
                </p>
              </div>
            </div>

            <div className="divider reveal">
              <div className="divider-line" /><span className="divider-sym">🌹</span><div className="divider-line" />
            </div>

            <div className="declaration reveal">
              <p className="big">
                «Que me des eso<br/>
                es el acto de amor<br/>
                más profundo que conozco.»
              </p>
            </div>

            <p className="pull reveal d2">
              «Contigo aprendí que el deseo y el amor no son cosas distintas. Son la misma llama con dos nombres.»
            </p>
          </div>
        </div>
      </section>

      {/* ════════════════════════════════════════════════════════════════
          SECTION 6 · MÁS QUE TODO
      ═══════════════════════════════════════════════════════════════ */}
      <section id="mas-que-todo" data-music-section="6">
        <div className="ghost" style={{top:'10%',left:'-3%'}}>ALMA</div>

        <div className="inner">
          <span className="section-num reveal">VI — Save Your Tears</span>

          <h2 className="section-title reveal d1">
            Pero es<br/>
            <em>mucho más</em><br/>
            <span className="gold">que eso</span>
          </h2>

          <div className="body-text">
            <p className="reveal d2 dropcap">
              Todo lo que he descrito hasta aquí es real.
              El deseo, las noches, el fuego,
              todo eso existe y es verdad.
              Pero si desapareciera todo lo físico
              y solo quedara lo que eres,
              seguiría queriéndote exactamente igual.
              Porque lo que me tiene atado a ti
              no es lo que me das,
              sino lo que eres.
            </p>

            <div className="quote-block reveal d2" style={{borderColor:'var(--gold)'}}>
              <p>
                Me gusta cómo piensas.<br/>
                Me gusta cómo hablas cuando algo te emociona.<br/>
                Me gusta cómo me escuchas,<br/>
                de esa manera tuya que hace que sienta<br/>
                que lo que digo tiene importancia.
              </p>
            </div>

            <div className="two-col">
              <div className="reveal-left d2">
                <p>
                  Me gusta tu sentido del humor.
                  El momento exacto en que decides ser graciosa
                  y lo consigues sin esfuerzo aparente.
                  Me gusta tu seriedad cuando algo te importa de verdad.
                  La intensidad con que defiendes lo que amas.
                  La fuerza que tienes y que a veces no reconoces.
                </p>
                <p>
                  Me gusta el silencio contigo.
                  Que no todo tenga que llenarse con palabras.
                  Que podamos estar y que eso sea suficiente.
                  Esa comodidad que solo existe con alguien
                  con quien ya no hay nada que probar.
                </p>
              </div>
              <div className="reveal-right d3">
                <p>
                  Me gusta lo que me haces querer ser.
                  No porque me lo pidas.
                  Sino porque existes
                  y mereces lo mejor de mí
                  y eso me hace querer encontrarlo.
                </p>
                <p>
                  Me gusta que seas imperfecta.
                  Que tengas tus miedos y tus días malos
                  y tus momentos de duda.
                  Me gusta que confíes en mí con eso.
                  Me gusta ser el sitio donde pones las cosas
                  que no puedes poner en otro sitio.
                </p>
              </div>
            </div>

            <div className="divider reveal">
              <div className="divider-line" /><span className="divider-sym">🌸</span><div className="divider-line" />
            </div>

            <div className="declaration reveal">
              <p className="big">
                «Lo que siento por ti<br/>
                vive mucho más profundo<br/>
                que cualquier palabra que pueda encontrar.»
              </p>
            </div>

            <p className="pull reveal d3">
              «Contigo aprendí que el amor de verdad no es un estado. Es una decisión que se toma todos los días.»
            </p>
          </div>
        </div>
      </section>

      {/* ════════════════════════════════════════════════════════════════
          SECTION 7 · PARA SIEMPRE
      ═══════════════════════════════════════════════════════════════ */}
      <section id="para-siempre" data-music-section="7">
        <div className="ghost" style={{top:'50%',left:'50%',transform:'translate(-50%,-50%)'}}>SIEMPRE</div>
        <div className="inner" style={{textAlign:'center'}}>
          <span className="final-rose reveal">🌹</span>
          <span className="section-num reveal d1">VII — Die For You</span>

          <h2 className="final-title reveal d2">Para<br/>siempre.</h2>

          <p className="final-body reveal d3">
            Este no es el final.<br/>
            Es solo la parte que he podido poner en palabras.<br/>
            Lo que no cabe aquí es todavía más grande.<br/>
            Y sigue creciendo cada día.
          </p>

          <div className="reveal d3">
            <div className="hr" />
          </div>

          <p className="final-body reveal d3" style={{fontSize:'clamp(1rem,1.6vw,1.25rem)'}}>
            Gracias por quedarte.<br/>
            Gracias por dejarme quererte.<br/>
            Gracias por ser exactamente lo que eres,<br/>
            sin suavizarlo para que yo lo lleve mejor.<br/>
            Eres la única cosa en este mundo<br/>
            sobre la que no tengo ninguna duda.<br/>
            Y eso, en la vida que tengo,<br/>
            es el regalo más grande que existe.
          </p>

          <div className="line-reveal reveal d4" style={{margin:'3rem 0'}}>
            <span className="line"><span>Te quiero hoy.</span></span>
            <span className="line"><span>Te querré mañana.</span></span>
            <span className="line"><span>Te querré en todos los capítulos que faltan.</span></span>
            <span className="line" style={{fontFamily:"'Dancing Script', cursive",fontSize:'clamp(1.4rem,3vw,2.2rem)',color:'var(--rose)'}}><span>Sin excepción. Sin condiciones.</span></span>
          </div>

          <div className="reveal d4">
            <div className="shimmer" style={{fontFamily:"'Playfair Display',serif",fontSize:'clamp(1.5rem,3vw,2.5rem)',fontStyle:'italic',marginBottom:'1rem'}}>
              Tuyo para siempre.
            </div>
          </div>

          <div className="reveal d5" style={{color:'var(--crimson)',fontSize:'1.5rem',letterSpacing:'1.5rem',marginTop:'2rem'}}>
            🌹 🖤 🌸 🖤 🌹
          </div>
        </div>
      </section>

      {/* ════════════════════════════════════════════════════════════════
          MUSIC PLAYER BAR (fixed bottom)
      ═══════════════════════════════════════════════════════════════ */}
      <div className={`music-bar ${!started ? '' : ''}`}>
        {!started ? (
          <>
            <span style={{fontSize:'.8rem',color:'var(--muted)',letterSpacing:'.1em'}}>
              🎵 Dale play para comenzar
            </span>
            <button className="start-btn" onClick={handleStart}>
              ▶ Iniciar música
            </button>
          </>
        ) : (
          <>
            <div className={`eq-wrap ${started && !muted ? 'playing' : ''}`}>
              {[0,1,2,3,4].map(i => <div key={i} className="eq-bar" style={{height:'20%'}} />)}
            </div>

            <div className="now-playing-info">
              <div className="np-label">Ahora suena</div>
              <div className="np-title">{sec.title}</div>
              <div className="np-artist">{sec.artist}</div>
            </div>

            <div className="progress-bar-wrap">
              <div className="progress-bar-fill" style={{width: `${progress}%`}} />
            </div>

            <button className="vol-btn" onClick={toggleMute} title={muted ? 'Activar sonido' : 'Silenciar'}>
              {muted ? '🔇' : '🔊'}
            </button>
          </>
        )}
      </div>
    </>
  )
}
