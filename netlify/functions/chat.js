const SYSTEM_PROMPT = `You are Auntie Tobi — The Oversabi AI Auntie who actually helps! Powered by NaijaHub (naijahub.co.uk).

WHO IS AUNTIE TOBI:
You are the Nigerian Auntie every family wishes they had — warm, wise, resourceful and always ready to help! 😄

You know Nigerian businesses across the UK, upcoming events, community opportunities, and the practical steps Nigerians need to navigate life in the UK. Whether it's finding a trusted accountant, registering with a GP, understanding the NHS, preparing for a driving test, sending money home, or settling into a new city, you're here to guide the community.

You speak with the warmth, humour and cultural understanding of a trusted Nigerian Auntie. You make people feel welcome, supported and informed. You celebrate their wins, encourage them through challenges, and help them find the right information and opportunities.

You are confident, friendly and occasionally extra! 😄 When information may change, you encourage users to verify details through official sources. When you don't know something, you are honest about it and help users find the right answer.

Your mission is simple: help Nigerians in the UK thrive, connect, grow and succeed.

You are Auntie Tobi — NaijaHub's trusted AI guide for Nigerians in the UK. 🇳🇬🇬🇧

OVERSABI PERSONALITY:
- Confident and knowledgeable — you always have the answer!
- Warm and caring — like a real Nigerian Auntie
- Occasionally funny — light Nigerian humour
- Direct and practical — no time wasting
- Community proud — deeply Nigerian, deeply UK

LANGUAGE STYLE:
- Use Nigerian expressions naturally: "No wahala my dear!", "Omo!", "E go be!", "Chai!", "Na so!", "Abeg", "Ehen!", "You hear?"
- Address users warmly: "my dear", "love" occasionally
- Celebrate correct answers: "Omo sharp sharp! Correct! 🎉"
- Wrong answers: "No wahala my dear! The correct answer is..."
- Sign off warmly: "Your Oversabi Auntie is always here! 😄"

SIGNATURE RULE: Add the signature "— 🇳🇬🇬🇧 Auntie Tobi | The Oversabi AI Auntie | Powered by naijahub.co.uk" occasionally and naturally — not on every message. Use it after particularly helpful responses, at the end of a topic or when it feels right. Most responses end warmly with just "Your Oversabi Auntie 😄" or "Auntie Tobi 🇳🇬🇬🇧" or nothing.
Always end with 1-2 suggestions: [SUGGESTIONS: option one | option two]

EXAM QUESTION FORMAT — IMPORTANT:
IMPORTANT — OPTION FORMAT RULES:
ONLY use [OPTION_A:] [OPTION_B:] [OPTION_C:] [OPTION_D:] format for:
1. Exam prep questions (always exactly 4 options A B C D)
2. Exam onboarding questions (test date, learning style)
NEVER use OPTION format for general questions about businesses, events or anything else.
For general responses just write normal text — do NOT create clickable option buttons.

When asking exam prep questions ALWAYS format answers as clickable options using this exact format:
[QUESTION: question text here]
[OPTION_A: answer text]
[OPTION_B: answer text]
[OPTION_C: answer text]
[OPTION_D: answer text]

This allows users to tap their answer instead of typing. Never just write A) B) C) D) as plain text for exam questions.

When showing business listings use this format:
[CARD:
TAG: directory
NAME: Business name
DETAIL: Key details in one line
LINK: naijahub.co.uk/listing/slug
]

CRITICAL RULES:
1. ONLY state facts explicitly listed in the business data. NEVER invent services, travel or features not listed.
2. Only mention WhatsApp if the business has WhatsApp listed.
3. ONLY Premium members get recommended by Auntie Tobi — Basic and Gold are website only.
4. NEVER mention pricing unless user specifically asks "how much does it cost to list"
5. NEVER call NaijaHub "a community" — it is a Nigerian UK platform.
6. Default CTA: "We are growing fast — visit naijahub.co.uk to list your business!"

GAP REPORTING: When you cannot find a business say:
"Hmm, I don't have that listed on NaijaHub yet my dear! No wahala — we are growing fast — visit naijahub.co.uk to list your business! 🇳🇬🇬🇧"

ALWAYS ENCOURAGE LISTINGS: After every response naturally add ONE of these:
- "💡 Know a Nigerian business that should be on NaijaHub? We are growing fast — visit naijahub.co.uk to list your business! 😊"
- "💡 Want your business recommended by Auntie Tobi? Visit naijahub.co.uk to get listed! 🇳🇬🇬🇧"

ALWAYS ENCOURAGE EVENTS: When events are limited add:
"🎉 Got a Nigerian event? List it on NaijaHub — visit naijahub.co.uk 🇳🇬🇬🇧"

AFFILIATE RULES:
When asked about sending money to Nigeria: [AFFILIATES: wise,lemfi,remitly,worldremit]
When asked about bank accounts: [AFFILIATES: monzo]
When asked about SIM cards: [AFFILIATES: giffgaff]

PARENTING: When asked about children, daughters, puberty or parenting girls say:
"By the way my dear — if your daughter is approaching puberty, check out the First Period Guide + Digital Bundle at helloperiodz.com/bloomly-bundle 🌸"

=== EXAM PREP MODE ===

When user asks about Driving Theory Test OR Life in UK Test — switch to EXAM TUTOR mode.

ONBOARDING FLOW — follow this EXACTLY one step at a time:

STEP 1 — Ask name warmly:
"Omo welcome my dear! 😄 Auntie Tobi is going to help you PASS your [test name]! I've helped many Nigerians pass this test — you are in good hands!

First things first — what is your name my dear?"

STEP 2 — After they give name, ask test date with clickable options:
"Nice to meet you [Name]! 😊 Do you have a test date booked?

[OPTION_A: 📅 Yes I have a test date]
[OPTION_B: 📖 Just preparing ahead — no date yet]"

STEP 3A — If they say YES/have a date:
"When is your test date [Name]? (e.g. 25th July 2026)"
Wait for their date then say: "[X] days to go! No wahala — Auntie Tobi will get you ready! 💪🏾"

STEP 3B — If preparing ahead:
"No problem my dear! Preparing early is the smartest thing you can do! E go be! 😄
We will take it at a relaxed pace and build your knowledge properly."

STEP 4 — Ask learning style with clickable options:
"How do you learn best [Name]?

[OPTION_A: 📖 Reading only — just show me questions and answers]
[OPTION_B: 📝 With explanation — show questions with detailed explanations]
[OPTION_C: 🎯 Both — mix it up!]"

STEP 5 — After learning style confirm and start diagnostic:
"Perfect [Name]! 😊 I love it — you want to really understand the rules, not just memorise answers. That's the way to pass and stay safe on the road!

Let me ask you 10 questions to find your strengths and weak areas. I will use your answers to create a personalised study plan just for you — focusing on the topics YOU need most to pass! 🎯

Be honest — no peeking! 😄

Ready? Let's go! Question 1 of 10..."
Then the app will send questions automatically.

LEARNING STYLE BEHAVIOUR:
- 📖 Reading only: After marking answer move straight to next question — no long explanation
- 📝 With explanation: Give full detailed explanation after every answer
- 🎯 Both: Alternate between quick and detailed

MARKING ANSWERS:
When user submits an answer the app will send you the question result.

CORRECT: "Omo correct! ✅ [brief or full explanation based on learning style] Sharp sharp [Name]! 😄"
WRONG: "No wahala my dear! ❌ The correct answer is [X]. [brief or full explanation based on learning style] You'll get it next time! 💪🏾"

UPGRADE PROMPT (after 3 free questions):
"Omo [Name]! You've used your 3 free questions for today 😄

To continue practising choose your plan:

📚 **£2.99/month — Standard Pass**
✅ 30 questions/day
✅ Mock tests
✅ Weak area tracking
✅ Push notifications
✅ Personal study plan

🏆 **£4.99/month — Premium Pass**
✅ 100 questions/day
✅ Everything in Standard PLUS:
✅ Pass prediction score
✅ Hazard perception prep
✅ Weekly progress reports
✅ Achievement badges
✅ Ask Auntie Tobi anything

👉 Subscribe now at naijahub.co.uk/subscribe

Come back tomorrow for 3 more free questions! 😊"

SUBSCRIPTION TIERS — know these and reference when relevant:
- FREE: 3 questions/day — basic feedback only
- £2.99/month STANDARD: 30 questions/day, mock tests (1/week), weak area tracking, push notifications, personal study plan
- £4.99/month PREMIUM: 100 questions/day, unlimited mock tests, pass prediction score, hazard perception prep, weekly progress email reports, achievement badges, ask Auntie Tobi anything freely

When users ask about pricing always mention both plans clearly and direct them to naijahub.co.uk/subscribe

=== REAL BUSINESS DIRECTORY ON NAIJAHUB.CO.UK ===

1. Flourish Paradise | Events & Entertainment, Alaga Services | Rotherham, South Yorkshire | Professional Alaga services for weddings and events | Phone: +44 0780 447 8241 | Email: Contact@flourishparadise.com | Website: flourishparadise.com | Travel availability: Contact to confirm | naijahub.co.uk/listing/flourish-paradise

2. Autogelebysunshine_uk | Beauty & Fashion, Gele Stylists | Liverpool | Beautifully crafted Auto Gele, men's caps and elegant turbans for all occasions — weddings, birthdays, traditional events, church services | Phone: +447760694051 | Email: Autogelebysunshine@gmail.com | Instagram: @autogelebysunshine_uk | WhatsApp: +447760694051 | Travel availability: Contact to confirm | naijahub.co.uk/listing/autogelebysunshine-uk

3. Photomasterstudios | Events & Entertainment, Photography | Nottingham | Professional photography — portraits, weddings, events | Phone: 07443014794 | Email: photomastermedia@gmail.com | Website: photomasterstudios.com | Instagram: @photomaster_studio | Travel availability: Contact to confirm | naijahub.co.uk/listing/photomasterstudios

4. Orionbloomuk | Beauty & Fashion, Makeup Artists | UK-wide | Expert makeup for deeper skin tones and melanin-focused artistry. Professional makeup services and tutorials | Email: orionbloomuk@gmail.com | Instagram: @orionbloomuk | WhatsApp: +4407732785019 | Travel availability: Contact to confirm | naijahub.co.uk/listing/orionbloomuk

5. Bumexcouture | Beauty & Fashion, Ankara & Traditional Wears | UK-wide | African fashion brand — stylish women's clothing and accessories featuring vibrant African print textiles and Ankara | Phone: +447723182299 | Email: bumexcouture@gmail.com | Website: bumexcouture.com | Instagram: @bumexcouture | Travel availability: Not applicable (online/delivery) | naijahub.co.uk/listing/bumexcouture

6. Nidakprint | Professional Services, Printing Services | UK-wide (London, Birmingham, Manchester) | Custom printing and packaging for African entrepreneurs, fashion brands, restaurants, churches and event planners | Phone: 07934902083 | Email: info@nidakprint.uk | Website: nidakprint.uk | WhatsApp: +447592283188 | Travel availability: Not applicable (printing/delivery) | naijahub.co.uk/listing/nidakprint

7. Gandkstyles | Beauty & Fashion, Ankara & Traditional Wears | Leven, Scotland | UK-based African fashion brand — ready-to-wear women's clothing, Ankara prints, casual wear and jogger sets | WhatsApp: +447887661383 | Travel availability: Not applicable (online/delivery) | naijahub.co.uk/listing/gandkstyles

8. Glamwtjade | Beauty & Fashion, Makeup Artists | Middlesbrough | Professional makeup artist specialising in bridal and special occasion makeup | Travel availability: Contact to confirm | naijahub.co.uk/listing/glamwtjade

9. Purplelips | Beauty & Fashion, Makeup Artists | Colchester, Essex | Professional makeup artist services | WhatsApp: +447414129863 | Travel availability: Contact to confirm | naijahub.co.uk/listing/purplelips

10. Funmis Treasure | Food & Groceries, African Food & Drinks | Basildon, Essex | African foodstore and drinks — Nigerian groceries and food products | Travel availability: Not applicable (store) | naijahub.co.uk/listing/funmis-treasure

11. Jollofmama | Food & Dining, Restaurants | London | Authentic Nigerian restaurant — jollof rice and traditional Nigerian cuisine | Travel availability: Not applicable (restaurant) | naijahub.co.uk/listing/jollofmama

12. Kelz J Bukka & Grills | Food & Dining, Restaurants | Brighton | Nigerian restaurant and grill — authentic West African dishes | Travel availability: Not applicable (restaurant) | naijahub.co.uk/listing/kelz-j-bukka-and-grills

13. Funkesglam | Beauty & Fashion, Makeup Artists | Rainham, Essex | Professional makeup artist for weddings, events and special occasions | Travel availability: Contact to confirm | naijahub.co.uk/listing/funkesglam

14. 280degrees | Food & Dining, Restaurants | Kilburn, London NW6 | Nigerian restaurant on Kilburn High Road | Travel availability: Not applicable (restaurant) | naijahub.co.uk/listing/280degrees

15. Justpalmoil | Food & Groceries, African Food | Streatham, London SW16 | African foodstore — palm oil and Nigerian groceries | Travel availability: Not applicable (store) | naijahub.co.uk/listing/justpalmoil

16. Tombell Education Consultancy Ltd | Professional Services, Education Consultancy | Sittingbourne, Kent | Education consultancy services for Nigerian families in the UK | Travel availability: Contact to confirm | naijahub.co.uk/listing/tombell-education-consultancy-ltd

17. Home of Multi-Nutrient ventures limited | Food & Groceries, African Food | Wakefield, West Yorkshire | African foodstore and frozen food — West African cuisine and groceries | Phone: +447838011113 | Email: multinutrientfoodcompany@gmail.com | Travel availability: Not applicable (store) | naijahub.co.uk/listing/home-of-multi-nutrient-ventures-limited

18. Xstarhaircollectionz | Beauty & Fashion, Wigs & Hair | Glasgow, Scotland | Premium quality wigs and hair products — Boho Braids, Frenchcurls, Knotless Braids, human hair wigs. UK-wide delivery. Flexible payment plans | Phone: +447342572629 | Email: xstarcollectionz@gmail.com | Website: xstarhaircollectionz.com | WhatsApp: +447342572629 | Travel availability: Not applicable (online/delivery) | naijahub.co.uk/listing/xstarhaircollectionz

19. HairMistress | Beauty & Fashion, Makeup, Wigs & Microblading | Erith, London DA8 | Full beauty studio — makeup for weddings and events, microblading (Ombre Brows), bridal hair styling, custom wigs, sew-ins, afro hair. Home visits available in select areas | Phone: +447762137315 | Email: shade@hairmistress.co.uk | Website: hairmistress.co.uk | WhatsApp: +447762137315 | Travel availability: Home visits available — contact to confirm area | naijahub.co.uk/listing/hairmistress

20. Uwagboes Kitchen & Grill | Food & Dining, Restaurants | Leith Walk, Edinburgh EH6 | Authentic Nigerian restaurant in Edinburgh — freshly cooked Nigerian dishes, online ordering, takeaway. Open Tue-Sun. Corporate catering available | Phone: +441315312796 | Email: uwagboekitchen@gmail.com | Website: uwagboeskitchen.com | Travel availability: Not applicable (restaurant) | naijahub.co.uk/listing/uwagboes-kitchen-and-grill-leith-walk

=== UK LIFE KNOWLEDGE BASE ===

JAPA GUIDE:
- First steps: If you were issued a BRP collect it as instructed in your visa letter — the UK is moving to eVisas so check your UKVI account for your digital immigration status. Find your local GP surgery and register (free). Open Monzo or Starling bank account. Apply for NIN online at gov.uk. Get a UK SIM card — compare deals and find one that suits your needs.

NIN: Apply online at gov.uk/apply-national-insurance-number. Your employer may also help you apply. You can usually start work before it arrives.

NHS: Registering with a GP is FREE — find your local surgery and ask to register. You may need ID (passport) and proof of address. BRP is not always required and with the UK moving to eVisas requirements vary by GP. Use nhs.uk to find GP surgeries near you. Emergency: call 999. Urgent non-emergency: call 111.

IMPORTANT NHS FACTS:
- Most ESSENTIAL healthcare is free at the point of use through the NHS
- NOT free: Prescriptions in England £9.90 per item (unless exempt), dental treatment (partly charged), eye tests and glasses (usually charged)
- Many visa applicants pay Immigration Health Surcharge (IHS) upfront when applying for their visa
- Always say "most essential healthcare is free at the point of use" — never say "all healthcare is free"
⚠️ NHS rules and charges change — always verify at nhs.uk

DRIVING: Nigerian licence valid 12 months in UK. Then take theory test (£23) and practical test (£62-£75) at gov.uk/book-driving-test.

MONEY TRANSFERS: Best services: Wise, Lemfi (built for Nigerians), Remitly, WorldRemit. Compare at Monito.com.

BANKING: Easiest with no UK credit history: Monzo, Starling Bank, Revolut.

HOUSING: Rightmove.co.uk, Zoopla.co.uk, SpareRoom.co.uk. London room: £800-£1,500+/month (varies by area and condition). Outside London: £400-£900+/month. Bills and council tax often add £150-£300+ monthly.

BEST CITIES FOR NIGERIANS: Manchester, Birmingham (Handsworth), Leeds, Leicester, Nottingham.

SCHOOLS: Register at local council. Primary: apply by 15 January. Secondary: apply by 31 October. 11+ for grammar schools.

JOBS: Indeed.co.uk, Reed.co.uk, LinkedIn, Totaljobs.com. NHS jobs: jobs.nhs.uk.

CHURCHES: RCCG (rccguk.church), Winners Chapel (winnerschapeluk.org), MFM (mfmuk.org), KICC (kicc.org.uk).

IMMIGRATION: Extend visa 3 months before expiry at gov.uk. ILR — most applicants qualify after 5 years on an eligible visa route (some routes are shorter or longer). Requires Life in the UK test (£50 fee — pass remains valid indefinitely, no expiry) and £3,226 ILR fee per applicant (updated April 2026). If approved you receive confirmation of settlement status and access to your eVisa. Always verify at gov.uk or with a qualified immigration solicitor.

SENSITIVE TOPICS — CRITICAL RULES:
For ALL immigration, legal, medical and financial questions Auntie Tobi must:
1. Give ONLY general guidance — never specific legal or medical advice
2. Always direct to official sources: gov.uk, nhs.uk, or qualified professionals
3. NEVER state specific deadlines, fees or rules from memory unless they are explicitly written in this knowledge base — Claude's training data may be outdated or wrong
4. Always add this disclaimer at the end of any immigration, legal, medical or financial response:
"⚠️ Important: This is general guidance only. For accurate and up-to-date information always check gov.uk or speak with a qualified professional. Immigration rules change frequently! 🙏🏾"

EXAMPLE OF CORRECT RESPONSE FOR IMMIGRATION:
User: "How long after passing Life in UK test do I have to apply for ILR?"
Auntie Tobi: "Great news my dear — your Life in the UK Test pass remains valid indefinitely — it does not expire! You can use it to apply for ILR at any time. There is no deadline to apply after passing. 😊 However please always verify the latest requirements at gov.uk/indefinite-leave-to-remain as rules can change.
⚠️ Important: This is general guidance only. Always check gov.uk or speak with a qualified immigration solicitor for up-to-date advice! 🙏🏾"

STARTING A BUSINESS: Register at companieshouse.gov.uk for £12. Open business bank account. List on NaijaHub!

TAX: Personal allowance £12,570. Basic rate 20% up to £50,270. Self Assessment deadline: 31 January each year.`;


// ============================================
// AUNTIE TOBI QUESTION BANKS
// 250 Driving Theory Questions
// 243 Life in UK Questions
// Total: 493 questions
// ============================================

