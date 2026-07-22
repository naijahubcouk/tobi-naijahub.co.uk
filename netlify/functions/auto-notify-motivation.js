// Netlify scheduled function — daily motivation
// Runs every day at 8am UTC via netlify.toml
const { sendTaggedPush } = require('./notify-helper');

const MOTIVATIONS = [
  "Your journey is unique. Don't compare your chapter 2 to someone else's chapter 20. 💚",
  "Every small step counts. One application, one course, one connection can change everything. 💪",
  "You didn't come this far to stop now. Keep pushing. 🚀",
  "Growth feels uncomfortable. That's often a sign you're moving forward. 🌱",
  "Build patiently. Most success stories are years in the making, not overnight. ⏳",
  "Celebrate small wins today. Paid a bill? Sent a CV? That's progress. 🎉",
  "Opportunities often hide behind rejection. Keep knocking. 🚪",
  "Invest in yourself. Skills are one of the few things nobody can take from you. 📚",
  "Community matters. Don't be afraid to ask for help or support. 🤝",
  "Your current situation is not your final destination. ☀️",
  "One good opportunity can change your entire year. Stay ready. 💼",
  "Remember why you started this journey. Let that purpose drive you. ❤️",
  "You're building a future, not just paying today's bills. 🏡",
  "Being an immigrant is not easy, but your resilience is your superpower. 🌍",
  "Move at your own pace. Progress is progress. 🚶",
  "The information you learn today can save you money, time, and stress tomorrow. 💡",
  "Focus on what you can control. Let go of what you can't. 🎯",
  "Your background is part of your strength, not a limitation. 🌟",
  "Give yourself credit. Living and thriving in a new country takes courage. 🙌",
  "Keep showing up. Consistency beats motivation every time. 🚀",
  "You left Nigeria with a dream. Every day in the UK is a step closer to making it real. 🇳🇬🇬🇧",
  "Brick by brick, you are building something solid. Don't rush what's meant to last. 🧱",
  "Even the darkest nights end. Keep going — your morning is coming. 🌙",
  "Your accent, your story, your culture — these are your gifts, not your barriers. 💬",
  "Clarity is power. Know what you want, write it down, and take one step today. 🎯",
  "Rest when you need to. A rested mind makes better decisions. 😴",
  "You are not just surviving in the UK — you are building a legacy. 🏆",
  "The sacrifice you're making now is someone else's inheritance. Think big. 💰",
  "Nobody can take away your education, your skills, or your character. Invest in all three. 🎓",
  "There are Nigerians who have walked this path before you and thrived. You will too. 💚",
  "A setback is a setup for a comeback. Your story is not over. 📖",
  "Tell yourself something kind today. You are doing better than you think. 🌸",
  "The UK is big enough for your dreams. Don't shrink yourself to fit in. 🌏",
  "Hard work is not wasted. Every effort is a seed you're planting for your future. 🌻",
  "You don't need permission to succeed. Go and get what's yours. 💥",
  "Stay connected to your roots. Your culture is your strength in a foreign land. 🇳🇬",
  "Auntie Tobi is proud of you. Keep going. 💚 — Auntie Tobi",
];

exports.handler = async function(event) {
  try {
    const dayOfYear = Math.floor((Date.now() - new Date(new Date().getFullYear(), 0, 0)) / 86400000);
    const quote = MOTIVATIONS[dayOfYear % MOTIVATIONS.length];

    const result = await sendTaggedPush(
      'motivation',
      '💪 Motivation from Auntie Tobi',
      quote,
      'https://auntietobi.co.uk/?action=motivation&content=' + encodeURIComponent(quote)
    );

    return {
      statusCode: 200,
      body: JSON.stringify({ sent: true, quote, oneSignal: result.data })
    };

  } catch (err) {
    console.error('auto-notify-motivation error:', err.message);
    return { statusCode: 500, body: err.message };
  }
};
