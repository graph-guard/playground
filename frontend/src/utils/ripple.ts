import type {ActionReturn} from 'svelte/action'

function rippleEffect(node: HTMLElement, o?): ActionReturn {
	const compStyl = getComputedStyle(node)

	if (
		compStyl.position !== 'absolute' &&
		compStyl.position !== 'fixed' &&
		compStyl.position !== 'sticky' &&
		compStyl.position !== 'relative'
	) {
		node.style.position = 'relative'
	}

	const wrapper = document.createElement('div')
	node.appendChild(wrapper)
	wrapper.className = 'ripple-container'
	wrapper.setAttribute('aria-hidden', 'true')
	wrapper.style.contain = 'content'
	wrapper.style.overflow = 'hidden'
	wrapper.style.position = 'absolute'
	wrapper.style.top = '0px'
	wrapper.style.left = '0px'
	wrapper.style.width = '100%'
	wrapper.style.height = '100%'
	wrapper.style.pointerEvents = 'none'
	wrapper.style.borderTopLeftRadius = compStyl.borderTopLeftRadius
	wrapper.style.borderTopRightRadius = compStyl.borderTopRightRadius
	wrapper.style.borderBottomRightRadius = compStyl.borderBottomRightRadius
	wrapper.style.borderBottomLeftRadius = compStyl.borderBottomLeftRadius

	let ongoingStack: Array<{
		el: HTMLElement,
		anim: Animation,
		props: {
			opacity: number,
			color: string,
			duration: number,
			easing: string,
		},
	}> = []

	function _ripple(event: PointerEvent) {
		const compStyl = getComputedStyle(node)

		let duration = 500
		if ('' !== compStyl.getPropertyValue('--ripple-duration')) {
			const val = compStyl.getPropertyValue('--ripple-duration')
			if (Number.isNaN(Number(duration))) {
				throw new Error(`invalid ripple duration value "${val}"`)
			}
			duration = Number(val)
		}

		let color = '#000'
		if ('' !== compStyl.getPropertyValue('--ripple-color')) {
			color = 'var(--ripple-color)'
		}

		let easing = 'ease-out'
		if ('' !== compStyl.getPropertyValue('--ripple-easing')) {
			easing = compStyl.getPropertyValue('--ripple-easing')
		}

		let opacity = .25
		if ('' !== compStyl.getPropertyValue('--ripple-opacity')) {
			const val = compStyl.getPropertyValue('--ripple-opacity')
			if (Number.isNaN(Number(val))) {
				throw new Error(`invalid ripple opacity value "${val}"`)
			}
			opacity = Number(val)
		}
		if (opacity < 0 || opacity > 1) {
			throw new Error(
				`invalid ripple opacity of "${opacity}", ` +
				'only a value of 0 to 1 is possible'
			)
		}

		const rect = (event.currentTarget as HTMLElement).getBoundingClientRect();
		const x = event.clientX - rect.left
		const y = event.clientY - rect.top
		const max_x = Math.max(x, wrapper.offsetWidth - x)
		const max_y = Math.max(y, wrapper.offsetHeight - y)
		const radius = Math.sqrt((max_x * max_x) + (max_y * max_y))

		const rippleEl = document.createElement('div')
		wrapper.appendChild(rippleEl)
		rippleEl.className = 'ripple-effect'
		const style = rippleEl.style
		style.position = 'absolute'
		style.left = `${x - radius}px`
		style.top = `${y - radius}px`
		style.width = `${radius * 2}px`
		style.height = `${radius * 2}px`
		style.borderRadius = '50%'
		style.backgroundColor = color
		style.animationFillMode = 'both'
		style.opacity = ''+ opacity

		const anim = rippleEl.animate(
			[{transform: 'scale(0)'}, {transform: 'scale(1)'}],
			{duration: duration, easing: easing},
		)
		ongoingStack = [...ongoingStack, {
			el: rippleEl, anim, props: {
				opacity, color, duration, easing,
			},
		}]
	}

	function _clearRipple() {
		if (ongoingStack.length < 1) {
			return
		}
		for (let i = 0; i < ongoingStack.length; i++) {
			const x = ongoingStack[i]
			x.el.animate(
				[{opacity: ''+ x.props.opacity}, {opacity: '0'}],
				{duration: x.props.duration, easing: x.props.easing},
			).finished.then(
				()=> {x.el.remove()},
			)
		}
		ongoingStack = []
	}

	node.addEventListener('pointerdown', _ripple)
	node.addEventListener('pointerup', _clearRipple)
	node.addEventListener('pointerleave', _clearRipple)

	return {
		destroy() {
			node.removeEventListener('pointerdown', _ripple)
			node.style.position = ''
		},
	}
}

export default rippleEffect
