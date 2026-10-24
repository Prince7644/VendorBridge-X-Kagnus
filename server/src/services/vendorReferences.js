// Extension point for Weeks 2-4: RFQs, quotations, purchase orders and invoices
// will reference vendors. Once those collections exist, return true here when a
// vendor is referenced so archiving can be blocked (or handled) safely.
// In Week 1 no other collection references vendors.
async function vendorHasReferences() {
  return false;
}

module.exports = { vendorHasReferences };
