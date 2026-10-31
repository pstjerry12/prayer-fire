'use client';

import VerseOfTheDayCard from './VerseOfTheDayCard';
import HomeStartUpCard from './HomeStartUpCard';
import HomeAudioBibleCard from './HomeAudioBibleCard';

/**
 * The first thing on the home screen, visible without scrolling on a normal phone (360x640 and up):
 * the verse of the day, today's opening prayer, and the audio Bible. Kept compact on purpose.
 */
export default function HomeFold() {
  return (
    <div className="space-y-2" data-testid="home-fold">
      <VerseOfTheDayCard compact />
      <HomeStartUpCard />
      <HomeAudioBibleCard />
    </div>
  );
}
