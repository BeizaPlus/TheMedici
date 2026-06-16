import { inferPatientSex } from './patientSex.js';
import { resolvePatientDemographics } from './patientFactsFromHpi.js';

/** Scene template key: male | female | pedMale | pedFemale */
export function resolvePatientSceneKey(caseData = {}) {
  const sex = inferPatientSex(caseData);
  const { isPediatric } = resolvePatientDemographics(caseData);
  if (isPediatric) return sex === 'female' ? 'pedFemale' : 'pedMale';
  return sex === 'female' ? 'female' : 'male';
}
