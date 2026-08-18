export const labPresets = {
  hematology: [
    {
      labelEn: 'RBC (Red Blood Cells)',
      labelKh: 'គ្រាប់ឈាមក្រហម',
      unit: '10^12/L',
      refRange: '4.00 - 5.20'
    },
    {
      labelEn: 'Hb (Hemoglobin)',
      labelKh: 'អេម៉ូក្លូបីន',
      unit: 'g/L',
      refRange: '120 - 160'
    },
    {
      labelEn: 'Hct (Hematocrit)',
      labelKh: 'អេម៉ាតូគ្រីត',
      unit: '%',
      refRange: '37.0 - 47.0'
    },
    { labelEn: 'MCV', labelKh: 'MCV', unit: 'fL', refRange: '80.0 - 95.0' },
    { labelEn: 'MCH', labelKh: 'MCH', unit: 'pg', refRange: '27.0 - 33.0' },
    { labelEn: 'MCHC', labelKh: 'MCHC', unit: 'g/dL', refRange: '30.0 - 36.0' },
    { labelEn: 'RDW', labelKh: 'RDW', unit: '%', refRange: '11.0 - 16.6' },
    {
      labelEn: 'WBC (White Blood Cells)',
      labelKh: 'គ្រាប់ឈាមស',
      unit: '10^9/L',
      refRange: '4.00 - 9.00'
    },
    {
      labelEn: 'Platelets',
      labelKh: 'ប្លាកែត',
      unit: '10^9/L',
      refRange: '150 - 450'
    }
  ],
  chemistry: [
    {
      labelEn: 'Glucose',
      labelKh: 'ជាតិស្ករ',
      unit: 'mg/dL',
      refRange: '70 - 110'
    },
    { labelEn: 'Urea', labelKh: 'អ៊ុយរ៉េ', unit: 'mg/dL', refRange: '10 - 50' },
    {
      labelEn: 'Creatinine',
      labelKh: 'ក្រេអាទីនីន',
      unit: 'mg/dL',
      refRange: '0.6 - 1.2'
    },
    { labelEn: 'AST (SGOT)', labelKh: 'AST', unit: 'U/L', refRange: '< 40' },
    { labelEn: 'ALT (SGPT)', labelKh: 'ALT', unit: 'U/L', refRange: '< 41' },
    {
      labelEn: 'Cholesterol Total',
      labelKh: 'កូលេស្តេរ៉ុលសរុប',
      unit: 'mg/dL',
      refRange: '< 200'
    },
    {
      labelEn: 'Triglycerides',
      labelKh: 'ទ្រីគ្លីសេរីត',
      unit: 'mg/dL',
      refRange: '< 150'
    }
  ],
  urine: [
    { labelEn: 'Color', labelKh: 'ពណ៌', unit: '', refRange: 'Yellow' },
    { labelEn: 'pH', labelKh: 'pH', unit: '', refRange: '5.0 - 8.0' },
    {
      labelEn: 'Protein',
      labelKh: 'ប្រូតេអ៊ីន',
      unit: '',
      refRange: 'Negative'
    },
    { labelEn: 'Glucose', labelKh: 'ស្ករ', unit: '', refRange: 'Negative' },
    { labelEn: 'WBC', labelKh: 'WBC', unit: '/HPF', refRange: '0 - 5' },
    { labelEn: 'RBC', labelKh: 'RBC', unit: '/HPF', refRange: '0 - 2' }
  ]
}
