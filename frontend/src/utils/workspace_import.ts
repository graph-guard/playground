import type {GG_ImportOperation, GG_ImportTemplate, GG_ImportWorkspace, GG_Operation, GG_Template, GG_Workspace, VersionedEntity} from '../stores/playground'
import {WS_VERSION, TEMPLATE_VERSION, OPERATION_VERSION} from '../stores/playground'
import {randID} from './misc'

export function importOperationVersion(input: Partial<VersionedEntity> & {[key: string]: any}): GG_Operation {
	let opVer = input._version
	if (opVer === undefined || opVer === null || opVer < 0 || opVer > OPERATION_VERSION) {
		console.error('no or invalid operation version provided. this may import data incorrectly.')
		opVer = OPERATION_VERSION
	}
	const id = randID()
	switch (opVer) {
	case 0: {
		const op = input as GG_ImportOperation
		return {
			_version: op._version ?? OPERATION_VERSION,
			id,
			name: op.name ?? '',
			source: op.source ?? '',
			variables: op.variables ?? '',
		}
	}
	default:
		throw new Error('was unable to import operation')
	}
}

export function importTemplateVersion(input: Partial<VersionedEntity> & {[key: string]: any}): GG_Template {
	let tplVer = input._version
	if (tplVer === undefined || tplVer === null || tplVer < 0 || tplVer > TEMPLATE_VERSION) {
		console.error('no or invalid template version provided. this may import data incorrectly.')
		tplVer = TEMPLATE_VERSION
	}
	const id = randID()
	switch (tplVer) {
	case 0: {
		const tpl = input as GG_ImportTemplate
		return {
			_version: tpl._version ?? TEMPLATE_VERSION,
			id,
			name: tpl.name ?? '',
			source: tpl.source ?? '',
		}
	}
	default:
		throw new Error('was unable to import template')
	}
}

export function importWorkspaceVersion(input: Partial<VersionedEntity> & {[key: string]: any}): GG_Workspace {
	let wsVer = input._version
	if (wsVer === undefined || wsVer === null || wsVer < 0 || wsVer > WS_VERSION) {
		console.error('no or invalid workspace version provided. this may import data incorrectly.')
		wsVer = WS_VERSION
	}
	const id = randID()
	switch (wsVer) {
	case 0: {
		const ws = input as GG_ImportWorkspace

		const templates = (ws.templates || []).map(importTemplateVersion)
		if (templates.length < 1) {
			templates.push(importTemplateVersion({}))
		}

		const operations = (ws.operations || []).map(importOperationVersion)
		if (operations.length < 1) {
			operations.push(importOperationVersion({}))
		}

		return {
			_version: ws._version ?? WS_VERSION,
			id,
			name: ws.name ?? '',
			schema: ws.schema ?? '',
			isSchemaless: ws.isSchemaless ?? false,
			creation: Date.now(),
			templates,
			operations,
		}
	}
	default:
		throw new Error(`was unable to import workspace by version "${input._version}"`)
	}
}
