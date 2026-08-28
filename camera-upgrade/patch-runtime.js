#!/usr/bin/env node

const fs = require('node:fs')
const path = require('node:path')

const appRoot = process.argv[2]
const vendorModulePath = process.argv[3]
if (!appRoot) {
	console.error('Usage: node patch-runtime.js <extracted-app-root> [vendor-tldraw-module]')
	process.exit(1)
}

function updateFile(relativePath, update) {
	const filePath = path.join(appRoot, relativePath)
	const before = fs.readFileSync(filePath, 'utf8')
	const after = update(before, relativePath)
	if (after !== before) fs.writeFileSync(filePath, after)
}

function replaceRequired(source, current, replacement, relativePath) {
	if (source.includes(replacement)) return source
	if (!source.includes(current)) {
		throw new Error(`Unsupported tldraw runtime: expected opacity hook missing in ${relativePath}`)
	}
	return source.replace(current, replacement)
}

updateFile('out/renderer/index.html', (source) => {
	const marker = '<!-- tldraw-camera-upgrade -->'
	if (!source.includes(marker)) {
		return source.replace(
			'</head>',
			`\t\t${marker}\n\t\t<link rel="stylesheet" href="./assets/camera-tour.css">\n\t\t<script type="module" src="./assets/camera-tour.js"></script>\n\t</head>`
		)
	}
	return source
		.replace('./camera-tour/camera-tour.css', './assets/camera-tour.css')
		.replace('./camera-tour/camera-tour.js', './assets/camera-tour.js')
})

function patchStylePanel(source, relativePath) {
	source = replaceRequired(
		source,
		'const tldrawSupportedOpacities = [0.1, 0.25, 0.5, 0.75, 1];',
		'const tldrawSupportedOpacities = [0, 0.1, 0.25, 0.5, 0.75, 1];',
		relativePath
	)
	return replaceRequired(source, 'ariaValueModifier: 25', 'ariaValueModifier: 20', relativePath)
}

function patchTranslation(source, relativePath) {
	return replaceRequired(
		source,
		'  "opacity-style.0.1": "10%",',
		'  "opacity-style.0": "0%",\n  "opacity-style.0.1": "10%",',
		relativePath
	)
}

updateFile(
	'node_modules/tldraw/dist-cjs/lib/ui/components/StylePanel/DefaultStylePanelContent.js',
	patchStylePanel
)
updateFile(
	'node_modules/tldraw/dist-esm/lib/ui/components/StylePanel/DefaultStylePanelContent.mjs',
	patchStylePanel
)
updateFile(
	'node_modules/tldraw/dist-cjs/lib/ui/hooks/useTranslation/defaultTranslation.js',
	patchTranslation
)
updateFile(
	'node_modules/tldraw/dist-esm/lib/ui/hooks/useTranslation/defaultTranslation.mjs',
	patchTranslation
)

if (vendorModulePath) {
	const before = fs.readFileSync(vendorModulePath, 'utf8')
	let after = replaceRequired(
		before,
		'var tldrawSupportedOpacities = [0.1, 0.25, 0.5, 0.75, 1];',
		'var tldrawSupportedOpacities = [0, 0.1, 0.25, 0.5, 0.75, 1];',
		vendorModulePath
	)
	after = patchTranslation(after, vendorModulePath)
	after = replaceRequired(after, 'ariaValueModifier: 25', 'ariaValueModifier: 20', vendorModulePath)
	if (after !== before) fs.writeFileSync(vendorModulePath, after)
}

console.log('Patched native opacity stops: 0%, 10%, 25%, 50%, 75%, 100%')
