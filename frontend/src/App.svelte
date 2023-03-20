<script lang='ts' context='module'>
import {writable, get as get$} from 'svelte/store'
import {randID} from './utils/misc'
import newLocalStorageKey from './stores/_local_storage_prefix'

// BEGIN configurable variables

export const appName = 'GG Proxy Playground'

// END configurable variables

const reducedMotionMediaQuery = matchMedia('(prefers-reduced-motion: reduce)')
const moreContrastMediaQuery = matchMedia('(prefers-contrast: more)')

export enum t_AppTheme {
	System = 'sys', Light = 'light', Dark = 'dark',
}

const appThemeLocStoreID = newLocalStorageKey('theme')

let _appTheme = t_AppTheme.System
if ('localStorage' in window) {
	const locStore = localStorage.getItem(appThemeLocStoreID)
	if (locStore) {
		_appTheme = locStore as t_AppTheme
	}
}

const thisStore = writable<{
	theme: t_AppTheme
	a11y: {
		reducedMotion: boolean
		moreContrast:  boolean
	}
}>({
	theme: _appTheme,
	a11y: {
		reducedMotion: reducedMotionMediaQuery.matches,
		moreContrast: moreContrastMediaQuery.matches,
	},
})
export const appState = {
	subscribe: thisStore.subscribe,
	$: ()=> get$(appState),
}

function _reducedMotionChanged() {
	thisStore.update(($)=> {
		$.a11y.reducedMotion = reducedMotionMediaQuery.matches
		return $
	})
}

function _moreContrastChanged() {
	thisStore.update(($)=> {
		$.a11y.moreContrast = moreContrastMediaQuery.matches
		return $
	})
}

reducedMotionMediaQuery.addEventListener(
	'change', _reducedMotionChanged,
	{passive: true},
)
moreContrastMediaQuery.addEventListener(
	'change', _moreContrastChanged,
	{passive: true},
)

thisStore.subscribe(($)=> {
	document.documentElement.setAttribute(
		'app-theme', $.theme,
	)
	document.documentElement.setAttribute(
		'reduced-motion', $.a11y.reducedMotion ? 'true':'false',
	)
	document.documentElement.setAttribute(
		'more-contrast', $.a11y.moreContrast ? 'true':'false',
	)
	if ('localStorage' in window) {
		localStorage.setItem(appThemeLocStoreID, $.theme as string)
	}
})

const lockScrollStore = writable<Array<string>>([])

export function lockScroll(id: string): void {
	if (id === '') {
		throw new Error(
			`lockScroll: invalid ID given, got "${id}"`
		)
	}

	let err: Error|null = null
	lockScrollStore.update(($)=> {
		if ($.indexOf(id) >= 0) {
			err = new Error(`lockScroll: ID "${id}" already locked`)
			return $
		}
		$.push(id)
		if ($.length > 0) {
			document.scrollingElement?.setAttribute('lock-scroll', 'true')
		}
		return $
	})
	if (err !== null) {throw err}
}

export function unlockScroll(id: string): void {
	if (id === '') {
		throw new Error(
			`unlockScroll: invalid ID given "${id}"`
		)
	}

	let err: Error|null = null
	lockScrollStore.update(($)=> {
		const idx = $.indexOf(id)
		if (idx < 0) {
			err = new Error(`unlockScroll: ID "${id}" not locked`)
			return $
		}
		$.splice(idx, 1)
		if ($.length < 1) {
			document.scrollingElement?.removeAttribute('lock-scroll')
		}
		return $
	})
	if (err !== null) {throw err}
}

export function setTheme(theme: t_AppTheme) {
	thisStore.update(($)=> {
		$.theme = theme
		return $
	})
}

const _actionStack: Array<{id: string, resolver: ()=> void}> = []

// stack an action which can be escaped via the ESC key
// the callback must resolve the action itself, otherwise it will break things
export function stackAction(resolver: ()=> void) {
	const id = randID()
	_actionStack.unshift({id, resolver})
	return id
}

// resolve action by id
export function resolveAction(id: string) {
	for (let i = 0; i < _actionStack.length; i++) {
		if (_actionStack[i].id === id) {
			_actionStack.splice(i,1)
		}
	}
}

// unstack recent action by ESC key
function escapeAction() {
	if (_actionStack.length > 0) {
		_actionStack[0].resolver()
	}
}

// the latest restriction will be 
let _restrictedFocusStack: Array<{id: string, target: HTMLElement}> = []

export function restrictFocus(el: HTMLElement) {
	if (Number.isNaN(Number(el.tabIndex))) {
		console.error(el)
		throw new Error(
			'cannot restrict focus on given element, because the element is ' +
			'not focusable (invalid tabindex)'
		)
	}
	const id = randID()
	_restrictedFocusStack.unshift({id, target: el})
	el.focus({preventScroll: true})
	return function(): void {
		for (let i = 0; i < _restrictedFocusStack.length; i++) {
			if (_restrictedFocusStack[i].id === id) {
				_restrictedFocusStack.splice(i,1)
				break
			}
		}
	}
}

function _checkIsFocusAllowed(event: FocusEvent & {currentTarget: EventTarget & Window}) {
	if (_restrictedFocusStack.length > 0) {
		let isAllowedFocus = false
		for (const el of event.composedPath()) {
			if (el === _restrictedFocusStack[0].target) {
				isAllowedFocus = true
				break
			}
		}
		if (!isAllowedFocus) {
			event.preventDefault()
			_restrictedFocusStack[0].target.focus()
			return false
		}
		return true
	}
}
</script>



<script lang='ts'>
import {welcomeModalLocStrKey} from './components/overlays/ModalAboutGraphGuard.svelte'

import CritErrModal from './components/overlays/ModalCritErr.svelte'
import Overlays, { openOverlay } from './components/sections/Overlays.svelte'
import Toasts from './components/sections/Toasts.svelte'
import Loader, {load} from './components/sections/Loader.svelte'
import Menus from './components/sections/Menus.svelte'
import Playground from './components/sections/Playground.svelte'

import {initStores} from './stores/init_stores'
import {storesInit} from './stores/stores_init'

// initialize stores
import './stores/i18n'
import './stores/playground'

let appReadyToInteract = false
let resolveAppInitial: ()=> void;

load((resolve)=> {
	resolveAppInitial =()=> {
		appReadyToInteract = true
		resolve()
		if ('localStorage' in window) {
			const lastTimeOpened = localStorage.getItem(welcomeModalLocStrKey)
			if (!lastTimeOpened) {
				setTimeout(()=> openOverlay({name: 'about', props: {welcome: true}}), 200)
			}
		}
	}
}, {timeout: 0, escapable: false})

storesInit.then(()=> {
	resolveAppInitial()
})
</script>



<svelte:window
	on:load={initStores}
	on:focus|capture={_checkIsFocusAllowed}
	on:keydown={(event)=> {
		if (event.key == 'Escape') {escapeAction()}
	}}
	on:unhandledrejection={({reason})=> {
		new CritErrModal({
			target: document.body,
			props: {isOwnInstance: true, err: {reason: reason},
		}})
	}}
	on:panic={(event)=> {
		const {reason, stackTrace} = event.detail
		openOverlay({name: 'critErr', props: {err: {reason, details: stackTrace}}})
	}}
/>

{#if appReadyToInteract}<Playground/>{/if}
<Overlays/>
<Menus/>
<Toasts/>
<Loader/>
