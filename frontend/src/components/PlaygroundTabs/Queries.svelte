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
import {hasMenu} from '../sections/Menus.svelte'
import type {Props as ListMenuProps} from '../menus/List.svelte'

$:wsID = $uiState.selectedWorkspaceID
$:wsUIState = $uiState.workspaces[wsID]
$:WS = $workspace.workspaces[wsID]
$:selQueryIdx = wsUIState.selectedQueryIndex
$:selQuery = WS.queries[selQueryIdx]
$:selQueryName = selQuery.id in wsUIState.selectedQueryName ? wsUIState.selectedQueryName[selQuery.id] : null
$:templatesIDMapByWS = workspace.derivedTemplatesIDMapByWS(wsID)
$:isEngineInited = workspace.isEngineInited
$:errors = workspace.errors
$:wsErrors = wsID in $errors ? $errors[wsID] : null
$:hasAnyErrors = (
	wsErrors !== null && (
		wsErrors.gqt !== null || wsErrors.schema !== null ||
		Object.keys(wsErrors.templates).length > 0 || selQuery.id in wsErrors.queries
	)
)
$:parsedQueries = workspace.parsedOperations
$:parsedQuery = (
	wsID in $parsedQueries && selQuery.id in $parsedQueries[wsID] ?
	$parsedQueries[wsID][selQuery.id] : null
)
$:queryResults = workspace.results
$:wsQueryResults = wsID in $queryResults ? $queryResults[wsID] : null
$:queryExecutionNotAllowed = !$isEngineInited || hasAnyErrors
$:wsID,selQueryIdx,updateQueryEditor(),updateVariablesEditor(),updateQueryNameList();
$:parsedQuery,updateQueryNameList();

let queryNameList: ListMenuProps = {optionGroups: []}
function updateQueryNameList() {
	queryNameList = {optionGroups: [
		(parsedQuery || []).map(({name})=> ({
			label: name,
			fn(x) {uiState.selectQueryName(wsID, selQuery.id, name); x()},
		}))
	]}
	if (parsedQuery !== null) {
		if (parsedQuery.length < 1) {
			uiState.selectQueryName(wsID, selQuery.id, null)
		} else if (
			selQueryName === null ||
			parsedQuery.findIndex(({name})=> selQueryName === name) === -1
		) {
			uiState.selectQueryName(wsID, selQuery.id, parsedQuery[0].name)
		}
	}
}

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
	workspace.executeQuery(wsID, selQuery.id, selQueryName ?? undefined)
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
			<Splitpanes theme='customSplitpanes' horizontal>
				<Pane snapSize={15}>
					<div class='pane-contents query-results flex flex-col'>
						<header class='title-wrapper flex flex-center-y flex-base-size gap-05'>
							<span class='title'>Results</span>

							<div class='flex flex-center-y flex-self-right gap-05'>
								{#if selQueryName !== null && (parsedQuery || []).length > 1}
									<button use:hasMenu={{name: 'list', offset: {y: 'top'}, props: queryNameList}} class='btn'>
										<span>{selQueryName}</span>
										<Icon name='chevron'/>
									</button>
								{/if}

								<button on:click={executeQuery} use:rippleEffect
								disabled={queryExecutionNotAllowed}
								class='btn btn-icon accent'>
									<Icon name='play'/>
								</button>
							</div>
						</header>
						<div class='pane-body matched-templates flex-base-size-var'>
							{#if wsQueryResults === null || !(selQuery.id in wsQueryResults)}
								<span>Execute query to get results</span>
							{:else}
								{#if wsQueryResults[selQuery.id].error !== null}
									<p class='result-error'>{wsQueryResults[selQuery.id].error}</p>
								{:else}
									<h6 class='matched-header'>
										{wsQueryResults[selQuery.id].matched.length} matched templates:
									</h6>
									<div class='matched-list grid gap-05'>
										{#each wsQueryResults[selQuery.id].matched as tplID}
											<button
											on:click={()=> openTplRef(tplID)}
											use:rippleEffect
											class='matched-tpl btn'>
												<Icon name='sheet'/>
												<span class='tpl-name'>
													{$templatesIDMapByWS[tplID].name !== '' ?
														$templatesIDMapByWS[tplID].name
														: `Template ${WS.templates.findIndex(({id})=> id === tplID)+1} (untitled)`
													}
												</span>
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
				{#if wsErrors !== null && selQuery.id in wsErrors.queries}
					<Pane minSize={10} size={20}>
						<div class='pane-contents query-errors flex flex-col nowrap'>
							<header class='title-wrapper flex flex-center-y flex-base-size'>
								<span class='title'>Query errors</span>
							</header>
							<div class='pane-body flex-base-size-var flex flex-col nowrap'>
								<div class='error-list grid grid-top gap-05 flex-base-size-var'>
									{#each wsErrors.queries[selQuery.id] as err, idx}
										<p>{idx+1}. {err}</p>
									{/each}
								</div>
							</div>
						</div>
					</Pane>
				{/if}
			</Splitpanes>
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
	.query-errors
		border: solid 1px rgb(var(--clr-red))
		.title-wrapper
			background-color: rgba(var(--clr-red), 0.1)
			> .title
				padding: 0.25rem
				color: rgb(var(--clr-red))
		.pane-body
			overflow: hidden
			.error-list
				padding: 1rem
				overflow: auto
				> p
					padding: 0.5rem
					background-color: rgba(var(--clr-red), 0.15)
					border: solid 1px rgba(var(--clr-red), 0.1)
					color: rgb(var(--clr-red))
					border-radius: 0.25rem
					@media (prefers-color-scheme: dark)
						background-color: rgba(var(--clr-red-darker), 0.5)
						border: solid 1px rgba(var(--clr-red), 0.5)
						color: #fff
	.variables-input .title
		padding: 0.25rem
</style>
