You are a senior mobile engineer. Generate a complete, runnable mobile app in ONE pass.

## Tech stack (fixed)
- Framework: React Native with Expo (TypeScript), Expo go SDK 54
- State:
  - React Query for async data actions (load/save/export)
  - Zustand for local UI state 
- Forms: react-hook-form + zod
- Storage:
   AsyncStorage (single JSON store with versioning)
- Export:
  - expo-file-system + expo-sharing
  - Export creates a single backup file named `easy-money-tracker-backup.json`
  - File contents: { schemaVersion, exportedAt, records, categories, settings }
  - Import restores from the same JSON file
- Styling: StyleSheet only (consistent spacing scale)
- No additional libraries unless essential; if you add one, explain why in 1 sentence.
-**Library preferences:**
- Use battle-tested, well-maintained community libraries for complex UI components 
  (sliders, date pickers, modals, gestures, animations)
- Do NOT implement custom PanResponder/gesture handling - use react-native-gesture-handler 
  or @react-native-community packages instead
- Do NOT use crypto.getRandomValues(), as it usually result in Uncaught Error crypto.getRandomValues
- Prefer native components over JS-based implementations for performance-critical UI
- List the libraries you plan to use BEFORE implementing, so I can approve/reject


### App purpose
Build: "Easy Money Tracker"
Users: Average daily users
Primary job-to-be-done: An app, that user can easy record expense and income, and see the statistics

### Core requirements (must match exactly)
1) Screens (exact list)
- Screen A: Expense/income
  - Purpose:
    - For user to conveniently input expense/income, with minimum clicks

  - Primary actions:
    - Add one off or recurring expense/income

  - Layout (top → bottom):
      - Controls:      
        - 1st row Enter the expense/income amount, with the currency tags, the user press a button and go to currency tags page, and edit which currency he uses frequently, and the default currency he want to have.
        - 2rd row: small buttons that show the category that user set to be "frequent category", that user can edit the list of frequent category, but clicking a button to go to edit page, it can be level 1 and level 2, such as beauty > skincare
        - 3th row: If user don't use the frequent category, A list of category, that user can choose. There can be three levels of categories. 
          E.g. Level 1 → Level 2 → Level 3
          Then, the user can first select the main level, then upon clicking, there can be two outcome
          - If the user is using "main-level" mode, then clicking the level 1 tag, will just be selected (btw, the default is Unclassified)
          - If the user is using "main-level+secoond-level" mode, then clicking the level 1 tag, a page jump out and have user to choose the level 2
        - 4th row: Date of expense/income, default to be today
        - 5th row: one off expense/income or recurring, default is one-off
        - 6th row Enter the expense/income title, optional 
        - 7th row Enter the expense/income description, optional        
        -Click Save, The save button is a floating button on the bottom, and it will only be enabled when user input at least the expense/income amount and Category.
      -UI behaviors.
        - Before the user input the expense/income amount, other parts will be blurred. And only after the user enter the expense/income amount category, then the one-off/recurring and the name input would be unblurred. And only the name is inputted, the description wouild be unblurred. 


- Screen B: Statistics
  - Purpose:
    - For user to see income and expense stats

  - Primary actions:
    - This is for display only, the user can adjust how to display

  - Layout (top → bottom):
      - Controls:
        - User can choose between seeing the pie chart of expense or income, it is default to be expense. There is a third mode, that it shows the monthly or yearly balance, that is money susplus or budget, will elaborate 
        - User need to choose date range, it can be today, this week (the first day of a week is defaulted to be Monday, can be adjusted in setting), this month and 
        - User need to choose the currency, it has default or it will be the last time that user choose. The logic is, let say I want the stats expressed in USD, then all spending/income will be convert to USD, using the latest FX from some API (that I have not decided yet, you may suggest me). To prevent frequent API calling, the FX should update if only the last update time is more than 6 hours ago. 
        this year, or daily, or last 7 days, 30 days, 365s.                    
        - There are two types of stats
          - First is pie chart:
            -Date range Explanation, if user select weekly etc, then the pie would be aggregated week. The user can press left or right direction to see pies base on more previous expenditure/income
            - It should only show first level, the sum of each category, and with pointer showing the category name, total amount spent
            - If user click on the pie, it will enter level 2 pie chart. Then user click "back" to go back to the first pie chart.
          - Second is bar chart, that intend to show trends over a period within one page:
            - Show the total expenditure. Category will be shown in colors on the bar, preferably with label name, but don't need to show the amount of every bar, otherwise it would be too crowded. 
            -Date range Explanation, if user select weekly etc, it each bar would be aggregated week. But if he choose daily, it will show bars of many days. The user can press left or right direction to see pies base on more previous expenditure/income
            Third a line chart, showing the susplus or deficit, which means it can be negative
          

