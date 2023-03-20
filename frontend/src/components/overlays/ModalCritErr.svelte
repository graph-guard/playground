{#if renderModal}
<div id='CriticalError' class='overlay-container' bind:this={thisContainer} out:fade on:outroend={modalGracefulyClosed}>
	<div bind:this={thisEl} tabindex='-1' class='modal default-style grid gap-2' out:modalTransition>
		<div class='header grid gap-15'>
			<h1 class='title flex flex-center-y gap-1'>
				<Icon name='crit-error' class='colored-icon-crit-error'/>
				<span>{$_('app_crit_error.title')}</span>
			</h1>
			<p class='message'>
				{$_('app_crit_error.msg')}
			</p>
			{#if err.details}
				<details class='err-details'>
					<summary>{$_('app_crit_error.show_detailed_error')}</summary>
					<pre>{err.details}</pre>
				</details>
			{/if}
		</div>

		<div class='footer flex flex-center-y'>
			<button on:click={reloadApp} use:rippleEffect class='btn flex-self-right'>
				{$_('app_crit_error.reload_app')}
			</button>
			<!-- <button on:click={recoverEngine} use:rippleEffect class='btn accent flex-self-right'>
				{$_('app_crit_error.recover')}
			</button> -->
		</div>

		<div class='hard-reset grid gap-1'>
			<p class='message'>
				{$_('app_crit_error.hard_reset_msg')}
			</p>
			<div class='actions'>
				<button on:click={hardReset} use:rippleEffect class='btn red'>
					{$_('app_crit_error.hard_reset')}
				</button>
			</div>
		</div>
	</div>
</div>
{/if}



<svelte:window on:focus|capture={blockKeyboardTabbingOut}/>



<script lang='ts' context='module'>
type CritErr = {reason: string, details?: string}
export type Props = {
	err: CritErr
};
</script>

<script lang='ts'>
import {_} from 'svelte-i18n'
import rippleEffect from '../../utils/ripple'
import Icon from '../snippets/Icon.svelte'
import {fade, modalTransition} from '../../utils/transitions'

let thisEl: HTMLElement;
let thisContainer: HTMLElement;
let renderModal = true

export let isOwnInstance = false
export let err: CritErr

function reloadApp() {
	window.location.reload()
}

// function recoverEngine() {
// 	window['engine'].__run()
// 	renderModal = false
// }

function hardReset() {
	if ('localStorage' in window) {
		localStorage.clear()
	}
}

function modalGracefulyClosed() {
	if (!renderModal) {
		thisContainer.parentNode?.removeChild(thisContainer)
	}
}

function blockKeyboardTabbingOut(event: FocusEvent & {currentTarget: EventTarget & Window}) {
	if (!isOwnInstance) {return}

	let isAllowedFocus = false
	for (const el of event.composedPath()) {
		if (el === thisEl) {
			isAllowedFocus = true
			break
		}
	}
	if (!isAllowedFocus) {
		event.preventDefault()
		thisEl.focus()
		return false
	}
	return true
}
</script>



<style lang='sass'>
#CriticalError
	z-index: 999
	position: fixed
	top: 0
	left: 0
	width: 100%
	height: 100%
	overflow: auto
	background-color: var(--overlay-bg)
	overscroll-behavior: contain
	contain: strict
	animation: critErrContainerAnim 250ms cubic-bezier(0.65, 0, 0.35, 1)
	> .modal
		max-width: 550px
		border-color: rgb(var(--clr-red))
		animation: critErrModalAnim 250ms cubic-bezier(0.65, 0, 0.35, 1)
		.header :global(.icon)
			--icon-size: 1.25em
		.hard-reset, .err-details
			padding: 1rem
			background-color: rgba(var(--font-base-clr), 0.05)
			border-radius: 0.25rem
			border: solid 1px rgba(var(--font-base-clr), 0.1)
		.err-details > summary
			cursor: pointer
			transition: color var(--trans)
			&:hover
				color: rgb(var(--font-heading-clr))
		.err-details > pre
			margin-top: 1em
			padding: 0.5rem
			font-family: var(--font-code-stack)
			background-color: rgb(var(--page-bg))
			color: rgb(var(--font-heading-clr))
			border: solid 1px rgba(var(--font-base-clr), 0.1)
			border-radius: 0.25rem
			overflow: auto

@keyframes critErrContainerAnim
	from
		opacity: 0
@keyframes critErrModalAnim
	from
		transform: translateY(-1rem) scale(0.9)
</style>
