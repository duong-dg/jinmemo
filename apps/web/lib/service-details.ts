export type ServiceDetails = {
  custom?: boolean;
  included: string;
  excluded: string;
  includedEn: string;
  excludedEn: string;
};

export const emptyServiceDetails: ServiceDetails = {
  included: '',
  excluded: '',
  includedEn: '',
  excludedEn: ''
};

export function serviceDetailLines(details: ServiceDetails | undefined, en: boolean) {
  const included = en ? details?.includedEn || details?.included : details?.included;
  const excluded = en ? details?.excludedEn || details?.excluded : details?.excluded;
  const lines = (text: string | undefined) => (text || '').split(/\r?\n/).map(line => line.trim()).filter(Boolean);
  return {included: lines(included), excluded: lines(excluded)};
}
