<script lang='ts'>
import type {t_Toast} from '../sections/Toasts.svelte'
import {cubicInOut} from 'svelte/easing'
import {createEventDispatcher} from 'svelte'
import {customTransition} from '../../utils/transitions'
import rippleEffect from '../../utils/ripple'
import Icon from './Icon.svelte'
const dispatch = createEventDispatcher<{
	close: void, pointerOver: unknown, pointerLeave: unknown,
}>()

export let toast: t_Toast;

const popIn =(n, o: void)=> customTransition({
	duration: 500,
	easing: cubicInOut,
	css: (t)=> (
		`pointer-events: none;` +
		`transform: translateY(${100 - 100 * t}%);` +
		`opacity: ${t};`
	),
})

const slideOut =(n, o: void)=> customTransition({
	duration: 500,
	easing: cubicInOut,
	css: (t)=> (
		`pointer-events: none;` +
		`z-index: -10;` +
		`transform: translateX(-${110 - 110 * t}%);`
	),
})
</script>



<div class='toast {toast.style || ''}' in:popIn out:slideOut
class:hovered={toast.beingHovered}
on:pointerover={()=> dispatch('pointerOver')}
on:pointerleave={()=> dispatch('pointerLeave')}>
	<div class='wrapper grid gap-1'>
		<div class='content flex nowrap gap-1'>
			{#if toast.style}
				<div class='symbol flex'>
					{#if toast.style === 'error'}
						<Icon name='error-circle'/>
					{:else if toast.style === 'info'}
						<Icon name='info-circle'/>
					{:else if toast.style === 'warn'}
						<Icon name='warn' classes='colored-icon-warn'/>
					{:else if toast.style === 'success'}
						<Icon name='check-circle'/>
					{/if}
				</div>
			{/if}
			<p class='msg flex-base-size-var'>{toast.msg}</p>
			<div class='close-toast-wrapper'>
				<button on:click={()=> dispatch('close')} use:rippleEffect
				class='close-toast btn flex flex-center flex-base-size'>
					<Icon name='cross'/>
				</button>
			</div>
		</div>
		{#if toast.action}
			<div class='actions flex-full-size'>
				<button on:click={()=> toast.action?.fn(()=> dispatch('close'))}
				use:rippleEffect class='btn'>
					{toast.action.label}
				</button>
			</div>
		{/if}
		<div
			class='toast-finish-progress'
			style='animation-duration: {toast.duration}ms;'
		/>
	</div>
</div>



<style lang='sass'>
.toast
	position: relative
	z-index: 10
	width: 30vw
	max-width: 800px
	min-width: 500px
	margin-top: .5rem
	background-color: var(--toast-bg)
	color: rgb(var(--font-heading-clr))
	box-shadow: var(--toast-shadow)
	border-radius: .5rem .5rem .5rem .25rem
	contain: content
	> .wrapper
		padding: 1rem
		border: solid rgba(var(--font-base-clr), 0.5)
		border-width: 0 0 3px 0
		border-radius: inherit
		.symbol :global(.icon)
			--icon-size: 1.5rem
	.close-toast
		padding: .25rem
		--btn-bg: rgba(var(--font-base-clr), 0.1)
		--btn-font: rgb(var(--font-heading-clr))
	.toast-finish-progress
		position: absolute
		bottom: 0
		left: 0
		width: 100%
		height: 3px
		border-radius: 0 0 .5rem .5rem
		transition: var(--trans)
		transition-property: opacity
		background-color: rgb(var(--font-base-clr))
		animation: progress linear alternate both
		transform-origin: left
	&.error > .wrapper
		background-color: rgba(var(--clr-red), 0.1)
		border-color: rgb(var(--clr-red-darker))
		.toast-finish-progress
			background-color: rgb(var(--clr-red-brighter))
		.symbol :global(.icon)
			--icon-primary: rgb(var(--clr-red))
	&.warn > .wrapper
		background-color: rgba(var(--clr-yellow), 0.1)
		border-color: rgb(var(--clr-yellow-darker))
		.toast-finish-progress
			background-color: rgb(var(--clr-yellow))
	&.info > .wrapper
		background-color: rgba(var(--clr-blue), 0.1)
		border-color: rgb(var(--clr-blue-darker))
		.toast-finish-progress
			background-color: rgb(var(--clr-blue))
		.symbol :global(.icon)
			--icon-primary: rgb(var(--clr-blue))
	&.success > .wrapper
		background-color: rgba(var(--clr-green), 0.1)
		border-color: rgb(var(--clr-green-darker))
		.toast-finish-progress
			background-color: rgb(var(--clr-green))
		.symbol :global(.icon)
			--icon-primary: rgb(var(--clr-green))
	&.hovered .toast-finish-progress
		animation: none

@keyframes progress
	from
		transform: scaleX(1)
	to
		transform: scaleX(0)
</style>
