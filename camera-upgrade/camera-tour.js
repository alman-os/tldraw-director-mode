import { createShapeId, toRichText } from 'tldraw'

const META_KEY = 'cameraTour'
const SETTINGS_KEY = 'tldraw-camera-tour-settings-v1'
const DEFAULT_SETTINGS = {
	transitionMs: 900,
	holdMs: 1200,
	loop: false,
	inset: 28,
	stylePaletteHidden: false,
}

const easeInOutCubic = (t) =>
	t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2

let editor = null
let unsubscribeStore = null
let detachManualInterrupts = null
let renderQueued = false
let activeIndex = 0
let tourTimer = null
let playing = false
let presenting = false

const settings = loadSettings()
const ui = createUi()

function loadSettings() {
	try {
		return { ...DEFAULT_SETTINGS, ...JSON.parse(localStorage.getItem(SETTINGS_KEY) || '{}') }
	} catch {
		return { ...DEFAULT_SETTINGS }
	}
}

function saveSettings() {
	localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings))
}

function applyStylePaletteVisibility() {
	document.body.classList.toggle('camera-tour-style-palette-hidden', settings.stylePaletteHidden)
	if (ui?.stylePalette) ui.stylePalette.checked = settings.stylePaletteHidden
}

function setStylePaletteHidden(hidden) {
	settings.stylePaletteHidden = Boolean(hidden)
	applyStylePaletteVisibility()
	saveSettings()
}

function shotData(shape) {
	const value = shape?.meta?.[META_KEY]
	return value && value.version === 1 ? value : null
}

function getShots() {
	if (!editor) return []
	return editor
		.getCurrentPageShapes()
		.filter((shape) => shotData(shape))
		.sort((a, b) => {
			const aOrder = Number(shotData(a).order) || 0
			const bOrder = Number(shotData(b).order) || 0
			return aOrder - bOrder || a.id.localeCompare(b.id)
		})
}

function updateShot(shape, patch, props) {
	const current = shotData(shape)
	if (!editor || !current) return
	editor.updateShape({
		id: shape.id,
		type: shape.type,
		meta: { ...shape.meta, [META_KEY]: { ...current, ...patch } },
		...(props ? { props } : null),
	})
}

function captureShot() {
	if (!editor) return
	stopTour()
	const shots = getShots()
	const viewport = editor.getViewportPageBounds()
	const camera = editor.getCamera()
	const edge = Math.min(52 / Math.max(camera.z, 0.01), viewport.w * 0.08, viewport.h * 0.08)
	const number = shots.length + 1
	const name = `Shot ${String(number).padStart(2, '0')}`
	const id = createShapeId(`camera-shot-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`)
	const order = shots.length ? Math.max(...shots.map((shape) => Number(shotData(shape).order) || 0)) + 1 : 1

	editor.createShape({
		id,
		type: 'geo',
		x: viewport.x + edge,
		y: viewport.y + edge,
		opacity: 0.42,
		props: {
			geo: 'rectangle',
			w: Math.max(180, viewport.w - edge * 2),
			h: Math.max(110, viewport.h - edge * 2),
			color: 'violet',
			fill: 'none',
			dash: 'dashed',
			size: 'm',
			font: 'sans',
			align: 'middle',
			verticalAlign: 'middle',
			richText: toRichText(''),
		},
		meta: {
			[META_KEY]: {
				version: 1,
				order,
				name,
				createdAt: Date.now(),
			},
		},
	})

	activeIndex = shots.length
	editor.select(id)
	scheduleRender()
}

function renameShot(shape, name) {
	const nextName = name.trim() || 'Untitled shot'
	updateShot(shape, { name: nextName })
}

function reorderShot(index, direction) {
	if (!editor) return
	const shots = getShots()
	const target = index + direction
	if (target < 0 || target >= shots.length) return
	const reordered = [...shots]
	const [moved] = reordered.splice(index, 1)
	reordered.splice(target, 0, moved)
	reordered.forEach((shape, order) => updateShot(shape, { order: order + 1 }))
	activeIndex = target
	scheduleRender()
}

function deleteShot(shape) {
	if (!editor) return
	stopTour()
	editor.deleteShape(shape.id)
	activeIndex = Math.max(0, Math.min(activeIndex, getShots().length - 2))
	scheduleRender()
}

