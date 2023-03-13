<div class='overlay-container'>
	<!-- svelte-ignore a11y-click-events-have-key-events -->
	<div
		class='background'
		transition:fade
		on:click={()=> {if (escapable) cancelLoad()}}
	/>
	<div bind:this={thisEl} tabindex='-1' class='loader-fail-modal modal default-style' transition:modalTransition>
		<div class='header'>
			<h1 class='title flex flex-center-y gap-1'>
				{#if escapable}
					<Icon name='error-circle' classes='colored-icon-error'/>
				{:else}
					<Icon name='crit-error' classes='colored-icon-crit-error'/>
				{/if}
				<span>Failed to load</span>
			</h1>
			{#if escapable}
				<button on:click={cancelLoad} use:rippleEffect class='close-modal btn'>
					<Icon name='cross'/>
				</button>
			{/if}
		</div>
		{#if props.message}
			<div class='body'>
				<p class='message'>{props.message}</p>
			</div>
		{/if}
		<div class='footer flex flex-center'>
			{#if escapable}
				<button on:click={cancelLoad} use:rippleEffect class='btn'>
					Cancel
				</button>
			{/if}
			<button on:click={retryLoad} use:rippleEffect class='btn flex-self-right'>
				Retry
			</button>
		</div>
	</div>
</div>



<script lang='ts' context='module'>
export type Props = {
	message?: string
	cancel?:  Function
	retry?:   Function
}; // semicolon fixes syntax highlighting
</script>

<script lang='ts'>
import {_} from 'svelte-i18n'
import {onMount, createEventDispatcher} from 'svelte'
import {fade, modalTransition} from '../../utils/transitions'
import rippleEffect from '../../utils/ripple'
import Icon from '../snippets/Icon.svelte'
const dispatch = createEventDispatcher<{close: void, mounted: HTMLElement}>()

let thisEl: HTMLElement
onMount(()=> {
	dispatch('mounted', thisEl)
})

export let props: Props;
export let escapable: boolean;

function retryLoad() {
	dispatch('close')
	if (props.retry) {props.retry()}
}

function cancelLoad() {
	dispatch('close')
	if (props.cancel) {props.cancel()}
}
</script>



<style lang='sass'>
.modal
	width: 500px
	max-width: 100%
	.message
		display: block
	.header
		margin-bottom: 1rem
		> .title
			font-size: 1.75rem
			:global(.icon)
				--icon-size: 1.25em
	.footer
		margin-top: 2rem
</style>
