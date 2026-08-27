'use client';

import { useState } from 'react';
import Link from 'next/link';
import { ChevronLeft, X, ChevronRight, Bell, Pencil, Mic, BookMarked, Footprints, Flame, Clock, Zap, Users, Globe, Megaphone, Mic2, Headphones, Shield, BarChart3, Star } from 'lucide-react';
import Navbar from '@/app/components/Navbar';
import Footer from '@/app/components/Footer';

// ── Q&A data: How to Use the App ──
const HOW_TO_QA = [
  {
    emoji: '✍️',
    question: 'How do I write my prayer requests?',
    answer: (
      <ol className="list-decimal list-inside space-y-2 text-ink-soft text-sm leading-relaxed">
        <li>Go to <strong>Home</strong> page and tap <strong>&quot;Write&quot;</strong> in the bottom navigation</li>
        <li>Choose your prayer type: <strong>Family</strong>, <strong>Special</strong>, or <strong>Intercessory</strong></li>
        <li>Tap the <strong>&quot;+ Add Prayer&quot;</strong> button</li>
        <li>Type your prayer point in the text box (e.g. &quot;Lord, heal my mother&quot;)</li>
        <li>Tap <strong>Save</strong> — your prayer is saved and appears in the list</li>
        <li>Tap any prayer to read it in the <strong>Prayer Reader</strong> (large print modal)</li>
        <li>Use <strong>Next / Previous</strong> to move through your prayers, then tap <strong>Amen</strong> to close</li>
      </ol>
    ),
  },
  {
    emoji: '🙏',
    question: 'How do I use the Start-Up Prayer session?',
    answer: (
      <ol className="list-decimal list-inside space-y-2 text-ink-soft text-sm leading-relaxed">
        <li>Tap <strong>&quot;Start-Up&quot;</strong> in the bottom navigation</li>
        <li>Tap the big <strong>&quot;Start Prayer&quot;</strong> button</li>
        <li>The app guides you through <strong>7 steps</strong>, one at a time:
          <ul className="list-disc list-inside ml-4 mt-1 space-y-0.5 text-xs">
            <li><strong>Mercy</strong> — ask for God&apos;s mercy</li>
            <li><strong>Thanksgiving</strong> — thank God for His blessings</li>
            <li><strong>Holy Spirit</strong> — invite the Holy Spirit</li>
            <li><strong>Intercession</strong> — pray for others</li>
            <li><strong>Petition</strong> — present your personal requests</li>
            <li><strong>Warfare</strong> — spiritual warfare prayers</li>
            <li><strong>Prophetic</strong> — prophetic declarations</li>
          </ul>
        </li>
        <li>A <strong>timer</strong> counts down for each step (default 5 minutes total)</li>
        <li>You can <strong>edit the total timer</strong> — tap the pencil icon to change it</li>
        <li>When all steps are done, a <strong>celebration popup</strong> with applause sound plays! 🎉</li>
        <li>Tap <strong>Finish</strong> to end the session</li>
      </ol>
    ),
  },
  {
    emoji: '🔔',
    question: 'How do I set prayer alarms?',
    answer: (
      <ol className="list-decimal list-inside space-y-2 text-ink-soft text-sm leading-relaxed">
        <li>Tap <strong>&quot;Fasting&quot;</strong> in the bottom nav, then go to <strong>Schedule</strong> page, or go directly to <strong>/schedule</strong></li>
        <li>You see 3 default prayer times: <strong>Midnight Hour (12:00 AM)</strong>, <strong>Noon Prayer (12:00 PM)</strong>, <strong>Morning Watch (4:00 AM)</strong></li>
        <li>Tap the <strong>✏️ pencil</strong> icon on any prayer time to change it</li>
        <li>Pick the <strong>Hour</strong> and <strong>Minutes</strong> (every 5 minutes — e.g. 4:20 AM)</li>
        <li>Tap <strong>Save Time</strong></li>
        <li>Tap the <strong>🔔 Bell</strong> icon to open Alarm Settings</li>
        <li>Choose your <strong>alarm sound</strong>: Classic Phone, Church Bells, Soft Chime, Digital Beep, or Morning Praise</li>
        <li>Tap the 🔊 speaker icon to preview each sound</li>
        <li>Toggle <strong>Alarm ON/OFF</strong></li>
        <li>Tap <strong>Test Alarm</strong> to hear it ring now (it rings until you tap Dismiss)</li>
        <li>Use <strong>+ Add</strong> to create more prayer times (e.g. 5:30 PM after work)</li>
        <li>When prayer time arrives, the alarm <strong>rings continuously</strong> with a full-screen DISMISS button</li>
      </ol>
    ),
  },
  {
    emoji: '📖',
    question: 'How do I use the Scripture Vault?',
    answer: (
      <ol className="list-decimal list-inside space-y-2 text-ink-soft text-sm leading-relaxed">
        <li>Go to <strong>/scripture</strong> or tap Scripture in the navigation</li>
        <li>Choose a <strong>language</strong>: English, Spanish, French, Portuguese, or Swahili</li>
        <li>Browse through categories: Salvation, Faith, Peace, Strength, Wisdom, Love, and more</li>
        <li>Tap any scripture card to read it in a large modal</li>
        <li>A <strong>daily verse</strong> appears automatically on the home screen each day</li>
      </ol>
    ),
  },
  {
    emoji: '📚',
    question: 'How do I read the KJV Bible?',
    answer: (
      <ol className="list-decimal list-inside space-y-2 text-ink-soft text-sm leading-relaxed">
        <li>Tap <strong>&quot;KJV Bible&quot;</strong> in the bottom navigation</li>
        <li>All <strong>66 books</strong> are listed — Old Testament and New Testament</li>
        <li>Tap any book (e.g. <strong>Psalms</strong>)</li>
        <li>Tap a chapter number</li>
        <li>Read the full chapter with all verses</li>
        <li>The Bible works <strong>offline</strong> after the first read (verses are cached)</li>
      </ol>
    ),
  },
  {
    emoji: '🔥',
    question: 'How do I track my fasting?',
    answer: (
      <ol className="list-decimal list-inside space-y-2 text-ink-soft text-sm leading-relaxed">
        <li>Tap <strong>&quot;Fasting&quot;</strong> in the bottom navigation</li>
        <li>Tap <strong>&quot;Start Fast&quot;</strong></li>
        <li>Choose duration: <strong>3 days, 7 days, 21 days, or 40 days</strong></li>
        <li>The tracker counts each day and shows your progress</li>
        <li>Tap <strong>&quot;Break Fast&quot;</strong> if you need to end early</li>
        <li>Your fasting history is saved so you can look back</li>
      </ol>
    ),
  },
  {
    emoji: '🎵',
    question: 'How do I use the Worship Player?',
    answer: (
      <ol className="list-decimal list-inside space-y-2 text-ink-soft text-sm leading-relaxed">
        <li>Go to <strong>/worship</strong> page</li>
        <li>Tap <strong>&quot;Upload Song&quot;</strong> to add a worship song from your phone</li>
        <li>You can upload by <strong>file</strong> (MP3, audio files) or by <strong>URL</strong> (link to a song)</li>
        <li>Uploaded songs are stored on your device (IndexedDB)</li>
        <li>Tap any song to <strong>play</strong> it</li>
        <li>Use play/pause, and volume controls</li>
      </ol>
    ),
  },
  {
    emoji: '👥',
    question: 'How do I join and use Prayer Groups?',
    answer: (
      <ol className="list-decimal list-inside space-y-2 text-ink-soft text-sm leading-relaxed">
        <li>Go to <strong>/groups</strong> page</li>
        <li>Browse existing groups or tap <strong>&quot;Join Group&quot;</strong></li>
        <li>Enter the <strong>invite code</strong> (e.g. &quot;PRAYER&quot; for the official group)</li>
        <li>Once joined, you can:
          <ul className="list-disc list-inside ml-4 mt-1 space-y-0.5 text-xs">
            <li><strong>Chat</strong> with other members</li>
            <li>Send <strong>emergency alerts</strong></li>
            <li>See the <strong>group prayer time</strong></li>
            <li>Read the <strong>pinned verse</strong></li>
            <li><strong>Mark prayed today</strong> for accountability</li>
          </ul>
        </li>
        <li>To <strong>create your own group</strong>, you need the <strong>Fire Partner Leader</strong> plan</li>
      </ol>
    ),
  },
  {
    emoji: '🌐',
    question: 'How do I submit and pray for partner requests?',
    answer: (
      <ol className="list-decimal list-inside space-y-2 text-ink-soft text-sm leading-relaxed">
        <li>Go to <strong>/network</strong> page (Partners)</li>
        <li>Tap <strong>&quot;Submit Request&quot;</strong></li>
        <li>Enter your <strong>name</strong>, <strong>location</strong>, and <strong>prayer request</strong></li>
        <li>Tap Submit — your request appears on the wall for others to see and pray for</li>
        <li>Scroll through other people&apos;s requests and <strong>tap &quot;Prayed&quot;</strong> to let them know you prayed for them</li>
        <li>The <strong>prayer count</strong> increases each time someone prays for a request</li>
      </ol>
    ),
  },
  // Donation Q&A removed — paused until Paystack approves
  {
    emoji: '🌙',
    question: 'How do I switch to dark mode (night mode)?',
    answer: (
      <ol className="list-decimal list-inside space-y-2 text-ink-soft text-sm leading-relaxed">
        <li>Tap the <strong>🌙 Moon / ☀️ Sun</strong> icon in the top navigation bar</li>
        <li>The app switches between <strong>Light</strong> (warm ivory) and <strong>Night</strong> (deep navy)</li>
        <li>Your choice is saved — it remembers next time you open the app</li>
      </ol>
    ),
  },
  {
    emoji: '⚙️',
    question: 'How do I manage my account and sign out?',
    answer: (
      <ol className="list-decimal list-inside space-y-2 text-ink-soft text-sm leading-relaxed">
        <li>Tap the <strong>⋮ (3 dots)</strong> button in the top right of the Navbar</li>
        <li>Tap <strong>&quot;My Account&quot;</strong> to view your profile</li>
        <li>Tap <strong>&quot;Settings&quot;</strong> to change name, email, or password</li>
        <li>Tap <strong>&quot;Sign Out&quot;</strong> to log out</li>
        <li>To <strong>delete your account</strong>, go to Settings → scroll down → tap &quot;Delete Account&quot;</li>
      </ol>
    ),
  },
];

