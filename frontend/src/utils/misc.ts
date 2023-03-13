export function vibrate(pattern: VibratePattern = 1) {
	if (window.navigator?.vibrate) {
		window.navigator.vibrate(pattern)
	}
}

function fallbackCopyToClipboard(data: string): boolean {
	const tempEl: HTMLTextAreaElement = document.createElement('textarea')
	tempEl.value = data

	// to avoid scrolling to this element, because of el.focus()
	tempEl.style.position = 'fixed'
	tempEl.classList.add('hidden')

	document.body.appendChild(tempEl)
	const prevFocus = document.activeElement
	tempEl.focus()
	tempEl.select()
	/* @ts-ignore */
	prevFocus.focus()

	let wasSuccessful = true
	try {document.execCommand('copy')}
	catch {wasSuccessful = false}

	document.body.removeChild(tempEl)
	return wasSuccessful
}

export async function copyToClipboard(data: string): Promise<boolean> {
	if (!window?.navigator?.clipboard) {
		return fallbackCopyToClipboard(data)
	}
	return await (
		navigator.clipboard.writeText(data).then(()=> true).catch(()=> false)
	)
}

export function randNum(max: number, min?: number) {
	const x = Math.floor(Math.random() * max)
	if (min !== undefined && !Number.isNaN(Number(min)) && x < min) {
		return min
	}
	return x
}

export function randString(max: number, min?: number, base?: number) {
	let len = randNum(max)
	if (min && len < min) {len = min}
	if (len > max) {len = max}

	let arr = new Uint8Array(len / 2)
	window.crypto.getRandomValues(arr)
	return Array.from(arr, (dec)=> (
		dec.toString(base || 36).padStart(2, '0')
	)).join('')
}

export function randID(len: number = 32) {
	return randString(len, len, 36)
}

export function trimStr(str: string, max: number): string {
	if (str.length > max) {
		return str.substring(0, max) + '…'
	}
	return str
}
