<script lang='ts' context='module'>
export interface Props {
	selected: string|null
	onSelect(value: string): void
	options: {[id: string]: string}
};
</script>



<script lang='ts'>
import {tick, createEventDispatcher, onMount} from 'svelte'
import type {Readable} from 'svelte/store'
import {menuTransition} from '../../utils/transitions'
import type {t_AppMenuCoordinates, t_AppMenuOffset} from '../sections/Menus.svelte'
import rippleEffect from '../../utils/ripple'
const dispatch = createEventDispatcher<{close: void, mounted: HTMLElement}>()

export let props: Readable<Props>
export let offset: t_AppMenuOffset|undefined
export let position: t_AppMenuCoordinates
export let checkBoundingBox: ()=> void

$:xTransDirection = offset?.x ? offset.x : 'left'
$:yTransDirection = offset?.y ? offset.y : 'top'

let thisEl: HTMLDivElement

tick().then(checkBoundingBox)
onMount(()=> {
	dispatch('mounted', thisEl)
})

function selectOpt(id: string) {
	$props.onSelect(id)
	dispatch('close')
}
</script>



<div bind:this={thisEl} class='app-menu grid default-style'
tabindex='-1' role='menu'
style:left={position.x + 'px'}
style:top={position.y + 'px'}
transition:menuTransition={{x: xTransDirection, y: yTransDirection}}>
	{#each Object.keys($props.options) as id}
		{#if $props.selected !== id}
			<button on:click={()=> selectOpt(id)} use:rippleEffect class='btn' role='menuitem'>
				<span>{$props.options[id]}</span>
			</button>
		{/if}
	{/each}
</div>



<style lang='sass'>
.app-menu
	width: max-content
	max-width: 300px
	.btn
		--btn-border: solid 0
		--btn-bg: transparent
		--btn-rounding: 0
		--btn-shadow: none
		--btn-H-bg: rgba(var(--font-base-clr), 0.1)
		--btn-H-shadow: none
		--btn-A-shadow: none
		--btn-child-gap: 1rem
		padding: 0.65rem 1rem
</style>
