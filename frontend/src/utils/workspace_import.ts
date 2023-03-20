import type {GG_ImportOperation, GG_ImportTemplate, GG_ImportWorkspace, GG_Operation, GG_Template, GG_Workspace, VersionedEntity} from '../stores/playground'
import {WS_VERSION, TEMPLATE_VERSION, OPERATION_VERSION} from '../stores/playground'
import {randID} from './misc'

export function importOperationVersion(input: Partial<VersionedEntity> & {[key: string]: any}): GG_Operation {
	if (
		input._version === undefined || input._version === null ||
		input._version < 0 || input._version > OPERATION_VERSION
	) {
		console.error('no or invalid operation version provided. this may import data incorrectly.')
		input._version = OPERATION_VERSION
	}
	const id = randID()
	switch (input._version) {
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
	if (
		input._version === undefined || input._version === null ||
		input._version < 0 || input._version > TEMPLATE_VERSION
	) {
		console.error('no or invalid template version provided. this may import data incorrectly.')
		input._version = TEMPLATE_VERSION
	}
	const id = randID()
	switch (input._version) {
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
	if (
		input._version === undefined || input._version === null ||
		input._version < 0 || input._version > WS_VERSION
	) {
		console.error('no or invalid workspace version provided. this may import data incorrectly.')
		input._version = WS_VERSION
	}
	const id = randID()
	switch (input._version) {
	case 0: {
		const ws = input as GG_ImportWorkspace
		return {
			_version: ws._version ?? WS_VERSION,
			id,
			name: ws.name ?? '',
			schema: ws.schema ?? '',
			isSchemaless: ws.isSchemaless ?? false,
			creation: Date.now(),
			templates: (input.templates || []).map(importTemplateVersion),
			operations: (input.operations || []).map(importOperationVersion),
		}
	}
	default:
		throw new Error(`was unable to import workspace by version "${input._version}"`)
	}
}
