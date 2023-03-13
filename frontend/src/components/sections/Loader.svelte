<script lang='ts' context='module'>
import {writable, get as get$} from 'svelte/store'
import {randID} from '../../utils/misc'

type t_LoaderFailMessage = string|Error|number|boolean
type t_LoaderFail = (message?: t_LoaderFailMessage)=> void
type t_LoaderLoadFn = (resolve: ()=> void, fail?: t_LoaderFail)=> void
type t_LoaderLoadOptions = {
	escapable?: boolean
	timeout?:   number
}

const thisStore = writable({
	isLoading: false,
	escapable: false,
})

const loaderStack: Array<{
	fn:          Function
	reqTimeOut?: number
	calls:       number
	escapable:   boolean
	timeout:     number
	resolve:     Function
	reject:      Function
}> = []
const lockScrollID_loader = randID()

let _userActivityBlocked = false
let _loaderLastFocus = document.activeElement as HTMLElement
const _preventKeyboardNav =(e)=> e.preventDefault()

export function load<T>(
	fn: t_LoaderLoadFn,
	{timeout, escapable = true}: t_LoaderLoadOptions = {},
) {
	let resolve: Function = ()=> {}
	let reject: Function = ()=> {}
	const promise = new Promise<T>((res, rej)=> {
		resolve = res
		reject = rej
	})
	loaderStack.push({
		fn, calls: 0,
		resolve, reject,
		escapable,
		timeout: Number.isNaN(Number(timeout)) ? 30e3 : timeout as number,
	})
	if (!get$(thisStore).isLoading) {
		_callLoaderStack()
	}
	return promise
}

function _callLoaderStack(): void {
	thisStore.set({
		isLoading: true,
		escapable: loaderStack[0].escapable,
	})

	// reqTimeOut = request setTimeout
	if (loaderStack[0].timeout > 0) {
		loaderStack[0].reqTimeOut = (
			setTimeout(()=> {
				if (get$(thisStore).isLoading) {
					_failLoader()
				}
			}, loaderStack[0].timeout)
		)
	}

	if (!_userActivityBlocked) {
		_userActivityBlocked = true
		window.addEventListener('keydown', _preventKeyboardNav)
		lockScroll(lockScrollID_loader)
	}
	if (loaderStack[0].calls < 1) {
		_loaderLastFocus = document.activeElement as HTMLElement
	}
	loaderStack[0].fn(
		_resolveLoader.bind(this),
		_failLoader.bind(this),
	)
}

function _failLoader(message?: t_LoaderFailMessage): void {
	window.removeEventListener('keydown', _preventKeyboardNav)
	if (loaderStack[0].reqTimeOut) {
		clearTimeout(loaderStack[0].reqTimeOut)
	}
	thisStore.update(($)=> {
		$.isLoading = false
		return $
	})
	let failMsg = ''
	if (message) {
		if (message instanceof Error) {
			failMsg = message.message
		}
		else if (message.toString) {
			failMsg = message.toString()
		}
		else {
			failMsg = '' + message
		}
	}
	openOverlay({
		name: 'loaderFail', props: {
			message: failMsg,
			retry: ()=> _retryFetch(),
			cancel: ()=> _abortLoader(failMsg),
		},
		escapable: get$(thisStore).escapable,
	})
}

function _abortLoader(failMsg: string) {
	loaderStack[0].reject(failMsg)
	loaderStack.shift()
	if (loaderStack.length >= 1) {
		_callLoaderStack()
	} else {
		window.removeEventListener('keydown', _preventKeyboardNav)
		unlockScroll(lockScrollID_loader)
		_userActivityBlocked = false
		_loaderLastFocus.focus()
		thisStore.set({
			isLoading: false,
			escapable: true,
		})
	}
}

function _retryFetch() {
	if (get$(thisStore).isLoading) {return}

	thisStore.update(($)=> {
		if (loaderStack[0].reqTimeOut) {
			clearTimeout(loaderStack[0].reqTimeOut)
		}
		loaderStack[0].calls++
		return $
	})
	_callLoaderStack()
}

function _resolveLoader(arg: unknown) {
	const $ = get$(thisStore)
	if (loaderStack.length > 0) {
		if (loaderStack[0].reqTimeOut) {
			clearTimeout(loaderStack[0].reqTimeOut)
		}
		loaderStack[0].resolve(arg)
		loaderStack.shift()
	}

	if (loaderStack.length >= 1) {
		_callLoaderStack()
	} else {
		window.removeEventListener('keydown', _preventKeyboardNav)
		unlockScroll(lockScrollID_loader)
		_userActivityBlocked = false
		_loaderLastFocus.focus()
		thisStore.set({
			isLoading: false,
			escapable: true,
		})
	}
}
</script>



<script lang='ts'>
import Icon from '../snippets/Icon.svelte'
import {customTransition} from '../../utils/transitions'
import {lockScroll, unlockScroll} from '../../App.svelte'
import {openOverlay} from './Overlays.svelte'
import {cubicOut} from 'svelte/easing'
import {_} from 'svelte-i18n'

const spinnerTransition =(n)=> customTransition({
	duration: 200,
	easing: cubicOut,
	css: (t)=> `transform: scale(${0.8 + 0.2 * t}); opacity: ${t};`,
})
</script>



<div id='Loader' class='overlay-fixed' class:active={$thisStore.isLoading}>
	<div class='background overlay'/>
	<div class='wrapper flex flex-center'>
		{#if $thisStore.isLoading}
			<div class='spinner' transition:spinnerTransition>
				<Icon name='loader'/>
			</div>
		{/if}
	</div>
</div>



<style lang='sass'>
#Loader
	z-index: var(--idx-loader)
	contain: strict
	.background
		z-index: -1
		background-color: var(--overlay-bg)
		transition: opacity 1s var(--trans-easing)
	.wrapper
		width: 100%
		height: 100%
		.spinner
			position: absolute
			padding: 1rem
			background-color: rgb(var(--box-bg))
			border-radius: var(--modal-rounding)
			border: var(--modal-border)
			box-shadow: var(--modal-shadow)
			:global(.icon)
				--icon-size: 3rem
				--icon-primary: rgb(var(--font-heading-clr))
	&:not(.active)
		pointer-events: none
		.background
			opacity: 0
</style>
