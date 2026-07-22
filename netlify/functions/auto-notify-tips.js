// Netlify scheduled function — daily UK life tip
// Runs every day at 8am UTC via netlify.toml
const { sendTaggedPush } = require('./notify-helper');

const TIPS = [
  "Register with a GP as soon as you arrive in the UK — it's free and essential for NHS access.",
  "Apply for your National Insurance Number online at gov.uk before starting work.",
  "Monzo and Starling bank accounts can be opened with just your passport — no UK credit history needed.",
  "If you have fewer bedrooms than people in your home, an unmetered water bill is usually cheaper.",
  "You can access free NHS dental treatment if you're pregnant or had a baby in the last 12 months.",
  "Check if you qualify for Council Tax discount — single occupants get 25% off automatically.",
  "Universal Credit can top up low wages — you don't have to be unemployed to claim.",
  "Your employer must give you a payslip every time you're paid — keep them all.",
  "You can reclaim overpaid tax via HMRC's online self-assessment — many Nigerians miss this.",
  "Free courses are available via the government's Skills Bootcamp programme — check gov.uk.",
  "Always get a written tenancy agreement before moving in — verbal agreements are hard to enforce.",
  "Your landlord must protect your deposit in a government scheme within 30 days.",
  "The NHS 111 service is free 24/7 — call before going to A&E for non-emergencies.",
  "Check your P60 every April — it shows your total pay and tax paid for the year.",
  "You can request a free credit report from Experian, Equifax or TransUnion — do this yearly.",
  "UK driving licences from Nigeria are valid for 12 months — convert yours before it expires.",
  "Citizens Advice gives free confidential legal and financial guidance — find your local branch.",
  "Food banks are available across the UK — the Trussell Trust provides referrals with no judgment.",
  "Child Benefit is available for every child in the UK — claim it even if you're working.",
  "The Healthy Start scheme gives free vouchers for milk, fruit and veg if you're pregnant on benefits.",
  "Always check your broadband contract end date — prices jump when you leave the initial period.",
  "You can freeze your credit file for free to prevent fraud — contact Experian, Equifax or TransUnion.",
  "Energy companies must help if you're struggling to pay — ask about hardship funds.",
  "Your employer must pay you at least National Minimum Wage regardless of your visa status.",
  "If your boiler breaks, your landlord must fix it within a reasonable time — usually 24 hours in winter.",
  "Free eye tests are available on the NHS if you're diabetic, have glaucoma, or are over 60.",
  "You are entitled to 28 days paid holiday per year as a full-time worker in the UK.",
  "HMRC has a free app — use it to check your tax code and National Insurance record.",
  "Keep receipts for work expenses if you're self-employed — you can deduct them from your tax bill.",
  "The Electoral Commission allows you to register to vote online in under 5 minutes.",
  "Prescription charges are capped — if you need more than 3 items, a prepayment certificate saves money.",
  "Most UK libraries offer free eBooks, audiobooks and newspapers via apps like Libby.",
  "If you work from home, you may be able to claim tax relief on bills — check HMRC's guidance.",
  "Switching energy suppliers can save hundreds per year — use Ofgem's price comparison tool.",
  "The Right to Rent check is the landlord's responsibility — you can't be evicted for their failure.",
  "You can get a free NHS health check every 5 years between the ages of 40 and 74.",
  "Report immigration fraud to the Home Office — it protects the Nigerian community's reputation.",
  "If your employer closes, you may claim redundancy pay from the government — check gov.uk.",
  "UK banks must give you notice before closing your account — you have time to find an alternative.",
  "The UK has a cooling-off period for most purchases — 14 days to return online orders.",
  "You can challenge a parking fine — over 50% of appeals are successful.",
  "Statutory Sick Pay is available from day 4 of illness — your employer must pay it.",
  "Check if your child qualifies for free school meals — eligibility is wider than most people think.",
  "Keep a record of all communication with your employer in writing — emails are legal evidence.",
  "The minimum notice period for ending a tenancy is 2 months — your landlord cannot rush you out.",
  "You can access your NHS records online via the NHS App — download it today.",
  "If you are a victim of a scam, report it to Action Fraud at 0300 123 2040.",
  "The government's Help to Save scheme pays a 50% bonus on savings for low-income workers.",
  "Martin Lewis's Money Saving Expert site is the best free resource for UK financial tips.",
  "Always read your employment contract before signing — Acas has free guidance if you're unsure.",
];

exports.handler = async function(event) {
  try {
    // Pick tip based on day of year so it rotates predictably
    const dayOfYear = Math.floor((Date.now() - new Date(new Date().getFullYear(), 0, 0)) / 86400000);
    const tip = TIPS[dayOfYear % TIPS.length];

    const result = await sendTaggedPush(
      'tips',
      '💡 Auntie Tobi\'s Tip of the Day',
      tip,
      'https://auntietobi.co.uk'
    );

    return {
      statusCode: 200,
      body: JSON.stringify({ sent: true, tip, oneSignal: result.data })
    };

  } catch (err) {
    console.error('auto-notify-tips error:', err.message);
    return { statusCode: 500, body: err.message };
  }
};
