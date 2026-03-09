import { MongoMemoryServer } from 'mongodb-memory-server'
import { describe, expect, it, beforeAll, afterAll, afterEach } from 'vitest'

type SchemaPathLike = {
  instance: string
  options?: {
    required?: unknown
    enum?: unknown[]
    default?: unknown
    unique?: boolean
  }
  caster?: { instance?: string }
}

type AnyModel = any

type EagerModuleMap = Record<string, Record<string, unknown>>

const modelModules = import.meta.glob('../../../server/src/infrastructure/database/models/**/*.ts', {
  eager: true,
}) as EagerModuleMap

function isMongooseModel(candidate: unknown): candidate is AnyModel {
  if (!candidate || typeof candidate !== 'function') {
    return false
  }

  const maybeModel = candidate as AnyModel
  return Boolean(maybeModel.modelName && maybeModel.schema && typeof maybeModel.create === 'function')
}

function dedupeModels(models: AnyModel[]): AnyModel[] {
  const byName = new Map<string, AnyModel>()

  for (const model of models) {
    byName.set(model.modelName, model)
  }

  return Array.from(byName.values())
}

function getAllModels(): AnyModel[] {
  const models: AnyModel[] = []

  for (const moduleExports of Object.values(modelModules)) {
    for (const exportedValue of Object.values(moduleExports)) {
      if (isMongooseModel(exportedValue)) {
        models.push(exportedValue)
      }
    }
  }

  return dedupeModels(models)
}

function isStaticallyRequired(schemaPath: SchemaPathLike): boolean {
  const required = (schemaPath as any).options?.required

  if (required === true) {
    return true
  }

  if (Array.isArray(required)) {
    return required[0] === true
  }

  if (required && typeof required === 'object' && 'value' in required) {
    return Boolean((required as { value: unknown }).value)
  }

  return false
}

function setDeep(target: Record<string, unknown>, dottedPath: string, value: unknown): void {
  const segments = dottedPath.split('.')
  let pointer: Record<string, unknown> = target

  for (let i = 0; i < segments.length - 1; i += 1) {
    const key = segments[i]
    const current = pointer[key]
    if (!current || typeof current !== 'object' || Array.isArray(current)) {
      pointer[key] = {}
    }
    pointer = pointer[key] as Record<string, unknown>
  }

  pointer[segments[segments.length - 1]] = value
}

function unsetDeep(target: Record<string, unknown>, dottedPath: string): void {
  const segments = dottedPath.split('.')
  let pointer: Record<string, unknown> = target

  for (let i = 0; i < segments.length - 1; i += 1) {
    const key = segments[i]
    const current = pointer[key]

    if (!current || typeof current !== 'object' || Array.isArray(current)) {
      return
    }

    pointer = current as Record<string, unknown>
  }

  delete pointer[segments[segments.length - 1]]
}

function sampleValueForPath(pathName: string, schemaPath: SchemaPathLike, model: AnyModel): unknown {
  const schemaPathAny = schemaPath as any
  const enumValues = schemaPathAny.options?.enum

  if (Array.isArray(enumValues) && enumValues.length > 0) {
    return enumValues[0]
  }

  switch (schemaPath.instance) {
    case 'String':
      return `${pathName.replace(/\./g, '_')}_value`
    case 'Number':
      return 1
    case 'Boolean':
      return true
    case 'Date':
      return new Date('2025-01-01T00:00:00.000Z')
    case 'ObjectId':
      return new model.db.base.Types.ObjectId()
    case 'Buffer':
      return Buffer.from('x')
    case 'Decimal128':
      return 1.5
    case 'Array': {
      const casterInstance = schemaPathAny.caster?.instance
      if (casterInstance === 'String') {
        return ['item']
      }
      if (casterInstance === 'Number') {
        return [1]
      }
      if (casterInstance === 'ObjectId') {
        return [new model.db.base.Types.ObjectId()]
      }
      return []
    }
    case 'Map':
      return { key: 'value' }
    default:
      return {}
  }
}

function buildRequiredDoc(model: AnyModel): Record<string, unknown> {
  const doc: Record<string, unknown> = {}

  for (const [pathName, schemaPath] of Object.entries(model.schema.paths)) {
    if (pathName === '_id' || pathName === '__v') {
      continue
    }

    if (!isStaticallyRequired(schemaPath)) {
      continue
    }

    setDeep(doc, pathName, sampleValueForPath(pathName, schemaPath as SchemaPathLike, model))
  }

  return doc
}

function getUniqueIndexSpecs(model: AnyModel): Array<Record<string, 1 | -1 | 'text'>> {
  const uniqueIndexes = model.schema
    .indexes()
    .filter(([, options]) => Boolean(options?.unique) && !options?.partialFilterExpression)
    .map(([keys]) => keys as Record<string, 1 | -1 | 'text'>)

  const uniquePathIndexes = Object.entries(model.schema.paths)
    .filter(([, schemaPath]) => (schemaPath as any).options?.unique === true)
    .map(([pathName]) => ({ [pathName]: 1 as const }))

  const all = [...uniqueIndexes, ...uniquePathIndexes]
  const deduped = new Map<string, Record<string, 1 | -1 | 'text'>>()

  for (const indexSpec of all) {
    const signature = Object.keys(indexSpec)
      .sort()
      .map((key) => `${key}:${indexSpec[key]}`)
      .join('|')
    deduped.set(signature, indexSpec)
  }

  return Array.from(deduped.values())
}

