import { createMongooseCrudRepository } from './crud'
import { BusinessProfileModel } from '../../models/pmc/BusinessProfile'
import { PlasticItemModel } from '../../models/pmc/PlasticItem'
import { ProductModel } from '../../models/pmc/Product'
import { ByProductModel } from '../../models/pmc/ByProduct'
import { ProducerModel } from '../../models/pmc/Producer'
import { ConsumerModel } from '../../models/pmc/Consumer'
import { CollectorModel } from '../../models/pmc/Collector'
import { RecyclerModel } from '../../models/pmc/Recycler'
import { RawMaterialModel } from '../../models/pmc/RawMaterial'
import { ApplicantFieldResponseModel } from '../../models/pmc/ApplicantFieldResponse'
import { ApplicantManualFieldsModel } from '../../models/pmc/ApplicantManualFields'
import { ApplicationAssignmentModel } from '../../models/pmc/ApplicationAssignment'

export const businessProfileCrudRepo = createMongooseCrudRepository(BusinessProfileModel, 'numericId')
export const plasticItemCrudRepo = createMongooseCrudRepository(PlasticItemModel)
export const productCrudRepo = createMongooseCrudRepository(ProductModel)
export const byProductCrudRepo = createMongooseCrudRepository(ByProductModel)
export const producerCrudRepo = createMongooseCrudRepository(ProducerModel, 'numericId')
export const consumerCrudRepo = createMongooseCrudRepository(ConsumerModel, 'numericId')
export const collectorCrudRepo = createMongooseCrudRepository(CollectorModel, 'numericId')
export const recyclerCrudRepo = createMongooseCrudRepository(RecyclerModel, 'numericId')
export const rawMaterialCrudRepo = createMongooseCrudRepository(RawMaterialModel)
export const applicantFieldResponseCrudRepo = createMongooseCrudRepository(ApplicantFieldResponseModel, 'numericId')
export const applicantManualFieldsCrudRepo = createMongooseCrudRepository(ApplicantManualFieldsModel, 'numericId')
export const applicationAssignmentCrudRepo = createMongooseCrudRepository(ApplicationAssignmentModel, 'numericId')
