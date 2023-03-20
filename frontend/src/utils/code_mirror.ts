import {EditorState} from '@codemirror/state'
import {basicSetup} from 'codemirror'
import {keymap, drawSelection, highlightActiveLine, rectangularSelection, lineNumbers, EditorView, highlightActiveLineGutter} from '@codemirror/view'
import {syntaxHighlighting, bracketMatching, foldGutter, foldKeymap} from '@codemirror/language'
import {defaultKeymap, insertTab, indentLess} from '@codemirror/commands'
import {searchKeymap} from '@codemirror/search'
import type {Extension} from '@codemirror/state'

import {oneDarkHighlightStyle} from '@codemirror/theme-one-dark'

export type CMEditor = {state: EditorState|null, view: EditorView|null, el: HTMLElement|null}

const defaultDynamicTheme = EditorView.theme({
	'&': {
		color: 'var(--code-mirror-font-clr)',
		backgroundColor: 'var(--code-mirror-bg)',
		outline: 'none',
	},
	'.cm-editor': {
		outline: 'none',
	},
	'.cm-line': {
		lineHeight: 'var(--code-mirror-line-height)',
	},
	'.cm-scroller': {
		overscrollBehavior: 'contain',
		fontVariantLigatures: 'normal',
		fontFamily: 'var(--code-mirror-font-family-stack)',
		fontWeight: 'var(--code-mirror-font-weight)',
		cursor: 'text',
	},
	'&.cm-focused .cm-cursor': {
		borderLeftColor: 'var(--code-mirror-cursor-clr)',
	},
	'.cm-selectionBackground, &.cm-focused .cm-selectionBackground, ::selection': {
		backgroundColor: 'var(--code-mirror-selection-bg)',
	},
	'.cm-matchingBracket, &.cm-focused .cm-matchingBracket': {
		backgroundColor: 'var(--code-mirror-matching-braket-bg)',
		outline: 'var(--code-mirror-matching-braket-outline)',
		color: 'var(--code-mirror-matching-braket-font-clr)',
	},
	'.cm-selectionMatch': {
		backgroundColor: 'var(--code-mirror-selection-match-bg)',
		outline: 'var(--code-mirror-selection-match-outline)',
	},
	'.cm-gutters': {
		backgroundColor: 'var(--code-mirror-gutter-bg)',
		borderRight: 'var(--code-mirror-gutter-border)',
		color: 'var(--code-mirror-gutter-font-clr)',
	},
	'.cm-activeLine, .cm-activeLineGutter': {
		backgroundColor: 'var(--code-mirror-active-line-bg)',
	},
	'.cm-activeLineGutter': {
		color: 'var(--code-mirror-gutter-active-line-font-clr)',
	},
}, {dark: true})

function _newReadEditor(source: string, extensions: Extension[]) {
	return EditorState.create({
		doc: source,
		extensions: [
			EditorState.readOnly.of(true),
			lineNumbers(),
			foldGutter(),
			drawSelection(),
			bracketMatching(),
			rectangularSelection(),
			highlightActiveLineGutter(),
			highlightActiveLine(),
			syntaxHighlighting(oneDarkHighlightStyle),
			keymap.of([...defaultKeymap, ...searchKeymap, ...foldKeymap]),
			extensions,
			defaultDynamicTheme,
		],
	})
}

function _newEditor(source: string, extensions: Extension[]) {
	return EditorState.create({
		doc: source,
		extensions: [
			basicSetup,
			keymap.of([{key: 'Tab', run: insertTab, shift: indentLess}]),
			syntaxHighlighting(oneDarkHighlightStyle),
			extensions,
			defaultDynamicTheme,
		],
	})
}

interface EditorOptions {
	readonly?: boolean
	extensions?: Extension[]
}

export function newCodeEditor(source: string, opts?: EditorOptions) {
	if (opts?.readonly) {
		return _newReadEditor(source, opts?.extensions || [])
	}
	return _newEditor(source, opts?.extensions || [])
}
