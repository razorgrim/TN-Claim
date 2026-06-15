export const INITIAL_PROFILE = {
  name: "Ahmad Bin Razak",
  ic: "940815-14-5321",
  contact: "+60 12-345 6789",
  department: "Technical Operations",
  mileageRate: 0.60, // RM per KM
  financeEmail: "finance@totalneutron.com"
};

export const INITIAL_CLAIMS = [
  {
    id: "CLM-001",
    employeeName: "Siti Aminah",
    ic: "960102-10-5462",
    contact: "+60 17-987 6543",
    department: "Sales & Marketing",
    type: "general",
    date: "2026-06-10",
    month: "2026-06",
    status: "Approved",
    adminComments: "All receipts verified and approved.",
    totals: {
      mileageDistance: 45,
      mileageAmount: 27.00,
      toll: 12.50,
      medical: 0.00,
      otherAmount: 15.00,
      grandTotal: 54.50
    },
    items: [
      {
        date: "2026-06-08",
        journey: "Client meeting at Mid Valley Megamall",
        mileageDistance: 25,
        mileageAmount: 15.00,
        toll: 6.50,
        medical: 0.00,
        otherDescription: "",
        otherAmount: 0.00,
        receipt: "receipt_toll_1"
      },
      {
        date: "2026-06-09",
        journey: "Site survey at Cyberjaya",
        mileageDistance: 20,
        mileageAmount: 12.00,
        toll: 6.00,
        medical: 0.00,
        otherDescription: "Client parking fee",
        otherAmount: 15.00,
        receipt: "receipt_parking_1"
      }
    ]
  },
  {
    id: "CLM-002",
    employeeName: "John Doe",
    ic: "921130-14-6789",
    contact: "+60 13-222 3344",
    department: "IT Department",
    type: "ot",
    date: "2026-06-12",
    month: "2026-06",
    status: "Pending",
    adminComments: "",
    totals: {
      weekdayHours: 5,
      weekendHours: 15
    },
    items: [
      {
        date: "2026-06-08",
        checkIn: "09:00",
        checkOut: "21:00",
        weekdayHours: 3,
        weekendHours: 0,
        location: "Kuala Lumpur Office",
        reason: "Server migration and system upgrades",
        authorization: "Mr. Lim (IT Manager)"
      },
      {
        date: "2026-06-09",
        checkIn: "09:00",
        checkOut: "20:00",
        weekdayHours: 2,
        weekendHours: 0,
        location: "Kuala Lumpur Office",
        reason: "Post-migration debugging",
        authorization: "Mr. Lim (IT Manager)"
      },
      {
        date: "2026-06-13", // Saturday
        checkIn: "10:00",
        checkOut: "25:00", // 1 AM next day, or check-out hour total 15 hours
        weekdayHours: 0,
        weekendHours: 15, // full claim 15 hours
        location: "Data Center (Cyberjaya)",
        reason: "Critical database recovery",
        authorization: "Mr. Lim (IT Manager)"
      }
    ]
  },
  {
    id: "CLM-003",
    employeeName: "Ahmad Bin Razak",
    ic: "940815-14-5321",
    contact: "+60 12-345 6789",
    department: "Technical Operations",
    type: "general",
    date: "2026-06-14",
    month: "2026-06",
    status: "Pending",
    adminComments: "",
    totals: {
      mileageDistance: 68,
      mileageAmount: 40.80,
      toll: 18.00,
      medical: 45.00,
      otherAmount: 0.00,
      grandTotal: 103.80
    },
    items: [
      {
        date: "2026-06-11",
        journey: "On-site support at Putrajaya Office",
        mileageDistance: 48,
        mileageAmount: 28.80,
        toll: 10.00,
        medical: 0.00,
        otherDescription: "",
        otherAmount: 0.00,
        receipt: "receipt_toll_2"
      },
      {
        date: "2026-06-12",
        journey: "Travel to client office at Ampang",
        mileageDistance: 20,
        mileageAmount: 12.00,
        toll: 8.00,
        medical: 0.00,
        otherDescription: "",
        otherAmount: 0.00,
        receipt: "receipt_toll_3"
      },
      {
        date: "2026-06-13",
        journey: "Clinic visit (Medical checkup)",
        mileageDistance: 0,
        mileageAmount: 0.00,
        toll: 0.00,
        medical: 45.00,
        otherDescription: "",
        otherAmount: 0.00,
        receipt: "receipt_medical_1"
      }
    ]
  },
  {
    id: "CLM-004",
    employeeName: "Tan Mei Ling",
    ic: "951212-08-5534",
    contact: "+60 19-333 4455",
    department: "Finance & HR",
    type: "ot",
    date: "2026-05-28",
    month: "2026-05",
    status: "Approved",
    adminComments: "Verified and approved.",
    totals: {
      weekdayHours: 4,
      weekendHours: 0
    },
    items: [
      {
        date: "2026-05-25",
        checkIn: "08:30",
        checkOut: "19:30",
        weekdayHours: 2,
        weekendHours: 0,
        location: "Kuala Lumpur Office",
        reason: "Monthly payroll processing",
        authorization: "Mrs. Tan (Finance Director)"
      },
      {
        date: "2026-05-26",
        checkIn: "08:30",
        checkOut: "19:30",
        weekdayHours: 2,
        weekendHours: 0,
        location: "Kuala Lumpur Office",
        reason: "Monthly payroll processing",
        authorization: "Mrs. Tan (Finance Director)"
      }
    ]
  }
];

