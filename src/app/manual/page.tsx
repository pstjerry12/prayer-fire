'use client';

import Link from 'next/link';
import { ChevronLeft, Bell, Pencil, Mic, BookMarked, Footprints, Flame, Clock, Zap, Users, Globe, Megaphone, Mic2, Headphones, Shield, BarChart3, Star } from 'lucide-react';
import Navbar from '@/app/components/Navbar';
import Footer from '@/app/components/Footer';

export default function UserManualPage() {
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

        {/* ====== BENEFITS SECTION ====== */}
        <h2 className="font-serif-heading text-2xl font-black text-ink mb-6 text-center">
          🔥 What This App Does For Your Spiritual Life
        </h2>

        {/* Benefit 1 */}
        <div className="bg-card rounded-2xl border border-edge p-5 mb-4">
          <div className="flex items-start gap-4">
            <div className="p-3 rounded-xl bg-amber-100 text-amber-600 flex-shrink-0">
              <Bell className="w-6 h-6" />
            </div>
            <div>
              <h3 className="font-bold text-ink text-lg mb-1">1. It Rings When It&apos;s Time to Pray</h3>
              <p className="text-ink-soft leading-relaxed mb-2">
                <strong>No more forgetting.</strong> The alarm fires at your chosen prayer times — Midnight, Noon, Morning Watch — and it <strong>doesn&apos;t stop until you dismiss it</strong>. It rings. It vibrates. It plays church bells, a classic phone ring, a soft chime — your choice. This is your <strong>spiritual wake-up call</strong>, three times a day, every day.
              </p>
              <p className="text-ink-muted bg-acc-soft/50 rounded-lg px-3 py-2 text-sm italic">
                &quot;Daniel… knelt upon his knees three times a day, and prayed and gave thanks before his God.&quot; — Daniel 6:10
              </p>
            </div>
          </div>
        </div>

        {/* Benefit 2 */}
        <div className="bg-card rounded-2xl border border-edge p-5 mb-4">
          <div className="flex items-start gap-4">
            <div className="p-3 rounded-xl bg-emerald-100 text-emerald-600 flex-shrink-0">
              <Pencil className="w-6 h-6" />
            </div>
            <div>
              <h3 className="font-bold text-ink text-lg mb-1">2. It Helps You Write Your Prayers</h3>
              <p className="text-ink-soft leading-relaxed">
                <strong>Write it.</strong> The Prayer Workshop lets you compose prayer points for Family, Special, and Intercessory sessions. When you write your prayers, you pray with <strong>focus and intention</strong> — not vague wandering thoughts. This is the difference between saying words and waging war.
              </p>
            </div>
          </div>
        </div>

        {/* Benefit 3 */}
        <div className="bg-card rounded-2xl border border-edge p-5 mb-4">
          <div className="flex items-start gap-4">
            <div className="p-3 rounded-xl bg-blue-100 text-blue-600 flex-shrink-0">
              <Mic className="w-6 h-6" />
            </div>
            <div>
              <h3 className="font-bold text-ink text-lg mb-1">3. It Listens When You Speak</h3>
              <p className="text-ink-soft leading-relaxed">
                <strong>Speak it.</strong> Voice-to-text prayer writing means you can pray out loud — walking, driving, cooking — and the app captures every word. Your spoken prayers become written records you can revisit and pray again.
              </p>
            </div>
          </div>
        </div>

        {/* Benefit 4 */}
        <div className="bg-card rounded-2xl border border-edge p-5 mb-4">
          <div className="flex items-start gap-4">
            <div className="p-3 rounded-xl bg-purple-100 text-purple-600 flex-shrink-0">
              <BookMarked className="w-6 h-6" />
            </div>
            <div>
              <h3 className="font-bold text-ink text-lg mb-1">4. It Feeds You Scripture In 5 Languages</h3>
              <p className="text-ink-soft leading-relaxed mb-2">
                <strong>Pray it.</strong> The Scripture Vault gives you God&apos;s Word in <strong>English, Spanish, French, Portuguese, and Swahili</strong>. The full KJV Bible is built in. Daily verses appear on your screen. You cannot pray effectively without fuel, and God&apos;s Word is that fuel.
              </p>
              <p className="text-ink-muted bg-acc-soft/50 rounded-lg px-3 py-2 text-sm italic">
                &quot;My word… shall not return to me empty.&quot; — Isaiah 55:11
              </p>
            </div>
          </div>
        </div>

        {/* Benefit 5 */}
        <div className="bg-card rounded-2xl border border-edge p-5 mb-4">
          <div className="flex items-start gap-4">
            <div className="p-3 rounded-xl bg-rose-100 text-rose-600 flex-shrink-0">
              <Footprints className="w-6 h-6" />
            </div>
            <div>
              <h3 className="font-bold text-ink text-lg mb-1">5. It Guides You Step By Step</h3>
              <p className="text-ink-soft leading-relaxed">
                The <strong>Start-Up Prayer</strong> walks you through 7 guided steps — Mercy, Thanksgiving, Holy Spirit, Intercession, Petition, Warfare, and Prophetic. A timer keeps you focused. A celebration sound plays when you finish. <strong>Even a beginner can pray for 5 powerful minutes.</strong>
              </p>
            </div>
          </div>
        </div>

        {/* Benefit 6 */}
        <div className="bg-card rounded-2xl border border-edge p-5 mb-4">
          <div className="flex items-start gap-4">
            <div className="p-3 rounded-xl bg-orange-100 text-orange-600 flex-shrink-0">
              <Flame className="w-6 h-6" />
            </div>
            <div>
              <h3 className="font-bold text-ink text-lg mb-1">6. It Tracks Your Fasting</h3>
              <p className="text-ink-soft leading-relaxed">
                Whether you&apos;re fasting <strong>3 days, 7 days, 21 days, or 40 days</strong> — the fasting tracker keeps you accountable. It counts the days. It marks the victories. <strong>Fasting without tracking is wandering. This keeps you on the path.</strong>
              </p>
            </div>
          </div>
        </div>

        {/* Benefit 7 */}
        <div className="bg-card rounded-2xl border border-edge p-5 mb-4">
          <div className="flex items-start gap-4">
            <div className="p-3 rounded-xl bg-teal-100 text-teal-600 flex-shrink-0">
              <Clock className="w-6 h-6" />
            </div>
            <div>
              <h3 className="font-bold text-ink text-lg mb-1">7. It Lets You Set YOUR Prayer Times</h3>
              <p className="text-ink-soft leading-relaxed">
                Not everyone can pray at exactly 12:00 PM. You&apos;re at work. On your break. On the bus. <strong>Set your prayer times to the minute</strong> — 4:20 AM, 12:15 PM, 5:35 PM — whatever fits YOUR life. The alarm adapts to YOU, not the other way around.
              </p>
            </div>
          </div>
        </div>

        {/* Benefit 8 */}
        <div className="bg-card rounded-2xl border border-edge p-5 mb-8">
          <div className="flex items-start gap-4">
            <div className="p-3 rounded-xl bg-red-100 text-red-600 flex-shrink-0">
              <Zap className="w-6 h-6" />
            </div>
            <div>
              <h3 className="font-bold text-ink text-lg mb-1">8. It Tracks Your Prayer Streak</h3>
              <p className="text-ink-soft leading-relaxed">
                Every day you check in, your <strong>fire streak</strong> grows. 1 day. 7 days. 30 days. 100 days. This isn&apos;t gamification — it&apos;s <strong>accountability</strong>. Daniel prayed 3 times a day for his entire life. The streak reminds you: yesterday you prayed. Today you will pray. Tomorrow you will pray again.
              </p>
            </div>
          </div>
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
    </>
  );
}
