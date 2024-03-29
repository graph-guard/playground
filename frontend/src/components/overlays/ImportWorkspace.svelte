<div class='overlay-container'>
	<!-- svelte-ignore a11y-click-events-have-key-events -->
	<div class='background' on:click={closeThis} transition:fade/>
	<div bind:this={thisEl} tabindex='-1' class='dialog-modal modal default-style' transition:modalTransition>
		<div class='header'>
			<h1 class='title'>Import</h1>
			<button on:click={closeThis} use:rippleEffect class='close-modal btn'>
				<Icon name='cross'/>
			</button>
		</div>
		<div class='body'>
			<div
			on:dragover|capture={()=> isDropZoneActive = true}
			on:dragleave|capture={()=> isDropZoneActive = false}
			on:drop|capture={()=> isDropZoneActive = false}
			use:rippleEffect
			class='drop-zone flex flex-center'
			class:about-to-drop={isDropZoneActive}>
				<span>Click to select or drag & drop JSON file here</span>
				<input type='file' accept='.json'
					on:input={({currentTarget})=> onFileSelected(currentTarget.files?.item(0) || null)}
				/>
			</div>
			<span class='input-separator flex flex-center-y gap-1'>or paste JSON here:</span>
			<div class='cm-editor-wrapper' class:has-error={!isValidJson} style:height='200px' bind:this={userInputEditor.el}/>
		</div>
		<div class='footer flex flex-center-y flex-end gap-1'>
			{#if !isValidJson}
				<span class='invalid-json-label'>Invalid JSON</span>
			{/if}
			<button on:click={importWs} use:rippleEffect
			disabled={checkingJson || !isValidJson || userInput === ''}
			class='btn accent'>
				<Icon name='import'/>
				<span>Import workspace</span>
			</button>
		</div>
	</div>
</div>



<script lang='ts' context='module'>
export type Props = void;
</script>

<script lang='ts'>
import {onDestroy, onMount} from 'svelte'
import {fade, modalTransition} from '../../utils/transitions'
import {createEventDispatcher} from 'svelte'
import rippleEffect from '../../utils/ripple'
import {$ as uiState} from '../../stores/ui_state'
import {$ as workspace, type GG_ImportWorkspace} from '../../stores/playground'
import Icon from '../snippets/Icon.svelte'
import type {openOverlay} from '../sections/Overlays.svelte'
import debounce from 'lodash/debounce'
import {newCodeEditor, type CMEditor} from '../../utils/code_mirror'
import {EditorView} from 'codemirror'
import {Compartment} from '@codemirror/state'
import {json as cmJson} from '@codemirror/lang-json'
const dispatch = createEventDispatcher<{close: void, mounted: HTMLElement}>()

let thisEl: HTMLElement
export let openOverlay: openOverlay

let userInput = ''
let isDropZoneActive = false
let checkingJson = false
let isValidJson = true

const validateUserInput = debounce(()=> {
	if (checkingJson) {return}
	checkingJson = true
	try {
		JSON.parse(userInput)
		isValidJson = true
	} catch {
		isValidJson = false
	}
	checkingJson = false
}, 300)

function closeThis() {
	dispatch('close')
}

async function onFileSelected(file: File|null) {
	if (file === null) {return}
	checkingJson = true
	const fileContent = await file.text()
	userInput = fileContent
	try {
		JSON.parse(fileContent)
		isValidJson = true
		checkingJson = false
		importWs()
	} catch(err) {
		isValidJson = false
		checkingJson = false
		userInputEditor.view?.dispatch({changes: {from: 0, insert: userInput}})
		console.error(err)
		openOverlay({name: 'dialog', props: {
			title: 'Failed to import file',
			message: 'Seems like the file isn\'t JSON or the content is corrupted.',
		}})
	}
}

function importWs() {
	if (checkingJson || !isValidJson || userInput === '') {return}
	uiState.selectWorkspace(
		workspace.import(JSON.parse(userInput) as GG_ImportWorkspace)
	)
	closeThis()
}

const userInputEditor: CMEditor = {state: null, view: null, el: null}

onMount(()=> {
	dispatch('mounted', thisEl)
	userInputEditor.state = newCodeEditor('', {
		extensions: [
			EditorView.editorAttributes.of({class: 'default-theme'}),
			EditorView.updateListener.of((update)=> {
				if (update.docChanged) {
					userInput = update.state.doc.toString()
					validateUserInput()
				}
			}),
			(new Compartment).of(cmJson()),
		],
	})
	userInputEditor.view = new EditorView({
		state: userInputEditor.state,
		parent: userInputEditor.el as HTMLElement,
	})
})
onDestroy(()=> {
	userInputEditor.view?.destroy()
})
</script>



<style lang='sass'>
.modal
	width: 100%
	max-width: 800px
	.header
		margin-bottom: 1rem
		> h1
			font-size: 1.75rem
	.body
		.drop-zone
			position: relative
			width: 100%
			padding: 1.5rem
			border-radius: 0.5rem
			border: dashed 1.5px rgba(var(--font-base-clr), 0.25)
			background-color: rgba(var(--font-base-clr), 0.05)
			transition: var(--trans)
			transition-property: background-color, border, box-shadow
			--ripple-color: rgb(var(--clr-accent))
			input[type='file']
				position: absolute
				top: 0
				left: 0
				width: 100%
				height: 100%
				opacity: 0
				cursor: pointer
			> span
				pointer-events: none
			&:hover:not(.about-to-drop)
				border-style: solid
			&.about-to-drop, &:hover
				border-color: rgb(var(--clr-accent))
				background-color: rgba(var(--clr-accent), 0.25)
				> span
					color: rgb(var(--font-heading-clr))
			&.about-to-drop
				box-shadow: 0 0 0 0.25rem rgba(var(--clr-accent), 0.15)
		.input-separator
			margin: 1rem 0
			color: rgba(var(--font-base-clr), 0.6)
			&:before, &:after
				content: ''
				flex: 1 1 auto
				border-top: solid 1px rgba(var(--font-base-clr), 0.1)
		.cm-editor-wrapper
			resize: vertical
			overflow: hidden
			min-height: 2rem
			border: solid 2px rgba(var(--font-base-clr), 0.15)
			border-radius: 0.5rem
			:global(.cm-editor)
				height: 100%
			&.has-error
				border-color: rgb(var(--clr-red))
	.footer
		margin-top: 2rem
		.invalid-json-label
			color: rgb(var(--clr-red))
</style>
