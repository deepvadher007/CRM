/**
 * Excel Export Controller
 *
 * Exports all leads visible to the requesting Admin as an .xlsx file using the
 * official 11-column CRM format:
 *
 *   Service Type | Property Type | Lead Date | Lead Name | Lead Phone Number |
 *   Locality | Configuration | Price | Building/Project Name | Address | Notes
 *
 * Lead Date is stored as a real Excel date serial so Excel recognises it as a
 * date and formats it as DD/MM/YYYY.
 */

const XLSX = require('xlsx');
const Lead = require('../models/Lead');

/**
 * Produces a date-only value for a Lead Date Excel cell.
 *
 * Rather than compute Excel serial numbers by hand (which is fragile across
 * timezones), we hand the xlsx library a real UTC-noon Date for the lead's
 * LOCAL calendar day. Using noon (12:00) avoids any midnight/timezone rounding
 * that could push the date to the previous or next day when the library and
 * Excel convert between serials and calendar dates. The cell is then given a
 * `DD/MM/YYYY` display format so Excel shows it exactly as required.
 *
 * @param {Date} date
 * @returns {Date|string} A Date to place in a date cell, or '' when absent
 */
function toExcelDateCell(date) {
  if (!date || isNaN(new Date(date).getTime())) return '';
  const d = new Date(date);
  // Lead Date is stored as a UTC-midnight, date-only value. Read the UTC
  // calendar parts and rebuild as UTC NOON of the same day. Noon is far from
  // midnight so no timezone conversion by the xlsx library or Excel can shift
  // the calendar day on the round trip.
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate(), 12, 0, 0));
}

/**
 * Legacy helper kept for tests: converts a JS Date to an Excel serial number
 * representing the same local calendar day (whole-number serial).
 * @param {Date} date
 * @returns {number|string}
 */
function dateToExcelSerial(date) {
  if (!date || isNaN(new Date(date).getTime())) return '';
  const d = new Date(date);
  const utcMidnight = Date.UTC(d.getFullYear(), d.getMonth(), d.getDate());
  const unixDays = utcMidnight / 86400000;
  return unixDays + 25569;
}

/**
 * GET /api/leads/export
 * Downloads all leads as an .xlsx file in the official CRM format.
 * Admin only (enforced at route level).
 */
const exportLeads = async (req, res, next) => {
  try {
    // Fetch all leads (Admin sees everything)
    const leads = await Lead.find({})
      .populate('createdBy', 'name')
      .sort({ date: -1 });

    // Official column order (exactly as specified by client)
    const officialColumns = [
      'Service Type',
      'Property Type',
      'Lead Date',
      'Lead Name',
      'Lead Phone Number',
      'Locality',
      'Configuration',
      'Price',
      'Building/Project Name',
      'Address',
      'Notes'
    ];

    // Build worksheet data: header row + one row per lead.
    // Lead Date is a real Date object so the xlsx library writes a genuine
    // date cell (type 'd'); we set the display format to DD/MM/YYYY below.
    const wsData = [officialColumns];

    for (const lead of leads) {
      wsData.push([
        lead.serviceType  || '',
        lead.propertyType || '',
        toExcelDateCell(lead.date),   // real Date cell (or '' when absent)
        lead.name         || '',
        lead.number       || '',
        lead.locality     || '',
        lead.configuration|| '',
        lead.price        || '',
        lead.buildingName || '',
        lead.address      || '',
        lead.remark       || ''
      ]);
    }

    // cellDates:true makes aoa_to_sheet emit proper date cells for Date values
    const ws = XLSX.utils.aoa_to_sheet(wsData, { cellDates: true });

    // Apply DD/MM/YYYY display format to every Lead Date cell (column C, rows 2+)
    for (let row = 1; row < wsData.length; row++) {
      const cellAddr = XLSX.utils.encode_cell({ r: row, c: 2 }); // column C (0-indexed)
      const cell = ws[cellAddr];
      if (cell && cell.t === 'd') {
        cell.z = 'DD/MM/YYYY';
      }
    }

    // Set column widths for readability
    ws['!cols'] = [
      { wch: 14 }, // Service Type
      { wch: 14 }, // Property Type
      { wch: 13 }, // Lead Date
      { wch: 22 }, // Lead Name
      { wch: 18 }, // Lead Phone Number
      { wch: 16 }, // Locality
      { wch: 14 }, // Configuration
      { wch: 10 }, // Price
      { wch: 24 }, // Building/Project Name
      { wch: 28 }, // Address
      { wch: 30 }  // Notes
    ];

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Leads');

    const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });

    res.set({
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': 'attachment; filename="leads_export.xlsx"',
      'Content-Length': buffer.length
    });

    res.send(buffer);
  } catch (error) {
    next(error);
  }
};

module.exports = { exportLeads, dateToExcelSerial, toExcelDateCell };
