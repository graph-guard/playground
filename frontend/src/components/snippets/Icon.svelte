<script lang='ts' context='module'>
import type {SvelteComponentDev} from 'svelte/internal'

import IconGraphGuard from '../icons/GraphGuard.svelte'
import IconLoader from '../icons/Loader.svelte'
import IconErrorCircle from '../icons/ErrorCircle.svelte'
import IconErrorCritical from '../icons/ErrorCritical.svelte'
import IconWarn from '../icons/Warn.svelte'
import Iconplus from '../icons/Plus.svelte'
import IconCross from '../icons/Cross.svelte'
import IconTrash from '../icons/Trash.svelte'
import IconDuplicate from '../icons/Duplicate.svelte'
import IconExport from '../icons/Export.svelte'
import IconImport from '../icons/Import.svelte'
import IconChevron from '../icons/Chevron.svelte'
import IconPlay from '../icons/Play.svelte'
import IconSheet from '../icons/Sheet.svelte'
import IconTelegram from '../icons/Telegram.svelte'
import IconTwitter from '../icons/Twitter.svelte'
import IconGitHub from '../icons/GitHub.svelte'
import IconCheck from '../icons/Check.svelte'
import IconClipboard from '../icons/Clipboard.svelte'

export type IconName = (
	'graphguard'|'loader'|'error-circle'|'crit-error'|'warn'|'plus'|'cross'|'trash'|'duplicate'|'export'|'import'|
	'chevron'|'play'|'sheet'|'telegram'|'twitter'|'github'|'check'|'clipboard'
)

const icons: {[name in IconName]: typeof SvelteComponentDev} = {
	'graphguard': IconGraphGuard,
	'loader': IconLoader,
	'error-circle': IconErrorCircle,
	'crit-error': IconErrorCritical,
	'warn': IconWarn,
	'plus': Iconplus,
	'cross': IconCross,
	'trash': IconTrash,
	'duplicate': IconDuplicate,
	'export': IconExport,
	'import': IconImport,
	'chevron': IconChevron,
	'play': IconPlay,
	'sheet': IconSheet,
	'telegram': IconTelegram,
	'twitter': IconTwitter,
	'github': IconGitHub,
	'check': IconCheck,
	'clipboard': IconClipboard,
}
</script>



<script lang='ts'>
export let name: IconName;
$:comp = icons[name] as typeof SvelteComponentDev
if (!(name in icons)) {
	throw new Error(`icon by name "${name}" not defined`)
}
</script>
<svelte:component
	this={comp}
	{...$$restProps}
	class='icon icon-{name} {$$restProps.class}'
	aria-hidden=true
	focusable='false'
	role='presentation'
	fill='none'
	xmlns='http://www.w3.org/2000/svg'
/>



<style lang='sass' global>
.icon
	contain: content
	// --icon-primary: rgb(var(--font-base-clr))
	// --icon-secondary: rgba(var(--font-base-clr), 0.1)
	// --icon-bg: rgb(var(--box-bg))
	// --icon-size: 1em
	// --icon-transition: var(--trans)
	width: var(--icon-size)
	height: var(--icon-size)
	path, circle, rect, g
		transition: var(--icon-transition)
	&.colored
		&-icon-error, &-icon-crit-error
			--icon-primary: rgb(var(--clr-red))
			--icon-secondary: rgba(var(--clr-red), 0.15)
		&-icon-warn
			--icon-primary: #000
			--icon-secondary: rgb(var(--clr-yellow))
	&-loader
		--icon-transition: none

.icon-arrow-wide-x-right
	transform: rotate(180deg)
// .icon-arrow-wide-y-down

.icon-arrow-left, .icon-chevron-left
	transform: rotate(90deg)
.icon-arrow-up, .icon-chevron-up
	transform: rotate(180deg)
.icon-arrow-right, .icon-chevron-right
	transform: rotate(270deg)

.icon.rotate-left
	transform: rotate(-90deg)
.icon.rotate-right
	transform: rotate(90deg)

.icon-wide-x
	aspect-ratio: 2/1
	width: auto
.icon-wide-y
	aspect-ratio: 1/2
	height: auto
</style>
