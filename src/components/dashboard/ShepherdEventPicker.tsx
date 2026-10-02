'use client';

import { useEffect, useState } from 'react';
import { eventsApi } from '@/lib/api';

interface ShepherdEventPickerProps {
  value: string[];
  onChange: (eventIds: string[]) => void;
}

interface EventOption {
  _id: string;
  title: string;
  isRecurring?: boolean;
  status?: string;
}

export default function ShepherdEventPicker({ value, onChange }: ShepherdEventPickerProps) {
  const [events, setEvents] = useState<EventOption[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    eventsApi
      .getAll()
      .then((all) => setEvents(all.filter((e: EventOption) => e.status !== 'cancelled')))
      .catch((err) => console.error('Error fetching events:', err))
      .finally(() => setLoading(false));
  }, []);

  const toggle = (id: string) =>
    onChange(value.includes(id) ? value.filter((v) => v !== id) : [...value, id]);

  return (
    <div>
      <label className="block text-sm font-medium text-foreground mb-2">Services to Monitor</label>
      <p className="text-xs text-muted-foreground mb-3">
        Only attendance at the selected events counts towards absences. Leave all unchecked to count every event
        (including midweek meetings like a Tuesday service).
      </p>
      {loading ? (
        <p className="text-sm text-muted-foreground">Loading events...</p>
      ) : events.length === 0 ? (
        <p className="text-sm text-muted-foreground">No events found.</p>
      ) : (
        <div className="space-y-2 max-h-56 overflow-y-auto">
          {events.map((event) => (
            <label
              key={event._id}
              className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg border border-border cursor-pointer"
            >
              <input
                type="checkbox"
                checked={value.includes(event._id)}
                onChange={() => toggle(event._id)}
                className="w-4 h-4"
              />
              <span className="text-sm font-medium">{event.title}</span>
              {event.isRecurring && <span className="text-xs text-muted-foreground">Recurring</span>}
            </label>
          ))}
        </div>
      )}
    </div>
  );
}
