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
$:selOPIdx = wsUIState.selectedOperationIndex
$:selOP = WS.operations[selOPIdx]
$:selOPName = selOP.id in wsUIState.selectedOperationName ? wsUIState.selectedOperationName[selOP.id] : null
$:templatesIDMapByWS = workspace.derivedTemplatesIDMapByWS(wsID)
$:isEngineInited = workspace.isEngineInited
$:errors = workspace.errors
$:wsErrors = wsID in $errors ? $errors[wsID] : null
$:hasAnyErrors = (
	wsErrors !== null && (
		wsErrors.gqt !== null || wsErrors.schema !== null ||
		Object.keys(wsErrors.templates).length > 0 || selOP.id in wsErrors.operations
	)
)
$:parsedOperations = workspace.parsedOperations
$:parsedOp = (
	wsID in $parsedOperations && selOP.id in $parsedOperations[wsID] ?
	$parsedOperations[wsID][selOP.id] : null
)
$:operationResults = workspace.results
$:wsOpResults = wsID in $operationResults ? $operationResults[wsID] : null
$:executionNotAllowed = !$isEngineInited || hasAnyErrors
$:wsID,selOPIdx,updateOperationEditor(),updateVariablesEditor(),updateOpNameList();
$:parsedOp,updateOpNameList();

let operationNameMenuList: ListMenuProps = {optionGroups: []}
function updateOpNameList() {
	operationNameMenuList = {optionGroups: [
		(parsedOp || []).map(({name})=> ({
			label: name,
			fn(x) {uiState.selectOperationName(wsID, selOP.id, name); x()},
		}))
	]}
	if (parsedOp !== null) {
		if (parsedOp.length < 1) {
			uiState.selectOperationName(wsID, selOP.id, null)
		} else if (
			selOPName === null ||
			parsedOp.findIndex(({name})=> selOPName === name) === -1
		) {
			uiState.selectOperationName(wsID, selOP.id, parsedOp[0].name)
		}
	}
}

function openDeleteConfirmDialog() {
	let title = `Delete untitled operation ${selOPIdx+1}`
	if (selOP.name) {
		title = `Delete operation "${selOP.name}"`
	}
	openOverlay({name: 'dialog', props: {
		title,
		message: 'Are you sure you want to delete this operation?',
		secondary: {
			action: (x)=> x(),
			label: 'Cancel',
		},
		primary: {
			action(x) {
				workspace.deleteOperation(wsID as string, selOPIdx)
				uiState.selectOperation(selOPIdx >= WS.operations.length ? WS.operations.length-1 : selOPIdx)
				x()
			},
			type: 'red',
			label: 'Yes, delete',
		},
	}})
}

function onNameInput(name: string) {
	workspace.updateOperation(wsID, selOPIdx, {name})
}

function newOperation() {
	workspace.newOperation(wsID)
	uiState.selectOperation(WS.operations.length-1)
}

function duplicateOperation() {
	workspace.duplicateOperation(wsID, selOPIdx)
	uiState.selectOperation(selOPIdx+1)
}

function executeOperation() {
	if (hasAnyErrors) {return}
	workspace.executeOperation(wsID, selOP.id, selOPName ?? undefined)
}

function openTplRef(tplID: string) {
	const idx = WS.templates.findIndex(({id})=> id === tplID)
	if (idx === -1) {return}
	uiState.selectTemplate(idx)
	uiState.setTab(PlaygroundTab.SchemaAndTemplates)
}

const operationEditor: CMEditor = {state: null, view: null, el: null}
const variablesEditor: CMEditor = {state: null, view: null, el: null}

function updateOperationEditor() {
	operationEditor.view?.destroy()
	operationEditor.state = newCodeEditor(selOP.source, {
		extensions: [
			EditorView.editorAttributes.of({class: 'default-theme'}),
			EditorView.updateListener.of((update)=> {
				if (update.docChanged) {
					workspace.updateOperation(wsID, selOPIdx, {source: update.state.doc.toString()})
				}
			}),
		],
	})
	operationEditor.view = new EditorView({
		state: operationEditor.state,
		parent: operationEditor.el as HTMLElement,
	})
}

