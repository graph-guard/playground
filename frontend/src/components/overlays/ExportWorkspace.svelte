<div class='overlay-container'>
	<!-- svelte-ignore a11y-click-events-have-key-events -->
	<div class='background' on:click={closeThis} transition:fade/>
	<div bind:this={thisEl} tabindex='-1' class='dialog-modal modal default-style' transition:modalTransition>
		{#if props.title}
			<div class='header'>
				<h1 class='title'>Export</h1>
				{#if escapable}
					<button on:click={closeThis} use:rippleEffect class='close-modal btn'>
						<Icon name='cross'/>
					</button>
				{/if}
			</div>
		{/if}
		{#if props.message}
			<div class='body'>
				<p class='message'>{props.message}</p>
			</div>
		{/if}
		{#if props.primary}
			<div class='footer flex flex-center'>
				{#if props.primary && props.secondary}
					<button on:click={btnSeco}
					use:rippleEffect
					disabled={secondaryDisabled}
					class='btn flex-self-left {props.secondary.type || ''}'>
						{props.secondary.label}
					</button>

					<button on:click={btnPrim}
					use:rippleEffect
					disabled={primaryDisabled}
					class='btn flex-self-right {props.primary.type || ''}'>
						{props.primary.label}
					</button>
				{:else if props.primary}
					<button on:click={btnPrim}
					use:rippleEffect
					disabled={primaryDisabled}
					class='btn flex-self-right {props.primary.type || ''}'>
						{props.primary.label}
					</button>
				{/if}
			</div>
		{/if}
		<div>
			<div class='header'></div>
			<pre></pre>
		</div>
	</div>
</div>



<script lang='ts' context='module'>
type CloseCallback = (close: ()=> void)=> void
type BtnType = 'primary'|'accent'|'red'|'yellow'|'green'
interface Btn {
	label:               string
	action:              CloseCallback
	type?:               BtnType
	delayedInteraction?: number
}

export type Props = {
	title?:     string
	message?:   string
	primary?:   Btn
	secondary?: Btn
}; // semicolon fixes syntax highlighting
</script>

<script lang='ts'>
import {onMount} from 'svelte'
import {fade, modalTransition} from '../../utils/transitions'
import {createEventDispatcher} from 'svelte'
import rippleEffect from '../../utils/ripple'
import Icon from '../snippets/Icon.svelte'
const dispatch = createEventDispatcher<{close: void, mounted: HTMLElement}>()

let thisEl: HTMLElement

onMount(()=> {
	dispatch('mounted', thisEl)
})

export let props: Props
export let escapable: boolean|undefined

if (!props.title && !props.message) {
	throw new Error(
		'[DialogModal]: missing props "title" & "message", ' +
			'requires at least one'
	)
}
if (props.secondary && !props.primary) {
	throw new Error(
		'[DialogModal]: may only take primary and secondary or ' +
			'just a primary button'
	)
}
if (!escapable && !props.secondary && !props.primary) {
	throw new Error(
		'[DialogModal]: the user is trapped, because both a primary & ' +
			'secondary action are missing & escaping is not allowed'
	)
}

function closeThis() {
	dispatch('close')
}

function btnPrim(): void {
	if (!props.primary && !props.secondary) {closeThis()}
	else {props.primary?.action(closeThis)}
}
function btnSeco(): void {
	props.secondary?.action(closeThis)
}

let primaryDisabled = false
let secondaryDisabled = false

onMount(()=> {
	let _primaryDelayInteractTO: number|null = null
	if (props.primary?.delayedInteraction) {
		primaryDisabled = true
		_primaryDelayInteractTO = setTimeout(
			()=> {primaryDisabled = false},
			props.primary.delayedInteraction,
		)
	}

	let _secondaryDelayInteractTO: number|null = null
	if (props.secondary?.delayedInteraction) {
		secondaryDisabled = true
		_secondaryDelayInteractTO = setTimeout(
			()=> {secondaryDisabled = false},
			props.secondary.delayedInteraction,
		)
	}

	return ()=> {
		if (_primaryDelayInteractTO !== null) {clearTimeout(_primaryDelayInteractTO)}
		if (_secondaryDelayInteractTO !== null) {clearTimeout(_secondaryDelayInteractTO)}
	}
})
</script>



<style lang='sass'>
.modal
	width: 100%
	max-width: 800px
	.header
		margin-bottom: 1rem
		> h1
			font-size: 1.75rem
	.footer
		margin-top: 2rem
</style>
