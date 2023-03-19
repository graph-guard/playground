<script lang='ts'>
import {$ as workspace} from '../../stores/playground'
import {$ as uiState, PlaygroundTab} from '../../stores/ui_state'
import {openOverlay} from '../sections/Overlays.svelte'
import EntryList from './_EntryList.svelte'
import EntityEditor from './_EntityEditor.svelte'
import {Pane, Splitpanes} from 'svelte-splitpanes'
import rippleEffect from '../../utils/ripple'
import Icon from '../snippets/Icon.svelte'
import {onDestroy, onMount} from 'svelte'
import {newCodeEditor, type CMEditor} from '../../utils/code_mirror'
import {EditorView} from 'codemirror'
import {Compartment} from '@codemirror/state'
import {json as cmJson} from '@codemirror/lang-json'

$:wsID = $uiState.selectedWorkspaceID
$:wsUIState = $uiState.workspaces[wsID]
$:WS = $workspace.workspaces[wsID]
$:selQueryIdx = wsUIState.selectedQueryIndex
$:selQuery = WS.queries[selQueryIdx]
$:templatesIDMapByWS = workspace.derivedTemplatesIDMapByWS(wsID)
$:isEngineInited = workspace.isEngineInited
$:errors = workspace.errors
$:wsErrors = wsID in $errors ? $errors[wsID] : null
$:hasAnyErrors = (
	wsErrors !== null && (
		wsErrors.gqt !== null || wsErrors.schema !== null || Object.keys(wsErrors.templates).length > 0
	)
)
$:queryExecutionNotAllowed = !$isEngineInited || hasAnyErrors
$:wsID,selQueryIdx,updateQueryEditor(),updateVariablesEditor();

function openDeleteConfirmDialog() {
	let title = `Delete untitled query ${selQueryIdx+1}`
	if (selQuery.name) {
		title = `Delete query "${selQuery.name}"`
	}
	openOverlay({name: 'dialog', props: {
		title,
		message: 'Are you sure you want to delete this query?',
		secondary: {
			action: (x)=> x(),
			label: 'Cancel',
		},
		primary: {
			action(x) {
				workspace.deleteQuery(wsID as string, selQueryIdx)
				uiState.selectQuery(selQueryIdx >= WS.queries.length ? WS.queries.length-1 : selQueryIdx)
				x()
			},
			type: 'red',
			label: 'Yes, delete',
		},
	}})
}

function onNameInput(name: string) {
	workspace.updateQuery(wsID, selQueryIdx, {name})
}

function newQuery() {
	workspace.newQuery(wsID)
	uiState.selectQuery(WS.queries.length-1)
}

function duplicateQuery() {
	workspace.duplicateQuery(wsID, selQueryIdx)
	uiState.selectQuery(selQueryIdx+1)
}

function executeQuery() {
	if (hasAnyErrors) {return}
	workspace.executeQuery(wsID, selQuery.id)
}

function openTplRef(tplID: string) {
	const idx = WS.templates.findIndex(({id})=> id === tplID)
	if (idx === -1) {return}
	uiState.selectTemplate(idx)
	uiState.setTab(PlaygroundTab.SchemaAndTemplates)
}

const queryEditor: CMEditor = {state: null, view: null, el: null}
const variablesEditor: CMEditor = {state: null, view: null, el: null}

function updateQueryEditor() {
	queryEditor.view?.destroy()
	queryEditor.state = newCodeEditor(selQuery.query, {
		extensions: [
			EditorView.editorAttributes.of({class: 'default-theme'}),
			EditorView.updateListener.of((update)=> {
				if (update.docChanged) {
					workspace.updateQuery(wsID, selQueryIdx, {query: update.state.doc.toString()})
				}
			}),
		],
	})
	queryEditor.view = new EditorView({
		state: queryEditor.state,
		parent: queryEditor.el as HTMLElement,
	})
}

function updateVariablesEditor() {
	variablesEditor.view?.destroy()
	variablesEditor.state = newCodeEditor(selQuery.variables, {
		extensions: [
			EditorView.editorAttributes.of({class: 'default-theme'}),
			EditorView.updateListener.of((update)=> {
				if (update.docChanged) {
					workspace.updateQuery(wsID, selQueryIdx, {variables: update.state.doc.toString()})
				}
			}),
			(new Compartment).of(cmJson()),
		],
	})
	variablesEditor.view = new EditorView({
		state: variablesEditor.state,
		parent: variablesEditor.el as HTMLElement,
	})
}