// ── Q&A data: Benefits ──
const BENEFITS_QA = [
  {
    emoji: '🔔',
    color: 'amber',
    question: 'What does the prayer alarm do for my spiritual life?',
    answer: (
      <>
        <p className="text-ink-soft leading-relaxed mb-3">
          <strong>No more forgetting.</strong> The alarm fires at your chosen prayer times — Midnight, Noon, Morning Watch — and it <strong>doesn&apos;t stop until you dismiss it</strong>. It rings. It vibrates. It plays church bells, a classic phone ring, a soft chime — your choice. This is your <strong>spiritual wake-up call</strong>, three times a day, every day.
        </p>
        <p className="text-ink-muted bg-acc-soft/50 rounded-lg px-3 py-2 text-sm italic">
          &quot;Daniel… knelt upon his knees three times a day, and prayed and gave thanks before his God.&quot; — Daniel 6:10
        </p>
      </>
    ),
  },
  {
    emoji: '✍️',
    color: 'emerald',
    question: 'How does writing my prayers help me?',
    answer: (
      <p className="text-ink-soft leading-relaxed">
        <strong>Write it.</strong> The Prayer Workshop lets you compose prayer points for Family, Special, and Intercessory sessions. When you write your prayers, you pray with <strong>focus and intention</strong> — not vague wandering thoughts. This is the difference between saying words and waging war.
      </p>
    ),
  },
  {
    emoji: '🗣️',
    color: 'blue',
    question: 'How does voice-to-text prayer work?',
    answer: (
      <p className="text-ink-soft leading-relaxed">
        <strong>Speak it.</strong> Voice-to-text prayer writing means you can pray out loud — walking, driving, cooking — and the app captures every word. Your spoken prayers become written records you can revisit and pray again.
      </p>
    ),
  },
  {
    emoji: '📖',
    color: 'purple',
    question: 'Why do I need Scripture in 5 languages?',
    answer: (
      <>
        <p className="text-ink-soft leading-relaxed mb-3">
          <strong>Pray it.</strong> The Scripture Vault gives you God&apos;s Word in <strong>English, Spanish, French, Portuguese, and Swahili</strong>. The full KJV Bible is built in. Daily verses appear on your screen. You cannot pray effectively without fuel, and God&apos;s Word is that fuel.
        </p>
        <p className="text-ink-muted bg-acc-soft/50 rounded-lg px-3 py-2 text-sm italic">
          &quot;My word… shall not return to me empty.&quot; — Isaiah 55:11
        </p>
      </>
    ),
  },
  {
    emoji: '🙏',
    color: 'rose',
    question: 'How does the guided prayer session work?',
    answer: (
      <p className="text-ink-soft leading-relaxed">
        The <strong>Start-Up Prayer</strong> walks you through 7 guided steps — Mercy, Thanksgiving, Holy Spirit, Intercession, Petition, Warfare, and Prophetic. A timer keeps you focused. A celebration sound plays when you finish. <strong>Even a beginner can pray for 5 powerful minutes.</strong>
      </p>
    ),
  },
  {
    emoji: '🔥',
    color: 'orange',
    question: 'How does fasting tracking help me spiritually?',
    answer: (
      <p className="text-ink-soft leading-relaxed">
        Whether you&apos;re fasting <strong>3 days, 7 days, 21 days, or 40 days</strong> — the fasting tracker keeps you accountable. It counts the days. It marks the victories. <strong>Fasting without tracking is wandering. This keeps you on the path.</strong>
      </p>
    ),
  },
  {
    emoji: '⏰',
    color: 'teal',
    question: 'Can I set my own custom prayer times?',
    answer: (
      <p className="text-ink-soft leading-relaxed">
        Not everyone can pray at exactly 12:00 PM. You&apos;re at work. On your break. On the bus. <strong>Set your prayer times to the minute</strong> — 4:20 AM, 12:15 PM, 5:35 PM — whatever fits YOUR life. The alarm adapts to YOU, not the other way around.
      </p>
    ),
  },
  {
    emoji: '🔥',
    color: 'red',
    question: 'What does the prayer streak do for me?',
    answer: (
      <p className="text-ink-soft leading-relaxed">
        Every day you check in, your <strong>fire streak</strong> grows. 1 day. 7 days. 30 days. 100 days. This isn&apos;t gamification — it&apos;s <strong>accountability</strong>. Daniel prayed 3 times a day for his entire life. The streak reminds you: yesterday you prayed. Today you will pray. Tomorrow you will pray again.
      </p>
    ),
  },
];