// Seed images for receipts in base64 format (using svg mockups to keep it small and loadable)
export const MOCK_RECEIPT_IMAGES = {
  receipt_toll_1: "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='300' height='400' viewBox='0 0 300 400'><rect width='100%' height='100%' fill='%23f8fafc'/><rect x='10' y='10' width='280' height='380' rx='5' fill='none' stroke='%23cbd5e1' stroke-width='2' stroke-dasharray='5 5'/><text x='150' y='50' font-family='monospace' font-size='16' font-weight='bold' text-anchor='middle'>PLUS TOLL HIGHWAY</text><text x='150' y='75' font-family='monospace' font-size='12' text-anchor='middle'>PLAZA TOLL SUNGAI BESI</text><line x1='20' y1='100' x2='280' y2='100' stroke='%2394a3b8'/><text x='20' y='130' font-family='monospace' font-size='12'>DATE: 08/06/2026 14:32</text><text x='20' y='150' font-family='monospace' font-size='12'>VEHICLE CAT: CLASS 1</text><text x='20' y='170' font-family='monospace' font-size='12'>MODE: TOUCH 'N GO</text><line x1='20' y1='200' x2='280' y2='200' stroke='%2394a3b8'/><text x='20' y='230' font-family='monospace' font-size='14' font-weight='bold'>TOLL FARE: RM 6.50</text><text x='150' y='320' font-family='monospace' font-size='10' fill='%2364748b' text-anchor='middle'>THANK YOU. DRIVE SAFELY.</text><rect x='80' y='340' width='140' height='30' fill='%230f172a'/><text x='150' y='360' font-family='monospace' font-size='10' fill='white' text-anchor='middle'>BARCODE PLACEHOLDER</text></svg>",
  receipt_parking_1: "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='300' height='400' viewBox='0 0 300 400'><rect width='100%' height='100%' fill='%23f8fafc'/><rect x='10' y='10' width='280' height='380' rx='5' fill='none' stroke='%23cbd5e1' stroke-width='2' stroke-dasharray='5 5'/><text x='150' y='50' font-family='monospace' font-size='16' font-weight='bold' text-anchor='middle'>MID VALLEY PARKING</text><text x='150' y='75' font-family='monospace' font-size='12' text-anchor='middle'>KUALA LUMPUR</text><line x1='20' y1='100' x2='280' y2='100' stroke='%2394a3b8'/><text x='20' y='130' font-family='monospace' font-size='12'>DATE IN: 09/06/2026 10:15</text><text x='20' y='150' font-family='monospace' font-size='12'>DATE OUT: 09/06/2026 15:45</text><text x='20' y='170' font-family='monospace' font-size='12'>TICKET: #MV-88294</text><line x1='20' y1='200' x2='280' y2='200' stroke='%2394a3b8'/><text x='20' y='230' font-family='monospace' font-size='12'>PARKING DURATION: 5.5 HRS</text><text x='20' y='260' font-family='monospace' font-size='14' font-weight='bold'>TOTAL PAID: RM 15.00</text><text x='150' y='320' font-family='monospace' font-size='10' fill='%2364748b' text-anchor='middle'>RECEIPT RE-PRINT</text></svg>",
  receipt_toll_2: "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='300' height='400' viewBox='0 0 300 400'><rect width='100%' height='100%' fill='%23f8fafc'/><rect x='10' y='10' width='280' height='380' rx='5' fill='none' stroke='%23cbd5e1' stroke-width='2' stroke-dasharray='5 5'/><text x='150' y='50' font-family='monospace' font-size='16' font-weight='bold' text-anchor='middle'>MEX HIGHWAY TOLL</text><text x='150' y='75' font-family='monospace' font-size='12' text-anchor='middle'>PLAZA TOLL PUTRAJAYA</text><line x1='20' y1='100' x2='280' y2='100' stroke='%2394a3b8'/><text x='20' y='130' font-family='monospace' font-size='12'>DATE: 11/06/2026 08:45</text><text x='20' y='150' font-family='monospace' font-size='12'>TICKET ID: #MEX-44123</text><line x1='20' y1='200' x2='280' y2='200' stroke='%2394a3b8'/><text x='20' y='230' font-family='monospace' font-size='14' font-weight='bold'>TOLL FARE: RM 10.00</text></svg>",
  receipt_toll_3: "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='300' height='400' viewBox='0 0 300 400'><rect width='100%' height='100%' fill='%23f8fafc'/><rect x='10' y='10' width='280' height='380' rx='5' fill='none' stroke='%23cbd5e1' stroke-width='2' stroke-dasharray='5 5'/><text x='150' y='50' font-family='monospace' font-size='16' font-weight='bold' text-anchor='middle'>DUKE HIGHWAY TOLL</text><text x='150' y='75' font-family='monospace' font-size='12' text-anchor='middle'>PLAZA TOLL AYER PANAS</text><line x1='20' y1='100' x2='280' y2='100' stroke='%2394a3b8'/><text x='20' y='130' font-family='monospace' font-size='12'>DATE: 12/06/2026 18:15</text><text x='20' y='150' font-family='monospace' font-size='12'>TICKET ID: #DUKE-9922</text><line x1='20' y1='200' x2='280' y2='200' stroke='%2394a3b8'/><text x='20' y='230' font-family='monospace' font-size='14' font-weight='bold'>TOLL FARE: RM 8.00</text></svg>",
  receipt_medical_1: "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='300' height='400' viewBox='0 0 300 400'><rect width='100%' height='100%' fill='%23f8fafc'/><rect x='10' y='10' width='280' height='380' rx='5' fill='none' stroke='%23cbd5e1' stroke-width='2' stroke-dasharray='5 5'/><text x='150' y='50' font-family='monospace' font-size='16' font-weight='bold' text-anchor='middle'>KLINIK KELUARGA</text><text x='150' y='75' font-family='monospace' font-size='11' text-anchor='middle'>NO 24 JALAN TELAWI, BANGSAR</text><line x1='20' y1='100' x2='280' y2='100' stroke='%2394a3b8'/><text x='20' y='130' font-family='monospace' font-size='12'>DATE: 13/06/2026 11:20</text><text x='20' y='150' font-family='monospace' font-size='12'>PATIENT: AHMAD BIN RAZAK</text><line x1='20' y1='200' x2='280' y2='200' stroke='%2394a3b8'/><text x='20' y='220' font-family='monospace' font-size='12'>CONSULTATION: RM 25.00</text><text x='20' y='240' font-family='monospace' font-size='12'>MEDICATION: RM 20.00</text><line x1='20' y1='265' x2='280' y2='265' stroke='%23cbd5e1' stroke-width='1'/><text x='20' y='290' font-family='monospace' font-size='14' font-weight='bold'>TOTAL AMOUNT: RM 45.00</text><text x='150' y='350' font-family='monospace' font-size='10' fill='%2316a34a' text-anchor='middle'>[ PAID - CASH ]</text></svg>"
};