function buildUniqueIndexDoc(model: AnyModel, indexSpec: Record<string, 1 | -1 | 'text'>): Record<string, unknown> {
  const doc: Record<string, unknown> = {}

  for (const field of Object.keys(indexSpec)) {
    const schemaPath = model.schema.path(field)
    const value = schemaPath ? sampleValueForPath(field, schemaPath as SchemaPathLike, model) : `${field.replace(/\./g, '_')}_value`
    setDeep(doc, field, value)
  }

  return doc
}

function wrongTypeValueFor(instance: string): unknown {
  switch (instance) {
    case 'Number':
      return 'not-a-number'
    case 'Date':
      return 'not-a-date'
    case 'ObjectId':
      return 'not-an-objectid'
    case 'Boolean':
      return 'not-a-boolean'
    default:
      return null
  }
}

describe('Mongoose model schema contract coverage', () => {
  const models = getAllModels()
  const mongooseBase = models[0]?.db.base
  let mongoServer: MongoMemoryServer

  beforeAll(async () => {
    mongoServer = await MongoMemoryServer.create()
    await mongooseBase.connect(mongoServer.getUri())
  })

  afterEach(async () => {
    for (const model of models) {
      await model.deleteMany({})
    }
  })

  afterAll(async () => {
    await mongooseBase.connection.dropDatabase()
    await mongooseBase.disconnect()
    await mongoServer.stop()
  })

  it('should discover mongoose models exported under server model directories', () => {
    expect(models.length).toBeGreaterThan(20)
  })

  it('should raise ValidationError for each static required field when omitted', () => {
    for (const model of models) {
      const requiredPaths = Object.entries(model.schema.paths)
        .filter(([pathName, schemaPath]) => pathName !== '_id' && pathName !== '__v' && isStaticallyRequired(schemaPath))
        .map(([pathName]) => pathName)

      if (requiredPaths.length === 0) {
        continue
      }

      for (const requiredPath of requiredPaths) {
        const baseDoc = buildRequiredDoc(model)
        unsetDeep(baseDoc, requiredPath)

        const candidate = new model(baseDoc)
        const validationError = candidate.validateSync()

        expect(validationError?.errors?.[requiredPath], `${model.modelName}.${requiredPath} should be required`).toBeDefined()
      }
    }
  })

  it('should enforce unique constraints at database level for unique indexes', async () => {
    for (const model of models) {
      const uniqueIndexes = getUniqueIndexSpecs(model)

      if (uniqueIndexes.length === 0) {
        continue
      }

      await model.init()

      for (const uniqueIndex of uniqueIndexes) {
        await model.deleteMany({})

        const duplicateDoc = buildUniqueIndexDoc(model, uniqueIndex)
        await model.collection.insertOne({ ...duplicateDoc })

        let duplicateError: unknown

        try {
          await model.collection.insertOne({ ...duplicateDoc })
        } catch (error) {
          duplicateError = error
        }

        expect(duplicateError, `${model.modelName} should reject duplicate for ${JSON.stringify(uniqueIndex)}`).toBeTruthy()
        expect((duplicateError as { code?: number }).code).toBe(11000)
      }
    }
  })

  it('should reject wrong scalar types for numeric/date/objectid/boolean fields', () => {
    for (const model of models) {
      const typedPaths = Object.entries(model.schema.paths).filter(
        ([pathName, schemaPath]) =>
          pathName !== '_id' &&
          pathName !== '__v' &&
          ['Number', 'Date', 'ObjectId', 'Boolean'].includes(schemaPath.instance)
      )

      if (typedPaths.length === 0) {
        continue
      }

      const [targetPath, targetSchemaPath] = typedPaths[0]
      const payload = buildRequiredDoc(model)
      setDeep(payload, targetPath, wrongTypeValueFor(targetSchemaPath.instance))

      const candidate = new model(payload)
      const validationError = candidate.validateSync()

      expect(validationError?.errors?.[targetPath], `${model.modelName}.${targetPath} should reject wrong type`).toBeDefined()
    }
  })

  it('should apply configured default values on document construction', () => {
    for (const model of models) {
      const defaultPaths = Object.entries(model.schema.paths).filter(
        ([pathName, schemaPath]) =>
          pathName !== '_id' &&
          pathName !== '__v' &&
          !pathName.includes('.') &&
          (schemaPath as any).options?.default !== undefined
      )

      if (defaultPaths.length === 0) {
        continue
      }

      const candidate = new model(buildRequiredDoc(model))

      for (const [pathName, schemaPath] of defaultPaths) {
        const configuredDefault = (schemaPath as any).options.default
        const actualValue = candidate.get(pathName)

        if (configuredDefault === null) {
          expect(actualValue, `${model.modelName}.${pathName} default should be null`).toBeNull()
        } else {
          expect(actualValue, `${model.modelName}.${pathName} should have default`).not.toBeUndefined()
        }
      }
    }
  })

  it('should expose schema virtuals and instance/static methods without runtime access errors', () => {
    for (const model of models) {
      const candidate = new model(buildRequiredDoc(model))

      const virtualKeys = Object.keys(model.schema.virtuals).filter((virtualName) => virtualName !== 'id')
      for (const virtualName of virtualKeys) {
        expect(() => (candidate as Record<string, unknown>)[virtualName]).not.toThrow()
      }

      const methodKeys = Object.keys(model.schema.methods)
      for (const methodName of methodKeys) {
        expect(typeof (candidate as Record<string, unknown>)[methodName]).toBe('function')
      }

      const staticKeys = Object.keys(model.schema.statics)
      for (const staticName of staticKeys) {
        expect(typeof (model as unknown as Record<string, unknown>)[staticName]).toBe('function')
      }
    }
  })
})