function goToShot(index, { animate = true } = {}) {
	if (!editor) return false
	const shots = getShots()
	if (!shots.length) return false
	activeIndex = Math.max(0, Math.min(index, shots.length - 1))
	const shape = shots[activeIndex]
	const bounds = editor.getShapePageBounds(shape)
	if (!bounds) return false

	editor.zoomToBounds(bounds, {
		inset: settings.inset,
		animation: animate
			? { duration: settings.transitionMs, easing: easeInOutCubic }
			: undefined,
	})
	updatePresentationReadout()
	scheduleRender()
	return true
}

function stepShot(direction) {
	const shots = getShots()
	if (!shots.length) return
	stopTour({ keepPresentation: true })
	const next = (activeIndex + direction + shots.length) % shots.length
	goToShot(next)
}

function playTour({ fromStart = false } = {}) {
	const shots = getShots()
	if (!editor || !shots.length) return
	clearTimeout(tourTimer)
	playing = true
	enterPresentation({ moveCamera: false })
	if (fromStart) activeIndex = 0
	playCurrentLeg()
}

function playCurrentLeg() {
	if (!playing) return
	const shots = getShots()
	if (!shots.length) return stopTour()
	goToShot(activeIndex)
	tourTimer = window.setTimeout(() => {
		if (!playing) return
		if (activeIndex >= shots.length - 1) {
			if (!settings.loop) return stopTour({ keepPresentation: true })
			activeIndex = 0
		} else {
			activeIndex += 1
		}
		playCurrentLeg()
	}, settings.transitionMs + settings.holdMs)
	updatePresentationReadout()
}

function stopTour({ keepPresentation = true } = {}) {
	playing = false
	clearTimeout(tourTimer)
	tourTimer = null
	editor?.stopCameraAnimation?.()
	if (!keepPresentation) exitPresentation()
	updatePresentationReadout()
	scheduleRender()
}

function enterPresentation({ moveCamera = true } = {}) {
	const shots = getShots()
	if (!shots.length) return
	presenting = true
	ui.shell.classList.add('ct-presenting')
	ui.panel.classList.remove('ct-open')
	document.body.classList.add('camera-tour-presenting')
	if (moveCamera) goToShot(activeIndex)
	updatePresentationReadout()
}

function exitPresentation() {
	playing = false
	presenting = false
	clearTimeout(tourTimer)
	tourTimer = null
	editor?.stopCameraAnimation?.()
	ui.shell.classList.remove('ct-presenting')
	document.body.classList.remove('camera-tour-presenting')
	updatePresentationReadout()
	scheduleRender()
}

function updatePresentationReadout() {
	const shots = getShots()
	const current = shots[activeIndex]
	ui.presentName.textContent = current ? shotData(current).name : 'No shots'
	ui.presentCount.textContent = shots.length ? `${activeIndex + 1} / ${shots.length}` : '0 / 0'
	ui.presentPlay.textContent = playing ? 'Pause' : 'Play'
	ui.presentPlay.setAttribute('aria-label', playing ? 'Pause camera tour' : 'Play camera tour')
}

function scheduleRender() {
	if (renderQueued) return
	renderQueued = true
	requestAnimationFrame(() => {
		renderQueued = false
		render()
	})
}

