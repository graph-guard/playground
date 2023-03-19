<script lang='ts'>
import {$ as uiState, PlaygroundTab} from '../../stores/ui_state'
import {$ as workspace} from '../../stores/playground'
import SchemaAndTemplates from '../PlaygroundTabs/SchemaAndTemplates.svelte'
import Queries from '../PlaygroundTabs/Queries.svelte'
import rippleEffect from '../../utils/ripple'
import Icon from '../snippets/Icon.svelte'
import {openOverlay} from './Overlays.svelte'
import {onMount} from 'svelte'
import type {Unsubscriber} from 'svelte/store'
import EngineStatusIndicator from '../snippets/EngineStatusIndicator.svelte'

$:WS = $workspace.workspaces[$uiState.selectedWorkspaceID]
$:isEngineInited = workspace.isEngineInited
$:errors = workspace.errors
$:wsErrors = WS.id in $errors ? $errors[WS.id] : null
$:errorsCount = (
	wsErrors === null ? 0 : (
		wsErrors.gqt !== null || wsErrors.schema !== null ?
			1 : Object.keys(wsErrors.templates).length
	)
)
$:playLogoAnim = uiState.playLogoAnim

const tabMeta = {
	[PlaygroundTab.SchemaAndTemplates]: {
		title: 'Schema & Templates',
		component: SchemaAndTemplates,
	},
	[PlaygroundTab.Queries]: {
		title: 'Queries',
		component: Queries,
	},
}

let tabSlider = {width: 0, offset: 0}
const tabEls: {[tabKey: string]: HTMLElement} = {}

let unsubUIState: Unsubscriber;

if (!$uiState.selectedWorkspaceID || !($uiState.selectedWorkspaceID in $workspace.workspaces)) {
	uiState.selectWorkspace(Object.keys($workspace.workspaces)[0])
}

function exportWs() {
	if (!$isEngineInited) {return}
	openOverlay({name: 'export'})
}

function importWs() {
	if (!$isEngineInited) {return}
	openOverlay({name: 'import'})
}

function openWorkspacesSidebar() {
	if (!$isEngineInited) {return}
	openOverlay({name: 'workspaces'})
}

onMount(()=> {
	unsubUIState = uiState.subscribe(({selectedTab})=> {
		tabSlider.offset = tabEls[selectedTab].offsetLeft
		tabSlider.width = tabEls[selectedTab].offsetWidth
		tabSlider = tabSlider
	})
	workspace.initEngine(WS.id)
	workspace.parseAllOperations(WS.id)
	return ()=> {
		unsubUIState()
	}
})
</script>

<div id='Playground' class='grid'>
	<header class='grid'>
		<div class='left-part flex'>
			<div class='tabs flex'>
				<button
				bind:this={tabEls[PlaygroundTab.SchemaAndTemplates]}
				on:click={()=> uiState.setTab(PlaygroundTab.SchemaAndTemplates)}
				use:rippleEffect
				class:active={PlaygroundTab.SchemaAndTemplates === $uiState.selectedTab}
				class='btn flex flex-center'>
					<EngineStatusIndicator loading={!$isEngineInited} errorsCount={errorsCount}/>
					<span>{tabMeta[PlaygroundTab.SchemaAndTemplates].title}</span>
				</button>

				<button
				bind:this={tabEls[PlaygroundTab.Queries]}
				on:click={()=> uiState.setTab(PlaygroundTab.Queries)}
				use:rippleEffect
				class:active={PlaygroundTab.Queries === $uiState.selectedTab}
				class='btn flex flex-center'>
					{tabMeta[PlaygroundTab.Queries].title}
				</button>
				<div class='current-tab-slider' style:width='{tabSlider.width}px' style:left='{tabSlider.offset}px'/>
			</div>
		</div>

		<div id='GraphGuardLogo' class='flex-base-size flex'>
			<button on:click={()=> openOverlay({name: 'about'})}
			use:rippleEffect
			class='btn accent flex flex-center'
			class:welcome-closed={$playLogoAnim}
			on:transitionend={()=> playLogoAnim.set(false)}>
				<img src='app-icon/ico.svg' alt='GraphGuard'/>
			</button>
		</div>

		<div class='right-part flex'>
			<div class='actions flex-self-right flex gap-05'>
				<button on:click={importWs} use:rippleEffect disabled={!$isEngineInited} class='import btn flex gap-05 flex-center-y'>
					<Icon name='import'/>
					<span>Import</span>
				</button>

				<button on:click={exportWs} use:rippleEffect disabled={!$isEngineInited} class='export btn flex gap-05 flex-center-y'>
					<Icon name='export'/>
					<span>Export</span>
				</button>

				<button on:click={openWorkspacesSidebar} use:rippleEffect disabled={!$isEngineInited} class='workspace-selection btn flex nowrap'>
					<span class='flex-base-size-var'>{WS.name || 'Workspace (untitled)'}</span>
					<Icon name='chevron'/>
				</button>
			</div>

			<div class=' flex'>
			</div>
		</div>
	</header>
	
	<main>
		<svelte:component this={tabMeta[$uiState.selectedTab].component}/>
	</main>