// ── Color map for benefit badges ──
const COLOR_MAP: Record<string, string> = {
  amber: 'bg-amber-100 text-amber-600',
  emerald: 'bg-emerald-100 text-emerald-600',
  blue: 'bg-blue-100 text-blue-600',
  purple: 'bg-purple-100 text-purple-600',
  rose: 'bg-rose-100 text-rose-600',
  orange: 'bg-orange-100 text-orange-600',
  teal: 'bg-teal-100 text-teal-600',
  red: 'bg-red-100 text-red-600',
};

export default function UserManualPage() {
  const [openQ, setOpenQ] = useState<{ section: string; index: number } | null>(null);

  const openPopup = (section: string, index: number) => setOpenQ({ section, index });
  const closePopup = () => setOpenQ(null);

  const currentAnswer = openQ
    ? openQ.section === 'howto'
      ? HOW_TO_QA[openQ.index]
      : BENEFITS_QA[openQ.index]
    : null;

  return (
    <>
      <Navbar />
      <main className="max-w-3xl md:max-w-4xl mx-auto px-4 py-6 pb-28 md:pb-10">
        <Link href="/" className="inline-flex items-center gap-1 text-sm text-ink-muted hover:text-acc mb-6">
          <ChevronLeft className="w-4 h-4" /> Home
        </Link>

        {/* Header */}
        <div className="text-center mb-10">
          <div className="text-5xl mb-3">🔥</div>
          <h1 className="font-serif-heading text-3xl font-black text-ink mb-2">
            Prayer Fire Movement
          </h1>
          <p className="text-lg text-ink-soft font-serif italic">
            Pray 3x — A Cure For Prayerlessness
          </p>
          <p className="text-ink-muted text-sm mt-2">
            Write it. Speak it. Pray it. Trust God. — &quot;Praying like Daniel&quot;
          </p>
        </div>

        {/* Opening Message */}
        <div className="bg-card rounded-2xl border border-edge p-6 mb-8">
          <h2 className="font-bold text-ink text-xl mb-3">Dear Brother, Dear Sister — This Is For You</h2>
          <p className="text-ink-soft leading-relaxed mb-4">
            There is a sickness sweeping through the Church today — <strong className="text-danger">prayerlessness</strong>.
          </p>
          <p className="text-ink-soft leading-relaxed mb-4">
            Millions of believers love God, but they struggle to pray consistently. They want to pray like Daniel — three times a day — but life gets in the way. Work. School. Family. Fatigue. Distraction.
          </p>
          <p className="text-ink-soft leading-relaxed mb-4">
            The alarm rings for everything else — work, meetings, school runs — but <strong>nothing rings for prayer</strong>.
          </p>
          <p className="text-acc font-bold text-lg">Until now.</p>
          <p className="text-ink-soft leading-relaxed mt-4">
            Prayer Fire Movement is not just another Christian app. It is a <strong>spiritual alarm system</strong> for your soul. It is a <strong>cure for prayerlessness</strong>. It is the tool that transforms your desire to pray into a <strong>daily, unbreakable habit</strong> — just like Daniel did in Babylon.
          </p>
        </div>

        {/* ====== Q&A: HOW TO USE THE APP ====== */}
        <h2 className="font-serif-heading text-2xl font-black text-ink mb-6 text-center">
          📖 How To Use The App
        </h2>
        <p className="text-ink-muted text-sm text-center mb-5">Tap any question to see the answer</p>

        <div className="space-y-3 mb-10">
          {HOW_TO_QA.map((item, i) => (
            <button
              key={i}
              onClick={() => openPopup('howto', i)}
              className="w-full bg-card rounded-2xl border border-edge p-4 flex items-center gap-3 hover:border-acc transition text-left group"
            >
              <span className="text-2xl flex-shrink-0">{item.emoji}</span>
              <span className="font-semibold text-ink text-sm flex-1">{item.question}</span>
              <ChevronRight className="w-5 h-5 text-ink-faint group-hover:text-acc transition flex-shrink-0" />
            </button>
          ))}
        </div>

        {/* ====== Q&A: BENEFITS ====== */}
        <h2 className="font-serif-heading text-2xl font-black text-ink mb-6 text-center">
          🔥 What This App Does For Your Spiritual Life
        </h2>
        <p className="text-ink-muted text-sm text-center mb-5">Tap any question to see the answer</p>

        <div className="space-y-3 mb-10">
          {BENEFITS_QA.map((item, i) => (
            <button
              key={i}
              onClick={() => openPopup('benefits', i)}
              className="w-full bg-card rounded-2xl border border-edge p-4 flex items-center gap-3 hover:border-acc transition text-left group"
            >
              <span className={`p-2 rounded-lg ${COLOR_MAP[item.color] || 'bg-gray-100 text-gray-600'} flex-shrink-0`}>
                <span className="text-lg">{item.emoji}</span>
              </span>
              <span className="font-semibold text-ink text-sm flex-1">{item.question}</span>
              <ChevronRight className="w-5 h-5 text-ink-faint group-hover:text-acc transition flex-shrink-0" />
            </button>
          ))}
        </div>

        {/* ====== PRAYER FIRE PARTNER ====== */}
        <div className="bg-gradient-to-b from-amber-50 to-card dark:from-amber-950/20 dark:to-card rounded-2xl border-2 border-amber-300 dark:border-amber-700 p-6 mb-8">
          <div className="flex items-center gap-3 mb-4">
            <span className="text-4xl">👑</span>
            <div>
              <h2 className="font-serif-heading text-2xl font-black text-ink">Prayer Fire Partner</h2>
              <p className="text-amber-600 font-bold">$2.99/month · $23.99/year</p>
            </div>
          </div>

          <p className="text-ink text-lg font-bold mb-4">This is where prayer becomes WAR.</p>
          <p className="text-ink-soft leading-relaxed mb-6">
            When you upgrade to Prayer Fire Partner, you step out of personal prayer and into <strong>the global intercessory battlefield</strong>.
          </p>

          <div className="space-y-4 mb-6">
            <div className="flex items-start gap-3">
              <Globe className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-bold text-ink">Join Global Prayer Groups</p>
                <p className="text-ink-soft text-sm">Connect with believers across Nigeria, Kenya, Ghana, the UK, the US, South Africa — praying for the SAME things at the SAME time. There is power in agreement.</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <Users className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-bold text-ink">Submit &amp; Pray for Partner Requests</p>
                <p className="text-ink-soft text-sm">Someone in Ghana is praying for their sick mother. Someone in the UK is battling addiction. You see their request. You pray for them. They pray for you.</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <Megaphone className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-bold text-ink">Global Prayer Alerts</p>
                <p className="text-ink-soft text-sm">When an emergency hits — a nation in crisis, a persecuted believer — you get notified instantly. You become a first responder in the spirit.</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <Mic2 className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-bold text-ink">Voice-to-Text Prayer Writing</p>
                <p className="text-ink-soft text-sm">Speak your prayers and the app writes them. Perfect for intercessory sessions where you&apos;re praying for 10, 20, 50 people.</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <Headphones className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-bold text-ink">Priority Support</p>
                <p className="text-ink-soft text-sm">Partners get served first — technical, spiritual, or community help.</p>
              </div>
            </div>
          </div>

          <div className="bg-amber-100 dark:bg-amber-900/30 rounded-xl p-4">
            <p className="font-bold text-amber-800 dark:text-amber-300 mb-1">💎 The Spiritual Benefit:</p>
            <p className="text-amber-700 dark:text-amber-400 text-sm leading-relaxed mb-2">
              Prayer Fire Partner moves you from &quot;I pray for myself&quot; to <strong>&quot;I pray for the world.&quot;</strong> This is intercession. This is standing in the gap. This is what separates a Christian who prays from a <strong>prayer warrior</strong>.
            </p>
            <p className="text-amber-600 dark:text-amber-500 text-sm italic">
              &quot;I exhort therefore… that intercessions be made for all men.&quot; — 1 Timothy 2:1
            </p>
          </div>
        </div>

        {/* ====== FIRE PARTNER LEADER ====== */}
        <div className="bg-gradient-to-b from-red-50 to-card dark:from-red-950/20 dark:to-card rounded-2xl border-2 border-red-300 dark:border-red-700 p-6 mb-8">
          <div className="flex items-center gap-3 mb-4">
            <span className="text-4xl">🔥</span>
            <div>
              <h2 className="font-serif-heading text-2xl font-black text-ink">Fire Partner Leader</h2>
              <p className="text-red-600 font-bold">$9.99/month · $89.99/year</p>
            </div>
          </div>

          <p className="text-ink text-lg font-bold mb-4">This is for the one God has called to LEAD.</p>
          <p className="text-ink-soft leading-relaxed mb-6">
            Not everyone is called to lead. But if you are — if God has been giving you a <strong>burden for your city, your nation, your generation</strong> — then Fire Partner Leader is your command center.
          </p>

          <div className="space-y-4 mb-6">
            <div className="flex items-start gap-3">
              <Users className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-bold text-ink">Create &amp; Manage Your Own Prayer Groups</p>
                <p className="text-ink-soft text-sm">Build groups for your church, campus, workplace, nation. You set the prayer times. You set the vision. You lead.</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <Shield className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-bold text-ink">Admin &amp; Moderation Tools</p>
                <p className="text-ink-soft text-sm">3 co-admins per group. Approve members. Pin scriptures. Keep the group focused, holy, and on fire.</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <BarChart3 className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-bold text-ink">Partner Network Analytics</p>
                <p className="text-ink-soft text-sm">See who&apos;s faithful. See who&apos;s falling away. A shepherd knows his sheep.</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <Star className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-bold text-ink">Feature Your Prayer Groups</p>
                <p className="text-ink-soft text-sm">Your group gets highlighted globally. More intercessors join. Your fire spreads.</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <Zap className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-bold text-ink">Early Access to New Features</p>
                <p className="text-ink-soft text-sm">Leaders get every new feature first. New templates. New languages. New tools. You lead from the front.</p>
              </div>
            </div>
          </div>

          <div className="bg-red-100 dark:bg-red-900/30 rounded-xl p-4">
            <p className="font-bold text-red-800 dark:text-red-300 mb-1">💎 The Spiritual Benefit:</p>
            <p className="text-red-700 dark:text-red-400 text-sm leading-relaxed mb-2">
              Fire Partner Leader equips you to do what <strong>Nehemiah did</strong> — build a team, set watchmen, and rebuild the walls of prayer in your generation. You are no longer just praying. You are <strong>mobilizing prayer</strong>.
            </p>
            <p className="text-red-600 dark:text-red-500 text-sm italic">
              &quot;I sought for a man… that should stand in the gap before me for the land…&quot; — Ezekiel 22:30
            </p>
          </div>
        </div>

        {/* ====== THE REAL COST ====== */}
        <div className="bg-card rounded-2xl border border-edge p-6 mb-8">
          <h2 className="font-bold text-ink text-xl mb-4 text-center">💰 The Real Cost</h2>
          <div className="space-y-3">
            <div className="flex items-center justify-between bg-card-2 rounded-lg px-4 py-3">
              <span className="text-ink-soft text-sm">1 soda per month</span>
              <span className="font-bold text-ink mx-2">$2.99</span>
              <span className="text-acc font-semibold text-sm">→ Global intercessory community</span>
            </div>
            <div className="flex items-center justify-between bg-card-2 rounded-lg px-4 py-3">
              <span className="text-ink-soft text-sm">1 fast food meal</span>
              <span className="font-bold text-ink mx-2">$9.99</span>
              <span className="text-acc font-semibold text-sm">→ Your own prayer movement</span>
            </div>
            <div className="flex items-center justify-between bg-card-2 rounded-lg px-4 py-3">
              <span className="text-ink-soft text-sm">Netflix subscription</span>
              <span className="font-bold text-ink mx-2">$15.99</span>
              <span className="text-acc font-semibold text-sm">→ Feeds your SOUL, not flesh</span>
            </div>
          </div>
          <p className="text-ink-soft text-sm text-center mt-4 italic">
            You will spend the money anyway. Will you spend it on entertainment for an hour, or something that builds your prayer life for <strong>eternity</strong>?
          </p>
        </div>

        {/* ====== BOTTOM LINE ====== */}
        <div className="bg-gradient-to-r from-red-600 to-amber-500 rounded-2xl p-6 text-white mb-6">
          <h2 className="font-serif-heading text-2xl font-black mb-4 text-center">🔥 The Bottom Line</h2>
          <p className="text-white/90 leading-relaxed mb-4 text-center">
            Prayerlessness is the <strong>silent killer</strong> of spiritual life.
          </p>
          <div className="space-y-2 mb-4">
            <p className="text-white/85 text-sm">💀 It kills <strong>faith</strong> — because faith comes by hearing the Word</p>
            <p className="text-white/85 text-sm">💀 It kills <strong>power</strong> — because power comes from prayer</p>
            <p className="text-white/85 text-sm">💀 It kills <strong>purpose</strong> — because purpose is revealed in prayer</p>
            <p className="text-white/85 text-sm">💀 It kills <strong>protection</strong> — because protection comes through intercession</p>
          </div>
          <p className="text-center font-black text-lg mt-4">
            Prayer Fire Movement exists to kill prayerlessness.
          </p>
          <p className="text-center text-white/90 mt-2">
            It alarms. It guides. It writes. It speaks. It tracks. It connects. It leads.
          </p>
        </div>

        {/* Final CTA */}
        <div className="text-center py-8">
          <p className="text-ink-soft leading-relaxed max-w-md mx-auto mb-6">
            Daniel prayed three times a day — and it was so powerful that <strong>kings tried to stop him and couldn&apos;t</strong>.
          </p>
          <p className="text-ink-soft leading-relaxed max-w-md mx-auto mb-6">
            Imagine what happens when <strong>millions of Daniels</strong> pray three times a day — in every nation, every time zone, every language — and <strong>the fire never goes out</strong>.
          </p>
          <div className="text-3xl font-black text-danger mb-2">PRAY 3 TIMES A DAY.</div>
          <div className="text-xl font-bold text-acc mb-4">CURE PRAYERLESSNESS. SET THE WORLD ON FIRE.</div>
          <p className="text-ink-muted text-sm">The fire is waiting. 🔥</p>
          <p className="text-ink-faint text-xs mt-6">pst jerry chijioke — Founder, Prayer Fire Movement</p>
        </div>

      </main>
      <Footer />

      {/* ====== ANSWER POPUP MODAL ====== */}
      {openQ && currentAnswer && (
        <div
          className="fixed inset-0 z-[100] bg-black/50 flex items-end sm:items-center justify-center p-0 sm:p-4 animate-fade-in"
          onClick={closePopup}
        >
          <div
            className="bg-card rounded-t-2xl sm:rounded-2xl border border-edge w-full sm:max-w-lg max-h-[85vh] overflow-y-auto p-6 animate-slide-up"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal header */}
            <div className="flex items-center gap-3 mb-4">
              <span className="text-2xl">{currentAnswer.emoji}</span>
              <h3 className="font-bold text-ink text-lg flex-1">{currentAnswer.question}</h3>
              <button
                onClick={closePopup}
                className="p-2 rounded-xl hover:bg-card-2 transition text-ink-muted"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal body */}
            <div className="text-sm">
              {currentAnswer.answer}
            </div>

            {/* Close button */}
            <button onClick={closePopup} className="btn-primary w-full mt-5">
              Got it ✅
            </button>
          </div>
        </div>
      )}
    </>
  );
}
