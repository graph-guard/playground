<div class='overlay-container'>
	<!-- svelte-ignore a11y-click-events-have-key-events -->
	<div class='background' on:click={closeThis} transition:fade/>
	<div bind:this={thisEl} tabindex='-1' class='dialog-modal modal default-style' transition:modalTransition>
		<div class='header'>
			<h1 class='title'>Export</h1>
			<button on:click={closeThis} use:rippleEffect class='close-modal btn'>
				<Icon name='cross'/>
			</button>
		</div>
		<div class='body'>
			<div class='cm-editor-wrapper' style:height='400px' bind:this={exportedJsonPreview.el}/>
		</div>
		<div class='footer flex flex-end gap-1'>
			<button on:click={jsonToClipboard} use:rippleEffect class='btn accent'>
				<Icon name='clipboard'/>
				<span>Copy to clipboard</span>
			</button>

			<button on:click={downloadJson} use:rippleEffect class='btn accent'>
				<Icon name='export'/>
				<span>Download JSON</span>
			</button>
		</div>
	</div>
</div>



<script lang='ts' context='module'>
export type Props = void;
</script>

<script lang='ts'>
import {onMount, onDestroy} from 'svelte'
import {fade, modalTransition} from '../../utils/transitions'
import {createEventDispatcher} from 'svelte'
import rippleEffect from '../../utils/ripple'
import {$ as uiState} from '../../stores/ui_state'
import {$ as workspace} from '../../stores/playground'
import Icon from '../snippets/Icon.svelte'
import download from 'downloadjs'
import {copyToClipboard} from '../../utils/misc'
import {newCodeEditor, type CMEditor} from '../../utils/code_mirror'
import {EditorView} from 'codemirror'
import {Compartment} from '@codemirror/state'
import {json as cmJson} from '@codemirror/lang-json'
const dispatch = createEventDispatcher<{close: void, mounted: HTMLElement}>()

let thisEl: HTMLElement
const exportedWs = workspace.export($uiState.selectedWorkspaceID)

function closeThis() {
	dispatch('close')
}

function downloadJson() {
	download(
		new Blob([JSON.stringify(exportedWs)], {type: 'application/json'}),
		`gg-playground-workspace${exportedWs.name ? '_' + exportedWs.name : ''}.json`,
		'application/json',
	)
}

function jsonToClipboard() {
	copyToClipboard(JSON.stringify(exportedWs, null, '\t'))
}

const exportedJsonPreview: CMEditor = {state: null, view: null, el: null}

onMount(()=> {
	dispatch('mounted', thisEl)
	exportedJsonPreview.state = newCodeEditor(JSON.stringify(exportedWs, null, '\t'), {
		readonly: true,
		extensions: [
			EditorView.editorAttributes.of({class: 'default-theme'}),
			(new Compartment).of(cmJson()),
		],
	})
	exportedJsonPreview.view = new EditorView({
		state: exportedJsonPreview.state,
		parent: exportedJsonPreview.el as HTMLElement,
	})
})
onDestroy(()=> {
	exportedJsonPreview.view?.destroy()
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
	.body .cm-editor-wrapper
		resize: vertical
		overflow: hidden
		min-height: 6rem
		border: solid 2px rgba(var(--font-base-clr), 0.15)
		border-radius: 0.5rem
		:global(.cm-editor)
			height: 100%
	.footer
		margin-top: 2rem
</style>
