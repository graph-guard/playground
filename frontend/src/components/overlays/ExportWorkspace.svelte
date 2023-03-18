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
			<textarea readonly rows={10} class='inpt'>{JSON.stringify(exportedWs, null, '\t')}</textarea>
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
import {onMount} from 'svelte'
import {fade, modalTransition} from '../../utils/transitions'
import {createEventDispatcher} from 'svelte'
import rippleEffect from '../../utils/ripple'
import {$ as uiState} from '../../stores/ui_state'
import {$ as workspace} from '../../stores/playground'
import Icon from '../snippets/Icon.svelte'
import download from 'downloadjs'
import {copyToClipboard} from '../../utils/misc'
const dispatch = createEventDispatcher<{close: void, mounted: HTMLElement}>()

let thisEl: HTMLElement

const exportedWs = workspace.export($uiState.selectedWorkspaceID)

onMount(()=> {
	dispatch('mounted', thisEl)
})

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
</script>



<style lang='sass'>
.modal
	width: 100%
	max-width: 800px
	.header
		margin-bottom: 1rem
		> h1
			font-size: 1.75rem
	.body textarea
		width: 100%
		min-height: calc(2rem)
		resize: vertical
		tab-size: 4ch
		font-family: var(--font-code-stack)
		color: rgb(var(--font-heading-clr))
	.footer
		margin-top: 2rem
</style>
