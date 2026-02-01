import type { DistrictNewRepository, EecClubRepository } from '../../../../domain/repositories/idm'
import { DistrictNewModel } from '../../models/idm/DistrictNew'
import { EecClubModel } from '../../models/idm/EecClub'

export const districtNewRepositoryMongo: DistrictNewRepository = {
  async list() {
    return DistrictNewModel.find().lean()
  },
}

export const eecClubRepositoryMongo: EecClubRepository = {
  async list() {
    return EecClubModel.find().lean()
  },
  async listWithCoords() {
    return EecClubModel.find({ latitude: { $ne: null }, longitude: { $ne: null } }).lean()
  },
}
