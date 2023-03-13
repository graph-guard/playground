<script lang='ts' context='module'>
export interface Props {
	optionGroups: Array<Array<{
		label: string
		icon?: IconName
		fn: (close: ()=> void)=> void
	}>>
};
</script>



<script lang='ts'>
import {tick, createEventDispatcher, onMount} from 'svelte'
import type {Readable} from 'svelte/store'
import {menuTransition} from '../../utils/transitions'
import type {t_AppMenuCoordinates, t_AppMenuOffset} from '../sections/Menus.svelte'
import rippleEffect from '../../utils/ripple'
import type {IconName} from '../snippets/Icon.svelte'
import Icon from '../snippets/Icon.svelte'
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
</script>



<div bind:this={thisEl} class='app-menu grid default-style'
tabindex='-1' role='menu'
style:left={position.x + 'px'}
style:top={position.y + 'px'}
transition:menuTransition={{x: xTransDirection, y: yTransDirection}}>
	{#each $props.optionGroups as options, grpIdx}
		{#each options as {label, icon, fn}}
		<button on:click={()=> fn(()=> dispatch('close'))} use:rippleEffect class='btn' role='menuitem'>
				{#if icon}
					<Icon name={icon}/>
				{/if}
				<span class='label'>{label}</span>
			</button>
		{/each}
		{#if grpIdx < $props.optionGroups.length-1}
			<hr class='separator'/>
		{/if}
	{/each}
</div>



<style lang='sass'>
.app-menu
	width: max-content
	max-width: 300px
	.separator
		width: 100%
		margin: 0.5rem 0
	.btn
		width: 100%
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