function render() {
	const shots = getShots()
	activeIndex = Math.max(0, Math.min(activeIndex, Math.max(0, shots.length - 1)))
	ui.count.textContent = String(shots.length)
	ui.empty.hidden = shots.length > 0
	ui.list.replaceChildren()

	shots.forEach((shape, index) => {
		const data = shotData(shape)
		const row = document.createElement('div')
		row.className = `ct-shot${index === activeIndex ? ' ct-active' : ''}`

		const number = document.createElement('button')
		number.className = 'ct-shot-number'
		number.type = 'button'
		number.textContent = String(index + 1).padStart(2, '0')
		number.title = 'Fly to shot'
		number.addEventListener('click', () => {
			stopTour()
			goToShot(index)
		})

		const name = document.createElement('input')
		name.className = 'ct-shot-name'
		name.value = data.name || `Shot ${index + 1}`
		name.setAttribute('aria-label', `Name for shot ${index + 1}`)
		name.addEventListener('focus', () => {
			activeIndex = index
			editor?.select(shape.id)
			scheduleRender()
		})
		name.addEventListener('change', () => renameShot(shape, name.value))

		const actions = document.createElement('div')
		actions.className = 'ct-shot-actions'
		actions.append(
			iconButton('↑', 'Move shot earlier', () => reorderShot(index, -1), index === 0),
			iconButton('↓', 'Move shot later', () => reorderShot(index, 1), index === shots.length - 1),
			iconButton('×', 'Delete shot frame', () => deleteShot(shape)),
		)

		row.append(number, name, actions)
		ui.list.append(row)
	})

	ui.capture.disabled = !editor
	ui.present.disabled = shots.length === 0
	ui.play.disabled = shots.length === 0
	ui.transitionValue.textContent = `${(settings.transitionMs / 1000).toFixed(1)}s`
	ui.holdValue.textContent = `${(settings.holdMs / 1000).toFixed(1)}s`
	updatePresentationReadout()
}

function iconButton(label, title, onClick, disabled = false) {
	const button = document.createElement('button')
	button.type = 'button'
	button.className = 'ct-icon-button'
	button.textContent = label
	button.title = title
	button.disabled = disabled
	button.addEventListener('click', onClick)
	return button
}

function createUi() {
	const shell = document.createElement('div')
	shell.id = 'camera-tour-shell'
	shell.innerHTML = `
		<button class="ct-launcher" type="button" aria-label="Open camera shots" title="Camera shots (⌘⇧K)">
			<span class="ct-camera-icon" aria-hidden="true"></span>
			<span>Shots</span>
			<span class="ct-count">0</span>
		</button>
		<section class="ct-panel" aria-label="Camera shots">
			<header class="ct-header">
				<div>
					<div class="ct-kicker">CAMERA PATH</div>
					<h2>Presentation shots</h2>
				</div>
				<button class="ct-close ct-icon-button" type="button" aria-label="Close camera panel">×</button>
			</header>
			<div class="ct-primary-actions">
				<button class="ct-capture ct-accent-button" type="button">＋ Capture this view</button>
				<button class="ct-present ct-button" type="button">Present</button>
			</div>
			<div class="ct-guide">
				<span class="ct-guide-mark"></span>
				<span>Drag a frame to change focus. Resize it to change zoom. Style it with tldraw.</span>
			</div>
			<div class="ct-shot-list"></div>
			<div class="ct-empty">
				<div class="ct-empty-mark">＋</div>
				<strong>No shots yet</strong>
				<span>Frame the canvas, then capture the view.</span>
			</div>
			<div class="ct-settings">
				<label>
					<span>Transition <output class="ct-transition-value"></output></span>
					<input class="ct-transition" type="range" min="200" max="3000" step="100">
				</label>
				<label>
					<span>Hold <output class="ct-hold-value"></output></span>
					<input class="ct-hold" type="range" min="0" max="5000" step="100">
				</label>
				<label class="ct-loop-row"><span>Loop after the last shot</span><input class="ct-loop" type="checkbox"></label>
				<label class="ct-loop-row"><span>Hide style palette</span><input class="ct-style-palette" type="checkbox"></label>
			</div>
			<footer class="ct-footer">
				<button class="ct-play ct-accent-button" type="button">▶ Play from start</button>
				<span>← → navigate · Esc exits</span>
			</footer>
		</section>
		<nav class="ct-present-bar" aria-label="Presentation controls">
			<button class="ct-prev" type="button" aria-label="Previous shot">←</button>
			<div class="ct-present-title">
				<strong class="ct-present-name">No shots</strong>
				<span class="ct-present-count">0 / 0</span>
			</div>
			<button class="ct-present-play" type="button">Play</button>
			<button class="ct-next" type="button" aria-label="Next shot">→</button>
			<button class="ct-exit" type="button">Exit</button>
		</nav>
	`
	document.body.append(shell)

	const query = (selector) => shell.querySelector(selector)
	const refs = {
		shell,
		launcher: query('.ct-launcher'),
		count: query('.ct-count'),
		panel: query('.ct-panel'),
		close: query('.ct-close'),
		capture: query('.ct-capture'),
		present: query('.ct-present'),
		play: query('.ct-play'),
		list: query('.ct-shot-list'),
		empty: query('.ct-empty'),
		transition: query('.ct-transition'),
		transitionValue: query('.ct-transition-value'),
		hold: query('.ct-hold'),
		holdValue: query('.ct-hold-value'),
		loop: query('.ct-loop'),
		stylePalette: query('.ct-style-palette'),
		prev: query('.ct-prev'),
		next: query('.ct-next'),
		presentPlay: query('.ct-present-play'),
		presentName: query('.ct-present-name'),
		presentCount: query('.ct-present-count'),
		exit: query('.ct-exit'),
	}

	refs.transition.value = String(settings.transitionMs)
	refs.hold.value = String(settings.holdMs)
	refs.loop.checked = settings.loop
	refs.stylePalette.checked = settings.stylePaletteHidden

	refs.launcher.addEventListener('click', () => refs.panel.classList.toggle('ct-open'))
	refs.close.addEventListener('click', () => refs.panel.classList.remove('ct-open'))
	refs.capture.addEventListener('click', captureShot)
	refs.present.addEventListener('click', () => enterPresentation())
	refs.play.addEventListener('click', () => playTour({ fromStart: true }))
	refs.prev.addEventListener('click', () => stepShot(-1))
	refs.next.addEventListener('click', () => stepShot(1))
	refs.presentPlay.addEventListener('click', () => {
		if (playing) stopTour({ keepPresentation: true })
		else playTour()
	})
	refs.exit.addEventListener('click', exitPresentation)

	refs.transition.addEventListener('input', () => {
		settings.transitionMs = Number(refs.transition.value)
		saveSettings()
		scheduleRender()
	})
	refs.hold.addEventListener('input', () => {
		settings.holdMs = Number(refs.hold.value)
		saveSettings()
		scheduleRender()
	})
	refs.loop.addEventListener('change', () => {
		settings.loop = refs.loop.checked
		saveSettings()
	})
	refs.stylePalette.addEventListener('change', () => {
		setStylePaletteHidden(refs.stylePalette.checked)
	})

	return refs
}

