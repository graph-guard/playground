<script lang='ts'>
import {$ as workspace, EngineAPI_InitErrorCode} from '../../stores/playground'
import {$ as uiState} from '../../stores/ui_state'
import {openOverlay} from '../sections/Overlays.svelte'
import EntryList from './_EntryList.svelte'
import EntityEditor from './_EntityEditor.svelte'
import {Pane, Splitpanes} from 'svelte-splitpanes'
import {newCodeEditor, type CMEditor} from '../../utils/code_mirror'
import {EditorView} from 'codemirror'
import {onDestroy, onMount} from 'svelte'
import rippleEffect from '../../utils/ripple'
import {fade} from '../../utils/transitions'

$:wsID = $uiState.selectedWorkspaceID
$:wsUIState = $uiState.workspaces[wsID]
$:WS = $workspace.workspaces[wsID]
$:selTplIdx = wsUIState.selectedTemplateIndex
$:selTpl = WS.templates[selTplIdx]
$:errors = workspace.errors
$:wsErrors = wsID in $errors ? $errors[wsID] : null
$:schemaErrors = wsErrors !== null ? wsErrors.schema : null
$:selTplErrors = wsErrors !== null && selTpl.id in wsErrors.templates ? wsErrors.templates[selTpl.id] : null
$:isSchemalessMode = WS.isSchemaless
$:wsID,selTplIdx,updateTemplateEditor();
$:wsID,updateSchemaEditor();
$:isSchemalessMode,updateSchemaEditor();

function openDeleteConfirmDialog() {
	let title = `Delete untitled template ${selTplIdx+1}`
	if (selTpl.name) {
		title = `Delete template "${selTpl.name}"`
	}
	openOverlay({name: 'dialog', props: {
		title,
		message: 'Are you sure you want to delete this template?',
		secondary: {
			action: (x)=> x(),
			label: 'Cancel',
		},
		primary: {
			action(x) {
				workspace.deleteTemplate(wsID as string, selTplIdx)
				uiState.selectTemplate(selTplIdx >= WS.templates.length ? WS.templates.length-1 : selTplIdx)
				x()
			},
			type: 'red',
			label: 'Yes, delete',
		},
	}})
}

function onNameInput(name: string) {
	workspace.updateTemplate(wsID, selTplIdx, {name})
}

function newTemplate() {
	workspace.newTemplate(wsID)
	uiState.selectTemplate(WS.templates.length-1)
}

function duplicateTemplate() {
	workspace.duplicateTemplate(wsID, selTplIdx)
	uiState.selectTemplate(selTplIdx+1)
}

const templateEditor: CMEditor = {state: null, view: null, el: null}
const schemaEditor: CMEditor = {state: null, view: null, el: null}

function updateTemplateEditor() {
	templateEditor.view?.destroy()
	templateEditor.state = newCodeEditor(selTpl.source, {
		extensions: [
			EditorView.editorAttributes.of({class: 'default-theme'}),
			EditorView.updateListener.of((update)=> {
				if (update.docChanged) {
					workspace.updateTemplate(wsID, selTplIdx, {source: update.state.doc.toString()})
				}
			}),
		],
	})
	templateEditor.view = new EditorView({
		state: templateEditor.state,
		parent: templateEditor.el as HTMLElement,
	})
}

function updateSchemaEditor() {
	schemaEditor.view?.destroy()
	schemaEditor.state = newCodeEditor(WS.schema, {
		readonly: isSchemalessMode,
		extensions: [
			EditorView.editorAttributes.of({class: 'default-theme'}),
			EditorView.updateListener.of((update)=> {
				if (update.docChanged) {
					workspace.updateWorkspace(wsID, {schema: update.state.doc.toString()})
				}
			}),
		],
	})
	schemaEditor.view = new EditorView({
		state: schemaEditor.state,
		parent: schemaEditor.el as HTMLElement,
	})
}

function toggleSchemalessMode() {
	workspace.updateWorkspace(wsID, {isSchemaless: !isSchemalessMode})
}

onMount(()=> {
	updateTemplateEditor()
	updateSchemaEditor()
})
onDestroy(()=> {
	templateEditor.view?.destroy()
	schemaEditor.view?.destroy()
})
</script>