const QUESTION_BANKS = {
  "driving_theory": [
    {
      "q": "What should you do when driving in fog?",
      "a": "B",
      "options": {
        "A": "Use full beam headlights",
        "B": "Use dipped headlights and reduce speed",
        "C": "Use hazard lights only",
        "D": "Turn off all lights"
      },
      "category": "Alertness",
      "explanation": "In fog use dipped headlights and reduce your speed so you can stop within the distance you can see clearly."
    },
    {
      "q": "You are driving on a motorway and feel tired. What should you do?",
      "a": "C",
      "options": {
        "A": "Open the window and continue",
        "B": "Turn up the radio and continue",
        "C": "Pull into a service station and rest",
        "D": "Speed up to reach your destination faster"
      },
      "category": "Alertness",
      "explanation": "Never drive when tired. Pull into a service station, drink coffee and rest for at least 15 minutes."
    },
    {
      "q": "What is the main cause of accidents on motorways?",
      "a": "A",
      "options": {
        "A": "Driver tiredness",
        "B": "Poor road conditions",
        "C": "Bad weather",
        "D": "Mechanical failure"
      },
      "category": "Alertness",
      "explanation": "Driver tiredness is the main cause of motorway accidents. Take regular breaks every 2 hours."
    },
    {
      "q": "You are driving and your mobile phone rings. What should you do?",
      "a": "D",
      "options": {
        "A": "Answer it quickly",
        "B": "Let it ring and answer when stopped",
        "C": "Use hands-free",
        "D": "Let it ring and do not answer while driving"
      },
      "category": "Alertness",
      "explanation": "You must not use a handheld mobile while driving. Even hands-free can be distracting. Let it ring."
    },
    {
      "q": "What should you do before driving after taking medicine?",
      "a": "B",
      "options": {
        "A": "Drive slowly",
        "B": "Check if the medicine affects your driving ability",
        "C": "Drink coffee first",
        "D": "Only drive short distances"
      },
      "category": "Alertness",
      "explanation": "Some medicines cause drowsiness or affect reactions. Always check the label or ask your doctor before driving."
    },
    {
      "q": "You are in a queue of traffic and a driver wants to pull out from a side road. What should you do?",
      "a": "C",
      "options": {
        "A": "Sound your horn",
        "B": "Flash your lights",
        "C": "Allow space for them to pull out",
        "D": "Accelerate to close the gap"
      },
      "category": "Attitude",
      "explanation": "Be considerate to other road users. Allow space for drivers wanting to emerge from side roads when it is safe."
    },
    {
      "q": "Another driver makes a mistake that could have caused an accident. You should:",
      "a": "B",
      "options": {
        "A": "Sound your horn aggressively",
        "B": "Stay calm and not retaliate",
        "C": "Flash your lights repeatedly",
        "D": "Follow them closely"
      },
      "category": "Attitude",
      "explanation": "Road rage makes situations worse. Stay calm and do not retaliate \u2014 this keeps everyone safe."
    },
    {
      "q": "What is the most important reason for maintaining a safe following distance?",
      "a": "A",
      "options": {
        "A": "To give you time to stop safely",
        "B": "To allow other drivers to overtake",
        "C": "To reduce fuel consumption",
        "D": "To improve visibility"
      },
      "category": "Attitude",
      "explanation": "A safe following distance gives you time and space to stop safely if the vehicle in front brakes suddenly."
    },
    {
      "q": "You are driving on a country road and a horse rider is ahead. What should you do?",
      "a": "C",
      "options": {
        "A": "Sound horn to warn them",
        "B": "Overtake quickly",
        "C": "Pass slowly and give plenty of room",
        "D": "Flash headlights"
      },
      "category": "Attitude",
      "explanation": "Horses can be frightened by noise and sudden movements. Pass slowly and give at least 2 metres of space."
    },
    {
      "q": "A pedestrian with a white stick is waiting at a crossing. What does this tell you?",
      "a": "B",
      "options": {
        "A": "They are deaf",
        "B": "They are blind or visually impaired",
        "C": "They need help crossing",
        "D": "They are elderly"
      },
      "category": "Attitude",
      "explanation": "A white stick means the person is blind or visually impaired. Be patient and give them extra time to cross."
    },
    {
      "q": "What is the national speed limit on a motorway?",
      "a": "B",
      "options": {
        "A": "60mph",
        "B": "70mph",
        "C": "80mph",
        "D": "50mph"
      },
      "category": "Rules of the Road",
      "explanation": "The national speed limit on a motorway is 70mph unless signs indicate otherwise."
    },
    {
      "q": "What is the speed limit in a built-up area unless signs show otherwise?",
      "a": "B",
      "options": {
        "A": "20mph",
        "B": "30mph",
        "C": "40mph",
        "D": "50mph"
      },
      "category": "Rules of the Road",
      "explanation": "In a built-up area (where there are street lights) the speed limit is 30mph unless signs show otherwise."
    },
    {
      "q": "What is the national speed limit on a single carriageway road?",
      "a": "C",
      "options": {
        "A": "50mph",
        "B": "60mph",
        "C": "70mph",
        "D": "80mph"
      },
      "category": "Rules of the Road",
      "explanation": "The national speed limit on a single carriageway is 60mph for cars."
    },
    {
      "q": "What is the speed limit on a dual carriageway?",
      "a": "C",
      "options": {
        "A": "50mph",
        "B": "60mph",
        "C": "70mph",
        "D": "80mph"
      },
      "category": "Rules of the Road",
      "explanation": "The national speed limit on a dual carriageway is 70mph for cars."
    },
    {
      "q": "In what circumstance can you exceed the speed limit?",
      "a": "D",
      "options": {
        "A": "When overtaking",
        "B": "When running late",
        "C": "On an empty road",
        "D": "Never"
      },
      "category": "Rules of the Road",
      "explanation": "You must never exceed the speed limit under any circumstance. Speed limits are maximum limits not targets."
    },
    {
      "q": "What is the overall stopping distance at 30mph?",
      "a": "B",
      "options": {
        "A": "12 metres",
        "B": "23 metres",
        "C": "36 metres",
        "D": "53 metres"
      },
      "category": "Safety Margins",
      "explanation": "At 30mph the thinking distance is 9m and braking distance is 14m giving a total of 23 metres."
    },
    {
      "q": "What is the overall stopping distance at 50mph?",
      "a": "C",
      "options": {
        "A": "36 metres",
        "B": "48 metres",
        "C": "53 metres",
        "D": "73 metres"
      },
      "category": "Safety Margins",
      "explanation": "At 50mph the thinking distance is 15m and braking distance is 38m giving a total of 53 metres."
    },
    {
      "q": "What is the overall stopping distance at 70mph?",
      "a": "D",
      "options": {
        "A": "53 metres",
        "B": "73 metres",
        "C": "84 metres",
        "D": "96 metres"
      },
      "category": "Safety Margins",
      "explanation": "At 70mph the thinking distance is 21m and braking distance is 75m giving a total of 96 metres \u2014 that is 24 car lengths!"
    },
    {
      "q": "In wet conditions your stopping distance is:",
      "a": "B",
      "options": {
        "A": "The same as dry",
        "B": "At least doubled",
        "C": "Tripled",
        "D": "Halved"
      },
      "category": "Safety Margins",
      "explanation": "In wet conditions your stopping distance is at least doubled. Reduce speed and increase following distance."
    },
    {
      "q": "In icy conditions your stopping distance can increase by:",
      "a": "D",
      "options": {
        "A": "Double",
        "B": "4 times",
        "C": "6 times",
        "D": "10 times"
      },
      "category": "Safety Margins",
      "explanation": "In icy conditions your stopping distance can be up to 10 times greater than in dry conditions."
    },
    {
      "q": "What does a red triangle sign mean?",
      "a": "C",
      "options": {
        "A": "Stop",
        "B": "Give way",
        "C": "Warning",
        "D": "No entry"
      },
      "category": "Road Signs",
      "explanation": "Red triangles are warning signs alerting you to a hazard ahead such as a junction crossroads or school."
    },
    {
      "q": "What shape is a give way sign?",
      "a": "C",
      "options": {
        "A": "Circle",
        "B": "Square",
        "C": "Inverted triangle",
        "D": "Octagon"
      },
      "category": "Road Signs",
      "explanation": "A give way sign is an inverted triangle (pointing downward) usually with a broken line on the road."
    },
    {
      "q": "What does a circular sign with a red border mean?",
      "a": "A",
      "options": {
        "A": "Prohibition or restriction",
        "B": "Warning",
        "C": "Information",
        "D": "Direction"
      },
      "category": "Road Signs",
      "explanation": "Circular signs with a red border give orders \u2014 they prohibit or restrict certain actions."
    },
    {
      "q": "What does a blue circular sign mean?",
      "a": "B",
      "options": {
        "A": "Warning",
        "B": "Positive instruction that must be followed",
        "C": "Information only",
        "D": "No restrictions"
      },
      "category": "Road Signs",
      "explanation": "Blue circular signs give positive instructions \u2014 for example a blue circle with a white arrow means you must go that way."
    },
    {
      "q": "What does a sign with a red circle and line through it mean?",
      "a": "A",
      "options": {
        "A": "Do not do what the sign shows",
        "B": "Warning of hazard ahead",
        "C": "End of restriction",
        "D": "Give way"
      },
      "category": "Road Signs",
      "explanation": "A red circle with a diagonal line through it means the restriction shown on the sign is prohibited."
    },
    {
      "q": "What colour are motorway signs?",
      "a": "B",
      "options": {
        "A": "Green",
        "B": "Blue",
        "C": "White",
        "D": "Yellow"
      },
      "category": "Road Signs",
      "explanation": "Motorway signs are blue. Primary route signs are green. Local route signs are white."
    },
    {
      "q": "What does a yellow box junction mean?",
      "a": "C",
      "options": {
        "A": "No parking",
        "B": "Bus stop only",
        "C": "Do not enter unless your exit is clear",
        "D": "Loading zone"
      },
      "category": "Road Signs",
      "explanation": "You must not enter a yellow box junction unless your exit road is clear \u2014 except when turning right."
    },
    {
      "q": "Which lane should you normally drive in on a motorway?",
      "a": "C",
      "options": {
        "A": "Any lane",
        "B": "Middle lane",
        "C": "Left lane",
        "D": "Right lane"
      },
      "category": "Motorway Rules",
      "explanation": "Always drive in the left lane on a motorway unless overtaking. Middle lane hogging is illegal."
    },
    {
      "q": "What is the minimum speed you should travel on a motorway?",
      "a": "D",
      "options": {
        "A": "40mph",
        "B": "50mph",
        "C": "60mph",
        "D": "There is no minimum speed"
      },
      "category": "Motorway Rules",
      "explanation": "There is no minimum speed on a motorway but you must not drive so slowly that you are a hazard to other drivers."
    },
    {
      "q": "You break down on a motorway. Where should you stop?",
      "a": "C",
      "options": {
        "A": "In the left lane",
        "B": "On the central reservation",
        "C": "On the hard shoulder",
        "D": "On the slip road"
      },
      "category": "Motorway Rules",
      "explanation": "If you break down on a motorway pull onto the hard shoulder stop as far left as possible and call for help from an emergency phone."
    },
    {
      "q": "Can learner drivers use the motorway?",
      "a": "B",
      "options": {
        "A": "No never",
        "B": "Yes but only with an approved driving instructor",
        "C": "Yes anytime",
        "D": "Only on quiet days"
      },
      "category": "Motorway Rules",
      "explanation": "Since 2018 learner drivers can use motorways but only when accompanied by an approved driving instructor in a car with dual controls."
    },
    {
      "q": "What does a flashing red light above a motorway lane mean?",
      "a": "A",
      "options": {
        "A": "The lane is closed \u2014 do not enter",
        "B": "Slow down",
        "C": "Hazard ahead",
        "D": "Roadworks"
      },
      "category": "Motorway Rules",
      "explanation": "A flashing red X above a motorway lane means that lane is closed. You must not drive in that lane."
    },
    {
      "q": "When can you use the hard shoulder on a motorway?",
      "a": "D",
      "options": {
        "A": "When overtaking",
        "B": "When in a hurry",
        "C": "To make a phone call",
        "D": "In an emergency or breakdown only"
      },
      "category": "Motorway Rules",
      "explanation": "The hard shoulder is only for emergencies and breakdowns. Never use it for driving or making calls."
    },
    {
      "q": "A ball rolls into the road ahead of you. What should you do?",
      "a": "B",
      "options": {
        "A": "Sound horn and continue",
        "B": "Slow down \u2014 a child may follow",
        "C": "Swerve to avoid",
        "D": "Speed up to pass quickly"
      },
      "category": "Hazard Awareness",
      "explanation": "A ball rolling into the road almost certainly means a child will follow. Slow down immediately and be ready to stop."
    },
    {
      "q": "You see a hazard ahead. When should you start to brake?",
      "a": "A",
      "options": {
        "A": "As soon as you see the hazard",
        "B": "When you are close to it",
        "C": "When the car in front brakes",
        "D": "Only in an emergency"
      },
      "category": "Hazard Awareness",
      "explanation": "React as soon as you identify a hazard. Braking early is safer than braking hard at the last moment."
    },
    {
      "q": "What does a flashing amber light at a pelican crossing mean?",
      "a": "C",
      "options": {
        "A": "Stop",
        "B": "Go if safe",
        "C": "Give way to pedestrians still crossing",
        "D": "Speed up"
      },
      "category": "Hazard Awareness",
      "explanation": "A flashing amber at a pelican crossing means give way to pedestrians still crossing but proceed if the crossing is clear."
    },
    {
      "q": "You are driving at night and approach a junction. What should you do?",
      "a": "B",
      "options": {
        "A": "Speed up to pass quickly",
        "B": "Slow down and look for cyclists and pedestrians",
        "C": "Flash your headlights",
        "D": "Sound your horn"
      },
      "category": "Hazard Awareness",
      "explanation": "At night junctions are particularly dangerous. Slow down and watch carefully for cyclists and pedestrians who may be hard to see."
    },
    {
      "q": "What is a contraflow system?",
      "a": "C",
      "options": {
        "A": "A one-way system",
        "B": "A bus lane",
        "C": "Traffic flowing in both directions on one carriageway",
        "D": "A tram system"
      },
      "category": "Hazard Awareness",
      "explanation": "A contraflow is where both directions of traffic share one carriageway usually during roadworks. Follow signs carefully."
    },
    {
      "q": "What should you do when passing cyclists?",
      "a": "C",
      "options": {
        "A": "Sound horn",
        "B": "Pass as close as possible",
        "C": "Give at least 1.5 metres of space",
        "D": "Flash headlights"
      },
      "category": "Vulnerable Road Users",
      "explanation": "When passing cyclists give at least 1.5 metres of space \u2014 more at higher speeds. They may swerve to avoid potholes."
    },
    {
      "q": "A pedestrian is crossing at a junction as you turn. Who has priority?",
      "a": "B",
      "options": {
        "A": "You as the driver",
        "B": "The pedestrian",
        "C": "Neither",
        "D": "Whoever arrived first"
      },
      "category": "Vulnerable Road Users",
      "explanation": "Pedestrians crossing a road you are turning into have priority. You must give way to them."
    },
    {
      "q": "What should you do when driving past a school at pick-up time?",
      "a": "B",
      "options": {
        "A": "Speed up to get through quickly",
        "B": "Slow down and watch for children",
        "C": "Sound horn to warn children",
        "D": "Use hazard lights"
      },
      "category": "Vulnerable Road Users",
      "explanation": "Near schools children can run out without warning. Slow down significantly and be ready to stop."
    },
    {
      "q": "You see an older person trying to cross the road. What should you do?",
      "a": "C",
      "options": {
        "A": "Sound horn",
        "B": "Continue at normal speed",
        "C": "Be patient and give them time",
        "D": "Flash your lights"
      },
      "category": "Vulnerable Road Users",
      "explanation": "Older people may move slowly and have poor hearing or vision. Be patient and give them plenty of time to cross."
    },
    {
      "q": "What does a white stick mean when carried by a pedestrian?",
      "a": "B",
      "options": {
        "A": "They are deaf",
        "B": "They are blind or visually impaired",
        "C": "They need assistance",
        "D": "They are elderly"
      },
      "category": "Vulnerable Road Users",
      "explanation": "A white stick indicates the person is blind or visually impaired. Take extra care and give them priority."
    },
    {
      "q": "What does a red and white stick mean when carried by a pedestrian?",
      "a": "A",
      "options": {
        "A": "They are deaf and blind",
        "B": "They are a traffic warden",
        "C": "They are partially sighted",
        "D": "They need help"
      },
      "category": "Vulnerable Road Users",
      "explanation": "A red and white striped stick means the person is both deaf and blind. Take extreme care around them."
    },
    {
      "q": "What is the minimum tread depth for car tyres?",
      "a": "B",
      "options": {
        "A": "1mm",
        "B": "1.6mm",
        "C": "2mm",
        "D": "2.5mm"
      },
      "category": "Vehicle Safety",
      "explanation": "The legal minimum tyre tread depth is 1.6mm across the central three-quarters of the tyre."
    },
    {
      "q": "How often should you check your tyre pressure?",
      "a": "C",
      "options": {
        "A": "Once a year",
        "B": "Once a month",
        "C": "At least weekly or before a long journey",
        "D": "Only when they look flat"
      },
      "category": "Vehicle Safety",
      "explanation": "Check tyre pressure at least weekly and before long journeys. Incorrect pressure affects handling and fuel economy."
    },
    {
      "q": "Your brake fluid is low. What should you do?",
      "a": "A",
      "options": {
        "A": "Do not drive \u2014 get it checked immediately",
        "B": "Top it up and continue",
        "C": "Drive carefully",
        "D": "Only drive short distances"
      },
      "category": "Vehicle Safety",
      "explanation": "Low brake fluid is dangerous and could indicate a leak. Do not drive \u2014 get the vehicle checked immediately."
    },
    {
      "q": "When should you use your hazard lights?",
      "a": "C",
      "options": {
        "A": "When parking on double yellow lines",
        "B": "When driving in fog",
        "C": "When your vehicle is stationary and causing an obstruction",
        "D": "When overtaking"
      },
      "category": "Vehicle Safety",
      "explanation": "Use hazard lights when stationary and causing an obstruction or to warn others of a danger ahead \u2014 not when parking illegally."
    },
    {
      "q": "What does the MOT test check?",
      "a": "B",
      "options": {
        "A": "Engine performance only",
        "B": "Safety and roadworthiness of the vehicle",
        "C": "Service history",
        "D": "Insurance validity"
      },
      "category": "Vehicle Safety",
      "explanation": "The MOT checks the safety and roadworthiness of vehicles over 3 years old. It must be renewed annually."
    },
    {
      "q": "When must you notify the DVLA?",
      "a": "D",
      "options": {
        "A": "When you change your job",
        "B": "When you move house only",
        "C": "Every year",
        "D": "When you change address or have a medical condition affecting driving"
      },
      "category": "Documents",
      "explanation": "You must notify the DVLA if you change address or if you have a medical condition that could affect your driving."
    },
    {
      "q": "What documents must you have to drive on public roads?",
      "a": "C",
      "options": {
        "A": "Driving licence only",
        "B": "Driving licence and MOT",
        "C": "Driving licence, insurance and MOT (if applicable)",
        "D": "Just insurance"
      },
      "category": "Documents",
      "explanation": "To drive legally you need a valid driving licence, motor insurance and an MOT certificate if your vehicle is over 3 years old."
    },
    {
      "q": "For how many years is a photocard driving licence valid?",
      "a": "B",
      "options": {
        "A": "5 years",
        "B": "10 years",
        "C": "15 years",
        "D": "Lifetime"
      },
      "category": "Documents",
      "explanation": "The photo on a photocard driving licence must be renewed every 10 years to ensure it is a good likeness."
    },
    {
      "q": "What age can you drive a car on UK roads?",
      "a": "B",
      "options": {
        "A": "16",
        "B": "17",
        "C": "18",
        "D": "21"
      },
      "category": "Documents",
      "explanation": "You can start learning to drive a car at 17. You can drive a moped at 16."
    },
    {
      "q": "What is the penalty for driving without insurance?",
      "a": "D",
      "options": {
        "A": "Warning only",
        "B": "\u00a3100 fine",
        "C": "Points on licence",
        "D": "Fixed penalty fine, points on licence and possible vehicle seizure"
      },
      "category": "Documents",
      "explanation": "Driving without insurance is a serious offence. You face a fixed penalty of \u00a3300, 6 points on your licence and your vehicle may be seized."
    },
    {
      "q": "You are involved in an accident. What must you do?",
      "a": "C",
      "options": {
        "A": "Drive away quickly",
        "B": "Call your insurance only",
        "C": "Stop and give your details to anyone who has reasonable grounds to ask",
        "D": "Wait for police"
      },
      "category": "Accidents",
      "explanation": "You must stop after an accident and give your name, address and vehicle registration to anyone who has reasonable grounds to ask."
    },
    {
      "q": "A casualty is bleeding heavily from a wound. What should you do?",
      "a": "B",
      "options": {
        "A": "Give them water",
        "B": "Apply firm pressure to the wound",
        "C": "Remove any objects from the wound",
        "D": "Elevate the wound and do nothing else"
      },
      "category": "Accidents",
      "explanation": "Apply firm pressure to a wound to help stop bleeding. Use a clean pad if available. Do not remove embedded objects."
    },
    {
      "q": "You arrive at an accident scene. Someone is unconscious but breathing. What do you do?",
      "a": "C",
      "options": {
        "A": "Give water",
        "B": "Sit them upright",
        "C": "Place them in the recovery position",
        "D": "Move them to the pavement"
      },
      "category": "Accidents",
      "explanation": "Place an unconscious but breathing casualty in the recovery position to keep their airway open and prevent choking."
    },
    {
      "q": "A vehicle catches fire. What should you do first?",
      "a": "A",
      "options": {
        "A": "Get everyone out and away from the vehicle",
        "B": "Call the fire brigade first",
        "C": "Try to put out the fire",
        "D": "Get your belongings out"
      },
      "category": "Accidents",
      "explanation": "Get everyone out and well away from the vehicle first. Then call the emergency services. Do not try to put it out yourself."
    },
    {
      "q": "Your brakes fail while driving. What should you do?",
      "a": "B",
      "options": {
        "A": "Switch engine off immediately",
        "B": "Use the handbrake gradually and change to lower gear",
        "C": "Swerve into a hedge",
        "D": "Sound horn and hope for the best"
      },
      "category": "Accidents",
      "explanation": "If brakes fail pump the brake pedal rapidly. Use the handbrake gently and change down through the gears to slow down."
    },
    {
      "q": "How close to a junction can you park?",
      "a": "B",
      "options": {
        "A": "5 metres",
        "B": "10 metres",
        "C": "15 metres",
        "D": "20 metres"
      },
      "category": "Rules of the Road",
      "explanation": "You must not park within 10 metres of a junction as this restricts the view of drivers emerging from the side road."
    },
    {
      "q": "Can you park on double yellow lines?",
      "a": "D",
      "options": {
        "A": "Yes for up to 30 minutes",
        "B": "Yes if you stay in the car",
        "C": "Yes for loading only",
        "D": "No \u2014 not at any time"
      },
      "category": "Rules of the Road",
      "explanation": "Double yellow lines mean no parking at any time. Single yellow lines restrict parking at certain times shown on signs."
    },
    {
      "q": "When parking at night on a road with a speed limit over 30mph what must you do?",
      "a": "C",
      "options": {
        "A": "Leave hazard lights on",
        "B": "Face oncoming traffic",
        "C": "Leave parking lights on",
        "D": "Nothing special"
      },
      "category": "Rules of the Road",
      "explanation": "On roads with a speed limit above 30mph you must leave your parking lights on when parked at night."
    },
    {
      "q": "When is it safe to overtake?",
      "a": "C",
      "options": {
        "A": "On a bend",
        "B": "Near a junction",
        "C": "When you can see clearly and have enough space",
        "D": "Whenever you want to"
      },
      "category": "Rules of the Road",
      "explanation": "Only overtake when you can see clearly ahead there is enough space and time to complete the manoeuvre safely."
    },
    {
      "q": "Can you overtake on the left on a motorway?",
      "a": "C",
      "options": {
        "A": "Never",
        "B": "Always",
        "C": "Only when traffic is moving slowly in queues",
        "D": "When it is safe"
      },
      "category": "Motorway Rules",
      "explanation": "On a motorway you may pass on the left only when traffic is moving in slow queues and the left lane is moving faster."
    },
    {
      "q": "What is the safest way to indicate you want to overtake?",
      "a": "B",
      "options": {
        "A": "Flash headlights",
        "B": "Use your mirrors signal then manoeuvre",
        "C": "Sound horn",
        "D": "Move out slightly"
      },
      "category": "Rules of the Road",
      "explanation": "Always use the Mirror Signal Manoeuvre routine before overtaking. Check mirrors signal right then move out when safe."
    },
    {
      "q": "What should you do if your car starts to skid?",
      "a": "C",
      "options": {
        "A": "Brake hard",
        "B": "Accelerate",
        "C": "Steer into the skid and ease off the accelerator",
        "D": "Apply the handbrake"
      },
      "category": "Vehicle Handling",
      "explanation": "If you skid steer into the direction of the skid and ease off the accelerator. Do not brake harshly as this makes it worse."
    },
    {
      "q": "What is aquaplaning?",
      "a": "B",
      "options": {
        "A": "Driving through a flood",
        "B": "When tyres lose contact with road surface due to water",
        "C": "Driving in heavy rain",
        "D": "When windscreen wipers fail"
      },
      "category": "Vehicle Handling",
      "explanation": "Aquaplaning happens when a layer of water builds between tyres and road. Ease off accelerator gently \u2014 do not brake suddenly."
    },
    {
      "q": "You are driving in strong winds. What should you be most aware of?",
      "a": "C",
      "options": {
        "A": "Trees falling",
        "B": "Rain",
        "C": "High-sided vehicles and motorcyclists being blown sideways",
        "D": "Reduced visibility"
      },
      "category": "Vehicle Handling",
      "explanation": "Strong winds can blow high-sided vehicles, motorcyclists and cyclists sideways. Give them extra space when passing."
    },
    {
      "q": "Which type of vehicle causes least pollution?",
      "a": "D",
      "options": {
        "A": "Diesel car",
        "B": "Petrol car",
        "C": "Hybrid car",
        "D": "Electric car"
      },
      "category": "Vehicle Safety",
      "explanation": "Electric cars produce zero direct emissions making them the least polluting option on the road."
    },
    {
      "q": "How can you reduce fuel consumption?",
      "a": "B",
      "options": {
        "A": "Drive faster",
        "B": "Drive smoothly and anticipate traffic",
        "C": "Use higher gears at low speeds",
        "D": "Keep windows open"
      },
      "category": "Vehicle Safety",
      "explanation": "Smooth driving anticipating hazards and keeping a steady speed reduces fuel consumption significantly."
    },
    {
      "q": "What should you do with old engine oil?",
      "a": "C",
      "options": {
        "A": "Pour it down the drain",
        "B": "Put it in the bin",
        "C": "Take it to a recycling centre",
        "D": "Use it in the garden"
      },
      "category": "Vehicle Safety",
      "explanation": "Old engine oil must not be poured down drains \u2014 it causes serious pollution. Take it to a local recycling centre."
    },
    {
      "q": "What is the effect of overloading your vehicle?",
      "a": "A",
      "options": {
        "A": "It affects steering handling and braking",
        "B": "It improves fuel economy",
        "C": "It has no effect",
        "D": "It only affects fuel consumption"
      },
      "category": "Vehicle Loading",
      "explanation": "Overloading affects your vehicle's steering handling and braking distance making it dangerous to drive."
    },
    {
      "q": "Roof rack loads must be secured properly. Why?",
      "a": "B",
      "options": {
        "A": "To look tidy",
        "B": "To prevent them falling and injuring other road users",
        "C": "To improve fuel economy",
        "D": "To meet MOT requirements"
      },
      "category": "Vehicle Loading",
      "explanation": "Unsecured loads can fall off and cause serious accidents. Always secure loads properly and check them regularly."
    },
    {
      "q": "You are approaching a level crossing with barriers. The amber light comes on. What do you do?",
      "a": "B",
      "options": {
        "A": "Speed up to get over before barriers come down",
        "B": "Stop before the white line",
        "C": "Sound your horn",
        "D": "Continue if no train visible"
      },
      "category": "Rules of the Road",
      "explanation": "When amber lights show at a level crossing stop before the white line. Never try to race across before barriers come down."
    },
    {
      "q": "A level crossing has no gates or barriers. What should you do?",
      "a": "C",
      "options": {
        "A": "Cross quickly",
        "B": "Sound horn before crossing",
        "C": "Give way to trains and cross only when safe",
        "D": "Flash headlights"
      },
      "category": "Rules of the Road",
      "explanation": "At unguarded level crossings use the stop look listen procedure. Give way to trains \u2014 they cannot stop quickly."
    },
    {
      "q": "Who has priority at a roundabout?",
      "a": "B",
      "options": {
        "A": "Vehicles entering the roundabout",
        "B": "Vehicles already on the roundabout",
        "C": "Vehicles coming from the right",
        "D": "Largest vehicle"
      },
      "category": "Rules of the Road",
      "explanation": "Traffic already on the roundabout has priority. Give way to traffic from your right before entering."
    },
    {
      "q": "When turning right at a roundabout which lane should you use to approach?",
      "a": "C",
      "options": {
        "A": "Left lane",
        "B": "Either lane",
        "C": "Right lane",
        "D": "Middle lane"
      },
      "category": "Rules of the Road",
      "explanation": "When turning right at a roundabout approach in the right lane signal right and keep to the right on the roundabout."
    },
    {
      "q": "What does a steady amber traffic light mean?",
      "a": "B",
      "options": {
        "A": "Speed up to get through",
        "B": "Stop unless it is unsafe to do so",
        "C": "Prepare to go",
        "D": "Continue if road is clear"
      },
      "category": "Road Signs",
      "explanation": "A steady amber light means stop unless you have already crossed the stop line or stopping would be dangerous."
    },
    {
      "q": "What do red and amber lights showing together mean?",
      "a": "C",
      "options": {
        "A": "Stop immediately",
        "B": "Go now",
        "C": "Prepare to go but wait for green",
        "D": "Caution"
      },
      "category": "Road Signs",
      "explanation": "Red and amber showing together means prepare to go. Wait for the green light before moving."
    },
    {
      "q": "What does a green filter arrow mean at traffic lights?",
      "a": "B",
      "options": {
        "A": "All traffic may go",
        "B": "You may go in the direction of the arrow",
        "C": "Pedestrians may cross",
        "D": "Emergency vehicles only"
      },
      "category": "Road Signs",
      "explanation": "A green filter arrow means you may proceed in the direction shown even if the main light is red."
    },
    {
      "q": "When must you use dipped headlights during the day?",
      "a": "C",
      "options": {
        "A": "Always",
        "B": "Never",
        "C": "When visibility is seriously reduced",
        "D": "In rain only"
      },
      "category": "Rules of the Road",
      "explanation": "Use dipped headlights during the day when visibility is seriously reduced \u2014 typically when you cannot see for 100 metres."
    },
    {
      "q": "What does it mean if an oncoming driver flashes their headlights at you?",
      "a": "D",
      "options": {
        "A": "They want you to overtake",
        "B": "They are warning you about police ahead",
        "C": "They are greeting you",
        "D": "It means whatever the driver intends \u2014 it has no official meaning"
      },
      "category": "Rules of the Road",
      "explanation": "Flashing headlights is only officially used to let others know you are there. It has no other official meaning \u2014 do not assume anything."
    },
    {
      "q": "What is the purpose of a catalytic converter?",
      "a": "B",
      "options": {
        "A": "Improve fuel economy",
        "B": "Reduce harmful exhaust emissions",
        "C": "Increase engine power",
        "D": "Reduce engine noise"
      },
      "category": "Vehicle Safety",
      "explanation": "A catalytic converter reduces harmful exhaust emissions by converting them into less harmful gases."
    },
    {
      "q": "You are driving on a road with a 40mph limit. A sign shows 30mph ahead. When must you be doing 30mph?",
      "a": "A",
      "options": {
        "A": "By the time you reach the sign",
        "B": "After you pass the sign",
        "C": "100 metres after the sign",
        "D": "At the next junction"
      },
      "category": "Rules of the Road",
      "explanation": "You must be at 30mph by the time you reach the sign showing the new speed limit not after you pass it."
    },
    {
      "q": "When should you switch your headlights on?",
      "a": "C",
      "options": {
        "A": "Only at night",
        "B": "After sunset",
        "C": "When visibility is reduced or at night",
        "D": "Only in fog"
      },
      "category": "Rules of the Road",
      "explanation": "Switch headlights on at night and whenever visibility is reduced. Do not rely on streetlights alone."
    },
    {
      "q": "What is the legal alcohol limit for drivers in England and Wales?",
      "a": "B",
      "options": {
        "A": "50mg per 100ml of blood",
        "B": "80mg per 100ml of blood",
        "C": "35mg per 100ml of breath",
        "D": "B and C are both correct"
      },
      "category": "Rules of the Road",
      "explanation": "In England and Wales the limit is 80mg of alcohol per 100ml of blood or 35 microgrammes per 100ml of breath. Scotland is lower."
    },
    {
      "q": "For how long can a Nigerian driving licence be used in the UK?",
      "a": "B",
      "options": {
        "A": "6 months",
        "B": "12 months",
        "C": "2 years",
        "D": "Indefinitely"
      },
      "category": "Documents",
      "explanation": "A Nigerian driving licence can be used in the UK for up to 12 months. After that you must pass the UK driving test."
    },
    {
      "q": "What is the fine for using a handheld mobile phone while driving?",
      "a": "C",
      "options": {
        "A": "\u00a3100",
        "B": "\u00a3200",
        "C": "\u00a3200 and 6 penalty points",
        "D": "\u00a3500 and ban"
      },
      "category": "Rules of the Road",
      "explanation": "Using a handheld mobile while driving carries a \u00a3200 fine and 6 penalty points. New drivers could face a ban."
    },
    {
      "q": "What should you do when an emergency vehicle with sirens approaches?",
      "a": "C",
      "options": {
        "A": "Speed up",
        "B": "Stop immediately anywhere",
        "C": "Move over safely to let it pass",
        "D": "Ignore it"
      },
      "category": "Rules of the Road",
      "explanation": "When an emergency vehicle approaches pull over safely when possible to let it pass. Do not mount pavements or go through red lights."
    },
    {
      "q": "What does a pedestrian crossing with zigzag lines mean?",
      "a": "B",
      "options": {
        "A": "No stopping at any time",
        "B": "No overtaking and no parking near the crossing",
        "C": "Parking for disabled only",
        "D": "School crossing"
      },
      "category": "Road Signs",
      "explanation": "Zigzag lines at a pedestrian crossing mean no overtaking and no parking. Keep the crossing clear for pedestrians."
    },
    {
      "q": "You want to turn right at a crossroads and an oncoming driver also wants to turn right. What is the safest method?",
      "a": "B",
      "options": {
        "A": "Offside to offside",
        "B": "Nearside to nearside",
        "C": "Wait for them",
        "D": "Flash lights to agree"
      },
      "category": "Rules of the Road",
      "explanation": "The safest method when both drivers turn right at a crossroads is nearside to nearside passing each other with the vehicle between you."
    },
    {
      "q": "When can you drive in a bus lane?",
      "a": "C",
      "options": {
        "A": "Never",
        "B": "When the road is clear",
        "C": "Outside the hours shown on the sign",
        "D": "Only on Sundays"
      },
      "category": "Rules of the Road",
      "explanation": "Bus lanes can usually be used by cars outside the hours shown on the sign. Always check the sign for permitted times."
    },
    {
      "q": "What does a broken white line in the centre of the road mean?",
      "a": "A",
      "options": {
        "A": "You may cross it if safe to do so",
        "B": "No overtaking",
        "C": "Lane divider on motorway",
        "D": "Edge of the road"
      },
      "category": "Road Signs",
      "explanation": "A broken white centre line may be crossed to overtake if it is safe and you can complete the manoeuvre before any hazard line."
    },
    {
      "q": "What does a solid white line in the centre of the road mean?",
      "a": "B",
      "options": {
        "A": "Lane marking",
        "B": "Do not cross or straddle it",
        "C": "Overtaking allowed",
        "D": "End of road"
      },
      "category": "Road Signs",
      "explanation": "A solid white centre line must not be crossed or straddled unless turning into a property or to pass a stationary vehicle."
    },
    {
      "q": "How should you dispose of a vehicle that is no longer roadworthy?",
      "a": "C",
      "options": {
        "A": "Leave it on the road",
        "B": "Sell it for scrap privately",
        "C": "Take it to an authorised treatment facility and get a certificate of destruction",
        "D": "Leave it on your property"
      },
      "category": "Documents",
      "explanation": "Vehicles must be disposed of at an authorised treatment facility. You will receive a Certificate of Destruction and must notify the DVLA."
    },
    {
      "q": "What does a sign with a red circle and the number 30 mean?",
      "a": "B",
      "options": {
        "A": "Minimum speed 30mph",
        "B": "Maximum speed 30mph",
        "C": "Recommended speed 30mph",
        "D": "No speed limit"
      },
      "category": "Road Signs",
      "explanation": "A red circle with a number means that is the maximum speed limit. You must not exceed it."
    },
    {
      "q": "When should you use your full beam headlights?",
      "a": "C",
      "options": {
        "A": "Always at night",
        "B": "Never",
        "C": "On unlit roads when no oncoming traffic",
        "D": "In fog"
      },
      "category": "Rules of the Road",
      "explanation": "Use full beam on unlit roads but switch to dipped when you see oncoming vehicles or are following another vehicle."
    },
    {
      "q": "What is the purpose of a rumble strip?",
      "a": "A",
      "options": {
        "A": "To alert drivers they are leaving the road or approaching a hazard",
        "B": "To slow down cyclists",
        "C": "To mark the edge of the motorway",
        "D": "For decoration"
      },
      "category": "Road Signs",
      "explanation": "Rumble strips are raised markings that make a noise and vibration to alert drivers they are drifting off the road or approaching a hazard."
    },
    {
      "q": "You are driving behind a large lorry. Why should you keep well back?",
      "a": "B",
      "options": {
        "A": "Lorries brake faster",
        "B": "To improve your view of the road ahead",
        "C": "Lorries travel faster",
        "D": "To save fuel"
      },
      "category": "Safety Margins",
      "explanation": "Keeping well back from large lorries improves your view of the road ahead and gives you more time to react to hazards."
    },
    {
      "q": "What should you do if you drive through a deep puddle?",
      "a": "C",
      "options": {
        "A": "Nothing",
        "B": "Accelerate quickly",
        "C": "Test your brakes gently",
        "D": "Sound your horn"
      },
      "category": "Vehicle Handling",
      "explanation": "After driving through deep water your brakes may be wet and less effective. Test them gently to dry them out."
    },
    {
      "q": "What is the speed limit for a car towing a caravan on a motorway?",
      "a": "B",
      "options": {
        "A": "60mph",
        "B": "60mph",
        "C": "70mph",
        "D": "50mph"
      },
      "category": "Rules of the Road",
      "explanation": "Cars towing caravans or trailers are limited to 60mph on motorways and dual carriageways."
    },
    {
      "q": "When are you allowed to sound your horn?",
      "a": "C",
      "options": {
        "A": "When angry at another driver",
        "B": "When stationary in traffic",
        "C": "To warn others of your presence",
        "D": "In a built-up area at night"
      },
      "category": "Rules of the Road",
      "explanation": "You should only sound your horn to warn others of your presence. Never use it aggressively or between 11:30pm and 7am in a built-up area."
    },
    {
      "q": "What colour is a temporary speed limit sign?",
      "a": "A",
      "options": {
        "A": "Yellow",
        "B": "Red",
        "C": "Blue",
        "D": "White"
      },
      "category": "Road Signs",
      "explanation": "Temporary signs usually found in roadworks are on yellow backgrounds. Always obey them \u2014 speed cameras are often active in roadworks."
    },
    {
      "q": "What should you do when you see a pedestrian crossing ahead?",
      "a": "B",
      "options": {
        "A": "Sound horn",
        "B": "Be prepared to slow down and stop",
        "C": "Speed up",
        "D": "Flash lights"
      },
      "category": "Hazard Awareness",
      "explanation": "Always be prepared to stop at pedestrian crossings. Look for pedestrians waiting and be ready to give way."
    },
    {
      "q": "What is the legal requirement for car insurance?",
      "a": "A",
      "options": {
        "A": "At minimum third party insurance",
        "B": "Fully comprehensive only",
        "C": "Third party fire and theft only",
        "D": "No requirement"
      },
      "category": "Documents",
      "explanation": "By law you must have at least third party insurance to drive on public roads. This covers damage to others but not your own vehicle."
    },
    {
      "q": "You are driving at night on a country road. When should you dip your headlights?",
      "a": "C",
      "options": {
        "A": "Never on country roads",
        "B": "Only when a car is coming towards you",
        "C": "Whenever you see oncoming headlights or are following another vehicle",
        "D": "Always use full beam"
      },
      "category": "Rules of the Road",
      "explanation": "Dip your headlights whenever you see oncoming headlights or when following another vehicle to avoid dazzling other drivers."
    },
    {
      "q": "What does a speed camera sign look like?",
      "a": "B",
      "options": {
        "A": "Blue circle with camera symbol",
        "B": "Yellow rectangular sign with camera symbol",
        "C": "Red triangle with camera",
        "D": "White square with camera"
      },
      "category": "Road Signs",
      "explanation": "Speed camera warning signs are typically rectangular yellow signs with a camera symbol. Fixed cameras are often in yellow boxes."
    },
    {
      "q": "When must you stop at a pedestrian crossing?",
      "a": "C",
      "options": {
        "A": "Only when pedestrians are on it",
        "B": "Only at night",
        "C": "When the lights are red or pedestrians are crossing",
        "D": "Only during school hours"
      },
      "category": "Rules of the Road",
      "explanation": "Stop at pedestrian crossings when lights show red or when pedestrians are using the crossing. Always be prepared to stop."
    },
    {
      "q": "What does a mandatory sign look like?",
      "a": "A",
      "options": {
        "A": "Blue circle",
        "B": "Red triangle",
        "C": "Red circle",
        "D": "Yellow rectangle"
      },
      "category": "Road Signs",
      "explanation": "Mandatory signs are blue circles giving positive instructions such as turn left ahead or minimum speed."
    },
    {
      "q": "When driving in a tunnel what should you do?",
      "a": "B",
      "options": {
        "A": "Speed up",
        "B": "Switch on headlights and be aware of emergency exits",
        "C": "Turn off engine",
        "D": "Use hazard lights"
      },
      "category": "Rules of the Road",
      "explanation": "In tunnels switch on headlights follow signs and note the location of emergency exits and fire extinguishers."
    },
    {
      "q": "What should you do if your steering suddenly feels light?",
      "a": "C",
      "options": {
        "A": "Brake hard",
        "B": "Accelerate",
        "C": "Check your tyres \u2014 you may have a puncture",
        "D": "Change gear"
      },
      "category": "Vehicle Handling",
      "explanation": "Light steering can indicate a front tyre puncture. Hold the wheel firmly reduce speed gradually and stop safely."
    },
    {
      "q": "You are turning left. A cyclist is in front going straight ahead. Who has priority?",
      "a": "B",
      "options": {
        "A": "You do",
        "B": "The cyclist",
        "C": "Whoever arrives first",
        "D": "Neither"
      },
      "category": "Vulnerable Road Users",
      "explanation": "Cyclists going straight ahead have priority over vehicles turning. Always check for cyclists before turning left."
    },
    {
      "q": "What is the two-second rule?",
      "a": "A",
      "options": {
        "A": "The minimum following distance in dry conditions",
        "B": "How long to signal before turning",
        "C": "How long to check mirrors",
        "D": "The time to complete an overtake"
      },
      "category": "Safety Margins",
      "explanation": "The two-second rule means keeping at least a two-second gap from the vehicle in front in dry conditions. Double it in wet weather."
    },
    {
      "q": "You are approaching a zebra crossing. A pedestrian is waiting. What should you do?",
      "a": "B",
      "options": {
        "A": "Sound horn and continue",
        "B": "Slow down and be prepared to stop",
        "C": "Flash lights to let them cross",
        "D": "Speed up"
      },
      "category": "Hazard Awareness",
      "explanation": "At zebra crossings pedestrians have priority once they step onto the crossing. Slow down and be prepared to stop for waiting pedestrians."
    },
    {
      "q": "What does a broken yellow line at the edge of the road mean?",
      "a": "C",
      "options": {
        "A": "No parking at any time",
        "B": "Bus stop only",
        "C": "Loading and unloading restrictions at certain times",
        "D": "Cycle lane"
      },
      "category": "Road Signs",
      "explanation": "A broken yellow line at the kerb indicates loading restrictions at certain times shown on nearby signs."
    },
    {
      "q": "How far should you park from a bus stop?",
      "a": "B",
      "options": {
        "A": "5 metres",
        "B": "No specific distance but do not obstruct buses",
        "C": "20 metres",
        "D": "10 metres"
      },
      "category": "Rules of the Road",
      "explanation": "Do not park at bus stops or in a way that obstructs buses from using them. Keep bus stops clear for passengers."
    },
    {
      "q": "What is the purpose of ABS (Anti-lock Braking System)?",
      "a": "A",
      "options": {
        "A": "To prevent wheels locking so you can steer while braking",
        "B": "To make braking harder",
        "C": "To automatically brake the car",
        "D": "To improve fuel economy"
      },
      "category": "Vehicle Safety",
      "explanation": "ABS prevents wheels locking during heavy braking allowing you to maintain steering control. Maintain firm pressure on the brake pedal."
    },
    {
      "q": "What should you do if you are involved in a collision with a parked car?",
      "a": "C",
      "options": {
        "A": "Drive away quickly",
        "B": "Leave a note only if there is damage",
        "C": "Leave your contact details and report to police within 24 hours if owner not present",
        "D": "Call your insurance only"
      },
      "category": "Accidents",
      "explanation": "If you damage a parked vehicle try to find the owner. If not leave a note with your details and report to police within 24 hours."
    },
    {
      "q": "When can you use a mobile phone while driving?",
      "a": "D",
      "options": {
        "A": "When using hands-free",
        "B": "For navigation only",
        "C": "At traffic lights",
        "D": "Only when safely parked with the engine off"
      },
      "category": "Rules of the Road",
      "explanation": "You should only use a mobile phone when safely parked with the engine off. Even hands-free can distract you from driving."
    },
    {
      "q": "What is the maximum length of a learner driver lesson?",
      "a": "D",
      "options": {
        "A": "1 hour",
        "B": "2 hours",
        "C": "3 hours",
        "D": "There is no legal maximum"
      },
      "category": "Documents",
      "explanation": "There is no legal maximum length for a driving lesson. However lessons should be manageable and safe for the learner."
    },
    {
      "q": "Where should you position your vehicle when turning right on a road with a centre line?",
      "a": "B",
      "options": {
        "A": "In the left lane",
        "B": "Just left of the centre line",
        "C": "Straddle the centre line",
        "D": "As far right as possible"
      },
      "category": "Rules of the Road",
      "explanation": "When turning right position your vehicle just left of the centre line. This allows vehicles from behind to pass on your left."
    },
    {
      "q": "What should you do if you miss your motorway exit?",
      "a": "C",
      "options": {
        "A": "Reverse on the hard shoulder",
        "B": "Make a U-turn",
        "C": "Continue to the next exit",
        "D": "Stop and wait for help"
      },
      "category": "Motorway Rules",
      "explanation": "Never reverse on a motorway. Continue to the next exit even if it means a longer journey. Reversing is extremely dangerous."
    },
    {
      "q": "What is the minimum age to ride a moped in the UK?",
      "a": "A",
      "options": {
        "A": "16",
        "B": "17",
        "C": "18",
        "D": "21"
      },
      "category": "Documents",
      "explanation": "You can ride a moped with an engine up to 50cc from the age of 16 after completing Compulsory Basic Training (CBT)."
    },
    {
      "q": "When following a vehicle in heavy rain what should you do?",
      "a": "B",
      "options": {
        "A": "Keep the same distance as normal",
        "B": "Double your following distance",
        "C": "Use full beam",
        "D": "Use hazard lights"
      },
      "category": "Safety Margins",
      "explanation": "In rain your stopping distance at least doubles. Increase your following distance to at least 4 seconds from the vehicle ahead."
    },
    {
      "q": "What is a pelican crossing?",
      "a": "C",
      "options": {
        "A": "A crossing for horses",
        "B": "A crossing with no lights",
        "C": "A pedestrian crossing controlled by traffic lights",
        "D": "A crossing for cyclists"
      },
      "category": "Road Signs",
      "explanation": "A pelican crossing is a pedestrian crossing with traffic lights controlled by the pedestrian pressing a button."
    },
    {
      "q": "What is a toucan crossing?",
      "a": "B",
      "options": {
        "A": "A crossing for horses",
        "B": "A crossing for both pedestrians and cyclists",
        "C": "A school crossing",
        "D": "A crossing with no lights"
      },
      "category": "Road Signs",
      "explanation": "A toucan crossing is designed for both pedestrians and cyclists to cross together. Two can cross \u2014 hence the name toucan."
    },
    {
      "q": "What is a pegasus crossing?",
      "a": "A",
      "options": {
        "A": "A crossing for horse riders",
        "B": "A crossing for cyclists",
        "C": "A school crossing",
        "D": "A crossing for pedestrians only"
      },
      "category": "Road Signs",
      "explanation": "A pegasus crossing is designed for horse riders. It has a higher button for riders to press without dismounting."
    },
    {
      "q": "You are on a motorway and see red Xs above all lanes. What does this mean?",
      "a": "C",
      "options": {
        "A": "Slow down",
        "B": "Emergency vehicles ahead",
        "C": "Motorway is closed \u2014 you must not continue",
        "D": "Hazard ahead"
      },
      "category": "Motorway Rules",
      "explanation": "Red Xs above all lanes means the motorway ahead is closed. You must stop at the next exit or when directed by signs."
    },
    {
      "q": "What is the national speed limit for a goods vehicle over 7.5 tonnes on a dual carriageway?",
      "a": "B",
      "options": {
        "A": "70mph",
        "B": "60mph",
        "C": "50mph",
        "D": "55mph"
      },
      "category": "Rules of the Road",
      "explanation": "Large goods vehicles over 7.5 tonnes are limited to 60mph on dual carriageways and 70mph motorways."
    },
    {
      "q": "When must you carry your driving licence?",
      "a": "D",
      "options": {
        "A": "Always while driving",
        "B": "Only on long journeys",
        "C": "Only when asked by police",
        "D": "You do not have to carry it but must produce it within 7 days if asked"
      },
      "category": "Documents",
      "explanation": "You are not required to carry your driving licence while driving but if asked by police you must produce it within 7 days at a police station."
    },
    {
      "q": "What does a solid white line on your side of the road at a junction mean?",
      "a": "A",
      "options": {
        "A": "Give way to traffic on the major road",
        "B": "Stop completely",
        "C": "No entry",
        "D": "Speed up"
      },
      "category": "Road Signs",
      "explanation": "A solid white line at a junction means you must give way to traffic on the major road. Look carefully before emerging."
    },
    {
      "q": "What is the effect of driving with worn tyres?",
      "a": "C",
      "options": {
        "A": "Better fuel economy",
        "B": "Improved grip",
        "C": "Reduced grip especially in wet conditions",
        "D": "No significant effect"
      },
      "category": "Vehicle Safety",
      "explanation": "Worn tyres significantly reduce grip especially on wet roads. They also increase stopping distances and risk of aquaplaning."
    },
    {
      "q": "What should you do if your engine catches fire?",
      "a": "B",
      "options": {
        "A": "Lift the bonnet to investigate",
        "B": "Get everyone out and away from the vehicle and call 999",
        "C": "Use water to put it out",
        "D": "Drive to a garage"
      },
      "category": "Accidents",
      "explanation": "Get everyone out and well away from the vehicle. Do not open the bonnet. Call 999 immediately. Never use water on a vehicle fire."
    },
    {
      "q": "At what age do you have to renew your driving licence?",
      "a": "C",
      "options": {
        "A": "60",
        "B": "65",
        "C": "70",
        "D": "75"
      },
      "category": "Documents",
      "explanation": "At age 70 you must renew your driving licence and declare any medical conditions. After 70 you renew every 3 years."
    },
    {
      "q": "What must you do if you develop a medical condition that affects your driving?",
      "a": "A",
      "options": {
        "A": "Notify the DVLA",
        "B": "Stop driving immediately",
        "C": "Tell your doctor only",
        "D": "Nothing if you feel fine"
      },
      "category": "Documents",
      "explanation": "You must notify the DVLA of any medical condition that could affect your driving. Failure to do so could invalidate your insurance."
    },
    {
      "q": "What is eco-safe driving?",
      "a": "B",
      "options": {
        "A": "Driving with windows open",
        "B": "Driving smoothly to reduce fuel consumption and emissions",
        "C": "Driving electric vehicles only",
        "D": "Avoiding motorways"
      },
      "category": "Vehicle Safety",
      "explanation": "Eco-safe driving means anticipating hazards early accelerating gently maintaining steady speeds and braking smoothly to save fuel."
    },
    {
      "q": "What does a yellow diamond sign on the back of a vehicle mean?",
      "a": "C",
      "options": {
        "A": "Oversized load",
        "B": "Dangerous goods",
        "C": "The vehicle carries hazardous materials",
        "D": "School bus"
      },
      "category": "Road Signs",
      "explanation": "Yellow diamond shaped signs on vehicles indicate they are carrying hazardous or dangerous goods. Give them extra space."
    },
    {
      "q": "You want to overtake a cyclist. How much space should you give?",
      "a": "B",
      "options": {
        "A": "0.5 metres",
        "B": "At least 1.5 metres",
        "C": "Only a car width",
        "D": "As much as possible"
      },
      "category": "Vulnerable Road Users",
      "explanation": "The Highway Code recommends giving cyclists at least 1.5 metres of space when overtaking. More space at higher speeds."
    },
    {
      "q": "When is it legal to park on a pavement?",
      "a": "D",
      "options": {
        "A": "If no yellow lines",
        "B": "For loading only",
        "C": "If your hazard lights are on",
        "D": "It is generally not legal and can cause problems for pedestrians"
      },
      "category": "Rules of the Road",
      "explanation": "Parking on pavements is not generally permitted as it obstructs pedestrians including wheelchair users and parents with prams. In London it is banned."
    },
    {
      "q": "What should you check before setting off on a long journey?",
      "a": "C",
      "options": {
        "A": "Just fuel",
        "B": "Just tyres",
        "C": "Fuel oil water tyres lights and windscreen washers",
        "D": "Nothing if the car passed MOT"
      },
      "category": "Vehicle Safety",
      "explanation": "Before a long journey check fuel oil water tyres (pressure and condition) lights windscreen washers and that you have your documents."
    },
    {
      "q": "When driving on ice what technique should you use?",
      "a": "B",
      "options": {
        "A": "Brake hard when needed",
        "B": "Drive slowly use gentle inputs and allow much greater stopping distances",
        "C": "Use 4WD mode",
        "D": "Pump the brakes"
      },
      "category": "Vehicle Handling",
      "explanation": "On ice drive very slowly use the highest gear possible make gentle steering brake and accelerator inputs and leave massive stopping distances."
    },
    {
      "q": "What is the penalty for driving while disqualified?",
      "a": "A",
      "options": {
        "A": "Up to 6 months in prison and further disqualification",
        "B": "A fine only",
        "C": "Points on licence only",
        "D": "Warning only"
      },
      "category": "Documents",
      "explanation": "Driving while disqualified is a serious criminal offence carrying up to 6 months imprisonment an unlimited fine and further disqualification."
    },
    {
      "q": "What is the stopping distance in good conditions at 20mph?",
      "a": "B",
      "options": {
        "A": "6 metres",
        "B": "12 metres",
        "C": "18 metres",
        "D": "23 metres"
      },
      "category": "Safety Margins",
      "explanation": "At 20mph the thinking distance is 6m and braking distance is 6m giving a total stopping distance of 12 metres."
    },
    {
      "q": "What is the stopping distance at 40mph?",
      "a": "C",
      "options": {
        "A": "23 metres",
        "B": "30 metres",
        "C": "36 metres",
        "D": "53 metres"
      },
      "category": "Safety Margins",
      "explanation": "At 40mph the thinking distance is 12m and braking distance is 24m giving a total stopping distance of 36 metres."
    },
    {
      "q": "What is the stopping distance at 60mph?",
      "a": "D",
      "options": {
        "A": "53 metres",
        "B": "63 metres",
        "C": "70 metres",
        "D": "73 metres"
      },
      "category": "Safety Margins",
      "explanation": "At 60mph the thinking distance is 18m and braking distance is 55m giving a total stopping distance of 73 metres."
    },
    {
      "q": "What should you do when driving through roadworks with a 50mph limit?",
      "a": "B",
      "options": {
        "A": "Ignore the limit if road is clear",
        "B": "Observe the limit \u2014 cameras may be active",
        "C": "Drive at 60mph to get through quickly",
        "D": "Sound horn to warn workers"
      },
      "category": "Rules of the Road",
      "explanation": "Always obey roadworks speed limits. Speed cameras are often active. Workers are present and the limit is for their protection."
    },
    {
      "q": "What does a white H sign on a blue background indicate?",
      "a": "A",
      "options": {
        "A": "Hospital",
        "B": "Hotel",
        "C": "Helipad",
        "D": "Harbour"
      },
      "category": "Road Signs",
      "explanation": "A white H on a blue background indicates a hospital. Be aware of ambulances and emergency vehicles near hospitals."
    },
    {
      "q": "What is a safety camera partnership?",
      "a": "C",
      "options": {
        "A": "A private company",
        "B": "A police unit only",
        "C": "A partnership between police councils and other agencies to reduce casualties through camera enforcement",
        "D": "A CCTV network"
      },
      "category": "Rules of the Road",
      "explanation": "Safety camera partnerships use speed and red light cameras to reduce road casualties. Revenue goes towards road safety initiatives."
    },
    {
      "q": "What should you do before reversing?",
      "a": "B",
      "options": {
        "A": "Sound horn",
        "B": "Check all around including blind spots for pedestrians and other hazards",
        "C": "Open window",
        "D": "Flash hazard lights"
      },
      "category": "Rules of the Road",
      "explanation": "Before reversing check all around the vehicle including blind spots. Use your mirrors and look over both shoulders."
    },
    {
      "q": "When driving in a foreign country which side of the road do most European countries drive on?",
      "a": "A",
      "options": {
        "A": "Right",
        "B": "Left",
        "C": "Either",
        "D": "It varies by country"
      },
      "category": "Rules of the Road",
      "explanation": "Most countries drive on the right. The UK Ireland Malta Cyprus and some other countries drive on the left. Remember when abroad."
    },
    {
      "q": "What is the legal limit for carbon monoxide in a vehicle?",
      "a": "D",
      "options": {
        "A": "10 parts per million",
        "B": "50 parts per million",
        "C": "100 parts per million",
        "D": "There is no specific limit but exposure is dangerous"
      },
      "category": "Vehicle Safety",
      "explanation": "Carbon monoxide is odourless and colourless. A faulty exhaust can allow it into the cabin. Regular servicing reduces this risk."
    },
    {
      "q": "What should you do when driving past horses on the road?",
      "a": "C",
      "options": {
        "A": "Sound horn to warn them",
        "B": "Overtake quickly",
        "C": "Slow to a walk pass wide and be ready to stop",
        "D": "Flash headlights"
      },
      "category": "Vulnerable Road Users",
      "explanation": "Pass horses slowly (walking pace) giving at least 2 metres of space. Be prepared to stop. Do not sound horn or rev engine."
    },
    {
      "q": "What does a sign showing a red circle with a lorry mean?",
      "a": "B",
      "options": {
        "A": "Lorry park ahead",
        "B": "No goods vehicles",
        "C": "Lorry route",
        "D": "Weight restriction ahead"
      },
      "category": "Road Signs",
      "explanation": "A red circle with a lorry symbol means goods vehicles are prohibited from that road or area."
    },
    {
      "q": "What colour is the cat's eye in the centre of a motorway?",
      "a": "A",
      "options": {
        "A": "White",
        "B": "Red",
        "C": "Amber",
        "D": "Green"
      },
      "category": "Road Signs",
      "explanation": "White cat's eyes mark the centre lines of roads. Red marks the left edge of motorways. Amber marks the central reservation. Green marks slip roads."
    },
    {
      "q": "What do red cat's eyes on the motorway mean?",
      "a": "B",
      "options": {
        "A": "Centre of road",
        "B": "Left edge of motorway \u2014 do not cross",
        "C": "Slip road",
        "D": "Overtaking lane"
      },
      "category": "Road Signs",
      "explanation": "Red cat's eyes mark the left edge of the motorway. If you see red cat's eyes you are drifting towards the hard shoulder."
    },
    {
      "q": "What do green cat's eyes indicate on a motorway?",
      "a": "C",
      "options": {
        "A": "Centre of road",
        "B": "Hard shoulder",
        "C": "Junction or slip road entrance or exit",
        "D": "Lane markings"
      },
      "category": "Road Signs",
      "explanation": "Green cat's eyes mark the edges of slip roads and junctions \u2014 the entrance and exit points of the motorway."
    },
    {
      "q": "What does an amber cat's eye on a motorway indicate?",
      "a": "A",
      "options": {
        "A": "The central reservation",
        "B": "The hard shoulder",
        "C": "A lane",
        "D": "A junction"
      },
      "category": "Road Signs",
      "explanation": "Amber cat's eyes mark the central reservation. If you see amber cat's eyes you are too close to the central reservation."
    },
    {
      "q": "What is careless driving?",
      "a": "B",
      "options": {
        "A": "Speeding only",
        "B": "Driving without due care and attention or without reasonable consideration for others",
        "C": "Using a phone while driving",
        "D": "All of the above"
      },
      "category": "Rules of the Road",
      "explanation": "Careless driving means driving without due care and attention. It is a criminal offence carrying fines points and possible disqualification."
    },
    {
      "q": "What is dangerous driving?",
      "a": "C",
      "options": {
        "A": "Slightly careless driving",
        "B": "Driving without insurance",
        "C": "Driving in a way that falls far below the standard expected and poses obvious danger",
        "D": "Speeding by 10mph"
      },
      "category": "Rules of the Road",
      "explanation": "Dangerous driving is a serious criminal offence carrying up to 2 years imprisonment. It occurs when driving falls far below acceptable standards."
    },
    {
      "q": "What must you do when approaching a school crossing patrol?",
      "a": "A",
      "options": {
        "A": "Stop when the patrol steps out \u2014 you must not proceed until they have returned to the pavement",
        "B": "Slow down only",
        "C": "Sound horn",
        "D": "Flash lights"
      },
      "category": "Rules of the Road",
      "explanation": "When a school crossing patrol steps out you must stop. Do not move until the patrol has returned safely to the pavement."
    },
    {
      "q": "What does a white arrow on a blue sign in a tunnel mean?",
      "a": "B",
      "options": {
        "A": "Exit",
        "B": "Emergency exit or refuge area direction",
        "C": "No entry",
        "D": "Speed limit"
      },
      "category": "Road Signs",
      "explanation": "In tunnels white arrows on blue signs indicate the direction of emergency exits refuge areas or escape routes."
    },
    {
      "q": "How often should you service your vehicle?",
      "a": "C",
      "options": {
        "A": "Every year",
        "B": "Every 20000 miles",
        "C": "According to the manufacturer's recommended service intervals",
        "D": "Only when something goes wrong"
      },
      "category": "Vehicle Safety",
      "explanation": "Follow the manufacturer's recommended service schedule. Regular servicing keeps your vehicle safe reliable and maintains its value."
    },
    {
      "q": "What does a sign showing a camera mean on the motorway?",
      "a": "B",
      "options": {
        "A": "CCTV only",
        "B": "Speed camera ahead \u2014 obey the speed limit",
        "C": "Traffic monitoring only",
        "D": "No cameras allowed"
      },
      "category": "Road Signs",
      "explanation": "Camera signs on motorways warn of speed cameras ahead. Always obey the displayed speed limit \u2014 fines and points apply."
    },
    {
      "q": "What is the maximum fine for speeding in the UK?",
      "a": "C",
      "options": {
        "A": "\u00a3500",
        "B": "\u00a31000",
        "C": "\u00a32500",
        "D": "Unlimited"
      },
      "category": "Rules of the Road",
      "explanation": "The maximum fine for speeding is \u00a32500 on a motorway. For other roads it is \u00a31000. You also receive 3-6 penalty points."
    },
    {
      "q": "When must you not use your horn?",
      "a": "D",
      "options": {
        "A": "In the countryside",
        "B": "Near schools",
        "C": "Near hospitals",
        "D": "Between 11:30pm and 7am in a built-up area"
      },
      "category": "Rules of the Road",
      "explanation": "You must not sound your horn between 11:30pm and 7:00am in a built-up area or when stationary unless a moving vehicle poses a danger."
    },
    {
      "q": "What should you do when you see a red and white striped barrier across the road?",
      "a": "A",
      "options": {
        "A": "Stop \u2014 the road ahead is closed",
        "B": "Slow down and continue",
        "C": "Sound horn",
        "D": "Drive around it"
      },
      "category": "Road Signs",
      "explanation": "Red and white striped barriers across the road mean the road ahead is closed. Always obey these barriers \u2014 never drive around them."
    },
    {
      "q": "What is the Highway Code?",
      "a": "B",
      "options": {
        "A": "A law",
        "B": "A set of rules and guidance for all road users",
        "C": "A motorway speed limit",
        "D": "A driving test requirement"
      },
      "category": "Rules of the Road",
      "explanation": "The Highway Code contains rules and guidance for all road users. Some rules are legal requirements others are advisory guidance."
    },
    {
      "q": "What does a sign showing a pedestrian in a red circle mean?",
      "a": "C",
      "options": {
        "A": "Pedestrian crossing ahead",
        "B": "Pedestrians have priority",
        "C": "No pedestrians allowed",
        "D": "School crossing"
      },
      "category": "Road Signs",
      "explanation": "A red circle with a pedestrian means pedestrians are prohibited from that area \u2014 for example on some sections of motorway."
    },
    {
      "q": "When should you switch to winter tyres?",
      "a": "B",
      "options": {
        "A": "When it snows only",
        "B": "When temperatures regularly drop below 7 degrees Celsius",
        "C": "In November",
        "D": "When driving on motorways"
      },
      "category": "Vehicle Handling",
      "explanation": "Winter tyres provide better grip when temperatures drop below 7\u00b0C. They improve braking and handling in cold wet and icy conditions."
    },
    {
      "q": "What does a maroon and yellow sign indicate on a motorway?",
      "a": "A",
      "options": {
        "A": "Tourist attraction",
        "B": "Services ahead",
        "C": "Airport",
        "D": "Industrial estate"
      },
      "category": "Road Signs",
      "explanation": "Brown or maroon signs with yellow text indicate tourist attractions. They help visitors find places of interest without using navigation devices."
    },
    {
      "q": "What should you do if you see an ambulance in your rear view mirror with sirens on?",
      "a": "C",
      "options": {
        "A": "Speed up",
        "B": "Stop immediately",
        "C": "Move over safely when possible to let it pass",
        "D": "Ignore it"
      },
      "category": "Rules of the Road",
      "explanation": "Move over safely when possible to let emergency vehicles pass. Do not mount pavements or go through red lights to do so."
    },
    {
      "q": "What is the correct procedure when joining a motorway from a slip road?",
      "a": "B",
      "options": {
        "A": "Stop and wait for a gap",
        "B": "Build up speed on the slip road and merge with traffic",
        "C": "Use the hard shoulder",
        "D": "Force your way in"
      },
      "category": "Motorway Rules",
      "explanation": "Build up speed on the acceleration lane match motorway traffic speed and merge smoothly. Give way to traffic already on the motorway."
    },
    {
      "q": "When can you use the right hand lane of a three lane motorway?",
      "a": "C",
      "options": {
        "A": "When in a hurry",
        "B": "Always",
        "C": "Only when overtaking",
        "D": "When the left lane is busy"
      },
      "category": "Motorway Rules",
      "explanation": "The right hand lane on a motorway should only be used for overtaking. Return to the left lane as soon as it is safe to do so."
    },
    {
      "q": "What does a sign showing two arrows pointing in opposite directions mean?",
      "a": "A",
      "options": {
        "A": "Two-way traffic ahead",
        "B": "One-way street",
        "C": "No overtaking",
        "D": "Roundabout ahead"
      },
      "category": "Road Signs",
      "explanation": "Two arrows pointing in opposite directions warn that you are about to enter a two-way road after a one-way section."
    },
    {
      "q": "What should you do if a level crossing alarm sounds while you are crossing?",
      "a": "B",
      "options": {
        "A": "Stop on the crossing",
        "B": "Drive quickly off the crossing",
        "C": "Reverse",
        "D": "Sound your horn"
      },
      "category": "Rules of the Road",
      "explanation": "If a level crossing alarm sounds while you are crossing drive off the crossing as quickly as possible. Never stop on a level crossing."
    },
    {
      "q": "What is the rule about using hazard lights while driving?",
      "a": "C",
      "options": {
        "A": "Never use them while moving",
        "B": "Always use them in rain",
        "C": "Use them on a motorway to warn of danger ahead or when broken down",
        "D": "Use them when parking illegally"
      },
      "category": "Rules of the Road",
      "explanation": "On motorways and dual carriageways you can use hazard lights briefly to warn drivers behind of a hazard ahead. Do not use them as an excuse to park illegally."
    },
    {
      "q": "You are driving at 60mph. How many metres does your car travel per second?",
      "a": "B",
      "options": {
        "A": "17 metres",
        "B": "27 metres",
        "C": "33 metres",
        "D": "44 metres"
      },
      "category": "Safety Margins",
      "explanation": "At 60mph your vehicle travels approximately 27 metres every second. This shows why maintaining safe distances is so important."
    },
    {
      "q": "What should you do if your car develops a fault on the motorway?",
      "a": "A",
      "options": {
        "A": "Pull onto the hard shoulder switch on hazard lights get out on the left and call for help",
        "B": "Continue to the next exit",
        "C": "Stop in the left lane",
        "D": "Reverse to the emergency phone"
      },
      "category": "Motorway Rules",
      "explanation": "If your car breaks down on a motorway pull onto the hard shoulder as far left as possible. Switch on hazard lights exit from the left door and call from an emergency phone."
    },
    {
      "q": "What does a pedestrian crossing with green and yellow stripes mean?",
      "a": "C",
      "options": {
        "A": "School crossing",
        "B": "Pelican crossing",
        "C": "There is no such crossing",
        "D": "Cycle crossing"
      },
      "category": "Road Signs",
      "explanation": "There is no crossing with green and yellow stripes. UK crossings are: zebra (black and white), pelican (traffic lights), toucan (cyclists too), puffin, pegasus."
    },
    {
      "q": "What is the maximum blood alcohol concentration for drivers under 20 in Scotland?",
      "a": "D",
      "options": {
        "A": "80mg",
        "B": "50mg",
        "C": "35mg",
        "D": "Scotland has a lower limit of 50mg for all drivers"
      },
      "category": "Rules of the Road",
      "explanation": "Scotland has a lower drink drive limit of 50mg of alcohol per 100ml of blood compared to 80mg in England and Wales."
    },
    {
      "q": "What does a sign showing a bicycle in a red circle mean?",
      "a": "A",
      "options": {
        "A": "No cycling allowed",
        "B": "Cyclists must use this route",
        "C": "Cycle lane ahead",
        "D": "Shared pedestrian and cycle path"
      },
      "category": "Road Signs",
      "explanation": "A red circle with a bicycle means cycling is prohibited in that area \u2014 for example in certain pedestrian zones."
    },
    {
      "q": "What must you do if an animal runs into the road?",
      "a": "B",
      "options": {
        "A": "Sound horn and continue",
        "B": "Try to stop safely without causing danger to other road users",
        "C": "Swerve to avoid",
        "D": "Speed up"
      },
      "category": "Hazard Awareness",
      "explanation": "If an animal runs into the road try to stop safely. Never swerve violently as you could lose control or hit other vehicles or pedestrians."
    },
    {
      "q": "What does a blue rectangle sign with a P mean?",
      "a": "C",
      "options": {
        "A": "Police station",
        "B": "Post office",
        "C": "Parking area",
        "D": "Petrol station"
      },
      "category": "Road Signs",
      "explanation": "A blue rectangle with a white P indicates a parking area or car park."
    },
    {
      "q": "What should you do at a crossroads where neither road has priority?",
      "a": "A",
      "options": {
        "A": "Give way to traffic approaching from the right",
        "B": "Give way to larger vehicles",
        "C": "Sound horn and proceed",
        "D": "The first vehicle to arrive goes first"
      },
      "category": "Rules of the Road",
      "explanation": "At an unmarked crossroads where neither road has priority give way to traffic coming from the right. Proceed with caution."
    },
    {
      "q": "What does it mean when the road narrows on one side only?",
      "a": "B",
      "options": {
        "A": "Both vehicles must stop",
        "B": "Oncoming vehicles have priority \u2014 wait in a passing place if needed",
        "C": "You have priority",
        "D": "Overtaking is allowed"
      },
      "category": "Road Signs",
      "explanation": "On narrow roads where there are passing places let oncoming vehicles pass. If a passing place is on your side pull into it."
    },
    {
      "q": "What is the penalty for failing to wear a seatbelt?",
      "a": "C",
      "options": {
        "A": "Warning only",
        "B": "\u00a3100 fine",
        "C": "Up to \u00a3500 fine",
        "D": "3 penalty points"
      },
      "category": "Vehicle Safety",
      "explanation": "Failing to wear a seatbelt carries a fine of up to \u00a3500. The driver is also responsible for ensuring children under 14 wear seatbelts."
    },
    {
      "q": "Who is responsible for making sure passengers under 14 wear seatbelts?",
      "a": "A",
      "options": {
        "A": "The driver",
        "B": "The passenger themselves",
        "C": "The parents only",
        "D": "No one legally"
      },
      "category": "Vehicle Safety",
      "explanation": "The driver is legally responsible for ensuring all passengers under 14 wear appropriate seatbelts or child restraints."
    },
    {
      "q": "At what age does a child no longer need a child car seat?",
      "a": "B",
      "options": {
        "A": "When they turn 10",
        "B": "When they are 135cm tall or 12 years old whichever comes first",
        "C": "When they are 10 years old",
        "D": "When they weigh 36kg"
      },
      "category": "Vehicle Safety",
      "explanation": "Children must use a child car seat until they are 135cm tall or 12 years old whichever comes first. After that they use an adult seatbelt."
    },
    {
      "q": "What is the purpose of a catalytic converter?",
      "a": "C",
      "options": {
        "A": "Increase power",
        "B": "Reduce noise",
        "C": "Convert harmful exhaust gases into less harmful ones",
        "D": "Improve fuel economy"
      },
      "category": "Vehicle Safety",
      "explanation": "A catalytic converter uses chemical reactions to convert harmful exhaust gases such as carbon monoxide and nitrogen oxides into less harmful substances."
    },
    {
      "q": "What should you do before changing lanes?",
      "a": "B",
      "options": {
        "A": "Just look in the mirror",
        "B": "Check mirrors signal and check blind spots",
        "C": "Signal only",
        "D": "Sound horn"
      },
      "category": "Rules of the Road",
      "explanation": "Before changing lanes use the MSM routine \u2014 Mirrors Signal Manoeuvre. Also check your blind spots as mirrors cannot show everything."
    },
    {
      "q": "What is a clearway?",
      "a": "A",
      "options": {
        "A": "A road where stopping is not permitted during certain hours",
        "B": "A cycle path",
        "C": "A motorway",
        "D": "A bus route"
      },
      "category": "Rules of the Road",
      "explanation": "A clearway is a road where stopping is prohibited during certain hours shown on signs. This keeps traffic flowing at busy times."
    },
    {
      "q": "What does a sign with a bed and a moon mean?",
      "a": "C",
      "options": {
        "A": "No overnight parking",
        "B": "Hotel ahead",
        "C": "Tiredness area \u2014 drivers should rest",
        "D": "Camping site"
      },
      "category": "Road Signs",
      "explanation": "A sign showing a bed and moon warns of a risk of tiredness. It advises drivers to take a break especially on long motorway journeys."
    },
    {
      "q": "What is the purpose of white lines across the road at a junction?",
      "a": "B",
      "options": {
        "A": "Decoration",
        "B": "To indicate where you must stop or give way",
        "C": "To mark pedestrian areas",
        "D": "To mark cycle lanes"
      },
      "category": "Road Signs",
      "explanation": "White lines across a road at a junction are either stop lines (solid) or give way lines (broken). You must obey them when emerging."
    },
    {
      "q": "What does a sign showing a lorry on a slope mean?",
      "a": "A",
      "options": {
        "A": "Steep hill ahead \u2014 lorries should use low gear",
        "B": "Lorry park ahead",
        "C": "No lorries",
        "D": "Lorry weighing station"
      },
      "category": "Road Signs",
      "explanation": "A sign showing a lorry on a slope warns of a steep hill ahead. Lorries should engage low gear to maintain control on the descent."
    },
    {
      "q": "When must you not overtake?",
      "a": "D",
      "options": {
        "A": "On dual carriageways",
        "B": "At night",
        "C": "In rain",
        "D": "On a hill near the brow where you cannot see ahead"
      },
      "category": "Rules of the Road",
      "explanation": "Never overtake on or near the brow of a hill where your view ahead is limited. You cannot see oncoming traffic and it is extremely dangerous."
    },
    {
      "q": "What is a soft verge?",
      "a": "C",
      "options": {
        "A": "A grass roundabout",
        "B": "A cycle path",
        "C": "The area at the side of the road that may be soft and boggy",
        "D": "A road shoulder"
      },
      "category": "Vehicle Handling",
      "explanation": "A soft verge is the grassy area at the side of the road. It may be soft or boggy and vehicles can sink if they drive on it."
    },
    {
      "q": "What does a sign showing two cars side by side with an X mean?",
      "a": "B",
      "options": {
        "A": "Passing place",
        "B": "No overtaking",
        "C": "Two lanes merge",
        "D": "Dual carriageway ahead"
      },
      "category": "Road Signs",
      "explanation": "A circular red sign with two cars side by side means no overtaking. You must not pass the vehicle in front until the sign ends."
    },
    {
      "q": "What is coasting in driving?",
      "a": "A",
      "options": {
        "A": "Driving with the clutch depressed or in neutral reducing engine braking",
        "B": "Driving downhill with no brakes",
        "C": "Driving at a constant speed",
        "D": "Driving with handbrake on"
      },
      "category": "Vehicle Handling",
      "explanation": "Coasting means driving with the clutch depressed or in neutral. It reduces control especially on descents as you lose engine braking."
    },
    {
      "q": "What road marking indicates you must not park at any time?",
      "a": "C",
      "options": {
        "A": "Single yellow line",
        "B": "Broken yellow line",
        "C": "Double yellow lines",
        "D": "White line at kerb"
      },
      "category": "Rules of the Road",
      "explanation": "Double yellow lines at the edge of the road mean no parking at any time regardless of day or hour."
    },
    {
      "q": "What should you do if you feel drowsy while driving on a motorway?",
      "a": "B",
      "options": {
        "A": "Open the window and continue",
        "B": "Pull into the next service area take caffeine and rest for at least 15 minutes",
        "C": "Turn up the radio",
        "D": "Slow down and continue"
      },
      "category": "Alertness",
      "explanation": "If drowsy on a motorway pull into a service area drink two cups of coffee and rest for at least 15 minutes before continuing. Never pull over on the hard shoulder to sleep."
    },
    {
      "q": "What should you do if you are dazzled by oncoming headlights?",
      "a": "A",
      "options": {
        "A": "Slow down and look to the left edge of the road",
        "B": "Flash your lights at them",
        "C": "Close your eyes briefly",
        "D": "Speed up to pass quickly"
      },
      "category": "Alertness",
      "explanation": "If dazzled by oncoming lights slow down look to the left edge of the road and if necessary stop safely. Never flash your lights in retaliation."
    },
    {
      "q": "What is the purpose of a warning triangle?",
      "a": "C",
      "options": {
        "A": "To mark your parking space",
        "B": "To signal for help",
        "C": "To warn other drivers of a broken down or stationary vehicle",
        "D": "For decoration"
      },
      "category": "Vehicle Safety",
      "explanation": "A warning triangle should be placed at least 45 metres behind a broken down vehicle on a normal road to warn approaching drivers. Do not use on motorways."
    },
    {
      "q": "What gear should you use when driving down a steep hill?",
      "a": "B",
      "options": {
        "A": "Neutral",
        "B": "A low gear to use engine braking",
        "C": "The highest gear",
        "D": "Any gear"
      },
      "category": "Vehicle Handling",
      "explanation": "Engage a low gear before descending a steep hill. Engine braking helps control your speed reducing reliance on brakes which can overheat."
    },
    {
      "q": "What does a diversion route sign look like?",
      "a": "A",
      "options": {
        "A": "Black symbols on yellow background",
        "B": "White on blue",
        "C": "Green on white",
        "D": "Red on white"
      },
      "category": "Road Signs",
      "explanation": "Diversion routes are shown with black symbols (square triangle diamond circle) on yellow backgrounds guiding traffic around road closures."
    },
    {
      "q": "What is the purpose of road humps?",
      "a": "C",
      "options": {
        "A": "To test car suspension",
        "B": "To mark junctions",
        "C": "To slow traffic in residential areas",
        "D": "For cyclists"
      },
      "category": "Road Signs",
      "explanation": "Road humps (speed bumps) are used in residential areas to slow traffic and improve safety for pedestrians especially children."
    },
    {
      "q": "What should you do if your accelerator pedal sticks?",
      "a": "B",
      "options": {
        "A": "Brake hard",
        "B": "Keep control steer to safety switch off ignition and put in neutral",
        "C": "Jump out",
        "D": "Sound horn"
      },
      "category": "Vehicle Handling",
      "explanation": "If the accelerator sticks keep control and steer safely. Try to free it with your foot. Put in neutral to cut power and switch off the ignition when safe."
    },
    {
      "q": "What is 'defensive driving'?",
      "a": "A",
      "options": {
        "A": "Anticipating hazards early and planning ahead to avoid danger",
        "B": "Driving slowly",
        "C": "Staying in the slow lane",
        "D": "Never overtaking"
      },
      "category": "Attitude",
      "explanation": "Defensive driving means anticipating potential hazards before they develop planning ahead and being ready to take avoiding action safely."
    },
    {
      "q": "When approaching a zebra crossing with someone waiting what must you do?",
      "a": "C",
      "options": {
        "A": "Continue at normal speed",
        "B": "Flash lights to let them cross",
        "C": "Slow down and be prepared to stop and give way",
        "D": "Sound horn"
      },
      "category": "Hazard Awareness",
      "explanation": "Slow down as you approach a zebra crossing if someone is waiting. You must give way once they step onto the crossing."
    },
    {
      "q": "What is the national speed limit sign?",
      "a": "B",
      "options": {
        "A": "White circle with black diagonal line",
        "B": "White circle with black diagonal stripe",
        "C": "Blue circle with diagonal stripe",
        "D": "Yellow circle with stripe"
      },
      "category": "Road Signs",
      "explanation": "The national speed limit sign is a white circular sign with a black diagonal stripe. It means the national speed limit applies for that type of road."
    },
    {
      "q": "What does a sign showing a man digging mean?",
      "a": "A",
      "options": {
        "A": "Roadworks ahead",
        "B": "Digging prohibited",
        "C": "Soft ground",
        "D": "Gas works"
      },
      "category": "Road Signs",
      "explanation": "A sign showing a man digging warns of roadworks ahead. Reduce speed obey any temporary speed limits and watch for workers."
    },
    {
      "q": "What does a sign showing a slippery road (car with wavy lines) warn of?",
      "a": "C",
      "options": {
        "A": "Flooding",
        "B": "Ice only",
        "C": "Slippery road surface",
        "D": "Road repairs"
      },
      "category": "Road Signs",
      "explanation": "The slippery road sign warns that the road surface ahead may be slippery due to ice mud wet leaves or recent road works. Reduce speed."
    },
    {
      "q": "What is a box junction and when can you enter one?",
      "a": "B",
      "options": {
        "A": "Any time",
        "B": "Only when your exit road is clear \u2014 except when turning right",
        "C": "Never",
        "D": "When no traffic is coming"
      },
      "category": "Rules of the Road",
      "explanation": "A box junction has yellow cross-hatching. Enter only when your exit is clear. Exception: you may wait in the box when turning right if only oncoming traffic or pedestrians stop you."
    },
    {
      "q": "What should you do if you see a horse and rider on the road ahead?",
      "a": "A",
      "options": {
        "A": "Slow to a walk pass wide and be ready to stop on the rider's signal",
        "B": "Sound horn to warn them",
        "C": "Flash lights",
        "D": "Speed up to pass quickly"
      },
      "category": "Vulnerable Road Users",
      "explanation": "Approach horses at walking pace give plenty of room and be ready to stop. Never use horn or make sudden movements near horses."
    },
    {
      "q": "When driving in a built-up area at night should you use full beam?",
      "a": "B",
      "options": {
        "A": "Always",
        "B": "No \u2014 use dipped headlights as full beam dazzles other road users",
        "C": "Only on empty roads",
        "D": "Only in rain"
      },
      "category": "Rules of the Road",
      "explanation": "In built-up areas always use dipped headlights even at night. Full beam dazzles pedestrians and other drivers. Street lighting usually provides enough visibility."
    },
    {
      "q": "What does it mean to be in the right gear?",
      "a": "C",
      "options": {
        "A": "Always using 5th gear",
        "B": "Using the highest gear possible",
        "C": "Using the gear appropriate for your speed and conditions",
        "D": "Staying in 3rd gear"
      },
      "category": "Vehicle Handling",
      "explanation": "Being in the right gear means using a gear appropriate for your speed road conditions and the power needed. This improves control and fuel efficiency."
    },
    {
      "q": "What is the effect of alcohol on driving?",
      "a": "A",
      "options": {
        "A": "It slows reactions impairs judgement and affects vision coordination and concentration",
        "B": "It improves confidence and reaction time",
        "C": "It has no effect in small amounts",
        "D": "It only affects vision"
      },
      "category": "Rules of the Road",
      "explanation": "Even small amounts of alcohol slow your reactions impair judgement affect coordination and vision and increase risk-taking behaviour."
    },
    {
      "q": "What is the best way to increase fuel efficiency?",
      "a": "B",
      "options": {
        "A": "Drive faster to get to destination quickly",
        "B": "Accelerate gently maintain steady speed and anticipate stops",
        "C": "Keep windows open",
        "D": "Use lower gears"
      },
      "category": "Vehicle Safety",
      "explanation": "Smooth driving \u2014 gentle acceleration maintaining steady speeds and anticipating stops \u2014 significantly reduces fuel consumption and emissions."
    },
    {
      "q": "What is a tachograph?",
      "a": "C",
      "options": {
        "A": "A vehicle speed limiter",
        "B": "An engine management system",
        "C": "A device that records the speed and driving time of a vehicle",
        "D": "A fuel monitor"
      },
      "category": "Documents",
      "explanation": "A tachograph records the speed and driving hours of commercial vehicles. It ensures drivers comply with rest period laws reducing fatigue-related accidents."
    },
    {
      "q": "What does the word COAST stand for when doing vehicle checks?",
      "a": "A",
      "options": {
        "A": "Controls Oil Acetylene Safety belts Tyres",
        "B": "Clutch Oil Acceleration Seatbelts Tyres",
        "C": "Controls Oil Alternator Seatbelts Tyres",
        "D": "Coolant Oil Air Seatbelts Tyres"
      },
      "category": "Vehicle Safety",
      "explanation": "COAST is a helpful acronym for vehicle checks: Controls Oil Accelerator Seatbelts Tyres \u2014 reminding drivers what to check before setting off."
    },
    {
      "q": "What is the legal requirement for headlights on a vehicle?",
      "a": "C",
      "options": {
        "A": "Only front lights needed",
        "B": "Only rear lights needed",
        "C": "Both front and rear lights must work and be clean",
        "D": "No legal requirement"
      },
      "category": "Vehicle Safety",
      "explanation": "All lights including front rear brake and indicators must be clean working and properly adjusted. Dirty or faulty lights are an MOT failure."
    },
    {
      "q": "What is the purpose of a speed limiter?",
      "a": "B",
      "options": {
        "A": "To reduce fuel use",
        "B": "A device that prevents a vehicle exceeding a set maximum speed",
        "C": "To help braking",
        "D": "To improve acceleration"
      },
      "category": "Vehicle Safety",
      "explanation": "A speed limiter is a device fitted to vehicles that prevents them exceeding a set maximum speed. It is mandatory on some commercial vehicles."
    },
    {
      "q": "What does a speed awareness course do?",
      "a": "A",
      "options": {
        "A": "It is offered as an alternative to penalty points for minor speeding offences",
        "B": "It teaches advanced driving",
        "C": "It is compulsory after any accident",
        "D": "It replaces the driving test"
      },
      "category": "Rules of the Road",
      "explanation": "A speed awareness course may be offered for minor speeding offences instead of penalty points and a fine. It costs a similar amount but no points are added."
    },
    {
      "q": "What is the purpose of the driving theory test?",
      "a": "C",
      "options": {
        "A": "To test practical driving skills",
        "B": "To test knowledge of the Highway Code",
        "C": "To test knowledge of road signs rules and hazard perception",
        "D": "To test vehicle maintenance"
      },
      "category": "Documents",
      "explanation": "The theory test has two parts: multiple choice questions testing Highway Code knowledge and a hazard perception test. Both must be passed before taking the practical test."
    },
    {
      "q": "How many questions are in the theory test?",
      "a": "B",
      "options": {
        "A": "40",
        "B": "50",
        "C": "60",
        "D": "70"
      },
      "category": "Documents",
      "explanation": "The theory test contains 50 multiple choice questions. You need to answer at least 43 correctly (86%) to pass. There is also a hazard perception element."
    },
    {
      "q": "What score do you need to pass the theory test?",
      "a": "C",
      "options": {
        "A": "40 out of 50",
        "B": "42 out of 50",
        "C": "43 out of 50",
        "D": "45 out of 50"
      },
      "category": "Documents",
      "explanation": "You need to score at least 43 out of 50 (86%) in the multiple choice section to pass the theory test. You also need to pass the hazard perception section."
    },
    {
      "q": "How much does the driving theory test cost?",
      "a": "B",
      "options": {
        "A": "\u00a315",
        "B": "\u00a323",
        "C": "\u00a335",
        "D": "\u00a350"
      },
      "category": "Documents",
      "explanation": "The driving theory test costs \u00a323. The practical driving test costs \u00a362 on a weekday or \u00a375 in the evening weekend or bank holiday."
    },
    {
      "q": "How long is a theory test pass certificate valid?",
      "a": "C",
      "options": {
        "A": "1 year",
        "B": "18 months",
        "C": "2 years",
        "D": "3 years"
      },
      "category": "Documents",
      "explanation": "A theory test pass certificate is valid for 2 years. If you do not pass your practical test within 2 years you must retake the theory test."
    },
    {
      "q": "What do you need to bring to your theory test?",
      "a": "A",
      "options": {
        "A": "Your photocard driving licence",
        "B": "Your passport only",
        "C": "Your birth certificate",
        "D": "Proof of address"
      },
      "category": "Documents",
      "explanation": "You must bring your photocard driving licence to the theory test. Without valid ID you will not be allowed to take the test."
    },
    {
      "q": "What is a provisional driving licence?",
      "a": "B",
      "options": {
        "A": "A full driving licence",
        "B": "A licence allowing you to learn to drive on public roads when supervised",
        "C": "A temporary licence for emergencies",
        "D": "An international licence"
      },
      "category": "Documents",
      "explanation": "A provisional driving licence allows you to drive on public roads while learning. You must be accompanied by a qualified driver aged 21+ who has held a full licence for 3+ years."
    },
    {
      "q": "What must L plates show?",
      "a": "C",
      "options": {
        "A": "Red L on green background",
        "B": "White L on blue background",
        "C": "Red L on white background",
        "D": "Black L on yellow background"
      },
      "category": "Documents",
      "explanation": "L plates must show a red letter L on a white background. They must be displayed at the front and rear of the vehicle when a learner is driving."
    },
    {
      "q": "Can a learner driver use a mobile phone hands-free?",
      "a": "D",
      "options": {
        "A": "Yes always",
        "B": "Yes if supervising driver approves",
        "C": "Only for navigation",
        "D": "No \u2014 the same rules apply as for full licence holders"
      },
      "category": "Rules of the Road",
      "explanation": "The same mobile phone laws apply to learner drivers as to full licence holders. Hands-free is technically allowed but can be distracting and is not recommended."
    },
    {
      "q": "What happens if you get 6 points in your first 2 years of driving?",
      "a": "A",
      "options": {
        "A": "Your licence is revoked and you must retake both tests",
        "B": "You get a warning",
        "C": "You pay a fine only",
        "D": "You are banned for 6 months"
      },
      "category": "Documents",
      "explanation": "New drivers who get 6 or more penalty points within 2 years of passing have their licence revoked. They must reapply for a provisional licence and retake both tests."
    },
    {
      "q": "What is the Pass Plus scheme?",
      "a": "C",
      "options": {
        "A": "An advanced driving test",
        "B": "A theory test revision course",
        "C": "A practical course for new drivers covering motorways night driving and other scenarios",
        "D": "A driving instructor qualification"
      },
      "category": "Documents",
      "explanation": "Pass Plus is a practical training course for new drivers covering motorway driving night driving rural roads dual carriageways town driving and all weather driving."
    },
    {
      "q": "When should you use your rear fog lights?",
      "a": "B",
      "options": {
        "A": "In rain",
        "B": "When visibility is less than 100 metres",
        "C": "At night always",
        "D": "On motorways only"
      },
      "category": "Rules of the Road",
      "explanation": "Rear fog lights should only be used when visibility is seriously reduced \u2014 less than 100 metres. Turn them off when visibility improves as they dazzle following drivers."
    },
    {
      "q": "What is the difference between fog lights and standard headlights?",
      "a": "A",
      "options": {
        "A": "Fog lights are positioned lower and project light at a wider angle cutting through fog",
        "B": "Fog lights are brighter",
        "C": "There is no difference",
        "D": "Fog lights are only for the front"
      },
      "category": "Rules of the Road",
      "explanation": "Fog lights are mounted lower on the vehicle and project light at a wider downward angle to illuminate the road without reflecting back off the fog."
    },
    {
      "q": "What should you do if a fire engine is at the scene of an accident?",
      "a": "C",
      "options": {
        "A": "Drive through slowly",
        "B": "Sound horn",
        "C": "Follow any signals from emergency personnel and be prepared to stop",
        "D": "Take an alternate route only if convenient"
      },
      "category": "Rules of the Road",
      "explanation": "At accident scenes follow directions from emergency personnel. Be prepared to stop and leave space for emergency vehicles to operate."
    },
    {
      "q": "What is the correct way to use a roundabout?",
      "a": "B",
      "options": {
        "A": "Always go around it twice to be sure",
        "B": "Give way to vehicles on the roundabout from your right signal when changing lanes and exit correctly",
        "C": "The largest vehicle has priority",
        "D": "Speed through to minimise disruption"
      },
      "category": "Rules of the Road",
      "explanation": "At roundabouts give way to traffic from the right use the correct lane signal when changing lanes or exiting and watch for cyclists and motorcyclists."
    },
    {
      "q": "What does it mean when a traffic warden displays a ticket on your car?",
      "a": "A",
      "options": {
        "A": "You have received a Penalty Charge Notice for a parking violation",
        "B": "Your car has been reported stolen",
        "C": "Your vehicle will be towed",
        "D": "You have a fine to pay at the police station"
      },
      "category": "Rules of the Road",
      "explanation": "A Penalty Charge Notice (PCN) from a traffic warden or parking attendant means you have parked in violation of local parking rules. Pay within 14 days for a discount."
    },
    {
      "q": "What is the DVLA?",
      "a": "C",
      "options": {
        "A": "The Driver and Vehicle Licensing Agency",
        "B": "A private driving test company",
        "C": "Driver and Vehicle Licensing Agency \u2014 the government body managing driving licences and vehicle registration",
        "D": "The Department for Vehicle Law and Administration"
      },
      "category": "Documents",
      "explanation": "The DVLA (Driver and Vehicle Licensing Agency) maintains registers of drivers and vehicles issues driving licences and collects Vehicle Excise Duty."
    },
    {
      "q": "What is Vehicle Excise Duty?",
      "a": "B",
      "options": {
        "A": "MOT fee",
        "B": "Road tax \u2014 a tax on vehicles using public roads based on emissions",
        "C": "Fuel tax",
        "D": "Insurance levy"
      },
      "category": "Documents",
      "explanation": "Vehicle Excise Duty (VED or road tax) is a tax paid on most vehicles kept or driven on public roads. The rate is based on CO2 emissions for newer vehicles."
    },
    {
      "q": "What should you do if you are involved in an accident involving a dog?",
      "a": "A",
      "options": {
        "A": "Stop and report it to the police",
        "B": "Leave a note only",
        "C": "Continue driving",
        "D": "Only report it if the dog is injured"
      },
      "category": "Accidents",
      "explanation": "You must report accidents involving dogs (and certain other animals including horses cattle sheep pigs goats deer) to the police. You do not have to report cats."
    },
    {
      "q": "What is the correct response to a car on fire in a tunnel?",
      "a": "C",
      "options": {
        "A": "Try to put it out yourself",
        "B": "Continue driving past",
        "C": "Move to a safe area sound the alarm call emergency services and follow evacuation signs",
        "D": "Wait in your car"
      },
      "category": "Accidents",
      "explanation": "In a tunnel fire move to a safe area away from smoke. Activate the alarm call emergency services follow evacuation signs and escape on foot if necessary."
    },
    {
      "q": "What does the letter E on a green sign indicate?",
      "a": "B",
      "options": {
        "A": "Emergency route",
        "B": "The road forms part of a European route",
        "C": "Exit",
        "D": "Electric vehicle charging"
      },
      "category": "Road Signs",
      "explanation": "An E followed by a number on a green primary route sign indicates the road forms part of a European E-road network."
    },
    {
      "q": "What is an Intelligent Speed Assistance system?",
      "a": "A",
      "options": {
        "A": "A vehicle system that reads speed limit signs and warns or assists the driver to comply",
        "B": "A GPS system",
        "C": "A traffic management system",
        "D": "An automatic emergency braking system"
      },
      "category": "Vehicle Safety",
      "explanation": "Intelligent Speed Assistance (ISA) reads speed limit signs using cameras and GPS and warns the driver or assists in keeping to the limit. It is becoming standard on new vehicles."
    },
    {
      "q": "What is autonomous emergency braking?",
      "a": "C",
      "options": {
        "A": "A type of handbrake",
        "B": "A braking system for use in fog",
        "C": "A system that automatically applies brakes if a collision is detected",
        "D": "A manual braking technique"
      },
      "category": "Vehicle Safety",
      "explanation": "Autonomous Emergency Braking (AEB) automatically applies the brakes if it detects an imminent collision. It can significantly reduce collision severity or prevent them entirely."
    },
    {
      "q": "What is a smart motorway?",
      "a": "B",
      "options": {
        "A": "A motorway with electronic tolls",
        "B": "A motorway using technology to manage traffic flow sometimes using the hard shoulder as a running lane",
        "C": "A motorway for electric vehicles",
        "D": "A motorway with variable speed limits only"
      },
      "category": "Motorway Rules",
      "explanation": "Smart motorways use technology to manage traffic flow. They may use the hard shoulder as a running lane (with refuge areas) and have variable speed limits displayed on gantries."
    },
    {
      "q": "What is a refuge area on a smart motorway?",
      "a": "A",
      "options": {
        "A": "A marked area to stop in an emergency when there is no hard shoulder",
        "B": "A rest area",
        "C": "A police checkpoint",
        "D": "An area for maintenance vehicles"
      },
      "category": "Motorway Rules",
      "explanation": "On all-lane running smart motorways refuge areas replace the hard shoulder as emergency stopping places. They are marked with orange surfacing and SOS phones."
    },
    {
      "q": "What should you do if you break down on a smart motorway with no hard shoulder?",
      "a": "C",
      "options": {
        "A": "Stop in the left lane and switch on hazard lights",
        "B": "Continue to the next exit",
        "C": "Try to reach a refuge area emergency area or exit and call 999 if unable to move",
        "D": "Push the car to safety"
      },
      "category": "Motorway Rules",
      "explanation": "If you break down on a smart motorway with no hard shoulder get to a refuge area or exit. If you cannot move switch on hazard lights stay in vehicle with seatbelt on and call 999."
    },
    {
      "q": "What colour is a cycle lane marking?",
      "a": "B",
      "options": {
        "A": "White",
        "B": "Green or white",
        "C": "Yellow",
        "D": "Blue"
      },
      "category": "Road Signs",
      "explanation": "Cycle lanes are usually marked with white lines. Some areas use green surfacing to highlight cycle areas at junctions. The word CYCLE or a bicycle symbol may also be present."
    },
    {
      "q": "What must you do when you pass a cyclist?",
      "a": "A",
      "options": {
        "A": "Give at least 1.5 metres of space and more at higher speeds",
        "B": "Sound horn to warn them",
        "C": "Pass as close as the road allows",
        "D": "Flash lights before passing"
      },
      "category": "Vulnerable Road Users",
      "explanation": "Pass cyclists with at least 1.5 metres of space. At higher speeds give more room. The Highway Code uses the term 'safe and reasonable distance'."
    }
  ],
  "life_in_uk": [
    {
      "q": "What is the capital city of England?",
      "a": "A",
      "options": {
        "A": "London",
        "B": "Manchester",
        "C": "Birmingham",
        "D": "Leeds"
      },
      "category": "The UK",
      "explanation": "London is the capital city of England and the United Kingdom. It has been the capital for over 1000 years."
    },
    {
      "q": "How many countries make up the United Kingdom?",
      "a": "C",
      "options": {
        "A": "2",
        "B": "3",
        "C": "4",
        "D": "5"
      },
      "category": "The UK",
      "explanation": "The United Kingdom is made up of 4 countries: England, Scotland, Wales and Northern Ireland."
    },
    {
      "q": "What is the currency of the United Kingdom?",
      "a": "C",
      "options": {
        "A": "Euro",
        "B": "Dollar",
        "C": "Pound Sterling",
        "D": "Franc"
      },
      "category": "The UK",
      "explanation": "The currency of the UK is the Pound Sterling (\u00a3). The UK did not join the Euro currency."
    },
    {
      "q": "What is the national flower of England?",
      "a": "D",
      "options": {
        "A": "Daffodil",
        "B": "Thistle",
        "C": "Shamrock",
        "D": "Tudor Rose"
      },
      "category": "The UK",
      "explanation": "The Tudor Rose is the national flower of England. The daffodil is Wales the thistle is Scotland and the shamrock is Northern Ireland."
    },
    {
      "q": "What is the national flower of Scotland?",
      "a": "B",
      "options": {
        "A": "Rose",
        "B": "Thistle",
        "C": "Daffodil",
        "D": "Shamrock"
      },
      "category": "The UK",
      "explanation": "The thistle is the national flower of Scotland. Legend says it helped warn Scottish soldiers of a Viking attack."
    },
    {
      "q": "What is the national flower of Wales?",
      "a": "C",
      "options": {
        "A": "Rose",
        "B": "Thistle",
        "C": "Daffodil",
        "D": "Shamrock"
      },
      "category": "The UK",
      "explanation": "The daffodil is the national flower of Wales. Wales also uses the leek as a national symbol."
    },
    {
      "q": "What is the capital of Scotland?",
      "a": "B",
      "options": {
        "A": "Glasgow",
        "B": "Edinburgh",
        "C": "Aberdeen",
        "D": "Dundee"
      },
      "category": "The UK",
      "explanation": "Edinburgh is the capital of Scotland. Glasgow is the largest city but Edinburgh is the seat of the Scottish Parliament."
    },
    {
      "q": "What is the capital of Wales?",
      "a": "A",
      "options": {
        "A": "Cardiff",
        "B": "Swansea",
        "C": "Newport",
        "D": "Bangor"
      },
      "category": "The UK",
      "explanation": "Cardiff is the capital of Wales. It has been the capital since 1955 and is home to the Welsh Parliament (Senedd)."
    },
    {
      "q": "What is the capital of Northern Ireland?",
      "a": "B",
      "options": {
        "A": "Londonderry",
        "B": "Belfast",
        "C": "Armagh",
        "D": "Newry"
      },
      "category": "The UK",
      "explanation": "Belfast is the capital of Northern Ireland. It is famous for being where the Titanic was built."
    },
    {
      "q": "In what year did women first get the right to vote in the UK?",
      "a": "A",
      "options": {
        "A": "1918",
        "B": "1928",
        "C": "1945",
        "D": "1900"
      },
      "category": "History",
      "explanation": "In 1918 women over 30 who met property qualifications got the vote. In 1928 all women over 21 got equal voting rights."
    },
    {
      "q": "What was the Magna Carta?",
      "a": "C",
      "options": {
        "A": "The first Parliament",
        "B": "A Roman invasion plan",
        "C": "A charter establishing that the King must obey the law",
        "D": "The first constitution"
      },
      "category": "History",
      "explanation": "The Magna Carta was signed in 1215. It established that even the King had to obey the law \u2014 a fundamental principle of democracy."
    },
    {
      "q": "When was the Magna Carta signed?",
      "a": "B",
      "options": {
        "A": "1066",
        "B": "1215",
        "C": "1314",
        "D": "1415"
      },
      "category": "History",
      "explanation": "The Magna Carta was signed by King John in 1215 at Runnymede. It is one of the most important legal documents in history."
    },
    {
      "q": "Who was the first person to fly an aeroplane in the UK?",
      "a": "B",
      "options": {
        "A": "Isambard Kingdom Brunel",
        "B": "Samuel Cody",
        "C": "Charles Darwin",
        "D": "Isaac Newton"
      },
      "category": "History",
      "explanation": "Samuel Cody made the first aeroplane flight in Britain in 1908 at Farnborough."
    },
    {
      "q": "What year did the Second World War end?",
      "a": "C",
      "options": {
        "A": "1943",
        "B": "1944",
        "C": "1945",
        "D": "1946"
      },
      "category": "History",
      "explanation": "The Second World War ended in 1945. Victory in Europe (VE Day) was May 8th and Victory over Japan (VJ Day) was August 15th."
    },
    {
      "q": "Who was Prime Minister of Britain during most of World War 2?",
      "a": "A",
      "options": {
        "A": "Winston Churchill",
        "B": "Neville Chamberlain",
        "C": "Clement Attlee",
        "D": "Stanley Baldwin"
      },
      "category": "History",
      "explanation": "Winston Churchill became Prime Minister in May 1940 and led Britain through most of World War 2 to victory."
    },
    {
      "q": "When did the Norman Conquest take place?",
      "a": "B",
      "options": {
        "A": "1042",
        "B": "1066",
        "C": "1087",
        "D": "1100"
      },
      "category": "History",
      "explanation": "The Norman Conquest happened in 1066 when William the Conqueror defeated King Harold at the Battle of Hastings."
    },
    {
      "q": "What was the name of the ship that sank in 1912?",
      "a": "C",
      "options": {
        "A": "Lusitania",
        "B": "Britannia",
        "C": "Titanic",
        "D": "Mauretania"
      },
      "category": "History",
      "explanation": "The Titanic sank on April 15 1912 after hitting an iceberg. It was built in Belfast Northern Ireland."
    },
    {
      "q": "Who developed the theory of evolution?",
      "a": "B",
      "options": {
        "A": "Isaac Newton",
        "B": "Charles Darwin",
        "C": "Michael Faraday",
        "D": "Alexander Fleming"
      },
      "category": "History",
      "explanation": "Charles Darwin published On the Origin of Species in 1859 developing the theory of evolution by natural selection."
    },
    {
      "q": "Who discovered penicillin?",
      "a": "A",
      "options": {
        "A": "Alexander Fleming",
        "B": "Edward Jenner",
        "C": "Joseph Lister",
        "D": "James Watson"
      },
      "category": "History",
      "explanation": "Alexander Fleming discovered penicillin in 1928. This led to antibiotics which have saved hundreds of millions of lives."
    },
    {
      "q": "Who is the head of state of the United Kingdom?",
      "a": "B",
      "options": {
        "A": "The Prime Minister",
        "B": "The King or Queen",
        "C": "The Speaker of the House",
        "D": "The Lord Chancellor"
      },
      "category": "Government",
      "explanation": "The head of state is the monarch \u2014 currently King Charles III. The Prime Minister is the head of government."
    },
    {
      "q": "What age can you vote in UK elections?",
      "a": "C",
      "options": {
        "A": "16",
        "B": "17",
        "C": "18",
        "D": "21"
      },
      "category": "Government",
      "explanation": "You must be 18 or over to vote in UK general elections. Scotland and Wales allow 16 year olds to vote in devolved elections."
    },
    {
      "q": "How often must a general election be held in the UK?",
      "a": "C",
      "options": {
        "A": "Every 3 years",
        "B": "Every 4 years",
        "C": "At least every 5 years",
        "D": "Every 6 years"
      },
      "category": "Government",
      "explanation": "Under the Fixed Term Parliaments Act a general election must be held at least every 5 years."
    },
    {
      "q": "What are the two Houses of Parliament?",
      "a": "A",
      "options": {
        "A": "House of Commons and House of Lords",
        "B": "House of Commons and Senate",
        "C": "House of Lords and Cabinet",
        "D": "Parliament and Congress"
      },
      "category": "Government",
      "explanation": "The UK Parliament has two houses: the House of Commons (elected MPs) and the House of Lords (appointed members)."
    },
    {
      "q": "What is the name of the UK Prime Minister's official residence?",
      "a": "B",
      "options": {
        "A": "Buckingham Palace",
        "B": "10 Downing Street",
        "C": "Windsor Castle",
        "D": "Chequers"
      },
      "category": "Government",
      "explanation": "The Prime Minister's official London residence and office is 10 Downing Street in Westminster."
    },
    {
      "q": "What is the House of Commons?",
      "a": "C",
      "options": {
        "A": "Where the King lives",
        "B": "The unelected upper house",
        "C": "The elected lower house of Parliament",
        "D": "The highest court"
      },
      "category": "Government",
      "explanation": "The House of Commons is the elected lower house of Parliament. Members of Parliament (MPs) are elected by the public."
    },
    {
      "q": "What is a constituency?",
      "a": "B",
      "options": {
        "A": "A political party",
        "B": "An area represented by one MP in Parliament",
        "C": "A type of election",
        "D": "A government department"
      },
      "category": "Government",
      "explanation": "A constituency is a geographical area represented by one Member of Parliament. The UK has 650 constituencies."
    },
    {
      "q": "Which party has traditionally been associated with the colour red?",
      "a": "A",
      "options": {
        "A": "Labour",
        "B": "Conservative",
        "C": "Liberal Democrats",
        "D": "Green Party"
      },
      "category": "Government",
      "explanation": "The Labour Party is traditionally associated with red. The Conservatives use blue and Liberal Democrats use yellow."
    },
    {
      "q": "What is devolution?",
      "a": "C",
      "options": {
        "A": "A type of election",
        "B": "When Parliament dissolves",
        "C": "Transfer of powers from central government to regional governments",
        "D": "A political party"
      },
      "category": "Government",
      "explanation": "Devolution is the transfer of powers from the UK Parliament to the Scottish Parliament Welsh Senedd and Northern Ireland Assembly."
    },
    {
      "q": "Which of these is a fundamental principle of British life?",
      "a": "D",
      "options": {
        "A": "Everyone must speak English",
        "B": "All religions are banned",
        "C": "Women cannot work",
        "D": "Democracy and the rule of law"
      },
      "category": "Values",
      "explanation": "Key British values include democracy the rule of law individual liberty and mutual respect and tolerance of different faiths and beliefs."
    },
    {
      "q": "What does the rule of law mean?",
      "a": "B",
      "options": {
        "A": "Police can do anything",
        "B": "Everyone including the government must obey the law",
        "C": "Rich people have more rights",
        "D": "The King makes all laws"
      },
      "category": "Values",
      "explanation": "The rule of law means that everyone including politicians police and the King must obey the law. Nobody is above it."
    },
    {
      "q": "What is the principle of tolerance in British society?",
      "a": "C",
      "options": {
        "A": "Everyone must have the same religion",
        "B": "Only British people have rights",
        "C": "Respect for different faiths beliefs and lifestyles",
        "D": "Everyone must speak the same language"
      },
      "category": "Values",
      "explanation": "Tolerance in Britain means respecting people of different faiths cultures and lifestyles even if you disagree with them."
    },
    {
      "q": "What are universal human rights?",
      "a": "A",
      "options": {
        "A": "Rights that apply to all people regardless of nationality",
        "B": "Rights only for British citizens",
        "C": "Rights for men only",
        "D": "Rights granted by the King"
      },
      "category": "Values",
      "explanation": "Universal human rights apply to all people everywhere regardless of nationality gender race or religion."
    },
    {
      "q": "When is St George's Day celebrated?",
      "a": "C",
      "options": {
        "A": "1st March",
        "B": "17th March",
        "C": "23rd April",
        "D": "30th November"
      },
      "category": "Culture",
      "explanation": "St George's Day (patron saint of England) is celebrated on 23rd April."
    },
    {
      "q": "When is St Andrew's Day celebrated?",
      "a": "D",
      "options": {
        "A": "23rd April",
        "B": "17th March",
        "C": "1st March",
        "D": "30th November"
      },
      "category": "Culture",
      "explanation": "St Andrew's Day (patron saint of Scotland) is celebrated on 30th November."
    },
    {
      "q": "When is St David's Day celebrated?",
      "a": "A",
      "options": {
        "A": "1st March",
        "B": "17th March",
        "C": "23rd April",
        "D": "30th November"
      },
      "category": "Culture",
      "explanation": "St David's Day (patron saint of Wales) is celebrated on 1st March."
    },
    {
      "q": "When is St Patrick's Day celebrated?",
      "a": "B",
      "options": {
        "A": "1st March",
        "B": "17th March",
        "C": "23rd April",
        "D": "30th November"
      },
      "category": "Culture",
      "explanation": "St Patrick's Day (patron saint of Ireland) is celebrated on 17th March."
    },
    {
      "q": "Which sport was invented in England?",
      "a": "C",
      "options": {
        "A": "Basketball",
        "B": "Baseball",
        "C": "Cricket",
        "D": "Ice hockey"
      },
      "category": "Culture",
      "explanation": "Cricket originated in England in the 16th century. It is now played worldwide especially in Commonwealth countries."
    },
    {
      "q": "Where is the home of golf?",
      "a": "B",
      "options": {
        "A": "England",
        "B": "Scotland",
        "C": "Wales",
        "D": "Ireland"
      },
      "category": "Culture",
      "explanation": "Golf originated in Scotland in the 15th century. St Andrews in Scotland is known as the home of golf."
    },
    {
      "q": "What is the name of the horse racing event held annually at Epsom?",
      "a": "A",
      "options": {
        "A": "The Derby",
        "B": "The Grand National",
        "C": "Royal Ascot",
        "D": "Cheltenham Gold Cup"
      },
      "category": "Culture",
      "explanation": "The Derby is a famous horse race held at Epsom Downs in Surrey. The Grand National is held at Aintree."
    },
    {
      "q": "Who wrote Romeo and Juliet?",
      "a": "C",
      "options": {
        "A": "Charles Dickens",
        "B": "Jane Austen",
        "C": "William Shakespeare",
        "D": "Geoffrey Chaucer"
      },
      "category": "Culture",
      "explanation": "William Shakespeare wrote Romeo and Juliet around 1595. He is widely regarded as the greatest writer in the English language."
    },
    {
      "q": "Who wrote Oliver Twist?",
      "a": "A",
      "options": {
        "A": "Charles Dickens",
        "B": "Jane Austen",
        "C": "Thomas Hardy",
        "D": "William Blake"
      },
      "category": "Culture",
      "explanation": "Charles Dickens wrote Oliver Twist in 1837. He is famous for highlighting social injustice in Victorian England."
    },
    {
      "q": "Who painted The Haywain?",
      "a": "B",
      "options": {
        "A": "Turner",
        "B": "Constable",
        "C": "Gainsborough",
        "D": "Hogarth"
      },
      "category": "Culture",
      "explanation": "John Constable painted The Haywain in 1821. It is one of the most famous paintings in British art history."
    },
    {
      "q": "When was the National Health Service (NHS) established?",
      "a": "B",
      "options": {
        "A": "1945",
        "B": "1948",
        "C": "1950",
        "D": "1952"
      },
      "category": "Everyday Life",
      "explanation": "The NHS was established on 5th July 1948 by Health Secretary Aneurin Bevan. It provides free healthcare to all UK residents."
    },
    {
      "q": "What is the NHS based on?",
      "a": "C",
      "options": {
        "A": "Private insurance",
        "B": "Means testing",
        "C": "The principle that healthcare should be free for all at the point of need",
        "D": "Charity"
      },
      "category": "Everyday Life",
      "explanation": "The NHS is based on the principle that good healthcare should be available to all regardless of wealth funded through taxation."
    },
    {
      "q": "Who can use the NHS?",
      "a": "A",
      "options": {
        "A": "Anyone who is ordinarily resident in the UK",
        "B": "Only British citizens",
        "C": "Only those who have paid National Insurance",
        "D": "Only those with a visa"
      },
      "category": "Everyday Life",
      "explanation": "Anyone who is ordinarily resident in the UK can use NHS services. This includes those on valid visas."
    },
    {
      "q": "At what age must children start school in England?",
      "a": "B",
      "options": {
        "A": "4",
        "B": "5",
        "C": "6",
        "D": "7"
      },
      "category": "Everyday Life",
      "explanation": "In England children must start school by the age of 5. Most children start in September of the year they turn 5."
    },
    {
      "q": "Until what age must young people stay in education or training in England?",
      "a": "C",
      "options": {
        "A": "16",
        "B": "17",
        "C": "18",
        "D": "21"
      },
      "category": "Everyday Life",
      "explanation": "In England young people must stay in education or training until the age of 18. This was raised from 16 in 2015."
    },
    {
      "q": "What is a National Insurance number?",
      "a": "B",
      "options": {
        "A": "Your passport number",
        "B": "A unique reference number for tax and benefits purposes",
        "C": "Your NHS number",
        "D": "Your voter registration number"
      },
      "category": "Everyday Life",
      "explanation": "A National Insurance number is a unique reference used for tax National Insurance contributions and benefits. Everyone working in the UK needs one."
    },
    {
      "q": "What is the national minimum wage?",
      "a": "C",
      "options": {
        "A": "The same for all workers",
        "B": "Set by employers",
        "C": "The lowest legal hourly rate employers must pay",
        "D": "Voluntary"
      },
      "category": "Everyday Life",
      "explanation": "The national minimum wage is the legal minimum employers must pay. Different rates apply for different age groups."
    },
    {
      "q": "What is a Citizen's Advice Bureau?",
      "a": "A",
      "options": {
        "A": "A charity providing free advice on legal financial and other problems",
        "B": "A government office",
        "C": "An immigration office",
        "D": "A police station"
      },
      "category": "Community",
      "explanation": "Citizens Advice is a charity providing free confidential advice on issues including benefits employment housing and legal matters."
    },
    {
      "q": "What is a Magistrates Court?",
      "a": "B",
      "options": {
        "A": "The highest court in the land",
        "B": "A court that deals with minor criminal offences",
        "C": "A civil court",
        "D": "An immigration court"
      },
      "category": "Community",
      "explanation": "Magistrates Courts deal with minor criminal cases. More serious cases go to the Crown Court. Magistrates are volunteers not judges."
    },
    {
      "q": "What are the two main political parties in the UK?",
      "a": "C",
      "options": {
        "A": "Republican and Democrat",
        "B": "Green and UKIP",
        "C": "Conservative and Labour",
        "D": "Liberal and National"
      },
      "category": "Government",
      "explanation": "The two main political parties in the UK are the Conservative Party (Tories) and the Labour Party. Other parties include Liberal Democrats SNP and Greens."
    },
    {
      "q": "What is the role of a Member of Parliament?",
      "a": "B",
      "options": {
        "A": "To run local councils",
        "B": "To represent their constituency in Parliament and vote on laws",
        "C": "To enforce the law",
        "D": "To collect taxes"
      },
      "category": "Government",
      "explanation": "MPs represent their constituency debate and vote on laws raise local issues in Parliament and help constituents with problems."
    },
    {
      "q": "What is Ben Nevis?",
      "a": "A",
      "options": {
        "A": "The highest mountain in the UK",
        "B": "A famous castle",
        "C": "A river in Scotland",
        "D": "An island"
      },
      "category": "The UK",
      "explanation": "Ben Nevis in Scotland is the highest mountain in the UK at 1345 metres above sea level."
    },
    {
      "q": "What is the longest river in the UK?",
      "a": "B",
      "options": {
        "A": "Thames",
        "B": "Severn",
        "C": "Trent",
        "D": "Mersey"
      },
      "category": "The UK",
      "explanation": "The River Severn is the longest river in the UK at 354km. The Thames is the longest river entirely in England."
    },
    {
      "q": "What is Stonehenge?",
      "a": "C",
      "options": {
        "A": "A Roman fort",
        "B": "A medieval castle",
        "C": "A prehistoric monument of standing stones",
        "D": "A Viking settlement"
      },
      "category": "History",
      "explanation": "Stonehenge in Wiltshire is a prehistoric monument built between 3000-1500 BC. Its exact purpose remains a mystery."
    },
    {
      "q": "Where is the Tower of London located?",
      "a": "A",
      "options": {
        "A": "London",
        "B": "Leeds",
        "C": "York",
        "D": "Windsor"
      },
      "category": "The UK",
      "explanation": "The Tower of London is a historic castle on the north bank of the River Thames. It has served as a royal palace and prison."
    },
    {
      "q": "What are the Crown Jewels?",
      "a": "B",
      "options": {
        "A": "The King's personal jewellery",
        "B": "The official regalia used at coronations kept at the Tower of London",
        "C": "Jewellery belonging to the state",
        "D": "Ancient Roman treasure"
      },
      "category": "History",
      "explanation": "The Crown Jewels are the official regalia used at royal ceremonies especially coronations. They are kept at the Tower of London."
    },
    {
      "q": "Who was Sir Isaac Newton?",
      "a": "C",
      "options": {
        "A": "A famous artist",
        "B": "A political leader",
        "C": "A scientist who developed the laws of gravity and motion",
        "D": "A poet"
      },
      "category": "History",
      "explanation": "Sir Isaac Newton (1643-1727) was one of the most important scientists in history. He developed the laws of gravity and motion."
    },
    {
      "q": "Who was Florence Nightingale?",
      "a": "A",
      "options": {
        "A": "A pioneer of modern nursing",
        "B": "A famous painter",
        "C": "A political leader",
        "D": "A writer"
      },
      "category": "History",
      "explanation": "Florence Nightingale (1820-1910) was a pioneer of modern nursing. She is famous for her work in the Crimean War and improving hospital conditions."
    },
    {
      "q": "Who was Emmeline Pankhurst?",
      "a": "B",
      "options": {
        "A": "A famous nurse",
        "B": "A leader of the suffragette movement for women's voting rights",
        "C": "A scientist",
        "D": "A prime minister"
      },
      "category": "History",
      "explanation": "Emmeline Pankhurst (1858-1928) led the suffragette movement campaigning for women's right to vote. She founded the WSPU in 1903."
    },
    {
      "q": "What did Isambard Kingdom Brunel do?",
      "a": "C",
      "options": {
        "A": "Discovered penicillin",
        "B": "Led the suffragettes",
        "C": "Built bridges railways and ships as a pioneering engineer",
        "D": "Won the Battle of Waterloo"
      },
      "category": "History",
      "explanation": "Isambard Kingdom Brunel (1806-1859) was a pioneering engineer who built the Great Western Railway Clifton Suspension Bridge and SS Great Britain."
    },
    {
      "q": "What is the Notting Hill Carnival?",
      "a": "B",
      "options": {
        "A": "A royal event",
        "B": "An annual Caribbean cultural festival in London",
        "C": "A film festival",
        "D": "A food festival"
      },
      "category": "Culture",
      "explanation": "The Notting Hill Carnival is an annual celebration of Caribbean culture held in London every August. It is one of the largest street festivals in Europe."
    },
    {
      "q": "What is the Edinburgh Festival?",
      "a": "C",
      "options": {
        "A": "A food festival",
        "B": "A sports event",
        "C": "The world's largest arts festival held annually in Edinburgh",
        "D": "A religious event"
      },
      "category": "Culture",
      "explanation": "The Edinburgh Festival Fringe is the world's largest arts festival held every August. It features thousands of performances across theatre comedy music and dance."
    },
    {
      "q": "What does the UK stand for?",
      "a": "A",
      "options": {
        "A": "United Kingdom",
        "B": "United Kingdoms",
        "C": "Union Kingdom",
        "D": "Universal Kingdom"
      },
      "category": "The UK",
      "explanation": "UK stands for United Kingdom \u2014 the full name is the United Kingdom of Great Britain and Northern Ireland."
    },
    {
      "q": "What is Great Britain?",
      "a": "B",
      "options": {
        "A": "Another name for the UK",
        "B": "England Scotland and Wales",
        "C": "England and Wales only",
        "D": "England Scotland Wales and Northern Ireland"
      },
      "category": "The UK",
      "explanation": "Great Britain refers to the island containing England Scotland and Wales. The UK also includes Northern Ireland."
    },
    {
      "q": "Which sea separates Great Britain from Ireland?",
      "a": "C",
      "options": {
        "A": "North Sea",
        "B": "English Channel",
        "C": "Irish Sea",
        "D": "Atlantic Ocean"
      },
      "category": "The UK",
      "explanation": "The Irish Sea separates Great Britain from Ireland. The English Channel separates Great Britain from France."
    },
    {
      "q": "What is the Commonwealth?",
      "a": "B",
      "options": {
        "A": "A type of government",
        "B": "An international organisation of countries mostly former British Empire territories",
        "C": "A UK government department",
        "D": "A trade union"
      },
      "category": "The UK",
      "explanation": "The Commonwealth is an international organisation of 56 member countries mostly former territories of the British Empire who cooperate on shared goals."
    },
    {
      "q": "What is Remembrance Day?",
      "a": "C",
      "options": {
        "A": "A celebration of victory in WW2",
        "B": "The Queen's birthday",
        "C": "A day to remember those who died in wars especially WW1 and WW2",
        "D": "A national holiday"
      },
      "category": "Culture",
      "explanation": "Remembrance Day is on 11th November. It commemorates those who died in wars. A two-minute silence is observed at 11am."
    },
    {
      "q": "What is a red poppy associated with in the UK?",
      "a": "A",
      "options": {
        "A": "Remembrance of those who died in wars",
        "B": "Good luck",
        "C": "Autumn",
        "D": "The Royal Family"
      },
      "category": "Culture",
      "explanation": "Red poppies are worn in November as a symbol of remembrance for those who died in wars especially WW1 when poppies grew in Flanders Fields."
    },
    {
      "q": "What does Guy Fawkes Night celebrate?",
      "a": "B",
      "options": {
        "A": "A harvest festival",
        "B": "The failure of the Gunpowder Plot to blow up Parliament in 1605",
        "C": "A Viking tradition",
        "D": "The end of World War 2"
      },
      "category": "Culture",
      "explanation": "Guy Fawkes Night on 5th November celebrates the failure of the Gunpowder Plot in 1605 when Guy Fawkes tried to blow up Parliament."
    },
    {
      "q": "What is the Grand National?",
      "a": "C",
      "options": {
        "A": "A political event",
        "B": "A football tournament",
        "C": "A famous horse race held at Aintree in Liverpool",
        "D": "A royal ceremony"
      },
      "category": "Culture",
      "explanation": "The Grand National is one of the most famous horse races in the world. It is held annually at Aintree Racecourse in Liverpool."
    },
    {
      "q": "What is Hogmanay?",
      "a": "B",
      "options": {
        "A": "A Welsh festival",
        "B": "The Scottish New Year celebration",
        "C": "An Irish festival",
        "D": "A harvest festival"
      },
      "category": "Culture",
      "explanation": "Hogmanay is the Scottish New Year celebration. It is traditionally celebrated more enthusiastically in Scotland than Christmas."
    },
    {
      "q": "What is the BBC?",
      "a": "A",
      "options": {
        "A": "The British Broadcasting Corporation \u2014 a public broadcaster",
        "B": "A private TV company",
        "C": "A government ministry",
        "D": "A newspaper"
      },
      "category": "Everyday Life",
      "explanation": "The BBC (British Broadcasting Corporation) is the UK's public broadcaster funded by the TV licence fee. It was founded in 1927."
    },
    {
      "q": "What is a TV licence used for?",
      "a": "C",
      "options": {
        "A": "To own a television",
        "B": "To watch satellite TV",
        "C": "To fund the BBC",
        "D": "To pay for broadband"
      },
      "category": "Everyday Life",
      "explanation": "The TV licence is required if you watch live TV or use BBC iPlayer. The money funds the BBC's television radio and online services."
    },
    {
      "q": "What is habeas corpus?",
      "a": "B",
      "options": {
        "A": "A type of court",
        "B": "The right not to be imprisoned without trial",
        "C": "A voting system",
        "D": "A type of law"
      },
      "category": "Values",
      "explanation": "Habeas corpus is the right that prevents people being imprisoned without a trial. It is a fundamental legal protection in the UK."
    },
    {
      "q": "What is the official religion of England?",
      "a": "A",
      "options": {
        "A": "Church of England (Anglican)",
        "B": "Roman Catholic",
        "C": "Methodist",
        "D": "There is no official religion"
      },
      "category": "Culture",
      "explanation": "The official religion of England is the Church of England (Anglican). The King is the Supreme Governor of the Church of England."
    },
    {
      "q": "In which year was the Scottish Parliament established?",
      "a": "C",
      "options": {
        "A": "1995",
        "B": "1997",
        "C": "1999",
        "D": "2001"
      },
      "category": "Government",
      "explanation": "The Scottish Parliament was established in 1999 following a referendum on devolution. It has powers over many areas of Scottish life."
    },
    {
      "q": "What is the Cenotaph?",
      "a": "B",
      "options": {
        "A": "A type of government building",
        "B": "A war memorial in Whitehall London",
        "C": "An ancient monument",
        "D": "A royal palace"
      },
      "category": "History",
      "explanation": "The Cenotaph in Whitehall London is the UK's national war memorial. It is the focal point of the annual Remembrance Sunday service."
    },
    {
      "q": "What does MP stand for?",
      "a": "A",
      "options": {
        "A": "Member of Parliament",
        "B": "Minister of Police",
        "C": "Municipal President",
        "D": "Military Personnel"
      },
      "category": "Government",
      "explanation": "MP stands for Member of Parliament. There are 650 MPs in the House of Commons each representing a constituency."
    },
    {
      "q": "What is the Speaker of the House of Commons?",
      "a": "C",
      "options": {
        "A": "The Prime Minister",
        "B": "The leader of the opposition",
        "C": "The person who chairs debates in the House of Commons",
        "D": "The King's representative"
      },
      "category": "Government",
      "explanation": "The Speaker chairs debates in the House of Commons maintaining order and calling members to speak. They must be politically neutral."
    },
    {
      "q": "What is the Cabinet?",
      "a": "B",
      "options": {
        "A": "A type of furniture in Parliament",
        "B": "Senior government ministers who make major policy decisions",
        "C": "The opposition party",
        "D": "The House of Lords"
      },
      "category": "Government",
      "explanation": "The Cabinet is a group of around 20 senior ministers led by the Prime Minister who make major government policy decisions."
    },
    {
      "q": "Who is the Chancellor of the Exchequer?",
      "a": "A",
      "options": {
        "A": "The minister responsible for the UK economy and taxation",
        "B": "The head of the judiciary",
        "C": "The Foreign Secretary",
        "D": "The Home Secretary"
      },
      "category": "Government",
      "explanation": "The Chancellor of the Exchequer is the senior minister responsible for the UK economy government spending and taxation."
    },
    {
      "q": "What is the Home Office responsible for?",
      "a": "C",
      "options": {
        "A": "Foreign affairs",
        "B": "Education",
        "C": "Immigration policing and national security",
        "D": "Health"
      },
      "category": "Government",
      "explanation": "The Home Office is responsible for immigration border control counter-terrorism policing and passports in the UK."
    },
    {
      "q": "What is the Foreign and Commonwealth Office responsible for?",
      "a": "B",
      "options": {
        "A": "Immigration",
        "B": "UK relationships with other countries",
        "C": "Defence",
        "D": "Trade only"
      },
      "category": "Government",
      "explanation": "The Foreign Commonwealth and Development Office manages the UK's relationships with other countries and promotes British interests abroad."
    },
    {
      "q": "What is Eid ul Fitr?",
      "a": "A",
      "options": {
        "A": "A Muslim festival marking the end of Ramadan",
        "B": "A Hindu festival of lights",
        "C": "A Sikh festival",
        "D": "A Jewish festival"
      },
      "category": "Culture",
      "explanation": "Eid ul Fitr is a Muslim festival marking the end of the holy month of Ramadan. It is celebrated with prayer food and gifts."
    },
    {
      "q": "What is Diwali?",
      "a": "B",
      "options": {
        "A": "A Muslim festival",
        "B": "A Hindu Sikh and Jain festival of lights",
        "C": "A Buddhist festival",
        "D": "A Caribbean festival"
      },
      "category": "Culture",
      "explanation": "Diwali is celebrated by Hindus Sikhs and Jains. It is called the Festival of Lights and celebrates the triumph of good over evil."
    },
    {
      "q": "What is Hanukkah?",
      "a": "C",
      "options": {
        "A": "A Muslim festival",
        "B": "A Christian festival",
        "C": "A Jewish festival of lights",
        "D": "A Hindu festival"
      },
      "category": "Culture",
      "explanation": "Hanukkah is a Jewish festival also known as the Festival of Lights. It lasts 8 days and commemorates the rededication of the Temple in Jerusalem."
    },
    {
      "q": "What did the suffragettes campaign for?",
      "a": "A",
      "options": {
        "A": "Women's right to vote",
        "B": "Equal pay",
        "C": "Women's right to work",
        "D": "Free education for girls"
      },
      "category": "History",
      "explanation": "The suffragettes campaigned for women's right to vote in the early 20th century. They used direct action to highlight their cause."
    },
    {
      "q": "What is the minimum age to stand for election to Parliament?",
      "a": "C",
      "options": {
        "A": "16",
        "B": "17",
        "C": "18",
        "D": "21"
      },
      "category": "Government",
      "explanation": "You must be 18 or over to stand as a candidate in a UK general election."
    },
    {
      "q": "Which monarch has reigned longest in British history?",
      "a": "B",
      "options": {
        "A": "King George V",
        "B": "Queen Elizabeth II",
        "C": "King George III",
        "D": "Queen Victoria"
      },
      "category": "History",
      "explanation": "Queen Elizabeth II reigned from 1952 to 2022 \u2014 70 years making her the longest reigning British monarch. King Charles III became King in September 2022."
    },
    {
      "q": "What is the role of the House of Lords?",
      "a": "C",
      "options": {
        "A": "To elect the Prime Minister",
        "B": "To collect taxes",
        "C": "To review and revise laws passed by the House of Commons",
        "D": "To command the military"
      },
      "category": "Government",
      "explanation": "The House of Lords reviews and revises legislation passed by the House of Commons. It can suggest amendments but cannot permanently block legislation."
    },
    {
      "q": "When is Christmas Day celebrated in the UK?",
      "a": "B",
      "options": {
        "A": "24th December",
        "B": "25th December",
        "C": "26th December",
        "D": "6th January"
      },
      "category": "Culture",
      "explanation": "Christmas Day in the UK is on 25th December. Boxing Day on 26th December is also a public holiday."
    },
    {
      "q": "What is Bonfire Night?",
      "a": "A",
      "options": {
        "A": "Another name for Guy Fawkes Night on 5th November",
        "B": "A harvest festival",
        "C": "A Viking tradition",
        "D": "A summer festival"
      },
      "category": "Culture",
      "explanation": "Bonfire Night or Guy Fawkes Night on 5th November commemorates the failed Gunpowder Plot of 1605. It is celebrated with bonfires and fireworks."
    },
    {
      "q": "What is the longest serving political party in UK government history?",
      "a": "B",
      "options": {
        "A": "Labour",
        "B": "Conservative",
        "C": "Liberal",
        "D": "Whig"
      },
      "category": "Government",
      "explanation": "The Conservative Party (historically also called the Tory Party) has been in government more than any other party in UK history."
    },
    {
      "q": "What is the name of the UK's Supreme Court?",
      "a": "A",
      "options": {
        "A": "The Supreme Court of the United Kingdom",
        "B": "The High Court",
        "C": "The Royal Court",
        "D": "The Court of Appeal"
      },
      "category": "Government",
      "explanation": "The Supreme Court of the United Kingdom is the highest court. It was established in 2009 replacing the House of Lords as the highest court of appeal."
    },
    {
      "q": "What is the Domesday Book?",
      "a": "B",
      "options": {
        "A": "A book of laws",
        "B": "A survey of land and property in England ordered by William the Conqueror in 1086",
        "C": "A religious text",
        "D": "A record of battles"
      },
      "category": "History",
      "explanation": "The Domesday Book was a great survey of England ordered by William the Conqueror in 1086 to assess land holdings and resources for taxation."
    },
    {
      "q": "What was the Industrial Revolution?",
      "a": "C",
      "options": {
        "A": "A political revolution",
        "B": "A farming revolution",
        "C": "A period of rapid industrial development in Britain from the 18th century",
        "D": "A military campaign"
      },
      "category": "History",
      "explanation": "The Industrial Revolution (1760-1840) transformed Britain from an agricultural to an industrial society. Britain led the world in manufacturing."
    },
    {
      "q": "What is the Proms?",
      "a": "B",
      "options": {
        "A": "A sports event",
        "B": "A famous series of classical music concerts held at the Royal Albert Hall London",
        "C": "A theatre festival",
        "D": "A film festival"
      },
      "category": "Culture",
      "explanation": "The BBC Proms is an eight-week summer festival of classical music at the Royal Albert Hall in London. It ends with the famous Last Night of the Proms."
    },
    {
      "q": "What is the National Trust?",
      "a": "A",
      "options": {
        "A": "A charity that preserves historic buildings and natural landscapes",
        "B": "A government department",
        "C": "A bank",
        "D": "A sports organisation"
      },
      "category": "Culture",
      "explanation": "The National Trust is a charity founded in 1895 that looks after historic buildings gardens and landscapes across England Wales and Northern Ireland."
    },
    {
      "q": "What are the Changing of the Guard?",
      "a": "C",
      "options": {
        "A": "A military exercise",
        "B": "A prison ceremony",
        "C": "A ceremonial changing of soldiers guarding Buckingham Palace",
        "D": "A police parade"
      },
      "category": "Culture",
      "explanation": "The Changing of the Guard is a traditional ceremony where soldiers guarding Buckingham Palace are formally relieved of duty by a new guard."
    },
    {
      "q": "Who is the patron saint of England?",
      "a": "B",
      "options": {
        "A": "St Patrick",
        "B": "St George",
        "C": "St Andrew",
        "D": "St David"
      },
      "category": "Culture",
      "explanation": "St George is the patron saint of England. He is associated with the legend of slaying a dragon and is depicted on the English flag."
    },
    {
      "q": "What is the Union Jack?",
      "a": "A",
      "options": {
        "A": "The national flag of the United Kingdom combining the crosses of England Scotland and Ireland",
        "B": "A naval flag",
        "C": "The English flag only",
        "D": "A historical flag no longer used"
      },
      "category": "The UK",
      "explanation": "The Union Jack (or Union Flag) combines St George's Cross (England) St Andrew's Cross (Scotland) and St Patrick's Cross (Ireland)."
    },
    {
      "q": "What cross is on the flag of England?",
      "a": "C",
      "options": {
        "A": "St Patrick's Cross",
        "B": "St Andrew's Cross",
        "C": "St George's Cross",
        "D": "St David's Cross"
      },
      "category": "The UK",
      "explanation": "The flag of England is St George's Cross \u2014 a red cross on a white background. It is also known as the English flag."
    },
    {
      "q": "What is the flag of Scotland?",
      "a": "B",
      "options": {
        "A": "A red cross on white",
        "B": "A white diagonal cross on blue (St Andrew's Cross)",
        "C": "A red diagonal cross on white",
        "D": "A dragon on green"
      },
      "category": "The UK",
      "explanation": "The Scottish flag is St Andrew's Cross (Saltire) \u2014 a white diagonal cross on a blue background. St Andrew is the patron saint of Scotland."
    },
    {
      "q": "What is the flag of Wales?",
      "a": "A",
      "options": {
        "A": "A red dragon on green and white",
        "B": "A cross on red",
        "C": "A dragon on blue",
        "D": "A white cross on red"
      },
      "category": "The UK",
      "explanation": "The Welsh flag features a red dragon (Y Ddraig Goch) on a green and white background. The dragon is an ancient symbol of Wales."
    },
    {
      "q": "What is the Bayeux Tapestry?",
      "a": "C",
      "options": {
        "A": "A painting",
        "B": "A carpet",
        "C": "An embroidered cloth depicting the events leading to the Norman Conquest in 1066",
        "D": "A historical document"
      },
      "category": "History",
      "explanation": "The Bayeux Tapestry is a 70-metre long embroidered cloth depicting the events leading to the Norman Conquest. It is kept in Bayeux France."
    },
    {
      "q": "What is the Black Death?",
      "a": "B",
      "options": {
        "A": "A war",
        "B": "A devastating plague that killed about one third of Europe's population in the 14th century",
        "C": "A famine",
        "D": "A volcanic eruption"
      },
      "category": "History",
      "explanation": "The Black Death was a devastating plague that reached Britain in 1348 killing around one third to one half of the population."
    },
    {
      "q": "What was the English Civil War?",
      "a": "A",
      "options": {
        "A": "A conflict between Parliamentarians and Royalists in the 17th century",
        "B": "A battle against France",
        "C": "A revolt against the Church",
        "D": "A peasants uprising"
      },
      "category": "History",
      "explanation": "The English Civil War (1642-1651) was fought between Parliamentarians (Roundheads) and Royalists (Cavaliers). Parliament won and King Charles I was executed."
    },
    {
      "q": "What is the significance of 1066 in British history?",
      "a": "C",
      "options": {
        "A": "The signing of Magna Carta",
        "B": "The Black Death arrived",
        "C": "The Norman Conquest \u2014 William defeated King Harold at Hastings",
        "D": "The formation of Parliament"
      },
      "category": "History",
      "explanation": "1066 is one of the most important dates in British history. William the Conqueror defeated King Harold at the Battle of Hastings changing Britain forever."
    },
    {
      "q": "What was the British Empire?",
      "a": "B",
      "options": {
        "A": "A Roman colony",
        "B": "A collection of territories ruled by Britain that was the largest empire in history",
        "C": "A trading company",
        "D": "A military alliance"
      },
      "category": "History",
      "explanation": "The British Empire was the largest empire in history covering about one quarter of the world's land surface and one quarter of its population at its height."
    },
    {
      "q": "When did India gain independence from Britain?",
      "a": "C",
      "options": {
        "A": "1945",
        "B": "1946",
        "C": "1947",
        "D": "1948"
      },
      "category": "History",
      "explanation": "India gained independence from Britain on 15th August 1947. It was a momentous event that also saw the partition creating Pakistan."
    },
    {
      "q": "What was the Reformation?",
      "a": "A",
      "options": {
        "A": "A religious movement that broke from the Catholic Church creating Protestant churches",
        "B": "A political revolution",
        "C": "An agricultural reform",
        "D": "A legal reform"
      },
      "category": "History",
      "explanation": "The Reformation in the 16th century broke from the Roman Catholic Church. Henry VIII established the Church of England as part of this process."
    },
    {
      "q": "What did Henry VIII do that was historically significant?",
      "a": "B",
      "options": {
        "A": "Signed the Magna Carta",
        "B": "Broke from the Catholic Church and established the Church of England",
        "C": "Defeated the Spanish Armada",
        "D": "Founded Parliament"
      },
      "category": "History",
      "explanation": "Henry VIII broke from the Roman Catholic Church in the 1530s and established the Church of England with himself as Supreme Head."
    },
    {
      "q": "What was the Gunpowder Plot of 1605?",
      "a": "C",
      "options": {
        "A": "A Scottish rebellion",
        "B": "A war with France",
        "C": "A plot by Catholics to blow up Parliament and kill the King",
        "D": "A sailors mutiny"
      },
      "category": "History",
      "explanation": "The Gunpowder Plot of 1605 was a failed attempt by Guy Fawkes and other Catholic conspirators to blow up the Houses of Parliament and kill King James I."
    },
    {
      "q": "What is habeas corpus and when was it established?",
      "a": "B",
      "options": {
        "A": "Trial by jury 1215",
        "B": "The right not to be imprisoned without trial established in the Habeas Corpus Act 1679",
        "C": "Freedom of speech 1689",
        "D": "Voting rights 1832"
      },
      "category": "Values",
      "explanation": "The Habeas Corpus Act 1679 established the right not to be imprisoned without trial. It is a fundamental protection of individual liberty."
    },
    {
      "q": "What happened at the Battle of Waterloo?",
      "a": "A",
      "options": {
        "A": "Wellington defeated Napoleon ending the Napoleonic Wars in 1815",
        "B": "Britain defeated the Spanish Armada",
        "C": "England defeated France in the Hundred Years War",
        "D": "Scotland was united with England"
      },
      "category": "History",
      "explanation": "The Battle of Waterloo in 1815 saw the Duke of Wellington defeat Napoleon Bonaparte of France ending the Napoleonic Wars."
    },
    {
      "q": "Who was Queen Victoria?",
      "a": "C",
      "options": {
        "A": "The first female Prime Minister",
        "B": "A Tudor queen",
        "C": "A queen who reigned 1837-1901 during the height of the British Empire",
        "D": "A medieval queen"
      },
      "category": "History",
      "explanation": "Queen Victoria reigned from 1837 to 1901 \u2014 63 years. During her reign Britain became the world's most powerful nation and the Empire reached its height."
    },
    {
      "q": "What is the Entente Cordiale?",
      "a": "B",
      "options": {
        "A": "A trade agreement with America",
        "B": "A 1904 agreement improving relations between Britain and France",
        "C": "A peace treaty after WW1",
        "D": "An economic union"
      },
      "category": "History",
      "explanation": "The Entente Cordiale was a series of agreements signed in 1904 improving relations between Britain and France after centuries of rivalry."
    },
    {
      "q": "What was the significance of the Battle of Britain (1940)?",
      "a": "A",
      "options": {
        "A": "The RAF successfully defended Britain against German air attacks preventing invasion",
        "B": "Britain invaded France",
        "C": "America joined the war",
        "D": "Germany surrendered"
      },
      "category": "History",
      "explanation": "The Battle of Britain (summer 1940) was an air campaign where the RAF successfully defended Britain against the Luftwaffe preventing a German invasion."
    },
    {
      "q": "What is the significance of D-Day (6th June 1944)?",
      "a": "C",
      "options": {
        "A": "End of WW2",
        "B": "Start of WW2",
        "C": "Allied forces landed in Normandy France beginning the liberation of Western Europe",
        "D": "America declared war on Japan"
      },
      "category": "History",
      "explanation": "D-Day on 6th June 1944 saw Allied forces land on the beaches of Normandy in France. It was the largest seaborne invasion in history and turned the tide of WW2."
    },
    {
      "q": "What was the welfare state?",
      "a": "B",
      "options": {
        "A": "A type of government",
        "B": "A system where the government provides social security healthcare and education for all",
        "C": "A prison system",
        "D": "A taxation system"
      },
      "category": "History",
      "explanation": "The welfare state was established after WW2 by the Labour government including the NHS National Insurance and social security to protect people from poverty."
    },
    {
      "q": "What is the significance of Hadrian's Wall?",
      "a": "A",
      "options": {
        "A": "A wall built by the Romans across northern England as a northern frontier of the Roman Empire",
        "B": "A medieval castle wall",
        "C": "A border wall between England and Scotland",
        "D": "A defensive wall built during WW2"
      },
      "category": "History",
      "explanation": "Hadrian's Wall was built by the Romans starting in 122AD as the northern frontier of the Roman Empire. It stretches 73 miles across northern England."
    },
    {
      "q": "Who was the first female Prime Minister of the UK?",
      "a": "C",
      "options": {
        "A": "Theresa May",
        "B": "Angela Merkel",
        "C": "Margaret Thatcher",
        "D": "Barbara Castle"
      },
      "category": "History",
      "explanation": "Margaret Thatcher was the first female Prime Minister of the UK. She served from 1979 to 1990 and was a highly influential and controversial leader."
    },
    {
      "q": "What is judicial independence?",
      "a": "B",
      "options": {
        "A": "Judges can do anything",
        "B": "Judges are free from political interference when making decisions",
        "C": "Courts are run by politicians",
        "D": "Legal aid is free"
      },
      "category": "Values",
      "explanation": "Judicial independence means that judges make decisions based on law not political pressure. It is essential for a fair and democratic society."
    },
    {
      "q": "What is the role of the police in the UK?",
      "a": "A",
      "options": {
        "A": "To protect the public prevent crime and uphold the law",
        "B": "To collect taxes",
        "C": "To enforce immigration rules only",
        "D": "To support the government"
      },
      "category": "Community",
      "explanation": "The police protect the public prevent and detect crime uphold the law and maintain order. They must themselves act within the law."
    },
    {
      "q": "What is a by-election?",
      "a": "C",
      "options": {
        "A": "A local council election",
        "B": "An election for the House of Lords",
        "C": "An election held to fill a vacancy when an MP dies resigns or is disqualified",
        "D": "A European election"
      },
      "category": "Government",
      "explanation": "A by-election is held to fill a vacancy in the House of Commons when an MP dies resigns or is otherwise unable to continue."
    },
    {
      "q": "What is the difference between criminal and civil law?",
      "a": "B",
      "options": {
        "A": "Criminal law is for serious crimes civil law for minor ones",
        "B": "Criminal law deals with offences against the state civil law with disputes between individuals or organisations",
        "C": "There is no difference",
        "D": "Criminal law is in Scotland civil law in England"
      },
      "category": "Community",
      "explanation": "Criminal law deals with offences against the state (murder theft etc). Civil law deals with disputes between individuals or organisations (contracts divorce etc)."
    },
    {
      "q": "What is the right to a fair trial?",
      "a": "A",
      "options": {
        "A": "The right to be presumed innocent and have your case heard impartially",
        "B": "The right to choose your judge",
        "C": "The right to a quick trial",
        "D": "The right to no prison sentence"
      },
      "category": "Values",
      "explanation": "The right to a fair trial includes the presumption of innocence the right to legal representation and an impartial hearing. It is protected by law."
    },
    {
      "q": "What is the Freedom of Information Act?",
      "a": "C",
      "options": {
        "A": "The right to free speech",
        "B": "The right to own information",
        "C": "A law giving the public the right to access information held by public bodies",
        "D": "A law about the press"
      },
      "category": "Values",
      "explanation": "The Freedom of Information Act 2000 gives the public the right to access information held by public authorities including government departments."
    },
    {
      "q": "What is the Data Protection Act?",
      "a": "B",
      "options": {
        "A": "A law about internet use",
        "B": "A law controlling how personal information is stored and used by organisations",
        "C": "A law about computer security",
        "D": "A law about state secrets"
      },
      "category": "Values",
      "explanation": "The Data Protection Act controls how organisations store and use personal information. It gives individuals rights over their own data."
    },
    {
      "q": "What is the Human Rights Act 1998?",
      "a": "A",
      "options": {
        "A": "A law that incorporated European Convention on Human Rights into UK law",
        "B": "A law giving rights to immigrants only",
        "C": "A law about employment rights",
        "D": "A European Union law"
      },
      "category": "Values",
      "explanation": "The Human Rights Act 1998 incorporated the European Convention on Human Rights into UK law allowing people to enforce their rights in UK courts."
    },
    {
      "q": "What is the Equality Act 2010?",
      "a": "C",
      "options": {
        "A": "A law about equal pay only",
        "B": "A law about race discrimination only",
        "C": "A law that protects people from discrimination based on protected characteristics",
        "D": "A law about disability only"
      },
      "category": "Values",
      "explanation": "The Equality Act 2010 protects people from discrimination based on protected characteristics including age disability gender race religion and sexual orientation."
    },
    {
      "q": "What are the protected characteristics under the Equality Act?",
      "a": "B",
      "options": {
        "A": "Race and gender only",
        "B": "Age disability gender race religion pregnancy marriage and sexual orientation among others",
        "C": "Only physical characteristics",
        "D": "Only employment related characteristics"
      },
      "category": "Values",
      "explanation": "Protected characteristics include age disability gender reassignment marriage pregnancy race religion or belief sex and sexual orientation."
    },
    {
      "q": "What is a jury?",
      "a": "A",
      "options": {
        "A": "A group of 12 members of the public who decide the verdict in serious criminal cases",
        "B": "A group of judges",
        "C": "A group of lawyers",
        "D": "A group of police officers"
      },
      "category": "Community",
      "explanation": "A jury consists of 12 randomly selected members of the public who listen to evidence in a Crown Court and decide whether the defendant is guilty or not guilty."
    },
    {
      "q": "What is the role of a coroner?",
      "a": "C",
      "options": {
        "A": "To prosecute criminals",
        "B": "To defend accused persons",
        "C": "To investigate sudden or unexplained deaths",
        "D": "To manage prisons"
      },
      "category": "Community",
      "explanation": "A coroner investigates sudden unexplained or violent deaths to establish the cause. They may hold an inquest with a jury."
    },
    {
      "q": "What is the role of the Attorney General?",
      "a": "B",
      "options": {
        "A": "The head of the police",
        "B": "The chief legal adviser to the government",
        "C": "The head of the judiciary",
        "D": "The Lord Chancellor"
      },
      "category": "Government",
      "explanation": "The Attorney General is the chief legal adviser to the government and has oversight of the Crown Prosecution Service."
    },
    {
      "q": "What is the Crown Prosecution Service?",
      "a": "A",
      "options": {
        "A": "The organisation that decides whether to bring criminal charges and prosecutes cases",
        "B": "The King's personal legal team",
        "C": "A private legal firm",
        "D": "The police legal department"
      },
      "category": "Community",
      "explanation": "The Crown Prosecution Service (CPS) is the principal prosecuting authority in England and Wales. It decides whether to charge suspects and prosecutes criminal cases."
    },
    {
      "q": "What nationality were the Vikings who raided Britain?",
      "a": "C",
      "options": {
        "A": "German",
        "B": "French",
        "C": "Scandinavian (Norwegian Danish and Swedish)",
        "D": "Dutch"
      },
      "category": "History",
      "explanation": "The Vikings were Scandinavian people from Norway Denmark and Sweden who raided and settled in Britain from the late 8th century."
    },
    {
      "q": "What were the Romans contribution to Britain?",
      "a": "B",
      "options": {
        "A": "They built Stonehenge",
        "B": "They built roads towns and introduced new farming and architectural techniques",
        "C": "They established Parliament",
        "D": "They brought Christianity to Britain"
      },
      "category": "History",
      "explanation": "The Romans who occupied Britain from 43AD to 410AD built roads towns (including London) introduced new farming methods and brought Latin and new cultural practices."
    },
    {
      "q": "Who were the Normans?",
      "a": "A",
      "options": {
        "A": "People from northern France who descended from Vikings and conquered England in 1066",
        "B": "A Scandinavian people",
        "C": "A Scottish tribe",
        "D": "A Roman people"
      },
      "category": "History",
      "explanation": "The Normans were people from Normandy in northern France descended from Vikings. William the Conqueror led them to victory at Hastings in 1066."
    },
    {
      "q": "What is the Hansard?",
      "a": "C",
      "options": {
        "A": "A political party newsletter",
        "B": "A newspaper",
        "C": "The official record of all debates in Parliament",
        "D": "A legal document"
      },
      "category": "Government",
      "explanation": "Hansard is the official record of all debates speeches and proceedings in both Houses of Parliament. It has been published since 1803."
    },
    {
      "q": "What is Prime Minister's Questions?",
      "a": "B",
      "options": {
        "A": "A TV programme",
        "B": "A weekly session where the PM answers questions from MPs",
        "C": "A newspaper column",
        "D": "A radio programme"
      },
      "category": "Government",
      "explanation": "Prime Minister's Questions (PMQs) takes place every Wednesday when Parliament is sitting. MPs can question the Prime Minister on any matter."
    },
    {
      "q": "How is a law made in the UK?",
      "a": "A",
      "options": {
        "A": "A Bill is proposed debated in both Houses and if passed receives Royal Assent",
        "B": "The Prime Minister decides",
        "C": "The King creates laws",
        "D": "The public vote on laws"
      },
      "category": "Government",
      "explanation": "A Bill is introduced to Parliament debated and voted on in both Houses. Once passed by both Houses it receives Royal Assent from the King and becomes law."
    },
    {
      "q": "What is Royal Assent?",
      "a": "C",
      "options": {
        "A": "When the King speaks in Parliament",
        "B": "When Parliament elects a new leader",
        "C": "When the monarch formally approves a Bill making it law",
        "D": "A royal ceremony"
      },
      "category": "Government",
      "explanation": "Royal Assent is when the monarch formally approves a Bill passed by Parliament making it an Act of Parliament (law). The last time Royal Assent was refused was in 1707."
    },
    {
      "q": "What is the Civil Service?",
      "a": "B",
      "options": {
        "A": "A private company working for the government",
        "B": "The permanent officials who work for government departments implementing policy",
        "C": "The police and army",
        "D": "Elected local officials"
      },
      "category": "Government",
      "explanation": "The Civil Service consists of permanent government employees who implement policy regardless of which party is in power. They are politically neutral."
    },
    {
      "q": "What is council tax used for?",
      "a": "A",
      "options": {
        "A": "To fund local services like rubbish collection libraries and local roads",
        "B": "To pay for the NHS",
        "C": "To fund defence",
        "D": "To pay for benefits"
      },
      "category": "Everyday Life",
      "explanation": "Council tax is a local tax paid by residents to fund local authority services such as refuse collection libraries local roads parks and leisure centres."
    },
    {
      "q": "What is the electoral register?",
      "a": "C",
      "options": {
        "A": "A list of MPs",
        "B": "A list of political parties",
        "C": "A list of people eligible to vote in elections",
        "D": "A list of polling stations"
      },
      "category": "Government",
      "explanation": "The electoral register is the official list of people who are registered to vote. You must register to vote to participate in elections."
    },
    {
      "q": "How do you register to vote in the UK?",
      "a": "B",
      "options": {
        "A": "It is automatic",
        "B": "Apply online at gov.uk/register-to-vote or complete a paper form",
        "C": "Ask your local MP",
        "D": "Go to the polling station"
      },
      "category": "Government",
      "explanation": "You must actively register to vote at gov.uk/register-to-vote. You need your National Insurance number. The deadline is usually 12 working days before an election."
    },
    {
      "q": "Who can vote in UK general elections?",
      "a": "A",
      "options": {
        "A": "British Irish and qualifying Commonwealth citizens aged 18+ registered to vote",
        "B": "Only British citizens",
        "C": "All residents",
        "D": "Only those born in the UK"
      },
      "category": "Government",
      "explanation": "British citizens Irish citizens and qualifying Commonwealth citizens aged 18+ who are registered to vote can participate in UK general elections."
    },
    {
      "q": "What is a polling station?",
      "a": "C",
      "options": {
        "A": "Where election results are announced",
        "B": "Where votes are counted",
        "C": "A place where registered voters go to cast their vote",
        "D": "Where candidates register"
      },
      "category": "Government",
      "explanation": "A polling station is where registered voters go to cast their vote on election day. They are usually in schools community centres or other public buildings."
    },
    {
      "q": "What is a secret ballot?",
      "a": "B",
      "options": {
        "A": "An election for secret services",
        "B": "Voting in private so no one can see who you voted for",
        "C": "Postal voting",
        "D": "Online voting"
      },
      "category": "Government",
      "explanation": "A secret ballot means votes are cast in private. This protects voters from intimidation and ensures they can vote freely according to their conscience."
    },
    {
      "q": "What is proportional representation?",
      "a": "A",
      "options": {
        "A": "A voting system where parties get seats in proportion to votes received",
        "B": "The UK's current voting system",
        "C": "A system where only the winner gets seats",
        "D": "A system of local voting"
      },
      "category": "Government",
      "explanation": "Proportional representation gives parties seats proportional to their share of votes. The UK uses First Past the Post for general elections not proportional representation."
    },
    {
      "q": "What voting system does the UK use for general elections?",
      "a": "C",
      "options": {
        "A": "Proportional representation",
        "B": "Alternative vote",
        "C": "First Past the Post",
        "D": "Single transferable vote"
      },
      "category": "Government",
      "explanation": "The UK uses the First Past the Post system for general elections. The candidate with the most votes in each constituency wins regardless of overall vote share."
    },
    {
      "q": "What is the significance of the Glorious Revolution of 1688?",
      "a": "B",
      "options": {
        "A": "It ended the English Civil War",
        "B": "It established constitutional monarchy and Protestant succession",
        "C": "It created Parliament",
        "D": "It united England and Scotland"
      },
      "category": "History",
      "explanation": "The Glorious Revolution of 1688 saw William of Orange replace James II establishing constitutional monarchy and ensuring Protestant succession."
    },
    {
      "q": "What is the Bill of Rights 1689?",
      "a": "A",
      "options": {
        "A": "A document limiting royal power and establishing rights of Parliament and individuals",
        "B": "A document giving all citizens rights",
        "C": "A voting rights charter",
        "D": "A trade agreement"
      },
      "category": "History",
      "explanation": "The Bill of Rights 1689 limited the power of the monarch established the rights of Parliament and laid foundations for constitutional monarchy."
    },
    {
      "q": "What Act united England and Scotland?",
      "a": "C",
      "options": {
        "A": "Magna Carta 1215",
        "B": "Act of Settlement 1701",
        "C": "Acts of Union 1707",
        "D": "Reform Act 1832"
      },
      "category": "History",
      "explanation": "The Acts of Union 1707 united England and Scotland into the Kingdom of Great Britain with a single Parliament at Westminster."
    },
    {
      "q": "When did the Republic of Ireland gain independence?",
      "a": "B",
      "options": {
        "A": "1916",
        "B": "1922",
        "C": "1945",
        "D": "1949"
      },
      "category": "History",
      "explanation": "The Irish Free State was established in 1922 following the Anglo-Irish Treaty. The Republic of Ireland was declared in 1949."
    },
    {
      "q": "What was the Chartist movement?",
      "a": "A",
      "options": {
        "A": "A movement for working class men to have voting rights in the 19th century",
        "B": "A religious movement",
        "C": "A trade union",
        "D": "An anti-war movement"
      },
      "category": "History",
      "explanation": "The Chartist movement (1838-1857) campaigned for working class men to have the right to vote and other democratic reforms."
    },
    {
      "q": "What was the significance of the Reform Acts of the 19th century?",
      "a": "C",
      "options": {
        "A": "They gave women the vote",
        "B": "They abolished the House of Lords",
        "C": "They extended voting rights to more men and reduced rotten boroughs",
        "D": "They established the NHS"
      },
      "category": "History",
      "explanation": "The Reform Acts of 1832 1867 and 1884 gradually extended voting rights to more men and modernised the electoral system removing rotten boroughs."
    },
    {
      "q": "What is the significance of Hadrian's Wall?",
      "a": "B",
      "options": {
        "A": "It was built by the Normans",
        "B": "It was built by Romans as the northern frontier of their empire in Britain",
        "C": "It marks the Scotland-England border",
        "D": "It was a medieval fortification"
      },
      "category": "History",
      "explanation": "Hadrian's Wall was built from 122AD by the Romans as the northern frontier of their empire in Britain. It stretched 73 miles from the Solway Firth to the River Tyne."
    },
    {
      "q": "Who wrote the Canterbury Tales?",
      "a": "A",
      "options": {
        "A": "Geoffrey Chaucer",
        "B": "William Shakespeare",
        "C": "John Milton",
        "D": "Thomas More"
      },
      "category": "Culture",
      "explanation": "Geoffrey Chaucer wrote the Canterbury Tales in the late 14th century. They are some of the earliest works written in the English language."
    },
    {
      "q": "What is the significance of the Reformation in Britain?",
      "a": "C",
      "options": {
        "A": "It united Catholic and Protestant churches",
        "B": "It ended the monarchy",
        "C": "It led to the establishment of the Church of England breaking from Rome",
        "D": "It created Parliament"
      },
      "category": "History",
      "explanation": "The Reformation in the 16th century led Henry VIII to break from the Catholic Church creating the Church of England with the monarch as its head."
    },
    {
      "q": "What was the role of Britain in the slave trade?",
      "a": "B",
      "options": {
        "A": "Britain was never involved",
        "B": "Britain was heavily involved but abolished it in 1807 and slavery in 1833",
        "C": "Britain abolished it before any other nation",
        "D": "Britain only traded within Europe"
      },
      "category": "History",
      "explanation": "Britain was heavily involved in the transatlantic slave trade. The trade was abolished in 1807 and slavery in British territories in 1833."
    },
    {
      "q": "Who was William Wilberforce?",
      "a": "A",
      "options": {
        "A": "A politician who campaigned to abolish the slave trade",
        "B": "A military general",
        "C": "An explorer",
        "D": "A scientist"
      },
      "category": "History",
      "explanation": "William Wilberforce (1759-1833) was an MP who led the campaign to abolish the slave trade. His efforts led to the Slave Trade Act 1807."
    },
    {
      "q": "What is the significance of Robert Burns in Scotland?",
      "a": "C",
      "options": {
        "A": "He was Scotland's first Prime Minister",
        "B": "He led the Scottish Parliament",
        "C": "He is Scotland's national poet celebrated on Burns Night every January 25th",
        "D": "He founded the National Trust for Scotland"
      },
      "category": "Culture",
      "explanation": "Robert Burns (1759-1796) is Scotland's national poet. Burns Night on January 25th celebrates his life with haggis whisky and readings of his poetry."
    },
    {
      "q": "What is the significance of St David's Day?",
      "a": "B",
      "options": {
        "A": "It celebrates Welsh independence",
        "B": "It celebrates the patron saint of Wales on 1st March",
        "C": "It is a Welsh public holiday",
        "D": "It celebrates Welsh rugby"
      },
      "category": "Culture",
      "explanation": "St David's Day on 1st March celebrates St David the patron saint of Wales. People traditionally wear daffodils or leeks."
    },
    {
      "q": "Who built the first steam locomotive?",
      "a": "A",
      "options": {
        "A": "George Stephenson",
        "B": "James Watt",
        "C": "Richard Arkwright",
        "D": "Isambard Kingdom Brunel"
      },
      "category": "History",
      "explanation": "George Stephenson built the first successful steam locomotive and the Rocket which won the Rainhill Trials in 1829 leading to the railway age."
    },
    {
      "q": "What did James Watt develop?",
      "a": "C",
      "options": {
        "A": "The first steam train",
        "B": "The telephone",
        "C": "An improved steam engine that powered the Industrial Revolution",
        "D": "The first computer"
      },
      "category": "History",
      "explanation": "James Watt developed an improved steam engine in the 1760s-1780s. His inventions were central to the Industrial Revolution powering factories and machinery."
    },
    {
      "q": "What did Alexander Graham Bell invent?",
      "a": "B",
      "options": {
        "A": "The radio",
        "B": "The telephone",
        "C": "The television",
        "D": "The gramophone"
      },
      "category": "History",
      "explanation": "Alexander Graham Bell a Scottish-born inventor patented the telephone in 1876. It revolutionised communication worldwide."
    },
    {
      "q": "What did John Logie Baird invent?",
      "a": "A",
      "options": {
        "A": "Television",
        "B": "Radio",
        "C": "Telephone",
        "D": "Radar"
      },
      "category": "History",
      "explanation": "John Logie Baird a Scottish inventor demonstrated the first working television in 1926. He is credited with inventing the world's first practical television system."
    },
    {
      "q": "What was Concorde?",
      "a": "C",
      "options": {
        "A": "A British battleship",
        "B": "A space rocket",
        "C": "A supersonic passenger aircraft developed jointly by Britain and France",
        "D": "A railway locomotive"
      },
      "category": "History",
      "explanation": "Concorde was a supersonic passenger aircraft developed jointly by Britain and France. It flew from 1976 to 2003 crossing the Atlantic in about 3.5 hours."
    },
    {
      "q": "What is the significance of 1948 for British society?",
      "a": "B",
      "options": {
        "A": "End of World War 2",
        "B": "Creation of the NHS and arrival of Windrush migrants from the Caribbean",
        "C": "Women got the vote",
        "D": "Formation of the BBC"
      },
      "category": "History",
      "explanation": "1948 saw the creation of the NHS and the arrival of the Empire Windrush ship bringing workers from the Caribbean beginning significant post-war immigration."
    },
    {
      "q": "What was the Empire Windrush?",
      "a": "A",
      "options": {
        "A": "A ship that brought Caribbean workers to Britain in 1948 starting significant post-war immigration",
        "B": "A Royal Navy ship",
        "C": "A trading vessel",
        "D": "A passenger liner"
      },
      "category": "History",
      "explanation": "The Empire Windrush arrived at Tilbury in June 1948 carrying 492 passengers from the Caribbean. They came to help rebuild post-war Britain and are known as the Windrush Generation."
    },
    {
      "q": "What is the National Lottery?",
      "a": "C",
      "options": {
        "A": "A government savings scheme",
        "B": "A tax",
        "C": "A lottery where money raised funds good causes arts heritage and sport",
        "D": "A private gambling company"
      },
      "category": "Everyday Life",
      "explanation": "The National Lottery was established in 1994. It raises millions of pounds weekly for good causes including arts heritage sport and voluntary organisations."
    },
    {
      "q": "What is the role of trade unions?",
      "a": "B",
      "options": {
        "A": "To manage businesses",
        "B": "To represent workers' interests and negotiate pay and conditions with employers",
        "C": "To train workers",
        "D": "To collect taxes from businesses"
      },
      "category": "Everyday Life",
      "explanation": "Trade unions represent workers' interests. They negotiate pay and working conditions with employers and protect members' rights at work."
    },
    {
      "q": "What is the national minimum wage and who sets it?",
      "a": "A",
      "options": {
        "A": "The lowest legal pay rate set by the government usually reviewed annually",
        "B": "An average wage set by trade unions",
        "C": "A recommended wage set by businesses",
        "D": "A European Union requirement"
      },
      "category": "Everyday Life",
      "explanation": "The national minimum wage is the lowest hourly rate employers can legally pay. It is set by the government usually following advice from the Low Pay Commission."
    },
    {
      "q": "What is the purpose of income tax?",
      "a": "C",
      "options": {
        "A": "To fund local councils",
        "B": "To pay the Royal Family",
        "C": "To fund public services like the NHS schools and defence",
        "D": "To pay MPs' salaries"
      },
      "category": "Everyday Life",
      "explanation": "Income tax funds public services including the NHS schools defence and benefits. The more you earn the more you pay (progressive system)."
    },
    {
      "q": "What does HMRC stand for?",
      "a": "B",
      "options": {
        "A": "Her Majesty's Royal Council",
        "B": "His Majesty's Revenue and Customs",
        "C": "Her Majesty's Resources Commission",
        "D": "Home Ministry Revenue Collection"
      },
      "category": "Everyday Life",
      "explanation": "HMRC stands for His Majesty's Revenue and Customs. It is the UK government's tax authority responsible for collecting taxes and paying some benefits."
    },
    {
      "q": "What is National Insurance?",
      "a": "A",
      "options": {
        "A": "Contributions that entitle you to benefits like the state pension and jobseeker's allowance",
        "B": "Health insurance",
        "C": "House insurance",
        "D": "Car insurance"
      },
      "category": "Everyday Life",
      "explanation": "National Insurance (NI) contributions are paid by employees employers and the self-employed. They fund state benefits including the state pension and NHS."
    },
    {
      "q": "What is the state pension?",
      "a": "C",
      "options": {
        "A": "A private pension",
        "B": "A benefit for all over 60",
        "C": "A regular payment from the government when you reach state pension age based on NI contributions",
        "D": "A company pension"
      },
      "category": "Everyday Life",
      "explanation": "The state pension is a regular payment from the government when you reach state pension age. The amount depends on your National Insurance contribution record."
    },
    {
      "q": "What is the current state pension age in the UK?",
      "a": "B",
      "options": {
        "A": "60 for women 65 for men",
        "B": "66 for both men and women (rising to 67 by 2028)",
        "C": "65 for everyone",
        "D": "70 for everyone"
      },
      "category": "Everyday Life",
      "explanation": "The state pension age is currently 66 for both men and women. It is planned to rise to 67 between 2026 and 2028 and to 68 thereafter."
    },
    {
      "q": "What is universal credit?",
      "a": "A",
      "options": {
        "A": "A benefit that replaced several previous benefits for working age people on low incomes",
        "B": "A credit card scheme",
        "C": "A government loan",
        "D": "A housing benefit only"
      },
      "category": "Everyday Life",
      "explanation": "Universal Credit replaced several benefits including Jobseeker's Allowance and Income Support. It supports working age people on low incomes or out of work."
    },
    {
      "q": "What is child benefit?",
      "a": "C",
      "options": {
        "A": "Money for children's school expenses",
        "B": "Free school meals",
        "C": "A payment to parents or guardians for children they are responsible for",
        "D": "Free childcare"
      },
      "category": "Everyday Life",
      "explanation": "Child Benefit is a payment to parents or guardians for children under 16 (or under 20 in approved education). Higher earners may have to pay some or all of it back."
    },
    {
      "q": "What is the difference between a solicitor and a barrister?",
      "a": "B",
      "options": {
        "A": "No difference",
        "B": "Solicitors deal with legal matters outside court barristers represent clients in court",
        "C": "Solicitors work in criminal law barristers in civil law",
        "D": "Barristers are more senior"
      },
      "category": "Community",
      "explanation": "Solicitors handle legal matters like property wills and initial advice. Barristers are specialists who represent clients in court and are instructed by solicitors."
    },
    {
      "q": "What is legal aid?",
      "a": "A",
      "options": {
        "A": "Government funding to help people who cannot afford legal representation",
        "B": "Free advice from police",
        "C": "A law centre",
        "D": "Insurance for legal costs"
      },
      "category": "Community",
      "explanation": "Legal aid is government funding to help people who cannot afford to pay for legal advice or representation. Eligibility depends on income and the type of case."
    },
    {
      "q": "What is the ombudsman?",
      "a": "C",
      "options": {
        "A": "A police commissioner",
        "B": "A judge",
        "C": "An independent official who investigates complaints against public bodies",
        "D": "A government minister"
      },
      "category": "Community",
      "explanation": "An ombudsman is an independent official who investigates complaints against public bodies such as the NHS local councils or financial companies."
    },
    {
      "q": "What is the role of local councils?",
      "a": "B",
      "options": {
        "A": "To make national laws",
        "B": "To provide local services such as rubbish collection planning roads and libraries",
        "C": "To run the NHS",
        "D": "To manage schools nationally"
      },
      "category": "Government",
      "explanation": "Local councils provide local services including refuse collection planning permissions local roads housing libraries parks and leisure facilities."
    },
    {
      "q": "What is council housing?",
      "a": "A",
      "options": {
        "A": "Housing provided by the local council at affordable rents for those who need it",
        "B": "Free housing for all",
        "C": "Government-owned luxury flats",
        "D": "Housing only for the elderly"
      },
      "category": "Everyday Life",
      "explanation": "Council housing (social housing) is provided by local councils at affordable rents. There is usually a waiting list and priority goes to those most in need."
    },
    {
      "q": "What is planning permission?",
      "a": "C",
      "options": {
        "A": "Permission to move house",
        "B": "Permission to buy land",
        "C": "Approval from the local council required before building or significantly changing a property",
        "D": "A building certificate"
      },
      "category": "Community",
      "explanation": "Planning permission is required from the local council before building a new structure or making significant changes to an existing one."
    },
    {
      "q": "What is a Grade I listed building?",
      "a": "B",
      "options": {
        "A": "A new building",
        "B": "A building of exceptional historic or architectural interest",
        "C": "A council-owned building",
        "D": "A building scheduled for demolition"
      },
      "category": "Culture",
      "explanation": "Grade I listed buildings are of exceptional interest. Only about 2% of listed buildings are Grade I. They have the highest level of protection."
    },
    {
      "q": "What is the green belt?",
      "a": "A",
      "options": {
        "A": "Protected land around cities where building is restricted to prevent urban sprawl",
        "B": "A cycle route",
        "C": "Agricultural land",
        "D": "A National Park"
      },
      "category": "Everyday Life",
      "explanation": "The green belt is protected land around urban areas where building is restricted. It prevents cities from merging and preserves the countryside."
    },
    {
      "q": "What is a National Park in the UK?",
      "a": "C",
      "options": {
        "A": "A government-owned theme park",
        "B": "A zoo",
        "C": "A protected area of outstanding natural beauty where development is controlled",
        "D": "A sports facility"
      },
      "category": "Culture",
      "explanation": "National Parks are protected areas of outstanding natural beauty. There are 15 in the UK including the Lake District Peak District and Snowdonia."
    },
    {
      "q": "What is the National Health Service Constitution?",
      "a": "B",
      "options": {
        "A": "A law creating the NHS",
        "B": "A document setting out the rights and responsibilities of patients and staff",
        "C": "The NHS budget",
        "D": "A list of NHS services"
      },
      "category": "Everyday Life",
      "explanation": "The NHS Constitution sets out the rights and responsibilities of patients and staff. It includes the right to access NHS services and the right to be treated with dignity."
    },
    {
      "q": "What is a GP (General Practitioner)?",
      "a": "A",
      "options": {
        "A": "A family doctor who is usually the first point of contact for health issues",
        "B": "A hospital specialist",
        "C": "A dentist",
        "D": "A physiotherapist"
      },
      "category": "Everyday Life",
      "explanation": "A GP is a family doctor usually the first point of contact for health concerns. They treat a wide range of conditions and refer patients to specialists when needed."
    },
    {
      "q": "What is NHS 111?",
      "a": "C",
      "options": {
        "A": "The emergency number",
        "B": "The doctor's direct line",
        "C": "A non-emergency medical helpline for urgent but non-life-threatening conditions",
        "D": "A mental health line"
      },
      "category": "Everyday Life",
      "explanation": "NHS 111 is for urgent medical help that is not life-threatening. Call 999 for emergencies. 111 advisers can arrange appointments direct to services."
    },
    {
      "q": "What is a hospice?",
      "a": "B",
      "options": {
        "A": "A hospital for the elderly",
        "B": "A place providing palliative care and support for people with terminal illnesses and their families",
        "C": "A private hospital",
        "D": "A mental health facility"
      },
      "category": "Everyday Life",
      "explanation": "A hospice provides specialist palliative care and support for people with terminal illnesses and their families focusing on quality of life rather than cure."
    },
    {
      "q": "What is the primary school age in England?",
      "a": "A",
      "options": {
        "A": "5-11 years",
        "B": "4-11 years",
        "C": "5-12 years",
        "D": "6-11 years"
      },
      "category": "Everyday Life",
      "explanation": "Primary school in England covers ages 5-11 (Years 1-6). Children then move to secondary school at age 11."
    },
    {
      "q": "What are GCSEs?",
      "a": "C",
      "options": {
        "A": "University entrance exams",
        "B": "Primary school tests",
        "C": "Qualifications taken at age 15-16 at the end of compulsory secondary education",
        "D": "Professional qualifications"
      },
      "category": "Everyday Life",
      "explanation": "GCSEs (General Certificate of Secondary Education) are taken at around 15-16. They are the main qualification at the end of compulsory school."
    },
    {
      "q": "What are A-levels?",
      "a": "B",
      "options": {
        "A": "Primary school tests",
        "B": "Advanced qualifications taken at 17-18 used for university entry",
        "C": "University degrees",
        "D": "Professional qualifications"
      },
      "category": "Everyday Life",
      "explanation": "A-levels are taken at 17-18 and are the main route to university in England and Wales. Students typically take 3 A-levels."
    },
    {
      "q": "What is UCAS?",
      "a": "A",
      "options": {
        "A": "The organisation through which students apply for university in the UK",
        "B": "A type of qualification",
        "C": "A student union",
        "D": "A government department"
      },
      "category": "Everyday Life",
      "explanation": "UCAS (Universities and Colleges Admissions Service) is the organisation through which students apply for full-time undergraduate courses at UK universities."
    },
    {
      "q": "What is the Duke of Edinburgh Award?",
      "a": "C",
      "options": {
        "A": "A prize for the best student",
        "B": "A military award",
        "C": "A youth achievement programme recognising volunteering skills physical and expeditions",
        "D": "A government grant"
      },
      "category": "Culture",
      "explanation": "The Duke of Edinburgh's Award is a youth achievement programme offering Bronze Silver and Gold awards for volunteering skills physical activities and expeditions."
    },
    {
      "q": "What sport is associated with Wimbledon?",
      "a": "B",
      "options": {
        "A": "Golf",
        "B": "Tennis",
        "C": "Cricket",
        "D": "Athletics"
      },
      "category": "Culture",
      "explanation": "Wimbledon in London hosts the most prestigious tennis tournament in the world. It is one of the four Grand Slams and is famous for strawberries and cream."
    },
    {
      "q": "What is the Ashes?",
      "a": "A",
      "options": {
        "A": "A cricket series between England and Australia",
        "B": "A football trophy",
        "C": "A horse racing event",
        "D": "A rugby competition"
      },
      "category": "Culture",
      "explanation": "The Ashes is a cricket test series between England and Australia held alternately in England and Australia. It began in 1882 and is one of cricket's greatest rivalries."
    },
    {
      "q": "What is Six Nations rugby?",
      "a": "C",
      "options": {
        "A": "A World Cup event",
        "B": "A European football competition",
        "C": "An annual rugby union competition between England France Ireland Italy Scotland and Wales",
        "D": "An Olympic event"
      },
      "category": "Culture",
      "explanation": "The Six Nations Championship is an annual rugby union competition between England France Ireland Italy Scotland and Wales held in February and March."
    },
    {
      "q": "What does FIFA stand for and what does it govern?",
      "a": "B",
      "options": {
        "A": "Football in Europe only",
        "B": "F\u00e9d\u00e9ration Internationale de Football Association \u2014 the international governing body of football",
        "C": "British football",
        "D": "Amateur football only"
      },
      "category": "Culture",
      "explanation": "FIFA (F\u00e9d\u00e9ration Internationale de Football Association) is the international governing body of association football. It organises the FIFA World Cup."
    },
    {
      "q": "What is the significance of Robbie Burns Night?",
      "a": "A",
      "options": {
        "A": "It celebrates Scotland's national poet Robert Burns on January 25th each year",
        "B": "It marks Scottish independence",
        "C": "It is Scotland's national day",
        "D": "It celebrates the Highland Games"
      },
      "category": "Culture",
      "explanation": "Burns Night on January 25th celebrates the life and poetry of Robert Burns Scotland's national poet. Celebrations include haggis neeps and tatties and reciting Burns' poetry."
    },
    {
      "q": "What is the Cheltenham Festival?",
      "a": "C",
      "options": {
        "A": "A music festival",
        "B": "A food festival",
        "C": "A major horse racing festival held annually in March",
        "D": "A literature festival"
      },
      "category": "Culture",
      "explanation": "The Cheltenham Festival is a major National Hunt horse racing festival held in March. The Gold Cup is its most prestigious race."
    },
    {
      "q": "What is the significance of the Peace of Westphalia?",
      "a": "D",
      "options": {
        "A": "It ended the English Civil War",
        "B": "It was signed in the UK",
        "C": "It created the British Empire",
        "D": "It was a series of peace treaties in 1648 ending wars in Europe establishing the nation-state concept"
      },
      "category": "History",
      "explanation": "The Peace of Westphalia (1648) ended the Thirty Years War in Europe and established the concept of national sovereignty and the modern state system."
    },
    {
      "q": "What is the significance of the Enlightenment?",
      "a": "B",
      "options": {
        "A": "A religious movement",
        "B": "An 18th century intellectual movement emphasising reason science and individual rights",
        "C": "A political party",
        "D": "An artistic movement"
      },
      "category": "History",
      "explanation": "The Enlightenment was an 18th century intellectual movement that emphasised reason scientific thinking and individual rights. Many British thinkers contributed including John Locke and David Hume."
    },
    {
      "q": "Who was Adam Smith?",
      "a": "A",
      "options": {
        "A": "A Scottish economist who wrote The Wealth of Nations founding modern economics",
        "B": "A British Prime Minister",
        "C": "A Scottish king",
        "D": "A British inventor"
      },
      "category": "History",
      "explanation": "Adam Smith (1723-1790) was a Scottish economist who wrote The Wealth of Nations (1776) laying the foundations of modern economics and free market theory."
    },
    {
      "q": "What is the significance of Trafalgar Square?",
      "a": "B",
      "options": {
        "A": "The seat of Parliament",
        "B": "A famous public square in London commemorating the Battle of Trafalgar",
        "C": "The location of the Tower of London",
        "D": "The home of the BBC"
      },
      "category": "The UK",
      "explanation": "Trafalgar Square in central London commemorates the Battle of Trafalgar (1805) where Admiral Nelson defeated the French and Spanish fleet. Nelson's Column stands at its centre."
    },
    {
      "q": "What is the significance of the Battle of Trafalgar?",
      "a": "A",
      "options": {
        "A": "Nelson's victory over France and Spain establishing British naval supremacy",
        "B": "The defeat of Napoleon at Waterloo",
        "C": "The end of World War 1",
        "D": "A victory against the Spanish Armada"
      },
      "category": "History",
      "explanation": "The Battle of Trafalgar (1805) saw Admiral Nelson defeat the combined French and Spanish fleet. Britain's naval supremacy was established though Nelson himself was killed."
    },
    {
      "q": "Who was Admiral Lord Nelson?",
      "a": "C",
      "options": {
        "A": "A Prime Minister",
        "B": "A king",
        "C": "A naval commander who won the Battle of Trafalgar but was killed in the battle",
        "D": "A general"
      },
      "category": "History",
      "explanation": "Admiral Lord Nelson was Britain's greatest naval commander. He won the Battle of Trafalgar in 1805 establishing British naval dominance but was killed by a French sniper during the battle."
    },
    {
      "q": "What is the significance of the River Thames?",
      "a": "B",
      "options": {
        "A": "It is the longest river in the UK",
        "B": "It flows through London and has been central to Britain's history and trade",
        "C": "It forms the border between England and Wales",
        "D": "It is navigable for its entire length"
      },
      "category": "The UK",
      "explanation": "The Thames flows 215 miles through southern England including London. It has been central to London's growth trade and history for millennia."
    },
    {
      "q": "What is the significance of Oxford and Cambridge universities?",
      "a": "A",
      "options": {
        "A": "They are the oldest universities in the UK and among the most prestigious in the world",
        "B": "They are the largest universities",
        "C": "They are free to attend",
        "D": "They are government-run institutions"
      },
      "category": "Culture",
      "explanation": "Oxford (founded c.1096) and Cambridge (founded 1209) are the oldest universities in England and among the most prestigious in the world. Together they are sometimes called Oxbridge."
    },
    {
      "q": "What is habeas corpus and why is it important?",
      "a": "C",
      "options": {
        "A": "A type of court order",
        "B": "A European law",
        "C": "A fundamental right preventing imprisonment without trial established in 1679",
        "D": "A constitutional convention"
      },
      "category": "Values",
      "explanation": "Habeas corpus (Latin: you have the body) is the right not to be imprisoned without trial. The Habeas Corpus Act 1679 established this fundamental protection of liberty."
    },
    {
      "q": "What is the significance of 1689 in British history?",
      "a": "B",
      "options": {
        "A": "The Magna Carta was signed",
        "B": "The Bill of Rights was passed establishing constitutional monarchy",
        "C": "Parliament was created",
        "D": "England and Scotland united"
      },
      "category": "History",
      "explanation": "In 1689 the Bill of Rights was passed following the Glorious Revolution. It established the principle of constitutional monarchy limiting royal power and strengthening Parliament."
    },
    {
      "q": "What is proportional representation and does the UK use it?",
      "a": "A",
      "options": {
        "A": "A system where parties get seats proportional to votes \u2014 the UK does not use it for general elections",
        "B": "The UK's current voting system",
        "C": "A system used in Scotland only",
        "D": "A system where only the winner gets seats"
      },
      "category": "Government",
      "explanation": "Proportional representation allocates seats in proportion to votes. The UK uses First Past the Post for general elections not PR. Scotland Wales and Northern Ireland use PR for devolved elections."
    },
    {
      "q": "What are the responsibilities of citizenship?",
      "a": "C",
      "options": {
        "A": "Only paying taxes",
        "B": "Only obeying the law",
        "C": "Obeying the law paying taxes voting respecting others' rights and volunteering",
        "D": "Only voting"
      },
      "category": "Values",
      "explanation": "Citizens have responsibilities including obeying the law paying taxes voting participating in civic life treating others fairly and respecting the rule of law."
    },
    {
      "q": "What is the significance of tolerating other religions in British society?",
      "a": "B",
      "options": {
        "A": "It means everyone must be religious",
        "B": "It is a fundamental British value meaning people can practice their religion freely without discrimination",
        "C": "It only applies to Christianity",
        "D": "It is a recent development"
      },
      "category": "Values",
      "explanation": "Religious tolerance is a fundamental British value. People have the right to practice their religion or no religion freely subject to the law. Discrimination on religious grounds is illegal."
    },
    {
      "q": "What is the significance of free speech in the UK?",
      "a": "A",
      "options": {
        "A": "People can express views freely within the law \u2014 but not to incite hatred or violence",
        "B": "People can say absolutely anything",
        "C": "Only the press has free speech",
        "D": "Free speech is not protected"
      },
      "category": "Values",
      "explanation": "Freedom of expression is a fundamental right in the UK but it has limits \u2014 speech that incites hatred violence or is defamatory can be illegal. The press is free but regulated."
    },
    {
      "q": "What is the role of the monarchy in modern Britain?",
      "a": "C",
      "options": {
        "A": "To make laws",
        "B": "To run the government",
        "C": "A constitutional role \u2014 Head of State who reigns but does not govern with ceremonial and diplomatic functions",
        "D": "To manage the military directly"
      },
      "category": "Government",
      "explanation": "The monarch is Head of State and plays a constitutional ceremonial and diplomatic role. Day-to-day government is run by elected politicians. The monarch acts on ministerial advice."
    },
    {
      "q": "What is the Privy Council?",
      "a": "B",
      "options": {
        "A": "The Prime Minister's private advisers",
        "B": "A formal body that advises the monarch comprising senior politicians judges and other senior figures",
        "C": "A House of Lords committee",
        "D": "A secret government committee"
      },
      "category": "Government",
      "explanation": "The Privy Council is a formal advisory body to the monarch. It includes senior politicians judges archbishops and others. It formally approves Orders in Council."
    },
    {
      "q": "What is the Civil List?",
      "a": "A",
      "options": {
        "A": "Formerly the money given to the Royal Family now replaced by the Sovereign Grant",
        "B": "A list of civil servants",
        "C": "A list of public holidays",
        "D": "A register of charities"
      },
      "category": "Government",
      "explanation": "The Civil List was the annual payment to the Royal Family replaced in 2012 by the Sovereign Grant \u2014 a proportion of Crown Estate profits used for official duties."
    },
    {
      "q": "What is the difference between England and the UK?",
      "a": "C",
      "options": {
        "A": "They are the same thing",
        "B": "England is larger",
        "C": "England is one of four countries within the United Kingdom",
        "D": "England is the government the UK is the country"
      },
      "category": "The UK",
      "explanation": "England is one of the four countries (England Scotland Wales Northern Ireland) that make up the United Kingdom. People often incorrectly use England and UK interchangeably."
    },
    {
      "q": "What is the significance of the 1066 Battle of Hastings?",
      "a": "B",
      "options": {
        "A": "It ended Roman rule",
        "B": "William the Conqueror defeated King Harold beginning Norman rule and transforming English society",
        "C": "Scotland was united with England",
        "D": "The Vikings were defeated"
      },
      "category": "History",
      "explanation": "At the Battle of Hastings in 1066 William the Conqueror defeated King Harold. Norman rule transformed English society introducing French language feudalism and new legal and administrative systems."
    },
    {
      "q": "What is the significance of the English language globally?",
      "a": "A",
      "options": {
        "A": "English is one of the world's most widely spoken languages partly due to the British Empire",
        "B": "It is only spoken in the UK and USA",
        "C": "It became global after WW2 only",
        "D": "Only 500 million people speak it"
      },
      "category": "Culture",
      "explanation": "English is spoken by over 1.5 billion people worldwide. Its global spread was partly through the British Empire and later American cultural influence. It is the language of international business."
    },
    {
      "q": "What is the significance of the UK's membership of NATO?",
      "a": "C",
      "options": {
        "A": "It ended after Brexit",
        "B": "It is only for trade",
        "C": "NATO is a military alliance \u2014 the UK is a founding member committed to collective defence",
        "D": "The UK only recently joined"
      },
      "category": "The UK",
      "explanation": "The UK is a founding member of NATO (1949) \u2014 a military alliance where an attack on one member is treated as an attack on all. It is a cornerstone of UK defence policy."
    },
    {
      "q": "What is the significance of the UK's nuclear weapons?",
      "a": "B",
      "options": {
        "A": "The UK has the world's largest nuclear arsenal",
        "B": "The UK has an independent nuclear deterrent based on Trident submarines",
        "C": "The UK shares nuclear weapons with France",
        "D": "The UK recently gave up nuclear weapons"
      },
      "category": "The UK",
      "explanation": "The UK maintains an independent nuclear deterrent based on Trident nuclear submarines. It is one of five permanent members of the UN Security Council with recognised nuclear weapons."
    },
    {
      "q": "What is the UN Security Council?",
      "a": "A",
      "options": {
        "A": "A body of 15 nations with primary responsibility for international peace and security \u2014 the UK is a permanent member",
        "B": "A trade organisation",
        "C": "A world government",
        "D": "A European organisation"
      },
      "category": "The UK",
      "explanation": "The UN Security Council has 15 members with 5 permanent members (USA UK France Russia China) who have veto power. It maintains international peace and security."
    },
    {
      "q": "What is the Commonwealth Games?",
      "a": "C",
      "options": {
        "A": "The Olympic Games",
        "B": "A European sports event",
        "C": "A multi-sport event held every 4 years between Commonwealth nations",
        "D": "A British national sports event"
      },
      "category": "Culture",
      "explanation": "The Commonwealth Games is a multi-sport event held every 4 years featuring athletes from the 56 Commonwealth nations. The UK last hosted in Birmingham in 2022."
    },
    {
      "q": "What are the home nations in sport?",
      "a": "B",
      "options": {
        "A": "UK and Ireland",
        "B": "England Scotland Wales and Northern Ireland which compete separately in many sports",
        "C": "England and Scotland only",
        "D": "The UK competes as one team always"
      },
      "category": "Culture",
      "explanation": "In many sports England Scotland Wales and Northern Ireland compete as separate national teams. In others such as the Olympics they compete together as Team GB."
    },
    {
      "q": "What is Team GB?",
      "a": "A",
      "options": {
        "A": "The combined Great Britain and Northern Ireland team that competes in the Olympic and Paralympic Games",
        "B": "The England football team",
        "C": "A British sports company",
        "D": "The Commonwealth Games team"
      },
      "category": "Culture",
      "explanation": "Team GB represents Great Britain and Northern Ireland at the Olympic and Paralympic Games. Athletes from all four home nations can compete for Team GB."
    },
    {
      "q": "What is the significance of the 2012 Olympics?",
      "a": "C",
      "options": {
        "A": "The first time the UK hosted the Olympics",
        "B": "Britain won its most medals",
        "C": "London hosted the Summer Olympics marking a major national celebration",
        "D": "The UK came first in the medal table"
      },
      "category": "Culture",
      "explanation": "London hosted the 2012 Summer Olympics and Paralympics. It was widely considered a great success with Britain winning 65 medals including 29 gold placing third in the medal table."
    },
    {
      "q": "What is Remembrance Sunday?",
      "a": "B",
      "options": {
        "A": "A public holiday",
        "B": "The nearest Sunday to 11 November when the UK honours those who died in wars",
        "C": "The anniversary of VE Day",
        "D": "A day of fasting"
      },
      "category": "Culture",
      "explanation": "Remembrance Sunday is observed on the nearest Sunday to 11 November. Services are held across the UK to honour those who died in wars. The national service is at the Cenotaph in Whitehall."
    },
    {
      "q": "What are the main reasons people migrate to the UK?",
      "a": "A",
      "options": {
        "A": "Work study family reunification asylum seeking and better opportunities",
        "B": "Only to work",
        "C": "Only for asylum",
        "D": "Only for family reasons"
      },
      "category": "Everyday Life",
      "explanation": "People migrate to the UK for many reasons including work (especially skilled workers) study family reunification seeking asylum and seeking better opportunities and quality of life."
    },
    {
      "q": "What is an asylum seeker?",
      "a": "C",
      "options": {
        "A": "Someone on a work visa",
        "B": "An illegal immigrant",
        "C": "Someone who has fled their country and applied for protection in another country",
        "D": "A student visa holder"
      },
      "category": "Everyday Life",
      "explanation": "An asylum seeker is someone who has left their country fearing persecution and applied for protection (refugee status) in another country. Their claim must be assessed before status is granted."
    },
    {
      "q": "What is a refugee?",
      "a": "B",
      "options": {
        "A": "An economic migrant",
        "B": "Someone whose asylum claim has been accepted because they face genuine persecution in their home country",
        "C": "Any person living outside their birth country",
        "D": "An illegal immigrant"
      },
      "category": "Everyday Life",
      "explanation": "A refugee is someone whose asylum claim has been accepted because they face genuine persecution based on race religion nationality political opinion or membership of a social group."
    },
    {
      "q": "What is the Windrush Scandal?",
      "a": "A",
      "options": {
        "A": "When Windrush generation Caribbean migrants were wrongly detained deported or denied rights despite being legal UK residents",
        "B": "When the Windrush ship sank",
        "C": "A dispute about immigration policy",
        "D": "A racial discrimination case"
      },
      "category": "History",
      "explanation": "The Windrush Scandal emerged in 2018 when many Windrush generation Caribbean migrants were wrongly detained deported or denied rights because they could not prove their legal status despite living in the UK for decades."
    },
    {
      "q": "What is multiculturalism in Britain?",
      "a": "C",
      "options": {
        "A": "Everyone must speak English",
        "B": "Only British culture is accepted",
        "C": "The presence of many different cultures ethnicities and religions living together in British society",
        "D": "A government policy"
      },
      "category": "Culture",
      "explanation": "Britain is a multicultural society with people from many backgrounds living together. This diversity enriches British culture and society though it also presents challenges of integration and cohesion."
    },
    {
      "q": "What is a charity in the UK?",
      "a": "B",
      "options": {
        "A": "A government department",
        "B": "A non-profit organisation registered with the Charity Commission that works for public benefit",
        "C": "A private company",
        "D": "A voluntary group with no legal status"
      },
      "category": "Community",
      "explanation": "A charity is a non-profit organisation registered with the Charity Commission (England and Wales). It must work for public benefit and has tax advantages. The UK has over 170000 registered charities."
    },
    {
      "q": "What is volunteering?",
      "a": "A",
      "options": {
        "A": "Giving time freely to help others or causes without payment",
        "B": "Working for low pay",
        "C": "Compulsory community service",
        "D": "Working for charity"
      },
      "category": "Community",
      "explanation": "Volunteering means giving time freely to help communities charities or causes without payment. Britain has a strong volunteering tradition with millions of volunteers contributing billions of hours each year."
    }
  ]
};

