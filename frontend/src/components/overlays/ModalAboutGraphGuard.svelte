<div class='overlay-container'>
	<!-- svelte-ignore a11y-click-events-have-key-events -->
	<div class='background' on:click={closeThis} in:fade={transitionDuration} out:bgOutTransition/>
	<div bind:this={thisEl}
	tabindex='-1'
	class='dialog-modal modal default-style'
	in:modalTransition={transitionDuration}
	out:modalOutTransition>
		<button on:click={closeThis} use:rippleEffect class='close-modal btn'>
			<Icon name='cross'/>
		</button>

		<div class='flex flex-center'>
			<img src='app-icon/ico.svg' alt='Graph Guard Logo' class='graph-guard-logo'/>
		</div>
		<div class='title'>
			<h1 class='name'>Graph Guard Playground</h1>
			<span class='version'>v1.0.0</span>
		</div>

		<section class='message'>
			<p>
				The GraphGuard playground allows you to explore
				<a href='https://github.com/graph-guard/gqt' target='_blank' rel='noreferrer'>
					GQT (GraphQL Template Language)
				</a>
				and share examples with others.
			</p>
			<p>
				Visit <a href='https://docs.graphguard.io' target='_blank' rel='noreferrer'>docs.graphguard.io</a>
				for more information and help.</p>
			<p>
				🚧 ggproxy is currently under development and as such, it may contain bugs or other issues. Our team is
				working hard to ensure stablity and reliability, but it is important to note that there may be
				unforeseen issues that arise during the development process.
			</p>
			<p>
				Please don't hesitate to contact us directly at
				<a href='email:support@graphguard.io' target='_blank' rel='noreferrer'>
					support@graphguard.io
				</a>
				or through one of our community portals
			</p>
		</section>

		<section class='links'>
			<div class='list flex gap-05 flex-center-x'>
				<a href='https://twitter.com/GraphGuard' target='_blank' rel='noreferrer'
				class='flex flex-center-y gap-05 twitter'
				use:rippleEffect>
					<Icon name='twitter'/>
					<span>Twitter</span>
				</a>

				<a href='https://t.me/graphguard' target='_blank' rel='noreferrer'
				class='flex flex-center-y gap-05 telegram'
				use:rippleEffect>
					<Icon name='telegram'/>
					<span>Telegram</span>
				</a>

				<a href='https://graphguard.io' target='_blank' rel='noreferrer'
				class='flex flex-center-y gap-05 graphguard'
				use:rippleEffect>
					<Icon name='graphguard'/>
					<span>graphguard.io</span>
				</a>

				<a href='https://github.com/graph-guard' target='_blank' rel='noreferrer'
				class='flex flex-center-y gap-05 github'
				use:rippleEffect>
					<Icon name='github'/>
					<span>GitHub</span>
				</a>
			</div>
		</section>
	</div>
</div>




<script lang='ts' context='module'>
import newLocalStorageKey from '../../stores/_local_storage_prefix'
export type Props = void | {
	welcome: boolean;
};
export const welcomeModalLocStrKey = newLocalStorageKey('welcome')
</script>

<script lang='ts'>
import {onMount} from 'svelte'
import {customTransition, fade, modalTransition} from '../../utils/transitions'
import {createEventDispatcher} from 'svelte'
import rippleEffect from '../../utils/ripple'
import {$ as uiState} from '../../stores/ui_state'
import Icon from '../snippets/Icon.svelte'
import {cubicOut, cubicInOut} from 'svelte/easing'
const dispatch = createEventDispatcher<{close: void, mounted: HTMLElement}>()

let thisEl: HTMLElement
export let props: Props;

let transitionDuration = props?.welcome ? {duration: 1e3} : undefined
let bgOutTransition = props?.welcome ? welcomeBgOutTransition : fade
let modalOutTransition = props?.welcome ? welcomeModalOutTransition : modalTransition

function welcomeBgOutTransition(n, o?) {
	return customTransition({duration: 1200, easing: cubicInOut, css: (t)=> `opacity: ${t}`})
}

function welcomeModalOutTransition(node: HTMLElement, o?) {
	const x = node.offsetTop * 3.5
	const style = getComputedStyle(node)
	return customTransition({
		duration: 1200,
		css: (t)=> {
			const t2 = cubicInOut(t)
			return (
				`transform-origin: top;` +
				`transform: scale(${t2}) translateY(-${x - x * cubicOut(t)}%);` +
				`opacity: ${t2};` +
				`border-radius: ${parseInt(style.borderRadius, 10) + (150 - 150 * t2)}px;`
			)
		},
	})
}

onMount(()=> {
	dispatch('mounted', thisEl)
})

function closeThis() {
	dispatch('close')
	if (props?.welcome) {uiState.playLogoAnim.set(true)}
	if ('localStorage' in window) {
		const lastTimeOpened = localStorage.getItem(welcomeModalLocStrKey)
		if (!lastTimeOpened) {
			localStorage.setItem(welcomeModalLocStrKey, Date.now().toString())
		}
	}
}
</script>



<style lang='sass'>
.modal
	width: 100%
	max-width: 500px
	text-align: center
	padding: 3.5rem
	.close-modal
		top: 2rem
		right: 2rem
	.graph-guard-logo
		height: 100px
		aspect-ratio: 1/1
		animation: logoZoom 0.25s var(--trans-easing)
		transform-origin: bottom
		@keyframes logoZoom
			from
				opacity: 0
				transform: scale(0.25)
	> .title
		margin-top: 1rem
		> h1
			font-size: 1.75rem
		> .version
			color: rgba(var(--font-base-clr), 0.5)
	section.message
		margin: 4rem 0
		a
			transition: var(--trans) color
			&:hover
				color: rgb(var(--clr-accent))
		p:not(:last-child)
			margin-bottom: 1rem
	section.links
		.list
			> a
				padding: 0.5rem
				border-radius: 0.5rem
				transition: var(--trans)
				transition-property: background-color, color
				text-decoration: none
				color: rgb(var(--font-heading-clr))
				&.graphguard
					--icon-primary: rgb(var(--clr-accent))
					--ripple-color: rgb(var(--clr-accent))
					--bg: rgba(var(--clr-accent), 0.05)
					--bg-h: rgba(var(--clr-accent), 0.2)
				&.twitter
					--icon-primary: #55ADED
					--ripple-color: rgb(85, 173, 237)
					--bg: rgba(85, 173, 237, 0.05)
					--bg-h: rgba(85, 173, 237, 0.2)
				&.telegram
					--icon-primary: #179CDE
					--ripple-color: rgb(23, 156, 222)
					--bg: rgba(23, 156, 222, 0.05)
					--bg-h: rgba(23, 156, 222, 0.2)
				&.github
					--icon-primary: #1B1817
					--ripple-color: rgb(27, 24, 23)
					--bg: rgba(27, 24, 23, 0.05)
					--bg-h: rgba(27, 24, 23, 0.2)
					@media (prefers-color-scheme: dark)
						--icon-primary: #fff
						--bg: rgba(27, 24, 23, 0.4)
						--bg-h: rgba(27, 24, 23, 0.8)
				background-color: var(--bg)
				&:hover
					background-color: var(--bg-h)
</style>