<div id='SchemaAndTemplates'>
	{#if wsID !== ''}
	<Splitpanes theme='customSplitpanes' class='splitpanes-root'>
		<Pane snapSize={10} maxSize={25} size={20}>
			<div class='pane-contents templates-list flex flex-col nowrap'>
				<EntryList
				title='Templates'
				newEntryLabel='New Template'
				entries={WS.templates}
				selectedEntry={selTplIdx}
				on:click={({detail})=> uiState.selectTemplate(detail)}
				on:newEntry={newTemplate}>
					<svelte:fragment let:idx let:entry>
						{#if wsErrors !== null && entry.id in wsErrors.templates}
							<span class='error-count flex flex-center'>
								{wsErrors.templates[entry.id].length}
							</span>
						{/if}
						<span class='name'>{entry.name || `Template ${idx+1} (untitled)`}</span>
					</svelte:fragment>
				</EntryList>
			</div>
		</Pane>
		<Pane snapSize={15} size={40}>
			<Splitpanes theme='customSplitpanes' horizontal>
				<Pane snapSize={15}>
					<div class='pane-contents template-editor flex flex-col nowrap'>
						{#if selTpl !== null}
							<EntityEditor
							name={selTpl.name}
							nameInputLabel='Template {selTplIdx+1} (untitled)'
							on:delete={openDeleteConfirmDialog}
							on:duplicate={duplicateTemplate}
							on:nameChange={({detail})=> onNameInput(detail)}>
								<div class='cm-editor-wrapper' bind:this={templateEditor.el}/>
							</EntityEditor>
						{/if}
					</div>
				</Pane>
				{#if selTplErrors !== null}
					<Pane minSize={10} size={20}>
						<div class='pane-contents template-errors flex flex-col nowrap'>
							<header class='title-wrapper flex flex-center-y flex-base-size'>
								<span class='title'>Template errors</span>
							</header>
							<div class='pane-body flex-base-size-var flex flex-col nowrap'>
								<div class='error-list grid grid-top gap-05 flex-base-size-var'>
									{#each selTplErrors as err, idx}
										<p>{idx+1}. {err}</p>
									{/each}
								</div>
							</div>
						</div>
					</Pane>
				{/if}
			</Splitpanes>
		</Pane>
		<Pane snapSize={15} size={40}>
			<Splitpanes theme='customSplitpanes' horizontal>
				<Pane snapSize={15}>
					<div class='pane-contents schema-editor flex flex-col nowrap' class:schema-less={isSchemalessMode}>
						<header class='title-wrapper flex flex-center-y flex-base-size'>
							<span class='title'>Schema</span>
							<button on:click={toggleSchemalessMode} use:rippleEffect class='btn flex-self-right'>
								{isSchemalessMode ? 'Schema-aware mode' : 'Schemaless mode'}
							</button>
						</header>
						<div class='pane-body flex-base-size-var pane-scrollable-content'>
							{#if isSchemalessMode}
								<div class='schemaless-mode flex flex-center' transition:fade>
									<span>Schemaless mode</span>
								</div>
							{/if}
							<div class='cm-editor-wrapper' bind:this={schemaEditor.el}/>
						</div>
					</div>
				</Pane>
				{#if schemaErrors !== null}
					<Pane minSize={10} size={20}>
						<div class='pane-contents schema-errors flex flex-col nowrap'>
							<header class='title-wrapper flex flex-center-y flex-base-size'>
								<span class='title'>Schema errors</span>
							</header>
							<div class='pane-body flex-base-size-var flex flex-col nowrap'>
								<div class='error-list grid grid-top gap-05 flex-base-size-var'>
									{#each schemaErrors as err, idx}
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
#SchemaAndTemplates
	height: 100%
	width: 100%
	.templates-list
		min-width: 10vw
		.name
			overflow: hidden
			text-overflow: ellipsis
			white-space: nowrap
		.error-count
			width: 1rem
			height: 1rem
			margin-right: 0.5rem
			background-color: rgb(var(--clr-red))
			border-radius: 50%
			font-size: 0.75rem
			color: #fff
			line-height: 1
			flex: 0 0 auto
	.schema-errors, .template-errors
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
	.schema-editor
		.pane-body
			position: relative
		.schemaless-mode
			z-index: 100
			position: absolute
			top: 0
			left: 0
			width: 100%
			height: 100%
			font-size: 1.25rem
			color: rgb(var(--font-heading-clr))
			background-color: rgba(var(--font-heading-clr), 0.1)
			@media (prefers-color-scheme: dark)
				background-color: rgba(var(--page-bg), 0.5)
				color: rgb(var(--font-base-clr))
		&.schema-less .cm-editor-wrapper
			opacity: 0.1
</style>