function updateVariablesEditor() {
	variablesEditor.view?.destroy()
	variablesEditor.state = newCodeEditor(selOP.variables, {
		extensions: [
			EditorView.editorAttributes.of({class: 'default-theme'}),
			EditorView.updateListener.of((update)=> {
				if (update.docChanged) {
					workspace.updateOperation(wsID, selOPIdx, {variables: update.state.doc.toString()})
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
	updateOperationEditor()
	updateVariablesEditor()
})
onDestroy(()=> {
	operationEditor.view?.destroy()
	variablesEditor.view?.destroy()
})
</script>

<div id='Operations'>
	{#if WS !== null && wsUIState !== null}
	<Splitpanes theme='customSplitpanes' class='splitpanes-root'>
		<Pane snapSize={10} maxSize={25} size={20}>
			<div class='pane-contents operations-list flex flex-col'>
				<EntryList
				title='Operations'
				newEntryLabel='New Operation'
				entries={WS.operations}
				selectedEntry={selOPIdx}
				on:click={({detail})=> uiState.selectOperation(detail)}
				on:newEntry={newOperation}>
					<svelte:fragment let:idx let:entry>
						<span class='name'>{entry.name || `Operation ${idx+1} (untitled)`}</span>
					</svelte:fragment>
				</EntryList>
			</div>
		</Pane>
		<Pane snapSize={15} size={40}>
			{#if selOP !== null}
				<Splitpanes theme='customSplitpanes' horizontal>
					<Pane snapSize={15}>
						<div class='pane-contents operation-editor flex flex-col'>
							<EntityEditor
							name={selOP.name}
							nameInputLabel='Operation {selOPIdx+1} (untitled)'
							on:delete={openDeleteConfirmDialog}
							on:duplicate={duplicateOperation}
							on:nameChange={({detail})=> onNameInput(detail)}>
								<div class='cm-editor-wrapper' bind:this={operationEditor.el}/>
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
					<div class='pane-contents operation-results flex flex-col'>
						<header class='title-wrapper flex flex-center-y flex-base-size gap-05'>
							<span class='title'>Results</span>

							<div class='flex flex-center-y flex-self-right gap-05'>
								{#if selOPName !== null && (parsedOp || []).length > 1}
									<button use:hasMenu={{name: 'list', offset: {y: 'top'}, props: operationNameMenuList}} class='btn'>
										<span>{selOPName}</span>
										<Icon name='chevron'/>
									</button>
								{/if}

								<button on:click={executeOperation} use:rippleEffect
								disabled={executionNotAllowed}
								class='btn btn-icon accent'>
									<Icon name='play'/>
								</button>
							</div>
						</header>
						<div class='pane-body matched-templates flex-base-size-var'>
							{#if wsOpResults === null || !(selOP.id in wsOpResults)}
								<span>Execute operation to get results</span>
							{:else}
								{#if wsOpResults[selOP.id].error !== null}
									<p class='result-error'>{wsOpResults[selOP.id].error}</p>
								{:else}
									<h6 class='matched-header'>
										{wsOpResults[selOP.id].matched.length} matched templates:
									</h6>
									<div class='matched-list grid gap-05'>
										{#each wsOpResults[selOP.id].matched as tplID}
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
				{#if wsErrors !== null && selOP.id in wsErrors.operations}
					<Pane minSize={10} size={20}>
						<div class='pane-contents operation-errors flex flex-col nowrap'>
							<header class='title-wrapper flex flex-center-y flex-base-size'>
								<span class='title'>Operation errors</span>
							</header>
							<div class='pane-body flex-base-size-var flex flex-col nowrap'>
								<div class='error-list grid grid-top gap-05 flex-base-size-var'>
									{#each wsErrors.operations[selOP.id] as err, idx}
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
#Operations
	height: 100%
	width: 100%
	.operations-list
		min-width: 10vw
		.name
			overflow: hidden
			text-overflow: ellipsis
			white-space: nowrap
	.operation-results
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
	.operation-errors
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
