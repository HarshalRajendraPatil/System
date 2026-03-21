const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

const toMonthLabel = (monthKey) => {
  const [yearText, monthText] = monthKey.split('-');
  const date = new Date(Date.UTC(Number(yearText), Number(monthText) - 1, 1));
  return date.toLocaleString('en-US', { month: 'long', year: 'numeric', timeZone: 'UTC' });
};

const moveMonth = (monthKey, delta) => {
  const [yearText, monthText] = monthKey.split('-');
  const date = new Date(Date.UTC(Number(yearText), Number(monthText) - 1 + delta, 1));
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}`;
};

const buildMonthGrid = (monthKey) => {
  const [yearText, monthText] = monthKey.split('-');
  const year = Number(yearText);
  const monthIndex = Number(monthText) - 1;

  const firstDay = new Date(Date.UTC(year, monthIndex, 1));
  const startWeekday = firstDay.getUTCDay();
  const daysInCurrentMonth = new Date(Date.UTC(year, monthIndex + 1, 0)).getUTCDate();
  const daysInPrevMonth = new Date(Date.UTC(year, monthIndex, 0)).getUTCDate();

  const cells = [];

  for (let i = 0; i < startWeekday; i += 1) {
    const day = daysInPrevMonth - startWeekday + i + 1;
    const date = new Date(Date.UTC(year, monthIndex - 1, day));
    cells.push({
      dateKey: `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}-${String(date.getUTCDate()).padStart(2, '0')}`,
      day,
      inCurrentMonth: false,
    });
  }

  for (let day = 1; day <= daysInCurrentMonth; day += 1) {
    cells.push({
      dateKey: `${year}-${String(monthIndex + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`,
      day,
      inCurrentMonth: true,
    });
  }

  while (cells.length < 42) {
    const day = cells.length - startWeekday - daysInCurrentMonth + 1;
    const date = new Date(Date.UTC(year, monthIndex + 1, day));
    cells.push({
      dateKey: `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}-${String(date.getUTCDate()).padStart(2, '0')}`,
      day,
      inCurrentMonth: false,
    });
  }

  return cells;
};

function MockCalendarView({ monthKey, calendarData, selectedDateKey, onSelectDateKey, onChangeMonth }) {
  const dayMap = new Map((calendarData?.days || []).map((day) => [day.dateKey, day]));
  const cells = buildMonthGrid(monthKey);

  return (
    <section className="panel mocks-calendar-panel">
      <div className="panel__head">
        <h2>Mock Calendar</h2>
        <p>Custom calendar built from date math and your logs</p>
      </div>

      <div className="mocks-calendar-toolbar">
        <button type="button" className="button ghost" onClick={() => onChangeMonth(moveMonth(monthKey, -1))}>
          Previous
        </button>
        <strong>{toMonthLabel(monthKey)}</strong>
        <button type="button" className="button ghost" onClick={() => onChangeMonth(moveMonth(monthKey, 1))}>
          Next
        </button>
      </div>

      <div className="mocks-weekday-row">
        {WEEKDAYS.map((label) => (
          <span key={label}>{label}</span>
        ))}
      </div>

      <div className="mocks-calendar-grid">
        {cells.map((cell) => {
          const day = dayMap.get(cell.dateKey);
          const isSelected = selectedDateKey === cell.dateKey;
          const hasMocks = Boolean(day?.count);

          return (
            <button
              key={cell.dateKey}
              type="button"
              className={`mocks-calendar-cell ${cell.inCurrentMonth ? '' : 'muted'} ${isSelected ? 'selected' : ''} ${hasMocks ? 'active' : ''}`}
              onClick={() => onSelectDateKey(cell.dateKey)}
            >
              <span className="day-number">{cell.day}</span>
              {hasMocks ? (
                <span className="day-meta">
                  <em>{day.count} mock</em>
                  <strong>{day.avgScore}</strong>
                </span>
              ) : null}
            </button>
          );
        })}
      </div>
    </section>
  );
}

export default MockCalendarView;