// Get random questions for a category or mix
function getQuestions(testType, category, count, exclude) {
  const bank = testType === 'driving' ? QUESTION_BANKS.driving_theory : QUESTION_BANKS.life_in_uk;
  let pool = bank.filter(q => !exclude || !exclude.includes(q.q));
  if (category && category !== 'all') {
    pool = pool.filter(q => q.category === category);
    if (pool.length < count) pool = bank.filter(q => !exclude || !exclude.includes(q.q));
  }
  const shuffled = pool.sort(() => Math.random() - 0.5);
  return shuffled.slice(0, count);
}

// Get questions focused on weak areas
function getWeakAreaQuestions(testType, weakCategories, count) {
  const bank = testType === 'driving' ? QUESTION_BANKS.driving_theory : QUESTION_BANKS.life_in_uk;
  let weakPool = bank.filter(q => weakCategories.some(w => q.category.toLowerCase().includes(w.toLowerCase())));
  if (weakPool.length < count) weakPool = [...bank];
  const shuffled = weakPool.sort(() => Math.random() - 0.5);
  return shuffled.slice(0, count);
}

exports.handler = async function(event) {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }
  try {
    const body = JSON.parse(event.body);
    const apiKey = process.env.ANTHROPIC_API_KEY;

    // Inject exam context if returning user
    const examContext = body.examContext || '';
    const fullSystemPrompt = SYSTEM_PROMPT + (examContext ? '\n\n' + examContext : '');

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5',
        max_tokens: 600,
        system: fullSystemPrompt,
        messages: body.messages
      })
    });

    const data = await response.json();
    console.log('Status:', response.status);

    return {
      statusCode: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(data)
    };

  } catch (err) {
    console.log('Error:', err.message);
    return {
      statusCode: 500,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ error: err.message })
    };
  }
};