function bindEditor(nextEditor) {
	if (nextEditor === editor) return
	unsubscribeStore?.()
	detachManualInterrupts?.()
	stopTour({ keepPresentation: false })
	editor = nextEditor || null

	if (editor) {
		unsubscribeStore = editor.store.listen(scheduleRender, { source: 'all', scope: 'document' })
		const container = editor.getContainer()
		const interrupt = () => {
			if (playing) stopTour({ keepPresentation: true })
		}
		container.addEventListener('pointerdown', interrupt, { passive: true })
		container.addEventListener('wheel', interrupt, { passive: true })
		detachManualInterrupts = () => {
			container.removeEventListener('pointerdown', interrupt)
			container.removeEventListener('wheel', interrupt)
		}
	}
	scheduleRender()
}

window.addEventListener('keydown', (event) => {
	const target = event.target
	if (target instanceof HTMLElement && (target.matches('input, textarea, select') || target.isContentEditable)) return

	if ((event.metaKey || event.ctrlKey) && event.shiftKey && event.key.toLowerCase() === 'k') {
		event.preventDefault()
		ui.panel.classList.toggle('ct-open')
		return
	}
	if (!presenting) return

	if (event.key === 'ArrowRight' || event.key === 'PageDown') {
		event.preventDefault()
		stepShot(1)
	} else if (event.key === 'ArrowLeft' || event.key === 'PageUp') {
		event.preventDefault()
		stepShot(-1)
	} else if (event.key === 'Home') {
		event.preventDefault()
		stopTour({ keepPresentation: true })
		goToShot(0)
	} else if (event.key === 'End') {
		event.preventDefault()
		stopTour({ keepPresentation: true })
		goToShot(getShots().length - 1)
	} else if (event.key === ' ') {
		event.preventDefault()
		if (playing) stopTour({ keepPresentation: true })
		else playTour()
	} else if (event.key === 'Escape') {
		event.preventDefault()
		exitPresentation()
	}
})

window.setInterval(() => bindEditor(window.editor || null), 300)
applyStylePaletteVisibility()
bindEditor(window.editor || null)
render()
