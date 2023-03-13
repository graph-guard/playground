<button
class='app-switch flex flex-center'
class:active={value}
class:readonly={readonly}
on:click={toggle}
disabled={disabled || readonly}
aria-readonly={readonly}>
	<div class='slider-bg'/>
	<div class='slider flex flex-center-y'>
		<div class='nop'/>
	</div>
</button>

<script lang='ts'>
import {createEventDispatcher} from 'svelte'
const dispatch = createEventDispatcher()

export let disabled: boolean = false
export let value: boolean = false
export let readonly: boolean = false
const toggle =()=> {
	if (!readonly) {
		value = !value
		dispatch('switch', value)
	}
}
</script>

<style lang='sass'>
.app-switch
	position: relative
	padding: .5em
	cursor: pointer
	contain: layout
	.slider-bg
		width: 2.25em
		height: .65em
		background-color: var(--switch-bg)
		border: solid 1px var(--switch-bg-border)
		border-radius: 2em
		transition: var(--trans)
		transition-property: background-color, border-color
	.slider
		position: absolute
		top: 0
		left: 0
		width: 100%
		height: 100%
		pointer-events: none
		transform: translate(0, 0)
		transition: var(--trans)
		transition-property: transform
		.nop
			position: relative
			width: 1.15em
			height: 1.15em
			background-color: var(--switch-nop)
			box-shadow: var(--switch-nop-shadow)
			border-radius: 2em
			transform: translate(.25em, 0)
			overflow: hidden
			transition: var(--trans)
			transition-property: box-shadow, background-color
	&:not(.readonly)
		&:hover, &:focus
			.slider .nop
				box-shadow: var(--switch-H-nop-shadow)
	&.active
		.slider-bg
			background-color: var(--switch-A-bg)
			border-color: var(--switch-A-bg-border)
		.slider
			transform: translate(1.5em, 0)
			.nop
				box-shadow: var(--switch-A-nop-shadow)
				background-color: var(--switch-A-nop)
		&:not(.readonly)
			&:hover, &:focus
				.slider .nop
					box-shadow: var(--switch-A-H-nop-shadow)
	&.readonly
		cursor: default
	&[disabled='true']:not([readonly])
		pointer-events: none
		opacity: .5
</style>