</div>

<style lang='sass'>
#Playground
	height: 100%
	width: 100%
	grid-template-rows: auto 1fr
	overflow: hidden
	--playground-border: rgba(var(--font-base-clr), 0.15)
	@media (prefers-color-scheme: dark)
		--playground-border: rgb(var(--page-bg))
	header, main
		width: 100%
	header
		grid-template-columns: 1fr auto 1fr
		button
			position: relative
			padding: 0.75rem 1rem
		#GraphGuardLogo
			height: 100%
			padding: 0.5rem
			button
				padding: 0.5rem
				height: 100%
				width: 100%
				--btn-bg: transparent
				&.welcome-closed
					position: relative
					animation: 3.5s cubic-bezier(0.85, 0, 0.15, 1) welcomeClosedLogo both
					animation-delay: 0.2s
					overflow: hidden
					@keyframes welcomeClosedLogo
						0%
							transform: scale(1)
						27%
							transform: scale(2)
						35%
							transform: scale(1)
						100%
							transform: scale(1)
					&:before
						position: absolute
						content: ''
						width: 200%
						height: 200%
						background: -webkit-linear-gradient(115deg, rgb(var(--clr-accent), 0) 20%, rgb(var(--clr-accent), 0.2) 50%, rgb(var(--clr-accent), 0) 80%)
						background: -moz-linear-gradient(115deg, rgb(var(--clr-accent), 0) 20%, rgb(var(--clr-accent), 0.2) 50%, rgb(var(--clr-accent), 0) 80%)
						background: linear-gradient(115deg, rgb(var(--clr-accent), 0) 20%, rgb(var(--clr-accent), 0.2) 50%, rgb(var(--clr-accent), 0) 80%)
						animation: 3.5s var(--trans-easing) welcomeClosedLogoFlare both
						animation-delay: 0.2s
						@keyframes welcomeClosedLogoFlare
							0%
								transform: translateX(-100%)
							35%
								transform: translateX(-100%)
							100%
								transform: translateX(100%)
			img
				height: 100%
				aspect-ratio: 1/1
		.tabs
			position: relative
			padding: 0.5rem 0.5rem 0 0.5rem
			> .current-tab-slider
				position: absolute
				bottom: 0
				height: 2px
				transition: var(--trans)
				transition-property: width, left
				background-color: rgb(var(--clr-accent))
			> button
				--btn-child-gap: 0.5em
				border-radius: 0.25rem 0.25rem 0 0
				--btn-bg: transparent
				&.active
					--btn-bg: rgba(var(--clr-accent), 0.15)
					--btn-H-bg: rgba(var(--clr-accent), 0.25)
					--btn-font: rgb(var(--font-heading-clr))
					--ripple-color: rgb(var(--clr-accent))
		.actions
			padding: 0.5rem
			> button
				padding: 0.75rem
			.export, .import
				--btn-bg: transparent
			.workspace-selection
				max-width: 300px
				text-align: left
				white-space: nowrap
				:global(.icon)
					--icon-size: 0.75rem
				> span
					overflow: hidden
					text-overflow: ellipsis
	main
		overflow: hidden
		:global(header.title-wrapper)
			padding: 0.5rem
			color: rgb(var(--font-heading-clr))
			border-bottom: solid 1px var(--playground-border)
			background-color: rgba(var(--font-base-clr), 0.03)
			line-height: 1
			:global(span.title)
				text-transform: uppercase
				padding: 0.75rem
			:global(button.btn-icon)
				font-size: 1.25rem
				--btn-pdng: 0.5em
		:global(.pane-contents)
			width: 100%
			height: 100%
			contain: content
			background-color: rgb(var(--box-bg))
			border: solid 1px var(--playground-border)
			@supports (-webkit-backdrop-filter: blur(0px))
				overflow: hidden
			:global(.pane-scrollable-content)
				overflow: hidden
			:global(.cm-editor-wrapper)
				width: 100%
				height: 100%
				:global(.cm-editor)
					height: 100%
</style>