- Screen C: Edit Records
  - Purpose:
    - For user to see and edit previous input records
  - Primary actions:
    - User can edit or delete previous input records, as correction
  - Control:
    - 1st row should be a search bar, that can search/filter record base on keywords (of title or discrption), category, spending number figure, or base on date range
    - 2st row should be a card of records, each records should have the edit and delete button. If user click edit, then it will go to edit page that is similar to screen A

- Screen D: Category edit page
  - Purpose:
    - Let user edit the category, this is super vital to the app
  - Data: Default category as below, each has a icon:
        Expense category:
          Food
          Grocery / Restaurant / Coffee / Snack / Delivery / Unclassified

          Housing
          Rent / Mortgage / Property Tax / Insurance / Maintenance / Management Fee / Moving Expense / Unclassified

          Utility
          Home Internet / Mobile Plan / Water / Electricity / Gas / Trash / Heating / Unclassified

          Transportation
          Public Transport / Taxi / Fuel / Maintenance / Insurance / Payment / Bike / Parking / Toll / Flight / Unclassified

          Medical
          General Practitioner / Specialist / Dentist / Pharmacist / Physiotherapist / Psychotherapist / Psychiatrist / Alternative Medicine / Checkup / Unclassified

          Insurance
          Life Insurance / Medical Insurance / Critical Illness Insurance / Unclassified

          Finance/Tax/Government
          Foreign Exchange Fee / Transaction Fee / Tax / Fine / License / Unclassified

          Social
          Drink & Bar / Restaurant / Gift / Party & Event / Networking / Unclassified

          Love Life
          Date / Restaurant / Hotel / Gift / Partner Support / Adult Service / Sexual Health

          Education
          Tuition (School) / Private Tutoring / Course / Learning Material / Certification / Unclassified

          Fitness/Health
          Membership / Class / Coaching / Equipment / Supplement / Event / Unclassified

          Substance
          Alcohol / Tobacco / Cannabis / Psychedelic / Stimulant / Unclassified

          Entertainment
          Streaming / Music / Gaming / Movie / Book / Hobby / Outdoor / Gardening / Unclassified

          Shopping
          Electronic / Kitchenware / Stationery / Accessory / Home Decor / Merchandise / Tool / Unclassified

          Beauty
          Makeup / Skincare / Haircare / Grooming / Beauty Tool / Treatment / Nail / Fragrance / Unclassified

          Fashion
          Clothing / Shoe / Bag / Accessory / Jewelry / Formalwear / Tailoring & Alteration / Laundry & Dry Cleaning / Unclassified

          Digital Tool
          Software / AI Tool / Cloud / VPN / Hosting / Unclassified

          Service
          Cleaning / Legal Service / Financial Service / Unclassified

          Pet
          Food / Veterinary Care / Supply / Grooming / Training / Toy / Insurance / Unclassified

          Donation

          Family/Children
          Education / Daycare / Extracurricular Activity / Gift / Supply / Unclassified

          Unclassified
                    
        Income category
          - Salary
          - Freelance
          - Gift
          - Business
          - Investment
          - Miscellaneous
      Controls:
        First, the user choose to edit expense or income category, the default is expense
        Second, the user can see a list of level 1 category, in each category there is buttons to click, "edit name", "go to see it's level 2 level category", "delete" . There is also a add button, that user can create a new level 1 category, when it is created, it is backed to the list of level 1 category page.
        
        If the user go to level 2 category page, the logic is similar to level 1 category, user can "edit name", "go to see it's level 3 level category", "delete" There is also a add button, that user can create a new level 2 category, when it is created, it is backed to the list of level 3 category page.

        If the user go to level 3 category page, similar to above, but the level 3 category is always the deepest, they can only edit name or delete

        Btw, when they create, they have a optional that they can choose an icon

- Screen E: Setting
  - Purpose:
    - Settings
  - Control
    - 1st, is the language selection, it should support all major langauge, such as English (US/UK/AU), Spanish, French, German, Italian, Portuguese (BR), Japanese, Korean, Chinese (Simplified/Traditional), Cantonese (HK), Hindi, Arabic, Russian, Dutch, Swedish, Polish
      - **Language Display Format**: Each language should display both English name and native name (e.g., "Chinese (Simplified) 中文 (简体)", "Spanish Español")
      - **Exception**: If the English name equals the native name (like "English (US) English (US)"), only display once to avoid redundancy
      - **Implementation**: Use conditional rendering: `{item.label === item.nativeName ? item.label : `${item.label} ${item.nativeName}`}`
    - 2rd, is import and export session, it is for user when they change to a new phone, I assume it should be a  easy-money-tracker-backup.json, which consist of all data, including records, categories. 

