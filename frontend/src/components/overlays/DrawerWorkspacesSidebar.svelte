<script lang='ts'>
import {$ as workspace} from '../../stores/playground'
import {$ as uiState} from '../../stores/ui_state'
import rippleEffect from '../../utils/ripple'
import Icon from '../snippets/Icon.svelte'
import {fade, drawerTransition} from '../../utils/transitions'
import {createEventDispatcher} from 'svelte'
import RadioBox from '../snippets/RadioBox.svelte'
import {openOverlay} from '../sections/Overlays.svelte'
import {trimStr} from '../../utils/misc'
import InputAutoWidth from '../snippets/InputAutoWidth.svelte'
import {load} from '../sections/Loader.svelte'
const dispatch = createEventDispatcher<{close: void, mounted: HTMLElement}>()

function closeThis() {
	dispatch('close')
}

$:wsID = $uiState.selectedWorkspaceID
$:timeSortedWorkspaces = Object.values($workspace.workspaces).sort((a, b)=> {
	if (a.creation < b.creation) {return 1}
	if (a.creation > b.creation) {return -1}
	return 0
})

let workspaceAboutToDelete: number|null = null
function deleteWs(idx: number) {
	workspaceAboutToDelete = idx
	const wsMsgName = (
		timeSortedWorkspaces[idx].name ?
		`workspace "${trimStr(timeSortedWorkspaces[idx].name, 30)}"`
		: 'untitlted workspace'
	)
	openOverlay({name: 'dialog', props: {
		title: 'Delete workspace?',
		message: (
			`Are you sure to delete the ${wsMsgName} created on ` +
			`${new Date(timeSortedWorkspaces[idx].creation).toLocaleString('en-EN')}?`
		),
		secondary: {
			label: 'Cancel',
			action: (x)=> x(),
		},
		primary: {
			label: 'Yes, delete',
			type: 'red',
			action(x) {
				if (timeSortedWorkspaces[idx].id === wsID && timeSortedWorkspaces.length > 1) {
					uiState.selectWorkspace(timeSortedWorkspaces[idx-1 < 0 ? idx+1 : idx-1].id)
				}
				workspace.deleteWorkspace(timeSortedWorkspaces[idx].id)
				x()
			}
		},
	}}).then(()=> {
		workspaceAboutToDelete = null
	})
}

function selectWs(id: string) {
	uiState.selectWorkspace(id)
	closeThis()
}

function newWs() {
	uiState.selectWorkspace(workspace.newWorkspace(''))
	closeThis()
}

function newExampleWs() {
	load(async (resolve)=> {
		uiState.selectWorkspace(await workspace.addExampleWorkspaceStarwars())
		closeThis()
		resolve()
	})
}

function onWsNameInput(id: string, name: string) {
	workspace.updateWorkspace(id, {name})
}

function eraseAllData() {
	workspace.eraseAllData()
}

function onDelAllWs() {
	if (timeSortedWorkspaces.length < 2) {
		deleteWs(0)
		return
	}

	openOverlay({name: 'dialog', props: {
		title: 'Delete ALL workspaces?',
		message: `Are you sure to delete all ${timeSortedWorkspaces.length} workspaces?`,
		secondary: {
			label: 'Cancel',
			action: (x)=> x(),
		},
		primary: {
			label: 'Yes, delete',
			type: 'red',
			delayedInteraction: 2000,
			action(x) {
				eraseAllData()
				x()
			}
		},
	}})
}
</script>

<script lang='ts' context='module'>
export type Props = void;
</script>



<div id='WorkspacesSidebar' class='overlay-container'>
	<!-- svelte-ignore a11y-click-events-have-key-events -->
	<div class='background' on:click={()=> closeThis()} transition:fade/>
	<div class='drawer flex flex-col' transition:drawerTransition={{direction: 'left'}}>
		<div class='workspaces-list grid gap-05 grid-top flex-base-size-var'>
			<div class='grid grid-2 gap-05'>
				<button on:click={newWs} use:rippleEffect class='btn'>
					<Icon name='plus'/>
					<span>New workspace</span>
				</button>

				<button on:click={newExampleWs} use:rippleEffect class='btn'>
					<Icon name='plus'/>
					<span>Starwars example</span>
				</button>
			</div>

			{#each timeSortedWorkspaces as {id, name, creation}, idx (id)}
				<div class='workspace flex flex-center-y nowrap gap-05'
				class:selected={id === wsID}
				class:about-to-delete={idx === workspaceAboutToDelete}>
					<RadioBox selected={id === wsID} on:toggle={()=> selectWs(id)}/>
					<div class='content flex-base-size-var flex gap-05'>
						<InputAutoWidth
							value={name}
							class='title'
							on:input={({detail})=> onWsNameInput(id, detail)}
							label={'Workspace (untitled)'}
						/>
						<span class='flex-full-size'>
							{new Date(creation).toLocaleString('en-EN')}
						</span>
					</div>
					<button on:click={()=> deleteWs(idx)} use:rippleEffect class='btn delete'>
						<Icon name='trash'/>
					</button>
				</div>
			{/each}

			{#if timeSortedWorkspaces.length > 1}
				<button on:click={onDelAllWs} use:rippleEffect class='del-all-ws btn red'>
					<Icon name='trash'/>
					<span>Delete all workspaces</span>
				</button>
			{/if}
		</div>
	</div>
</div>



<style lang='sass'>
#WorkspacesSidebar
	padding: 0
	> .drawer
		width: 500px
		margin-left: auto
		overflow: hidden
		background-color: rgba(var(--box-bg))
		box-shadow: 0 0 20px var(--shadow-dark-clr)
		> .workspaces-list
			height: 0
			width: 100%
			padding: 1.5rem
			overflow: auto
			> .workspace
				padding: 0 1rem
				background-color: rgba(var(--font-base-clr), 0.05)
				border-radius: 0.25rem
				border: solid 1px transparent
				transition: var(--trans) background-color, border-color
				> :global(.app-radiobox)
					flex: 0 0 auto
				> .content
					padding: 0.75rem
					overflow: hidden
					> :global(.app-input-auto-width)
						font-size: 1.15rem
				&.selected
					background-color: rgba(var(--clr-accent), 0.15)
				> .delete
					padding: 0.25rem
					--icon-size: 1.25rem
				&.about-to-delete
					background-color: rgba(var(--clr-red), 0.15)
					border-color: rgb(var(--clr-red))
			> .del-all-ws
				margin-top: 2rem
</style>
