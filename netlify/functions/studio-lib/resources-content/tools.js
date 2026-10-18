'use strict';
// Templates & Tools only (no lesson): calculators and shortcuts to the Business Studio tools.
// Shown under 🧰 Templates & Tools. These are tools, not lessons, so they are published straight away.
module.exports = [
  {
    id: 'tools-pricing-calculators', module: 'm06', title: 'Pricing calculators', toolOnly: true, seedRev: 1,
    summary: 'Quick, private calculators — nothing you type is saved or sent anywhere.',
    use: [
      { type: 'calculator', kind: 'product', title: 'Product pricing calculator', group: 'money', free: true },
      { type: 'calculator', kind: 'service', title: 'Service pricing calculator', group: 'money' },
      { type: 'calculator', kind: 'margin', title: 'Profit margin calculator', group: 'money' },
      { type: 'calculator', kind: 'promo', title: 'Promotion profit calculator', group: 'money' },
    ],
  },
  {
    id: 'tools-business-studio', module: 'm05', title: 'Your Business Studio tools', toolOnly: true, seedRev: 1,
    summary: 'These live in Business Studio, so everything you add is saved and connected.',
    use: [
      { type: 'link', screen: 'plan', title: 'Content calendar', label: 'Open my Plan', group: 'content', free: true, text: 'Plan posts, Reels and Stories on a board and a calendar, then mark them as posted.' },
      { type: 'link', screen: 'customers', title: 'Customer enquiry log & follow-ups', label: 'Open Customers', group: 'customers', free: true, text: 'Log every enquiry, see each customer’s stage and get reminded who to follow up.' },
      { type: 'link', screen: 'track', title: 'Sales & enquiry tracker', label: 'Open Track', group: 'money', free: true, text: 'Record enquiries, bookings and sales. Paid invoices and completed customers are added for you.' },
      { type: 'link', screen: 'money', title: 'Quote & invoice maker', label: 'Open Quotes & invoices', group: 'money', free: true, text: 'Customer-ready quotes, invoices and receipts with your bank details.' },
      { type: 'link', screen: 'todo', title: 'Daily to-do list', label: 'Open my to-do list', group: 'operations', free: true, text: 'Your business tasks with priorities, repeating tasks and reminders.' },
      { type: 'link', screen: 'goal', title: 'Weekly goal planner', label: 'Set this week’s goal', group: 'planning', free: true, text: 'Choose one goal for the week and get a daily tip to help you reach it.' },
    ],
  },
  {
    id: 'tools-club', module: 'm08', title: 'Business Club tools', toolOnly: true, seedRev: 1,
    summary: 'For Business Club members.',
    use: [
      { type: 'link', screen: 'market', title: 'Marketplace listing', label: 'Open my Marketplace listing', group: 'club', text: 'Add or update your product or service on the Auntie Tobi Marketplace.' },
    ],
  },
];
