import type { MidTimelineEvent } from '../../types/mid';

interface MidProjectTimelineProps {
  events: MidTimelineEvent[];
}

export function MidProjectTimeline({ events }: MidProjectTimelineProps) {
  if (events.length === 0) return null;

  return (
    <section className="mid-timeline mid-timeline--carousel" aria-label="Timeline do projeto">
      <div className="mid-timeline-head">
        <span className="mid-timeline-eyebrow">Sprint IA · Timeline</span>
        <h2 className="mid-timeline-title">Memória do ciclo</h2>
      </div>
      <div className="mid-timeline-track" role="list">
        {events.map((event) => (
          <article
            key={event.id}
            role="listitem"
            className={`mid-timeline-card mid-timeline-card--${event.tone}`}
          >
            <time className="mid-timeline-card-date" dateTime={event.isoDate}>
              {event.dateLabel}
            </time>
            <p className="mid-timeline-card-title">{event.title}</p>
          </article>
        ))}
      </div>
    </section>
  );
}
