/**
 * Financial wisdom quotes to encourage users when recording transactions
 */

export const FINANCIAL_QUOTES = [
  // Famous quotes from financial experts
  '"What gets measured gets managed." - Peter Drucker',
  '"A budget is telling your money where to go instead of wondering where it went." - Dave Ramsey',
  '"Do not save what is left after spending, but spend what is left after saving." - Warren Buffett',
  '"Beware of little expenses; a small leak will sink a great ship." - Benjamin Franklin',
  '"An investment in knowledge pays the best interest." - Benjamin Franklin',
  '"Every penny counts when you\'re building wealth." - Suze Orman',
  '"Money is a terrible master but an excellent servant." - P.T. Barnum',
  '"The habit of saving is itself an education." - T.T. Munger',
  '"Financial peace isn\'t the acquisition of stuff. It\'s learning to live on less than you make." - Dave Ramsey',
  
  // Short motivational phrases
  'Track it to own it.',
  'Know your money, grow your money.',
  'Awareness is the first step to wealth.',
  'Record today, prosper tomorrow.',
  'Track your spending to find your savings.',
  'Small expenses add up to big savings when tracked.',
  'Wealth is built one transaction at a time.',
  'Every dollar earned and tracked is a step toward financial freedom.',
  'Every transaction matters on your journey to financial freedom.',
  'Consistency in tracking leads to clarity in spending.',
  'You\'re taking control of your financial future!',
];

/**
 * Get a random financial quote from the collection
 */
export function getRandomFinancialQuote(): string {
  const randomIndex = Math.floor(Math.random() * FINANCIAL_QUOTES.length);
  return FINANCIAL_QUOTES[randomIndex];
}
