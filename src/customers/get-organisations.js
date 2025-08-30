const organisations = [
  { organisationId: '5900001', sbi: 110100101, name: 'Farms Ltd' },
  { organisationId: '5900002', sbi: 110100102, name: 'Andrew Farmer' },
  { organisationId: '5900003', sbi: 110100103, name: 'A & F Land Management' }
]

export function getOrganisations () {
  return organisations
}

export function getOrganisationBySbi (sbi) {
  return organisations.find(org => org.sbi === sbi)
}
