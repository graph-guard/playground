<script lang='ts'>
import {$ as uiState, PlaygroundTab} from '../../stores/ui_state'
import {$ as workspace} from '../../stores/playground'
import SchemaAndTemplates from '../PlaygroundTabs/SchemaAndTemplates.svelte'
import Queries from '../PlaygroundTabs/Queries.svelte'
import rippleEffect from '../../utils/ripple'
import Icon from '../snippets/Icon.svelte'
import {openOverlay} from './Overlays.svelte'
import {onMount} from 'svelte'

$:WS = $workspace.workspaces[$uiState.selectedWorkspaceID]

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

let unsubUIState: ()=> void;

if (!$uiState.selectedWorkspaceID || !($uiState.selectedWorkspaceID in $workspace.workspaces)) {
	uiState.selectWorkspace(Object.keys($workspace.workspaces)[0])
}

function exportWs() {}

function importWs() {}

onMount(()=> {
	unsubUIState = uiState.subscribe(({selectedTab})=> {
		tabSlider.offset = tabEls[selectedTab].offsetLeft
		tabSlider.width = tabEls[selectedTab].offsetWidth
		tabSlider = tabSlider
	})
	workspace.initEngine(WS.id)
	return ()=> {
		unsubUIState()
	}
})
</script>

<div id='Playground' class='grid'>
	<header class='grid'>
		<div class='left-part flex'>
			<div class='tabs flex'>
				{#each Object.values(PlaygroundTab) as tab}
					<button
					bind:this={tabEls[tab]}
					on:click={()=> uiState.setTab(tab)}
					use:rippleEffect
					class:active={tab === $uiState.selectedTab}
					class='btn flex flex-center'>
						{tabMeta[tab].title}
					</button>
				{/each}
				<div class='current-tab-slider' style:width='{tabSlider.width}px' style:left='{tabSlider.offset}px'/>
			</div>
		</div>

		<div id='GraphGuardLogo' class='flex-base-size flex'>
			<button on:click={()=> openOverlay({name: 'about'})} use:rippleEffect class='btn accent flex flex-center'>
				<img src='app-icon/ico.svg' alt='GraphGuard'/>
			</button>
		</div>

		<div class='right-part flex'>
			<div class='actions flex-self-right flex gap-05'>
				<button on:click={importWs} use:rippleEffect class='import btn flex gap-05 flex-center-y'>
					<Icon name='import'/>
					<span>Import</span>
				</button>

				<button on:click={exportWs} use:rippleEffect class='export btn flex gap-05 flex-center-y'>
					<Icon name='export'/>
					<span>Export</span>
				</button>

				<button on:click={()=> openOverlay({name: 'workspaces'})} use:rippleEffect class='workspace-selection btn flex nowrap'>
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
		:global(header.title-wrapper)
			padding: 0.5rem
			color: rgb(var(--font-heading-clr))
			border-bottom: solid 1px var(--playground-border)
			background-color: rgba(var(--font-base-clr), 0.03)
			line-height: 1
			:global(span.title)
				text-transform: uppercase
				padding: 0.75rem
			:global(button)
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
</style>
