<script lang='ts'>
import {createEventDispatcher} from 'svelte'
const dispatch = createEventDispatcher<{toggle: void}>()
export let disabled = false
export let checked = false
</script>

<button class='app-checkbox flex flex-center' class:checked on:click={()=> dispatch('toggle')} {disabled}>
	<svg viewBox='0 0 24 24' fill='none' xmlns='http://www.w3.org/2000/svg'>
		<path stroke='var(--icon-primary)' stroke-width='var(--icon-thickness)' stroke-linecap='round' stroke-linejoin='round' d='M22 5L8 19L2 12H20'/>
	</svg>
</button>

<style lang='sass'>
.app-checkbox
	position: relative
	width: var(--checkbox-size)
	height: var(--checkbox-size)
	padding: var(--checkbox-pdng)
	cursor: pointer
	border-radius: var(--checkbox-rounding)
	background-color: var(--checkbox-bg)
	border: var(--checkbox-border) var(--checkbox-border-clr)
	box-shadow: var(--checkbox-shadow)
	transition: var(--trans)
	transition-property: background-color, box-shadow, border-color
	will-change: background-color, box-shadow, border-color
	contain: layout
	&:hover, &:focus
		background-color: var(--checkbox-H-bg)
		border-color: var(--checkbox-H-border-clr)
		box-shadow: var(--checkbox-H-shadow)
	> svg
		width: 100%
		height: 100%
		--icon-primary: var(--checkbox-symbole)
		--icon-thickness: 3
		stroke-dasharray: 48
		stroke-dashoffset: 48
		> *
			transition: 150ms var(--trans-easing)
			transition-property: stroke-dashoffset, stroke-dasharray, stroke
	&.checked
		background-color: rgb(var(--checkbox-clr))
		border-color: rgb(var(--checkbox-clr))
		> svg
			--icon-primary: var(--checkbox-A-symbole)
		&:hover, &:focus
			background-color: var(--checkbox-A-H-bg)
			border-color: rgb(var(--box-bg))
			box-shadow: 0 0 0 0.25em rgba(var(--checkbox-clr), 0.15)
	&.checked > svg
		stroke-dasharray: 33
		stroke-dashoffset: 70
</style>
