<script lang='ts'>
import {$ as workspace, EngineAPI_InitErrorCode} from '../../stores/playground'
import {$ as uiState} from '../../stores/ui_state'
import {openOverlay} from '../sections/Overlays.svelte'
import EntryList from './_EntryList.svelte'
import EntityEditor from './_EntityEditor.svelte'
import {Pane, Splitpanes} from 'svelte-splitpanes'

$:wsID = $uiState.selectedWorkspaceID
$:wsUIState = $uiState.workspaces[wsID]
$:WS = $workspace.workspaces[wsID]
$:selTplIdx = wsUIState.selectedTemplateIndex
$:selTpl = WS.templates[selTplIdx]
$:errors = workspace.errors
$:wsErrors = wsID in $errors ? $errors[wsID] : null
$:schemaErrors = wsErrors !== null ? wsErrors.schema : null
$:selTplErrors = wsErrors !== null && selTpl.id in wsErrors.templates ? wsErrors.templates[selTpl.id] : null

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

function onSourceInput(source: string) {
	workspace.updateTemplate(wsID, selTplIdx, {source})
}

function newTemplate() {
	workspace.newTemplate(wsID)
	uiState.selectTemplate(WS.templates.length-1)
}

function duplicateTemplate() {
	workspace.duplicateTemplate(wsID, selTplIdx)
	uiState.selectTemplate(selTplIdx+1)
}

function onSchemaInput(schema: string) {
	workspace.updateWorkspace(wsID, {schema})
}
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
								<textarea
									on:input={(event)=> onSourceInput(event.currentTarget.value)}
								>{selTpl.source}</textarea>
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
							<div class='error-list flex-base-size-var flex flex-col nowrap'>
								<div class='list grid grid-top gap-05 flex-base-size-var'>
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
					<div class='pane-contents schema-editor flex flex-col nowrap'>
						<header class='title-wrapper flex flex-center-y flex-base-size'>
							<span class='title'>Schema</span>
						</header>
						<div class='flex-base-size-var'>
							<textarea
								on:input={(event)=> onSchemaInput(event.currentTarget.value)}
							>{WS.schema}</textarea>
						</div>
					</div>
				</Pane>
				{#if schemaErrors !== null}
					<Pane minSize={10} size={20}>
						<div class='pane-contents schema-errors flex flex-col nowrap'>
							<header class='title-wrapper flex flex-center-y flex-base-size'>
								<span class='title'>Schema errors</span>
							</header>
							<div class='error-list flex-base-size-var flex flex-col nowrap'>
								<div class='list grid grid-top gap-05 flex-base-size-var'>
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
		.error-list
			overflow: hidden
			.list
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
	textarea
		padding: 0.5rem
		height: 100%
		width: 100%
		resize: none
		font-family: 'Fira Code'
		color: rgb(var(--font-heading-clr))
		tab-size: 2rem
		white-space: pre
		transition: var(--trans)
		transition-property: outline
		outline: dotted 2px transparent
		outline-offset: -2px
		&:focus
			outline-color: rgb(var(--clr-accent))
</style>
