<script lang='ts' context='module'>
type T = Array<string>
export interface Props {
	selected: T
	onSelect(value: T): void
	options: {[id: string]: string}
};
</script>



<script lang='ts'>
import {onMount, tick, createEventDispatcher} from 'svelte'
import type {Readable} from 'svelte/store'
import {menuTransition} from '../../utils/transitions'
import type {t_AppMenuCoordinates, t_AppMenuDimensions, t_AppMenuOffset} from '../sections/Menus.svelte'
import rippleEffect from '../../utils/ripple'
const dispatch = createEventDispatcher<{mounted: HTMLElement}>()

export let props: Readable<Props>
export let position: t_AppMenuCoordinates
export let dimensions: t_AppMenuDimensions
export let offset: t_AppMenuOffset
export let checkBoundingBox: ()=> void

$:xTransDirection = offset?.x ? offset.x : 'left'
$:yTransDirection = offset?.y ? offset.y : 'top'

let thisEl: HTMLDivElement

tick().then(checkBoundingBox)
onMount(()=> {
	dispatch('mounted', thisEl)
})

function selectOpt(id: string) {
	const idx = $props.selected.indexOf(id)
	if (idx < 0) {
		$props.onSelect([...$props.selected, id])
	} else {
		$props.selected.splice(idx, 1)
		$props.onSelect([...$props.selected])
	}
}

function selectAll() {
	if (!areAllSelected) {
		$props.onSelect(Object.keys($props.options))
	} else {
		$props.onSelect([])
	}
}

$:areAllSelected = (
	$props.selected.length === Object.keys($props.options).length
)
</script>



<div bind:this={thisEl} class='app-menu grid default-style'
tabindex='-1' role='menu'
class:width-defined={dimensions.width !== null && !Number.isNaN(Number(dimensions.width))}
style:left={position.x + 'px'}
style:top={position.y + 'px'}
style:width={dimensions.width + 'px'}
transition:menuTransition={{x: xTransDirection, y: yTransDirection}}>
	<button on:click={selectAll} use:rippleEffect
	role='menuitem'
	class='flex gap-1 flex-center-y'
	class:active={areAllSelected}>
		<div class='selection-identicator flex flex-center'>
			<svg class='icon icon-thicker' viewBox='0 0 60 60' aria-hidden='true' focusable='false' role='presentation' fill='none' xmlns='http://www.w3.org/2000/svg'>
				<path stroke='var(--icon-primary)' stroke-linecap='round' stroke-width='var(--icon-thickness)' d='M52 14 22 46 8 31'/>
			</svg>
		</div>
		<span class='label'>
			{#if !areAllSelected}
				Select all
			{:else}
				Unselect all
			{/if}
		</span>
	</button>

	<hr class='separator'/>

	{#each Object.keys($props.options) as id}
		<button on:click={()=> selectOpt(id)} use:rippleEffect
		class='flex flex-center-y'
		class:selected={$props.selected.includes(id)}
		role='menuitem'>
			<div class='selection-identicator flex flex-center'>
				<svg class='icon icon-thicker' viewBox='0 0 60 60' aria-hidden='true' focusable='false' role='presentation' fill='none' xmlns='http://www.w3.org/2000/svg'>
					<path stroke='var(--icon-primary)' stroke-linecap='round' stroke-linejoin='round' stroke-width='var(--icon-thickness)' d='M52 14 22 46 8 31'/>
				</svg>
			</div>
			<span>{$props.options[id]}</span>
		</button>
	{/each}
</div>



<style lang='sass'>
.app-menu
	width: max-content
	max-width: 300px
	overflow: auto
	> .separator
		width: 100%
		margin: 0.5rem 0
	> button
		width: 100%
		padding: 0.5rem 1rem
		gap: 1rem
		font-weight: var(--btn-font-weight)
		transition: var(--trans)
		transition-property: background-color, color
		> .selection-identicator
			padding: 0.15rem
			border: solid 2px rgba(var(--font-base-clr), 0.1)
			border-radius: 0.25rem
			transition: border-color var(--trans)
			> .icon
				stroke-dasharray: 66
				stroke-dashoffset: 132
				--icon-primary: #fff
				--icon-thickness: 8
				> path
					transition: var(--trans)
					transition-property: stroke-dashoffset, stroke
		&:hover, &:focus
			background-color: rba(var(--font-base-clr), 0.1)
			color: rgb(var(--font-heading-clr))
		&:not(.selected):not(.active)
			> .selection-identicator > .icon
				stroke-dashoffset: 66
		&.selected, &.active
			--ripple-color: rgb(var(--clr-accent))
			background-color: rgba(var(--clr-accent), 0.1)
			color: rgb(var(--font-heading-clr))
			> .selection-identicator
				background-color: rgb(var(--clr-accent))
				border-color: rgb(var(--clr-accent))
			&:hover, &:focus
				background-color: rgba(var(--clr-accent), 0.25)
</style>
