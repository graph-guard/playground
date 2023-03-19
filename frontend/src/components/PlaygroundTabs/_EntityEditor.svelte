<script lang='ts'>
import {createEventDispatcher} from 'svelte'
import rippleEffect from '../../utils/ripple'
import InputAutoWidth from '../snippets/InputAutoWidth.svelte'
import Icon from '../snippets/Icon.svelte'

const dispatch = createEventDispatcher<{
	delete: void
	duplicate: void
	nameChange: string
}>()

export let name: string;
export let nameInputLabel: string;
</script>



<header class='title-wrapper grid flex-base-size'>
	<div class='input-wrapper flex flex-base-size-var'>
		<InputAutoWidth
			value={name}
			class='title'
			on:input={({detail})=> dispatch('nameChange', detail)}
			label={nameInputLabel}
		/>
	</div>

	<div class='actions flex flex-base-size flex-center-y gap-05'>
		<button on:click={()=> dispatch('delete')} use:rippleEffect class='btn btn-icon'>
			<Icon name='trash'/>
		</button>
		<button on:click={()=> dispatch('duplicate')} use:rippleEffect class='btn btn-icon'>
			<Icon name='duplicate'/>
		</button>
	</div>
</header>

<div class='flex-base-size-var flex flex-col pane-scrollable-content'>
	<slot/>
</div>



<style lang='sass'>
header
	width: 100%
	padding: 0 !important
	grid-template-columns: 1fr max-content
	> .input-wrapper
		padding: 0.5rem
		overflow: hidden
	> :global(.app-input-auto-width)
		--app-inpt-pdng: 0.5rem
	> .actions
		padding: 0.5rem
		padding-left: 0
</style>
