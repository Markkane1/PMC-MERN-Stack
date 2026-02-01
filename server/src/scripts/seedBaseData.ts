import { connectDb } from '../infrastructure/config/db'
import { DivisionModel } from '../infrastructure/database/models/pmc/Division'
import { DistrictModel } from '../infrastructure/database/models/pmc/District'

async function seed() {
  await connectDb()

  const divisions = [
    { divisionId: 1, divisionName: 'Lahore', divisionCode: 'LHR' },
    { divisionId: 2, divisionName: 'Faisalabad', divisionCode: 'FSD' },
    { divisionId: 3, divisionName: 'Rawalpindi', divisionCode: 'RWP' },
    { divisionId: 4, divisionName: 'Sargodha', divisionCode: 'SGD' },
    { divisionId: 5, divisionName: 'Multan', divisionCode: 'MLT' },
    { divisionId: 6, divisionName: 'Sahiwal', divisionCode: 'SWL' },
    { divisionId: 7, divisionName: 'Gujranwala', divisionCode: 'GWL' },
    { divisionId: 8, divisionName: 'Bahawalpur', divisionCode: 'BWP' },
    { divisionId: 9, divisionName: 'Dera Ghazi Khan', divisionCode: 'DGK' },
    { divisionId: 10, divisionName: 'Gujrat', divisionCode: 'GRT' },
  ]

  const districts = [
    { districtId: 1, divisionId: 1, districtName: 'Lahore', districtCode: 'LHR', shortName: 'LHR' },
    { districtId: 2, divisionId: 1, districtName: 'Kasur', districtCode: 'KSR', shortName: 'KSR' },
    { districtId: 3, divisionId: 1, districtName: 'Sheikhupura', districtCode: 'SKP', shortName: 'SKP' },
    { districtId: 4, divisionId: 1, districtName: 'Nankana Sahib', districtCode: 'NNS', shortName: 'NNS' },
    { districtId: 5, divisionId: 2, districtName: 'Faisalabad', districtCode: 'FSD', shortName: 'FSD' },
    { districtId: 6, divisionId: 2, districtName: 'Jhang', districtCode: 'JHG', shortName: 'JHG' },
    { districtId: 7, divisionId: 2, districtName: 'Toba Tek Singh', districtCode: 'TTS', shortName: 'TTS' },
    { districtId: 8, divisionId: 2, districtName: 'Chiniot', districtCode: 'CHT', shortName: 'CHT' },
    { districtId: 9, divisionId: 3, districtName: 'Rawalpindi', districtCode: 'RWP', shortName: 'RWP' },
    { districtId: 10, divisionId: 3, districtName: 'Attock', districtCode: 'ATK', shortName: 'ATK' },
    { districtId: 11, divisionId: 3, districtName: 'Jhelum', districtCode: 'JLM', shortName: 'JLM' },
    { districtId: 12, divisionId: 3, districtName: 'Chakwal', districtCode: 'CKL', shortName: 'CKL' },
    { districtId: 13, divisionId: 4, districtName: 'Sargodha', districtCode: 'SGD', shortName: 'SGD' },
    { districtId: 14, divisionId: 4, districtName: 'Khushab', districtCode: 'KSB', shortName: 'KSB' },
    { districtId: 15, divisionId: 4, districtName: 'Mianwali', districtCode: 'MWL', shortName: 'MWL' },
    { districtId: 16, divisionId: 4, districtName: 'Bhakkar', districtCode: 'BKR', shortName: 'BKR' },
    { districtId: 17, divisionId: 5, districtName: 'Multan', districtCode: 'MLT', shortName: 'MLT' },
    { districtId: 18, divisionId: 5, districtName: 'Lodhran', districtCode: 'LDN', shortName: 'LDN' },
    { districtId: 19, divisionId: 5, districtName: 'Vehari', districtCode: 'VHR', shortName: 'VHR' },
    { districtId: 20, divisionId: 5, districtName: 'Khanewal', districtCode: 'KNW', shortName: 'KNW' },
    { districtId: 21, divisionId: 6, districtName: 'Sahiwal', districtCode: 'SWL', shortName: 'SWL' },
    { districtId: 22, divisionId: 6, districtName: 'Pakpattan', districtCode: 'PPT', shortName: 'PPT' },
    { districtId: 23, divisionId: 6, districtName: 'Okara', districtCode: 'OKR', shortName: 'OKR' },
    { districtId: 24, divisionId: 7, districtName: 'Gujranwala', districtCode: 'GWL', shortName: 'GWL' },
    { districtId: 25, divisionId: 7, districtName: 'Gujrat', districtCode: 'GRT', shortName: 'GRT' },
    { districtId: 26, divisionId: 7, districtName: 'Hafizabad', districtCode: 'HZD', shortName: 'HZD' },
    { districtId: 27, divisionId: 7, districtName: 'Mandi Bahauddin', districtCode: 'MBD', shortName: 'MBD' },
    { districtId: 28, divisionId: 7, districtName: 'Narowal', districtCode: 'NWL', shortName: 'NWL' },
    { districtId: 29, divisionId: 7, districtName: 'Sialkot', districtCode: 'SLK', shortName: 'SLK' },
    { districtId: 30, divisionId: 8, districtName: 'Bahawalpur', districtCode: 'BWP', shortName: 'BWP' },
    { districtId: 31, divisionId: 8, districtName: 'Bahawalnagar', districtCode: 'BWN', shortName: 'BWN' },
    { districtId: 32, divisionId: 8, districtName: 'Rahim Yar Khan', districtCode: 'RYK', shortName: 'RYK' },
    { districtId: 33, divisionId: 9, districtName: 'Dera Ghazi Khan', districtCode: 'DGK', shortName: 'DGK' },
    { districtId: 34, divisionId: 9, districtName: 'Rajanpur', districtCode: 'RJP', shortName: 'RJP' },
    { districtId: 35, divisionId: 9, districtName: 'Muzaffargarh', districtCode: 'MZG', shortName: 'MZG' },
    { districtId: 36, divisionId: 9, districtName: 'Layyah', districtCode: 'LYH', shortName: 'LYH' },
  ]

  for (const division of divisions) {
    await DivisionModel.updateOne({ divisionId: division.divisionId }, division, { upsert: true })
  }

  for (const district of districts) {
    await DistrictModel.updateOne({ districtId: district.districtId }, district, { upsert: true })
  }

  console.log('Seed completed')
  process.exit(0)
}

seed().catch((err) => {
  console.error(err)
  process.exit(1)
})
