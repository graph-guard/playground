<script lang='ts'>
import {fade} from '../../utils/transitions'
import Icon from './Icon.svelte'
export let loading: boolean;
export let errorsCount: number;
</script>

<div class='engine-status-indicator flex flex-center {loading ? '' : errorsCount !== 0 ? 'red' : 'green'}'>
{#if loading}
	<svg viewBox='0 0 10 10' aria-hidden=true focusable='false' role='presentation' fill='none' xmlns='http://www.w3.org/2000/svg' transition:fade={{duration: 150}}>
		<circle cy='5' cx='5' r='4.5'/>
	</svg>
{:else if errorsCount}
	<span>{errorsCount}</span>
{:else}
	<Icon name='check'/>
{/if}
</div>

<style lang='sass'>
.engine-status-indicator
	position: relative
	width: 1.25rem
	height: 1.25rem
	border-radius: 100%
	transition: var(--trans)
	background-color: transparent
	border: solid 1px transparent
	transition-property: background-color, border-color
	:global(> .icon)
		position: absolute
		--icon-size: 0.75rem
		--icon-primary: rgb(var(--clr-accent)) !important
		--icon-thickness: 3
	> span
		position: absolute
		font-size: 0.75rem
		line-height: 1
		color: #fff
	> svg
		position: absolute
		width: 100%
		height: 100%
		animation: spin 0.6s linear infinite
		> circle
			stroke: rgb(var(--clr-accent))
			stroke-width: 1
			stroke-dasharray: 7 7
		@keyframes spin
			to
				transform: rotate(360deg)
	&.red
		background-color: rgb(var(--clr-red))
	&.green
		border-color: rgb(var(--clr-accent))
</style>
