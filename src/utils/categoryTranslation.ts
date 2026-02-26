/**
 * Category name translation helper.
 *
 * Default category names are stored in AsyncStorage as English strings
 * (e.g. "Food", "Grocery"). This module provides a display-time translation
 * layer so the UI shows translated names without touching stored data.
 *
 * User-created categories (not in CATEGORY_KEY_MAP) fall back to their raw name.
 */

/** Maps every default English category name → its i18n translation key. */
export const CATEGORY_KEY_MAP: Record<string, string> = {
  // ── Expense parents ─────────────────────────────────────────────────────
  'Food':                      'defaultCategories.food',
  'Housing':                   'defaultCategories.housing',
  'Utility':                   'defaultCategories.utility',
  'Transportation':            'defaultCategories.transportation',
  'Medical':                   'defaultCategories.medical',
  'Insurance':                 'defaultCategories.insurance',
  'Finance/Tax/Government':    'defaultCategories.financeTaxGovernment',
  'Social':                    'defaultCategories.social',
  'Love Life':                 'defaultCategories.loveLife',
  'Education':                 'defaultCategories.education',
  'Fitness/Health':            'defaultCategories.fitnessHealth',
  'Substance':                 'defaultCategories.substance',
  'Entertainment':             'defaultCategories.entertainment',
  'Shopping':                  'defaultCategories.shopping',
  'Beauty':                    'defaultCategories.beauty',
  'Fashion':                   'defaultCategories.fashion',
  'Digital Tool':              'defaultCategories.digitalTool',
  'Service':                   'defaultCategories.service',
  'Pet':                       'defaultCategories.pet',
  'Donation':                  'defaultCategories.donation',
  'Family/Children':           'defaultCategories.familyChildren',

  // ── Income parents ───────────────────────────────────────────────────────
  'Salary':                    'defaultCategories.salary',
  'Freelance':                 'defaultCategories.freelance',
  'Business':                  'defaultCategories.business',
  'Investment':                'defaultCategories.investment',
  'Miscellaneous':             'defaultCategories.miscellaneous',

  // ── Special ──────────────────────────────────────────────────────────────
  'Uncategorized':             'category.uncategorized',

  // ── Shared leaf names (appear across multiple parent categories) ──────────
  'Restaurant':                'defaultCategories.restaurant',
  'Gift':                      'defaultCategories.gift',
  'Maintenance':               'defaultCategories.maintenance',
  'Grooming':                  'defaultCategories.grooming',
  'Supply':                    'defaultCategories.supply',
  'Accessory':                 'defaultCategories.accessory',

  // ── Food children ────────────────────────────────────────────────────────
  'Grocery':                   'defaultCategories.grocery',
  'Coffee':                    'defaultCategories.coffee',
  'Snack':                     'defaultCategories.snack',
  'Delivery':                  'defaultCategories.delivery',

  // ── Housing children ─────────────────────────────────────────────────────
  'Rent':                      'defaultCategories.rent',
  'Mortgage':                  'defaultCategories.mortgage',
  'Property Tax':              'defaultCategories.propertyTax',
  'Management Fee':            'defaultCategories.managementFee',
  'Moving Expense':            'defaultCategories.movingExpense',

  // ── Utility children ─────────────────────────────────────────────────────
  'Home Internet':             'defaultCategories.homeInternet',
  'Mobile Plan':               'defaultCategories.mobilePlan',
  'Water':                     'defaultCategories.water',
  'Electricity':               'defaultCategories.electricity',
  'Gas':                       'defaultCategories.gas',
  'Trash':                     'defaultCategories.trash',
  'Heating':                   'defaultCategories.heating',

  // ── Transportation children ───────────────────────────────────────────────
  'Public Transport':          'defaultCategories.publicTransport',
  'Taxi':                      'defaultCategories.taxi',
  'Fuel':                      'defaultCategories.fuel',
  'Payment':                   'defaultCategories.payment',
  'Bike':                      'defaultCategories.bike',
  'Parking':                   'defaultCategories.parking',
  'Toll':                      'defaultCategories.toll',
  'Flight':                    'defaultCategories.flight',

  // ── Medical children ─────────────────────────────────────────────────────
  'General Practitioner':      'defaultCategories.generalPractitioner',
  'Specialist':                'defaultCategories.specialist',
  'Dentist':                   'defaultCategories.dentist',
  'Pharmacist':                'defaultCategories.pharmacist',
  'Physiotherapist':           'defaultCategories.physiotherapist',
  'Psychotherapist':           'defaultCategories.psychotherapist',
  'Psychiatrist':              'defaultCategories.psychiatrist',
  'Alternative Medicine':      'defaultCategories.alternativeMedicine',
  'Checkup':                   'defaultCategories.checkup',

  // ── Insurance children ───────────────────────────────────────────────────
  'Life Insurance':            'defaultCategories.lifeInsurance',
  'Medical Insurance':         'defaultCategories.medicalInsurance',
  'Critical Illness Insurance':'defaultCategories.criticalIllnessInsurance',

  // ── Finance/Tax/Government children ──────────────────────────────────────
  'Foreign Exchange Fee':      'defaultCategories.foreignExchangeFee',
  'Transaction Fee':           'defaultCategories.transactionFee',
  'Tax':                       'defaultCategories.tax',
  'Fine':                      'defaultCategories.fine',
  'License':                   'defaultCategories.license',

  // ── Social children ──────────────────────────────────────────────────────
  'Drink & Bar':               'defaultCategories.drinkBar',
  'Party & Event':             'defaultCategories.partyEvent',
  'Networking':                'defaultCategories.networking',

  // ── Love Life children ───────────────────────────────────────────────────
  'Date':                      'defaultCategories.date',
  'Hotel':                     'defaultCategories.hotel',
  'Partner Support':           'defaultCategories.partnerSupport',
  'Adult Service':             'defaultCategories.adultService',
  'Sexual Health':             'defaultCategories.sexualHealth',

  // ── Education children ───────────────────────────────────────────────────
  'Tuition (School)':          'defaultCategories.tuitionSchool',
  'Private Tutoring':          'defaultCategories.privateTutoring',
  'Course':                    'defaultCategories.course',
  'Learning Material':         'defaultCategories.learningMaterial',
  'Certification':             'defaultCategories.certification',

  // ── Fitness/Health children ──────────────────────────────────────────────
  'Membership':                'defaultCategories.membership',
  'Class':                     'defaultCategories.class',
  'Coaching':                  'defaultCategories.coaching',
  'Equipment':                 'defaultCategories.equipment',
  'Supplement':                'defaultCategories.supplement',
  'Event':                     'defaultCategories.event',

  // ── Substance children ───────────────────────────────────────────────────
  'Alcohol':                   'defaultCategories.alcohol',
  'Tobacco':                   'defaultCategories.tobacco',
  'Cannabis':                  'defaultCategories.cannabis',
  'Psychedelic':               'defaultCategories.psychedelic',
  'Stimulant':                 'defaultCategories.stimulant',

  // ── Entertainment children ───────────────────────────────────────────────
  'Streaming':                 'defaultCategories.streaming',
  'Music':                     'defaultCategories.music',
  'Gaming':                    'defaultCategories.gaming',
  'Movie':                     'defaultCategories.movie',
  'Book':                      'defaultCategories.book',
  'Hobby':                     'defaultCategories.hobby',
  'Outdoor':                   'defaultCategories.outdoor',
  'Gardening':                 'defaultCategories.gardening',

  // ── Shopping children ────────────────────────────────────────────────────
  'Electronic':                'defaultCategories.electronic',
  'Kitchenware':               'defaultCategories.kitchenware',
  'Stationery':                'defaultCategories.stationery',
  'Home Decor':                'defaultCategories.homeDecor',
  'Merchandise':               'defaultCategories.merchandise',
  'Tool':                      'defaultCategories.tool',

  // ── Beauty children ──────────────────────────────────────────────────────
  'Makeup':                    'defaultCategories.makeup',
  'Skincare':                  'defaultCategories.skincare',
  'Haircare':                  'defaultCategories.haircare',
  'Beauty Tool':               'defaultCategories.beautyTool',
  'Treatment':                 'defaultCategories.treatment',
  'Nail':                      'defaultCategories.nail',
  'Fragrance':                 'defaultCategories.fragrance',

  // ── Fashion children ─────────────────────────────────────────────────────
  'Clothing':                  'defaultCategories.clothing',
  'Shoe':                      'defaultCategories.shoe',
  'Bag':                       'defaultCategories.bag',
  'Jewelry':                   'defaultCategories.jewelry',
  'Formalwear':                'defaultCategories.formalwear',
  'Tailoring & Alteration':    'defaultCategories.tailoringAlteration',
  'Laundry & Dry Cleaning':    'defaultCategories.laundryDryCleaning',

  // ── Digital Tool children ────────────────────────────────────────────────
  'Software':                  'defaultCategories.software',
  'AI Tool':                   'defaultCategories.aiTool',
  'Cloud':                     'defaultCategories.cloud',
  'VPN':                       'defaultCategories.vpn',
  'Hosting':                   'defaultCategories.hosting',

  // ── Service children ─────────────────────────────────────────────────────
  'Cleaning':                  'defaultCategories.cleaning',
  'Legal Service':             'defaultCategories.legalService',
  'Financial Service':         'defaultCategories.financialService',

  // ── Pet children ─────────────────────────────────────────────────────────
  'Veterinary Care':           'defaultCategories.veterinaryCare',
  'Training':                  'defaultCategories.training',
  'Toy':                       'defaultCategories.toy',

  // ── Family/Children children ─────────────────────────────────────────────
  'Daycare':                   'defaultCategories.daycare',
  'Extracurricular Activity':  'defaultCategories.extracurricularActivity',
};

/**
 * Returns the translated display name for a category.
 * Falls back to the raw name for user-created categories not in the map.
 *
 * @param name  The English category name as stored in AsyncStorage
 * @param t     The i18next translation function from useI18n()
 */
export function translateCategoryName(
  name: string,
  t: (key: string) => string,
): string {
  const key = CATEGORY_KEY_MAP[name];
  return key ? t(key) : name;
}

/**
 * Translates each segment of a category path for display.
 * e.g. ["Food", "Grocery"] → ["食物", "杂货店"]
 */
export function translateCategoryPath(
  path: string[],
  t: (key: string) => string,
): string[] {
  return path.map((segment) => translateCategoryName(segment, t));
}
