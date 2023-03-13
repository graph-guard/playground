<script lang='ts'>
import {createEventDispatcher} from 'svelte'
const dispatch = createEventDispatcher<{toggle: void}>()
export let selected = false
</script>

<button on:click={()=> dispatch('toggle')} class='app-radiobox flex flex-center' class:selected/>

<style lang='sass'>
.app-radiobox
	flex: 0 0 auto
	height: 1.75rem
	width: 1.75rem
	border-radius: 100%
	border: solid 0.1rem rgba(var(--font-base-clr), 0.2)
	transition: var(--trans)
	transition-property: border-color
	&:before
		content: ''
		width: 50%
		height: 50%
		border-radius: inherit
		transition: var(--trans)
		transition-property: transform
		background-color: rgba(var(--font-base-clr), 0.5)
	&:hover
		border-color: rgba(var(--font-base-clr), 0.5)
	&.selected
		border-color: rgb(var(--clr-accent))
		&:before
			background-color: rgb(var(--clr-accent))
	&:not(.selected):not(:hover):before
		transform: scale(0)
</style>