onMount(()=> {
	updateQueryEditor()
	updateVariablesEditor()
})
onDestroy(()=> {
	queryEditor.view?.destroy()
	variablesEditor.view?.destroy()
})
</script>

<div id='Queries'>
	{#if WS !== null && wsUIState !== null}
	<Splitpanes theme='customSplitpanes' class='splitpanes-root'>
		<Pane snapSize={10} maxSize={25} size={20}>
			<div class='pane-contents queries-list flex flex-col'>
				<EntryList
				title='Queries'
				newEntryLabel='New Query'
				entries={WS.queries}
				selectedEntry={selQueryIdx}
				on:click={({detail})=> uiState.selectQuery(detail)}
				on:newEntry={newQuery}>
					<svelte:fragment let:idx let:entry>
						<span class='name'>{entry.name || `Query ${idx+1} (untitled)`}</span>
					</svelte:fragment>
				</EntryList>
			</div>
		</Pane>
		<Pane snapSize={15} size={40}>
			{#if selQuery !== null}
				<Splitpanes theme='customSplitpanes' horizontal>
					<Pane snapSize={15}>
						<div class='pane-contents query-editor flex flex-col'>
							<EntityEditor
							name={selQuery.name}
							nameInputLabel='Query {selQueryIdx+1} (untitled)'
							onExecuteQuery={executeQuery}
							disableQueryExecution={queryExecutionNotAllowed}
							on:delete={openDeleteConfirmDialog}
							on:duplicate={duplicateQuery}
							on:nameChange={({detail})=> onNameInput(detail)}>
								<div class='cm-editor-wrapper' bind:this={queryEditor.el}/>
							</EntityEditor>
						</div>
					</Pane>
					<Pane snapSize={15}>
						<div class='pane-contents variables-input flex flex-col'>
							<header class='title-wrapper flex flex-center-y flex-base-size'>
								<span class='title'>Variables</span>
							</header>
							<div class='pane-body flex-base-size-var pane-scrollable-content'>
								<div class='cm-editor-wrapper' bind:this={variablesEditor.el}/>
							</div>
						</div>
					</Pane>
				</Splitpanes>
			{/if}
		</Pane>
		<Pane snapSize={15} size={40}>
			<div class='pane-contents query-results flex flex-col'>
				<header class='title-wrapper flex flex-center-y flex-base-size'>
					<span class='title'>Results</span>
				</header>
				<div class='pane-body matched-templates flex-base-size-var'>
					{#if selQuery.results === null}
						<span>Execute query to get results</span>
					{:else}
						{#if selQuery.results.error !== null}
							<p class='result-error'>{selQuery.results.error}</p>
						{:else}
							<h6 class='matched-header'>
								{selQuery.results.matched.length} matched templates:
							</h6>
							<div class='matched-list grid gap-05'>
								{#each selQuery.results.matched as {refID, name} (refID)}
									<button
									on:click={()=> openTplRef(refID)} use:rippleEffect
									disabled={!(refID in $templatesIDMapByWS)}
									class='matched-tpl btn'>
										<Icon name='sheet'/>
										<span class='tpl-name'>{name}</span>
									</button>
								{:else}
									<span>No templates matched</span>
								{/each}
							</div>
						{/if}
					{/if}
				</div>
			</div>
		</Pane>
	</Splitpanes>
	{/if}
</div>

<style lang='sass'>
#Queries
	height: 100%
	width: 100%
	.queries-list
		min-width: 10vw
		.name
			overflow: hidden
			text-overflow: ellipsis
			white-space: nowrap
	.query-results
		.matched-templates
			padding: 1rem
			> .matched-list
				> .matched-tpl
					padding: 0.75rem
					--btn-font: rgb(var(--font-heading-clr))
					--icon-primary: rgb(var(--font-heading-clr))
			.matched-header
				font-size: 1.15rem
				margin-bottom: 1rem
			.result-error
				padding: 0.5rem
				background: rgba(var(--clr-red), 0.15)
				color: rgb(var(--clr-red))
				border: solid 1px rgba(var(--clr-red), 0.1)
				border-radius: 0.25rem
	.variables-input .title
		padding: 0.25rem
</style>