- Screen F: First time user
  - Purpose
    - Help first-time user navigate and have init settings
  - Control
    - Ask user the language they prefer.
      - Display format: Show both English and native names (see Screen E for implementation details)
    - Ask user, what is their main currency, and secondary currency they often use.
    - Educate user, that they can
      - Use the default category, but at the same time edit their own category. 
      - Describe about the statistic function

2) Data model (must match exactly)
- Expense/income record fields:
  - id: string (uuid)
  - type: "expense" | "income"
  - amount: number (positive)
  - currency: string (ISO code like "USD")
  - categoryPath: string[] (1–3 levels, e.g. ["Beauty", "Skincare"])
  - date: string (ISO, local date)
  - title?: string
  - description?: string
  - isRecurring: boolean
  - recurringRule?: { frequency: "daily"|"weekly"|"monthly"|"yearly"; interval: number; startDate: string; endDate?: string }
  - createdAt: string (ISO datetime)
  - updatedAt: string (ISO datetime)

- Settings fields:
  - language: string
  - mainCurrency: string
  - secondaryCurrencies: string[]
  - weekStartsOn: "monday" | "sunday"
  - fxCache: { lastUpdatedAt: string; base: string; rates: Record<string, number> }

- Language object (for UI display):
  - code: string (e.g., "zh-CN", "en-US")
  - label: string (English name, e.g., "Chinese (Simplified)")
  - nativeName: string (Native name, e.g., "中文 (简体)")

3) Navigation (must match exactly)
- Tab or main routes:
  - Add Expense/income, Statistics, Edit Records, Settings
- Non-tab routes:
  - Category Edit
  - Currency Tags Page
  - First Time User (only shown on first launch)

4) State & logic
- Loading/empty/error states for every screen.


5) Debugging & Error Handling
**Critical: This app MUST be easily debuggable**

**Console Logging:**
- Log all key operations
- Include relevant data in logs: IDs, timestamps, values 
- Log errors with full context: operation name, input values, error details

**Error States:**
- Show detailed error messages in UI (not just "Something went wrong")
- Include error type, location, and timestamp
- For debugging builds, show full error stack traces


**Data Flow Traceability:**
- All async operations should log start and completion
- Log state changes in Zustand store 
- Log React Query cache invalidations
- Include operation IDs or timestamps to trace related events

**Error Boundaries:**
- Wrap each screen in error boundary that shows error details
- Log component stack traces on crashes
- Provide "Copy Error" button to share error details

**Development Helpers:**
- Add debug panel toggle in Settings (hidden by default)
- Debug panel shows: current state, recent logs, storage contents
- Include "Clear All Data" button for testing fresh installs
- Show React Query devtools info when available

**Storage Debugging:**
- Log all AsyncStorage operations (read/write/delete)
- Log file system operations 
- Include data size in logs for performance tracking
- Validate JSON structure on load and log if corrupted

6) UI/UX rules
- Mobile-first, thumb-friendly
- Consistent spacing scale: xs(4), sm(8), md(12), lg(16), xl(24), xxl(32), xxxl(48)
- Reusable components:
  - **Button**: variants (primary, secondary, outline, ghost, danger), sizes (sm, md, lg), icon support, loading/disabled states
  - **Input**: labeled text input with placeholder, error state
  - **Card**: surface-colored container with padding and border radius
  - **ScreenContainer**: safe-area wrapper for each screen
- Accessibility: labels for inputs/buttons
Don't invade the smartphone's native UI, such as top bar and low bar NOT render content under:
Status bar (top system bar)
Navigation bar / gesture area (bottom)

## Constraints
- MUST use AsyncStorage (not SQLite or Realm)
- MUST NOT use custom gesture handlers (use react-native-gesture-handler)
- MUST show loading/empty/error states on every screen
- MUST log all key operations for debugging (see section 5)
- MUST show detailed error messages in UI (not generic "Error occurred")

## Acceptance Criteria
- [ ] Can add an expense with amount + category (minimum required)
- [ ] Can add an income with amount + category (minimum required)
- [ ] Can create recurring expense/income and store the rule
- [ ] Can edit/delete past records from Edit Records screen
- [ ] Category edit supports 1–3 levels + add/edit/delete
- [ ] Statistics screen shows pie + drilldown + bar chart for selected date range
- [ ] FX conversion caching works (refresh only if last update > 6 hours)
- [ ] Export creates a shareable backup file (and import restores it)
- [ ] Loading/empty/error states exist on every screen

### Deliverable
Return:
1) A short “How to run” section (commands).
2) The complete code for every file.
