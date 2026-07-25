'use strict';
const { sendTaggedPush } = require('./notify-helper');

const PRAYERS = [
  { prayer: "Lord, thank You for this new day. Guide my steps, protect my family, and let Your favour go before me today. Amen.", b1: "What Nigerian community events are near me?", b2: "Find a Nigerian business near me" },
  { prayer: "Father, I commit this day into Your hands. Whatever I face today, remind me that I am not alone. Amen.", b1: "What Nigerian community events are near me?", b2: "Find a Nigerian business near me" },
  { prayer: "God, open doors for me today that no man can shut. Let Your grace be sufficient for every challenge I meet. Amen.", b1: "How do I find a job in the UK?", b2: "Find a Nigerian business near me" },
  { prayer: "Lord, I thank You for waking me up with breath in my body. Let this day be productive, peaceful and purposeful. Amen.", b1: "What Nigerian community events are near me?", b2: "Find a Nigerian business near me" },
  { prayer: "Father, cover my household today. Let no evil come near us and let Your angels go before us wherever we go. Amen.", b1: "What Nigerian community events are near me?", b2: "Find a Nigerian business near me" },
  { prayer: "Lord, give me wisdom for every decision today. Let my work be blessed and my efforts rewarded. Amen.", b1: "How do I find a job in the UK?", b2: "How do I improve my UK credit score?" },
  { prayer: "God, I trust You with today. When I am anxious, remind me of Your faithfulness. When I am tired, be my strength. Amen.", b1: "What Nigerian community events are near me?", b2: "Find a Nigerian business near me" },
  { prayer: "Father, as I go out today let me be a blessing to someone. Use me however You see fit. Amen.", b1: "What Nigerian community events are near me?", b2: "Find a Nigerian business near me" },
  { prayer: "Lord, every appointment, every meeting, every journey today — cover it with Your blood. Bring me home safely. Amen.", b1: "What Nigerian community events are near me?", b2: "Find a Nigerian business near me" },
  { prayer: "God of second chances, thank You for today. Let me not take this day for granted. Lead me and I will follow. Amen.", b1: "What Nigerian community events are near me?", b2: "Find a Nigerian business near me" },
  { prayer: "Father, let Your peace that passes all understanding guard my heart and mind today. Amen.", b1: "What Nigerian community events are near me?", b2: "Find a Nigerian business near me" },
  { prayer: "Lord, I pray for favour in every place I go today. Let people be kind to me and doors open before I even knock. Amen.", b1: "How do I find a job in the UK?", b2: "Find a Nigerian business near me" },
  { prayer: "God, thank You for every breath. Help me to be grateful, focused and faithful today. Amen.", b1: "What Nigerian community events are near me?", b2: "Find a Nigerian business near me" },
  { prayer: "Father, protect my children and everyone I love. Let this be a safe and blessed day for my household. Amen.", b1: "What Nigerian community events are near me?", b2: "Find a Nigerian business near me" },
  { prayer: "Lord, I need Your guidance today. Show me the right path and give me the courage to walk in it. Amen.", b1: "What Nigerian community events are near me?", b2: "Find a Nigerian business near me" },
  { prayer: "God, let every plan I have for today align with Your will. What You bless no one can curse. Amen.", b1: "How do I find a job in the UK?", b2: "Find a Nigerian business near me" },
  { prayer: "Father, I release every worry and anxiety at Your feet this morning. You are in control. Amen.", b1: "What Nigerian community events are near me?", b2: "Find a Nigerian business near me" },
  { prayer: "Lord, let Your light shine through me today. Let my words be kind, my actions be loving and my spirit be grateful. Amen.", b1: "What Nigerian community events are near me?", b2: "Find a Nigerian business near me" },
  { prayer: "God, give me strength for what lies ahead today. I cannot do this without You and I am not trying to. Amen.", b1: "What Nigerian community events are near me?", b2: "Find a Nigerian business near me" },
  { prayer: "Father, thank You for another opportunity to get it right. Let today be better than yesterday. Amen.", b1: "How do I find a job in the UK?", b2: "Find a Nigerian business near me" },
  { prayer: "Lord, I pray over my finances today. Open new streams of income and help me to manage what I have wisely. Amen.", b1: "How do I improve my UK credit score?", b2: "Find a Nigerian business near me" },
  { prayer: "God, protect me on the roads today. Cover every journey with Your angels and bring me home safely. Amen.", b1: "What Nigerian community events are near me?", b2: "Find a Nigerian business near me" },
  { prayer: "Father, let my work speak for itself today. Give me excellence, focus and favour in everything I put my hands to. Amen.", b1: "How do I find a job in the UK?", b2: "Find a Nigerian business near me" },
  { prayer: "Lord, I pray for open doors this week. Let every closed door be a redirection to something better. Amen.", b1: "What Nigerian community events are near me?", b2: "Find a Nigerian business near me" },
  { prayer: "God, I declare that today will be a good day. Confusion will not reign and fear will not win. Amen.", b1: "What Nigerian community events are near me?", b2: "Find a Nigerian business near me" },
  { prayer: "Father, be with me in every meeting, every conversation and every decision today. Amen.", b1: "How do I find a job in the UK?", b2: "Find a Nigerian business near me" },
  { prayer: "Lord, thank You for the gift of health. Help me to steward my body and mind well today. Amen.", b1: "What NHS services can I access in the UK?", b2: "Find a Nigerian business near me" },
  { prayer: "God, let Your presence go before me today and make every crooked path straight. Amen.", b1: "What Nigerian community events are near me?", b2: "Find a Nigerian business near me" },
  { prayer: "Father, I pray for clarity today. Remove every cloud of confusion and let me hear Your voice clearly. Amen.", b1: "What Nigerian community events are near me?", b2: "Find a Nigerian business near me" },
  { prayer: "Lord, let this be a day of breakthroughs. What has been blocked will flow. What has been delayed will arrive. Amen.", b1: "What Nigerian community events are near me?", b2: "Find a Nigerian business near me" },
  { prayer: "God, thank You for Your mercy that is new every morning. I receive it fully today. Amen.", b1: "What Nigerian community events are near me?", b2: "Find a Nigerian business near me" },
  { prayer: "Father, I pray for patience today. When things do not go as planned help me to trust Your timing. Amen.", b1: "What Nigerian community events are near me?", b2: "Find a Nigerian business near me" },
  { prayer: "Lord, let joy be my strength today. No matter what comes my way let my spirit remain unshaken. Amen.", b1: "What Nigerian community events are near me?", b2: "Find a Nigerian business near me" },
  { prayer: "God, protect my mind from negative thoughts today. Let me think on things that are true, noble and good. Amen.", b1: "What Nigerian community events are near me?", b2: "Find a Nigerian business near me" },
  { prayer: "Father, I cover every member of my family today. Let no weapon formed against any of us prosper. Amen.", b1: "What Nigerian community events are near me?", b2: "Find a Nigerian business near me" },
  { prayer: "Lord, let my obedience today be greater than yesterday. Shape me into who You have called me to be. Amen.", b1: "What Nigerian community events are near me?", b2: "Find a Nigerian business near me" },
  { prayer: "God, I ask for supernatural energy today. Where I feel weak be my strength. Where I feel lost be my compass. Amen.", b1: "What Nigerian community events are near me?", b2: "Find a Nigerian business near me" },
  { prayer: "Father, let every prayer I have prayed concerning my future be answered in Your perfect time. Amen.", b1: "What Nigerian community events are near me?", b2: "Find a Nigerian business near me" },
  { prayer: "Lord, I thank You in advance for the victories today. What has not yet happened I am already grateful for. Amen.", b1: "How do I find a job in the UK?", b2: "Find a Nigerian business near me" },
  { prayer: "God, let my faith be greater than my fear today. Help me to step out and trust You. Amen.", b1: "What Nigerian community events are near me?", b2: "Find a Nigerian business near me" },
  { prayer: "Father, let me not be distracted from what truly matters today. Keep me focused, keep me disciplined. Amen.", b1: "How do I find a job in the UK?", b2: "Find a Nigerian business near me" },
  { prayer: "Lord, I pray that my children will grow up in health, wisdom and purpose. Protect them today. Amen.", b1: "What Nigerian community events are near me?", b2: "Find a Nigerian business near me" },
  { prayer: "God, let gratitude flow freely from me today. Help me to see the blessings in the ordinary moments. Amen.", b1: "What Nigerian community events are near me?", b2: "Find a Nigerian business near me" },
  { prayer: "Father, I pray for restoration in every area where I have experienced loss. What the enemy has taken restore double. Amen.", b1: "What Nigerian community events are near me?", b2: "Find a Nigerian business near me" },
  { prayer: "Lord, let me walk in integrity today. When no one is watching let me still do what is right. Amen.", b1: "What Nigerian community events are near me?", b2: "Find a Nigerian business near me" },
  { prayer: "God, I ask for new connections today. Bring the right people across my path who will help me grow. Amen.", b1: "What Nigerian community events are near me?", b2: "Find a Nigerian business near me" },
  { prayer: "Father, let this week be a turning point. Something changes this week. Something breaks through. Amen.", b1: "How do I find a job in the UK?", b2: "Find a Nigerian business near me" },
  { prayer: "Lord, protect my mental health today. Where I feel overwhelmed remind me to cast my cares on You. Amen.", b1: "What NHS services can I access in the UK?", b2: "Find a Nigerian business near me" },
  { prayer: "God, let Your name be glorified in everything that happens in my life today. Let my story give someone else hope. Amen.", b1: "What Nigerian community events are near me?", b2: "Find a Nigerian business near me" },
  { prayer: "Father, I declare that no plan of the enemy will succeed against me today. Greater is He that is in me. Amen.", b1: "What Nigerian community events are near me?", b2: "Find a Nigerian business near me" },
  { prayer: "Lord, help me to be the person my family needs me to be today. Give me patience, love and strength. Amen.", b1: "What Nigerian community events are near me?", b2: "Find a Nigerian business near me" },
  { prayer: "God, I pray for financial breakthrough. Let unexpected blessings come from unexpected places today. Amen.", b1: "How do I improve my UK credit score?", b2: "Find a Nigerian business near me" },
  { prayer: "Father, let healing flow through my body and mind today. You are my healer and I trust Your hand. Amen.", b1: "What NHS services can I access in the UK?", b2: "Find a Nigerian business near me" },
  { prayer: "Lord, I pray that every seed I have sown in faith will begin to produce a harvest. The time is now. Amen.", b1: "What Nigerian community events are near me?", b2: "Find a Nigerian business near me" },
  { prayer: "God, protect my reputation today. Let no false accusation stand against me and let the truth always come to light. Amen.", b1: "What Nigerian community events are near me?", b2: "Find a Nigerian business near me" },
  { prayer: "Father, let Your glory show up in my situation today. Let my testimony be someone else's miracle. Amen.", b1: "What Nigerian community events are near me?", b2: "Find a Nigerian business near me" },
  { prayer: "Lord, I commit my plans to You today. Order my steps and help me to walk in Your purpose. Amen.", b1: "How do I find a job in the UK?", b2: "Find a Nigerian business near me" },
  { prayer: "God, I thank You for where I am and I trust You for where I am going. You have never failed me. Amen.", b1: "What Nigerian community events are near me?", b2: "Find a Nigerian business near me" },
  { prayer: "Father, I pray for unity in my household today. Let love and peace reign under this roof. Amen.", b1: "What Nigerian community events are near me?", b2: "Find a Nigerian business near me" },
  { prayer: "Lord, let my light shine so bright today that it draws others toward hope and purpose. Amen.", b1: "What Nigerian community events are near me?", b2: "Find a Nigerian business near me" },
  { prayer: "God, give me a thankful heart even before I see the answer. Teach me to praise You in the waiting. Amen.", b1: "What Nigerian community events are near me?", b2: "Find a Nigerian business near me" },
  { prayer: "Father, every contract, every application, every opportunity I am waiting for — let Your favour fast-track it today. Amen.", b1: "How do I find a job in the UK?", b2: "Find a Nigerian business near me" },
  { prayer: "Lord, I release bitterness and unforgiveness today. Help me to forgive as You have forgiven me. Amen.", b1: "What Nigerian community events are near me?", b2: "Find a Nigerian business near me" },
  { prayer: "God, let today be a day of testimonies. By tonight let me have a reason to praise You. Amen.", b1: "What Nigerian community events are near me?", b2: "Find a Nigerian business near me" },
  { prayer: "Father, I pray for those in my community who are struggling today. Reach them with Your love and provision. Amen.", b1: "What Nigerian community events are near me?", b2: "Find a Nigerian business near me" },
  { prayer: "Lord, thank You for every unanswered prayer that protected me from what I did not know I was asking for. Amen.", b1: "What Nigerian community events are near me?", b2: "Find a Nigerian business near me" },
  { prayer: "God, let Your wisdom guide every word I speak today. Let me build and not destroy with my tongue. Amen.", b1: "What Nigerian community events are near me?", b2: "Find a Nigerian business near me" },
  { prayer: "Father, I will not be moved by what I see today. I choose to walk by faith and not by sight. Amen.", b1: "What Nigerian community events are near me?", b2: "Find a Nigerian business near me" },
  { prayer: "Lord, as I go about my day let me carry Your presence everywhere. Let others feel the difference You make. Amen.", b1: "What Nigerian community events are near me?", b2: "Find a Nigerian business near me" },
  { prayer: "God, I pray for Your divine connections today. The right mentor, the right opportunity, the right open door. Amen.", b1: "What Nigerian community events are near me?", b2: "How do I find a job in the UK?" },
  { prayer: "Father, let every promise You have made over my life begin to manifest. Your word does not return void. Amen.", b1: "What Nigerian community events are near me?", b2: "Find a Nigerian business near me" },
];

exports.handler = async function(event) {
  try {
    const dayOfYear = Math.floor((Date.now() - new Date(new Date().getFullYear(), 0, 0)) / 86400000);
    const prayer = PRAYERS[dayOfYear % PRAYERS.length];

    const url = `https://auntietobi.co.uk/?action=prayer&content=${encodeURIComponent(prayer.prayer)}&b1=${encodeURIComponent(prayer.b1)}&b2=${encodeURIComponent(prayer.b2)}`;

    const result = await sendTaggedPush(
      'prayer',
      '🕊️ Morning Prayer from Auntie Tobi',
      prayer.prayer.substring(0, 100) + '...',
      url
    );

    return {
      statusCode: 200,
      body: JSON.stringify({ sent: true, prayer: prayer.prayer.substring(0, 60), oneSignal: result.data })
    };

  } catch (err) {
    console.error('auto-notify-prayer error:', err.message);
    return { statusCode: 500, body: err.message };
  }
};
