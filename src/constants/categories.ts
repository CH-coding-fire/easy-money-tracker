import { Category, CategoryGroup } from '../types';
import { ensureUnclassified } from '../utils/categoryHelpers';

// Use simple string IDs for default categories (loaded at module init)
// Runtime-generated categories will use expo-crypto UUIDs
let idCounter = 0;
function generateId(): string {
  return `cat-${Date.now()}-${++idCounter}`;
}

function cat(name: string, icon: string, children?: Category[]): Category {
  return { id: generateId(), name, icon, children };
}

function leaf(name: string, icon?: string): Category {
  return { id: generateId(), name, icon };
}

// Raw categories WITHOUT explicit "Uncategorized" entries.
// ensureUnclassified() will inject them at every level automatically.
const RAW_CATEGORIES: CategoryGroup = {
  expense: [
    cat('Food', '🍔', [
      leaf('Grocery', '🛒'), leaf('Restaurant', '🍽️'), leaf('Coffee', '☕'),
      leaf('Snack', '🍿'), leaf('Delivery', '🚚'),
    ]),
    cat('Housing', '🏠', [
      leaf('Rent', '🔑'), leaf('Mortgage', '🏦'), leaf('Property Tax', '📋'),
      leaf('Insurance', '🛡️'), leaf('Maintenance', '🔧'),
      leaf('Management Fee', '📂'), leaf('Moving Expense', '📦'),
    ]),
    cat('Utility', '💡', [
      leaf('Home Internet', '🌐'), leaf('Mobile Plan', '📱'), leaf('Water', '💧'),
      leaf('Electricity', '⚡'), leaf('Gas', '🔥'), leaf('Trash', '🗑️'),
      leaf('Heating', '🌡️'),
    ]),
    cat('Transportation', '🚗', [
      leaf('Public Transport', '🚌'), leaf('Taxi', '🚕'), leaf('Fuel', '⛽'),
      leaf('Maintenance', '🔧'), leaf('Insurance', '🛡️'), leaf('Payment', '💳'),
      leaf('Bike', '🚲'), leaf('Parking', '🅿️'), leaf('Toll', '🛣️'),
      leaf('Flight', '✈️'),
    ]),
    cat('Medical', '🏥', [
      leaf('General Practitioner', '👨‍⚕️'), leaf('Specialist', '🩺'),
      leaf('Dentist', '🦷'), leaf('Pharmacist', '💊'),
      leaf('Physiotherapist', '🤸'), leaf('Psychotherapist', '🧠'),
      leaf('Psychiatrist', '🧑‍⚕️'), leaf('Alternative Medicine', '🌿'),
      leaf('Checkup', '📋'),
    ]),
    cat('Insurance', '🛡️', [
      leaf('Life Insurance'), leaf('Medical Insurance'), leaf('Critical Illness Insurance'),
    ]),
    cat('Finance/Tax/Government', '🏛️', [
      leaf('Foreign Exchange Fee', '💱'), leaf('Transaction Fee', '💳'),
      leaf('Tax', '📜'), leaf('Fine', '⚠️'), leaf('License', '📄'),
    ]),
    cat('Social', '🎉', [
      leaf('Drink & Bar', '🍻'), leaf('Restaurant', '🍽️'), leaf('Gift', '🎁'),
      leaf('Party & Event', '🎊'), leaf('Networking', '🤝'),
    ]),
    cat('Love Life', '❤️', [
      leaf('Date', '💑'), leaf('Restaurant', '🍽️'), leaf('Hotel', '🏨'),
      leaf('Gift', '🎁'), leaf('Partner Support', '💝'),
      leaf('Adult Service'), leaf('Sexual Health'),
    ]),
    cat('Education', '📚', [
      leaf('Tuition (School)', '🎓'), leaf('Private Tutoring', '👩‍🏫'),
      leaf('Course', '📖'), leaf('Learning Material', '📝'),
      leaf('Certification', '🏅'),
    ]),
    cat('Fitness/Health', '💪', [
      leaf('Membership', '🏋️'), leaf('Class', '🧘'), leaf('Coaching', '👟'),
      leaf('Equipment', '🏓'), leaf('Supplement', '💊'),
      leaf('Event', '🏃'),
    ]),
    cat('Substance', '🚬', [
      leaf('Alcohol', '🍷'), leaf('Tobacco', '🚬'), leaf('Cannabis', '🌿'),
      leaf('Psychedelic'), leaf('Stimulant'),
    ]),
    cat('Entertainment', '🎮', [
      leaf('Streaming', '📺'), leaf('Music', '🎵'), leaf('Gaming', '🎮'),
      leaf('Movie', '🎬'), leaf('Book', '📖'), leaf('Hobby', '🎨'),
      leaf('Outdoor', '🏕️'), leaf('Gardening', '🌱'),
    ]),
    cat('Shopping', '🛍️', [
      leaf('Electronic', '📱'), leaf('Kitchenware', '🍳'), leaf('Stationery', '✏️'),
      leaf('Accessory', '⌚'), leaf('Home Decor', '🖼️'),
      leaf('Merchandise', '👕'), leaf('Tool', '🔨'),
    ]),
    cat('Beauty', '💄', [
      leaf('Makeup', '💋'), leaf('Skincare', '🧴'), leaf('Haircare', '💇'),
      leaf('Grooming', '✂️'), leaf('Beauty Tool', '🪞'),
      leaf('Treatment', '💆'), leaf('Nail', '💅'),
      leaf('Fragrance', '🌸'),
    ]),
    cat('Fashion', '👗', [
      leaf('Clothing', '👕'), leaf('Shoe', '👟'), leaf('Bag', '👜'),
      leaf('Accessory', '🧣'), leaf('Jewelry', '💍'), leaf('Formalwear', '🤵'),
      leaf('Tailoring & Alteration', '🧵'), leaf('Laundry & Dry Cleaning', '🧺'),
    ]),
    cat('Digital Tool', '💻', [
      leaf('Software', '🖥️'), leaf('AI Tool', '🤖'), leaf('Cloud', '☁️'),
      leaf('VPN', '🔒'), leaf('Hosting', '🌐'),
    ]),
    cat('Service', '🔧', [
      leaf('Cleaning', '🧹'), leaf('Legal Service', '⚖️'),
      leaf('Financial Service', '📊'),
    ]),
    cat('Pet', '🐾', [
      leaf('Food', '🦴'), leaf('Veterinary Care', '🏥'),
      leaf('Supply', '🧸'), leaf('Grooming', '✂️'), leaf('Training', '🎓'),
      leaf('Toy', '🎾'), leaf('Insurance', '🛡️'),
    ]),
    cat('Donation', '🤲'),
    cat('Family/Children', '👨‍👩‍👧‍👦', [
      leaf('Education', '📚'), leaf('Daycare', '🏫'),
      leaf('Extracurricular Activity', '🎨'), leaf('Gift', '🎁'),
      leaf('Supply', '🎒'),
    ]),
  ],
  income: [
    cat('Salary', '💰'),
    cat('Freelance', '💼'),
    cat('Gift', '🎁'),
    cat('Business', '🏢'),
    cat('Investment', '📈'),
    cat('Miscellaneous', '📁'),
  ],
};

// Apply ensureUnclassified so "Uncategorized" is auto-injected at every level
export const DEFAULT_CATEGORIES: CategoryGroup = {
  expense: ensureUnclassified(RAW_CATEGORIES.expense),
  income: ensureUnclassified(RAW_CATEGORIES.income),
};
