'use client';

import VerseOfTheDayCard from './VerseOfTheDayCard';
import HomeAudioBibleCard from './HomeAudioBibleCard';

/**
 * Under the Prayer Fire heading, visible without scrolling on a normal phone (360x640 and up):
 * the audio Bible first, then the verse of the day. Kept compact on purpose.
 */
export default function HomeFold() {
  return (
    <div className="space-y-2" data-testid="home-fold">
      <HomeAudioBibleCard />
      <VerseOfTheDayCard compact />
    </div>
  );
}
