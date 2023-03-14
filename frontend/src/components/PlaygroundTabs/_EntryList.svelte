<script lang='ts'>
import rippleEffect from '../../utils/ripple'
import {createEventDispatcher} from 'svelte'
import Icon from '../snippets/Icon.svelte'
const dispatch = createEventDispatcher<{click: number, newEntry: void}>()

type EntryType = $$Generic<unknown>

export let title: string;
export let entries: Array<EntryType>;
export let newEntryLabel: string;
export let selectedEntry: number;
</script>



<header class='title-wrapper flex flex-center-y flex-base-size'>
	<span class='title'>{title}</span>
	<button on:click={()=> dispatch('newEntry')} use:rippleEffect class='btn accent flex-self-right'>
		<Icon name='plus'/>
	</button>
</header>

<div class='list flex-base-size-var'>
	{#each entries as entry, idx (entry)}
		<button
		on:click={()=> dispatch('click', idx)}
		use:rippleEffect
		class='entry flex nowrap'
		class:active={idx === selectedEntry}>
			<slot entry={entry} idx={idx}/>
		</button>
	{/each}

	<div class='add-entry grid'>
		<button on:click={()=> dispatch('newEntry')} use:rippleEffect class='btn accent'>
			<Icon name='plus'/>
			<span>{newEntryLabel}</span>
		</button>
	</div>
</div>



<style lang='sass'>
header button
	--btn-pdng: 0.5rem

.list
	height: 0
	width: 100%
	overflow-y: auto
	> .entry
		width: 100%
		padding: 1rem
		border-right: solid 3px transparent
		transition: var(--trans)
		transition-property: border-color, background-color, color
		border-bottom: solid 1px var(--playground-border)
		&.active
			background-color: rgba(var(--clr-accent), 0.1)
			border-right-color: rgb(var(--clr-accent))
			color: rgb(var(--font-heading-clr))
			--ripple-color: rgb(var(--clr-accent))
	> .add-entry
		padding: 0.5rem
</style>
