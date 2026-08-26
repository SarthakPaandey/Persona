'use client';

import React, { useId, useState } from 'react';
import { CalendarCheck, ExternalLink, Sparkles } from 'lucide-react';

import { bookMeeting } from '@/lib/api';
import { TimeSlot } from '@/lib/types';

interface CalendarWidgetProps {
  slots?: TimeSlot[];
  bookingLink?: string;
  timezone?: string;
}

const INPUT_CLASS =
  'w-full rounded-xl border border-white/[0.08] bg-black/40 backdrop-blur px-3 py-2.5 text-sm text-slate-100 placeholder:text-slate-600 transition-colors focus:border-cyan-300/40 focus:outline-none focus:ring-1 focus:ring-cyan-400/20 min-h-[42px]';

export default function CalendarWidget({
  slots = [],
  bookingLink,
  timezone,
}: CalendarWidgetProps) {
  const uid = useId();
  const [selectedSlot, setSelectedSlot] = useState('');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [isBooking, setIsBooking] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const activeSlot = selectedSlot || slots[0]?.start || '';

  async function handleBooking() {
    if (!activeSlot) {
      setError('Please pick a time slot first.');
      return;
    }
    if (!name.trim() || !email.trim()) {
      setError('Please provide your name and email.');
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      setError('That email address does not look valid.');
      return;
    }

    setIsBooking(true);
    setError('');
    setSuccess('');

    try {
      const result = await bookMeeting({
        name: name.trim(),
        email: email.trim(),
        start_time: activeSlot,
        timezone,
        notes: 'Booked via AI persona chat',
      });
      setSuccess(result.message);
    } catch (bookingError) {
      console.error('Booking failed:', bookingError);
      setError('Booking failed. Please try again or use the Cal.com link below.');
    } finally {
      setIsBooking(false);
    }
  }

  return (
    <div className="rounded-2xl border border-white/[0.08] bg-black/40 backdrop-blur-md p-4 shadow-panel overflow-hidden relative">
      <div aria-hidden="true" className="absolute inset-0 glass-highlight pointer-events-none opacity-40" />
      <div className="relative">
        <h3 className="flex items-center gap-2 text-sm font-semibold tracking-tight text-slate-100 mb-0.5">
          <span className="w-7 h-7 rounded-lg bg-cyan-500/10 border border-cyan-400/20 text-cyan-300 flex items-center justify-center">
            <CalendarCheck size={14} aria-hidden="true" />
          </span>
          Book an interview
          <span className="ml-auto inline-flex items-center gap-1 text-[10px] font-mono tracking-widest uppercase text-cyan-300/70 border border-cyan-400/15 bg-cyan-500/10 rounded-full px-2 py-0.5">
            <Sparkles size={10} /> Cal synced
          </span>
        </h3>
        <p className="text-xs text-slate-500 mb-3.5 leading-relaxed">
          {slots.length > 0
            ? 'Pick a coordinate in spacetime that works for you:'
            : 'No live availability right now — use the direct link below.'}
        </p>

        {slots.length > 0 && (
          <div className="space-y-3">
            <div>
              <label
                htmlFor={`${uid}-slot`}
                className="block text-xs font-medium tracking-wide text-slate-400 mb-1.5"
              >
                Time slot{timezone && <span className="text-slate-600 font-mono"> · {timezone}</span>}
              </label>
              <select
                id={`${uid}-slot`}
                value={activeSlot}
                onChange={(event) => setSelectedSlot(event.target.value)}
                className={`${INPUT_CLASS} [&>option]:bg-space-900`}
              >
                {slots.map((slot) => (
                  <option key={slot.start} value={slot.start}>
                    {slot.formatted}
                  </option>
                ))}
              </select>
            </div>

            <div className="grid gap-2.5 sm:grid-cols-2">
              <div>
                <label
                  htmlFor={`${uid}-name`}
                  className="block text-xs font-medium tracking-wide text-slate-400 mb-1.5"
                >
                  Name
                </label>
                <input
                  id={`${uid}-name`}
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  placeholder="Jane Recruiter"
                  autoComplete="name"
                  className={INPUT_CLASS}
                />
              </div>
              <div>
                <label
                  htmlFor={`${uid}-email`}
                  className="block text-xs font-medium tracking-wide text-slate-400 mb-1.5"
                >
                  Email
                </label>
                <input
                  id={`${uid}-email`}
                  type="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  placeholder="jane@company.com"
                  autoComplete="email"
                  className={INPUT_CLASS}
                />
              </div>
            </div>

            <button
              type="button"
              onClick={handleBooking}
              disabled={isBooking || !slots.length}
              className="w-full py-3 rounded-xl bg-gradient-to-br from-violet-600 to-cyan-500 hover:from-violet-500 hover:to-cyan-400 text-white text-sm font-semibold tracking-wide transition-all min-h-[44px] disabled:opacity-50 active:scale-[0.99] shadow-[0_8px_22px_rgba(124,58,237,0.28)]"
            >
              {isBooking ? 'Confirming…' : 'Confirm booking'}
            </button>
          </div>
        )}

        {error && (
          <p role="alert" className="mt-3 text-xs text-red-300 font-medium bg-red-500/10 border border-red-500/20 rounded-xl px-3 py-2">
            {error}
          </p>
        )}
        {success && (
          <p
            role="status"
            className="mt-3 text-xs text-emerald-200 font-medium p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 break-words flex gap-2"
          >
            <span className="w-5 h-5 rounded-full bg-emerald-500/20 border border-emerald-400/20 flex items-center justify-center shrink-0 text-emerald-300">✓</span>
            <span>{success}</span>
          </p>
        )}

        {bookingLink && (
          <a
            href={bookingLink}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-3 inline-flex items-center justify-center gap-1.5 w-full py-2.5 rounded-xl border border-white/[0.08] bg-white/[0.03] hover:bg-white/[0.06] hover:border-cyan-400/20 text-cyan-200 hover:text-cyan-100 transition-colors text-xs font-medium tracking-wide"
          >
            Or open Cal.com directly <ExternalLink size={12} aria-hidden="true" />
          </a>
        )}
      </div>
    </div>
  );
}
