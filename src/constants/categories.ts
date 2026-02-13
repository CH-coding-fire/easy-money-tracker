import { Category, CategoryGroup } from '../types';

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

export const DEFAULT_CATEGORIES: CategoryGroup = {
  expense: [
    cat('Food', '🍔', [
      leaf('Groceries', '🛒'), leaf('Restaurants', '🍽️'), leaf('Coffee', '☕'),
      leaf('Snacks', '🍿'), leaf('Delivery', '🚚'), leaf('Unclassified'),
    ]),
    cat('Housing', '🏠', [
      leaf('Rent', '🔑'), leaf('Mortgage', '🏦'), leaf('Property Taxes', '📋'),
      leaf('Insurance', '🛡️'), leaf('Maintenance', '🔧'),
      leaf('Management Fees', '📂'), leaf('Moving Expenses', '📦'), leaf('Unclassified'),
    ]),
    cat('Utilities', '💡', [
      leaf('Home Internet', '🌐'), leaf('Mobile Plans', '📱'), leaf('Water', '💧'),
      leaf('Electricity', '⚡'), leaf('Gas', '🔥'), leaf('Trash', '🗑️'),
      leaf('Heating', '🌡️'), leaf('Unclassified'),
    ]),
    cat('Transportation', '🚗', [
      leaf('Public Transport', '🚌'), leaf('Taxi', '🚕'), leaf('Fuel', '⛽'),
      leaf('Maintenance', '🔧'), leaf('Insurance', '🛡️'), leaf('Payments', '💳'),
      leaf('Bikes', '🚲'), leaf('Parking', '🅿️'), leaf('Tolls', '🛣️'),
      leaf('Flights', '✈️'), leaf('Unclassified'),
    ]),
    cat('Medical', '🏥', [
      leaf('General Practitioners', '👨‍⚕️'), leaf('Specialists', '🩺'),
      leaf('Dentists', '🦷'), leaf('Pharmacists', '💊'),
      leaf('Physiotherapists', '🤸'), leaf('Psychotherapists', '🧠'),
      leaf('Psychiatrists', '🧑‍⚕️'), leaf('Alternative Medicine', '🌿'),
      leaf('Checkups', '📋'), leaf('Unclassified'),
    ]),
    cat('Insurance', '🛡️', [
      leaf('Life Insurance'), leaf('Medical Insurance'), leaf('Critical Illness Insurance'),
      leaf('Unclassified'),
    ]),
    cat('Finance/Tax/Government', '🏛️', [
      leaf('Foreign Exchange Fees', '💱'), leaf('Transaction Fees', '💳'),
      leaf('Taxes', '📜'), leaf('Fines', '⚠️'), leaf('Licenses', '📄'),
      leaf('Unclassified'),
    ]),
    cat('Social', '🎉', [
      leaf('Drinks & Bars', '🍻'), leaf('Restaurants', '🍽️'), leaf('Gifts', '🎁'),
      leaf('Parties & Events', '🎊'), leaf('Networking', '🤝'), leaf('Unclassified'),
    ]),
    cat('Love Life', '❤️', [
      leaf('Dates', '💑'), leaf('Restaurants', '🍽️'), leaf('Hotel', '🏨'),
      leaf('Gift', '🎁'), leaf('Partner Support', '💝'),
      leaf('Adult Services'), leaf('Sexual Health'),
    ]),
    cat('Education', '📚', [
      leaf('Tuition (School)', '🎓'), leaf('Private Tutoring', '👩‍🏫'),
      leaf('Courses', '📖'), leaf('Learning Materials', '📝'),
      leaf('Certifications', '🏅'), leaf('Unclassified'),
    ]),
    cat('Fitness/Health', '💪', [
      leaf('Memberships', '🏋️'), leaf('Classes', '🧘'), leaf('Coaching', '👟'),
      leaf('Equipment', '🏓'), leaf('Supplements', '💊'),
      leaf('Events', '🏃'), leaf('Unclassified'),
    ]),
    cat('Substances', '🚬', [
      leaf('Alcohol', '🍷'), leaf('Tobacco', '🚬'), leaf('Cannabis', '🌿'),
      leaf('Psychedelics'), leaf('Stimulants'), leaf('Unclassified'),
    ]),
    cat('Entertainment', '🎮', [
      leaf('Streaming', '📺'), leaf('Music', '🎵'), leaf('Gaming', '🎮'),
      leaf('Movies', '🎬'), leaf('Books', '📖'), leaf('Hobbies', '🎨'),
      leaf('Outdoor', '🏕️'), leaf('Gardening', '🌱'), leaf('Unclassified'),
    ]),
    cat('Shopping', '🛍️', [
      leaf('Electronics', '📱'), leaf('Kitchenware', '🍳'), leaf('Stationery', '✏️'),
      leaf('Accessories', '⌚'), leaf('Home Decor', '🖼️'),
      leaf('Merchandise', '👕'), leaf('Tools', '🔨'), leaf('Unclassified'),
    ]),
    cat('Beauty', '💄', [
      leaf('Makeup', '💋'), leaf('Skincare', '🧴'), leaf('Haircare', '💇'),
      leaf('Grooming', '✂️'), leaf('Beauty Tools', '🪞'),
      leaf('Treatments', '💆'), leaf('Nails', '💅'),
      leaf('Fragrance', '🌸'), leaf('Unclassified'),
    ]),
    cat('Fashion', '👗', [
      leaf('Clothing', '👕'), leaf('Shoes', '👟'), leaf('Bags', '👜'),
      leaf('Accessories', '🧣'), leaf('Jewelry', '💍'), leaf('Formalwear', '🤵'),
      leaf('Tailoring & Alterations', '🧵'), leaf('Laundry & Dry Cleaning', '🧺'),
      leaf('Unclassified'),
    ]),
    cat('Digital Tools', '💻', [
      leaf('Software', '🖥️'), leaf('AI Tools', '🤖'), leaf('Cloud', '☁️'),
      leaf('VPN', '🔒'), leaf('Hosting', '🌐'), leaf('Unclassified'),
    ]),
    cat('Services', '🔧', [
      leaf('Cleaning', '🧹'), leaf('Legal Services', '⚖️'),
      leaf('Financial Services', '📊'), leaf('Unclassified'),
    ]),
    cat('Pet', '🐾', [
      leaf('Food', '🦴'), leaf('Veterinary Care', '🏥'),
      leaf('Supplies', '🧸'), leaf('Grooming', '✂️'), leaf('Training', '🎓'),
      leaf('Toys', '🎾'), leaf('Insurance', '🛡️'), leaf('Unclassified'),
    ]),
    cat('Donations', '🤲'),
    cat('Family/Children', '👨‍👩‍👧‍👦', [
      leaf('Education', '📚'), leaf('Daycare', '🏫'),
      leaf('Extracurricular Activities', '🎨'), leaf('Gift', '🎁'),
      leaf('Supplies', '🎒'), leaf('Unclassified'),
    ]),
    cat('Unclassified', '📁'),
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
