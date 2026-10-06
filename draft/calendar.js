/* Clinic hours and working periods are maintained here. Dates use Shanghai's
   calendar, never the visitor's time zone. No booking data is collected. */
(() => {
  'use strict';
  const workingPeriods = [
    { start: '2026-10-05', end: '2026-10-20' },
    { start: '2026-11-07', end: null }
  ];
  const weeklySessions = {
    1: { clinic: 'am-sino', time: 'afternoon' },
    2: { clinic: 'parkway', time: '13:00–19:00' },
    3: { clinic: 'am-sino', time: 'allDay' },
    5: { clinic: 'parkway', time: '13:00–19:00' },
    6: { clinic: 'am-sino', time: 'allDay' }
  };
  function sessionFor(date) {
    if (!workingPeriods.some(period => date >= period.start && (!period.end || date <= period.end))) return null;
    return weeklySessions[new Date(`${date}T12:00:00Z`).getUTCDay()] || null;
  }
  function daysInMonth(year, month) {
    return Array.from({ length: new Date(Date.UTC(year, month + 1, 0)).getUTCDate() }, (_, index) => {
      const day = index + 1;
      const date = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      return { date, day, session: sessionFor(date) };
    });
  }
  // Pure date logic also runs in the regression tests, without a browser.
  if (typeof module !== 'undefined' && module.exports) module.exports = { sessionFor, daysInMonth };
  if (typeof document === 'undefined') return;

  window.FergusonCalendar = {
    init() {
      const calendar = document.querySelector('.appointment-calendar');
      const days = calendar.querySelector('.calendar-days');
      const weekdays = calendar.querySelector('.calendar-weekdays');
      const heading = document.getElementById('calendar-month');
      const dialog = document.querySelector('.booking-dialog');
      function revealCalendar() {
        calendar.open = true;
        calendar.querySelector('summary').focus({ preventScroll: true });
      }
      document.querySelectorAll('[data-calendar-link]').forEach(link => link.addEventListener('click', event => {
        if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
        revealCalendar(); // Keep the native anchor URL, scrolling and browser history.
      }));
      window.addEventListener('hashchange', () => {
        if (window.location.hash === '#appointment-calendar') revealCalendar();
      });
      if (window.location.hash === '#appointment-calendar') revealCalendar();
      const practice = [...document.querySelectorAll('.practice')];
      const clinics = { 'am-sino': practice[0], parkway: practice[1] };
      const today = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Shanghai', year: 'numeric', month: '2-digit', day: '2-digit' })
        .formatToParts(new Date());
      const part = type => today.find(value => value.type === type).value;
      const todayDate = `${part('year')}-${part('month')}-${part('day')}`;
      const firstMonth = workingPeriods[0].start.slice(0, 7);
      const initialMonth = todayDate.slice(0, 7) < firstMonth ? firstMonth : todayDate.slice(0, 7);
      let year = Number(initialMonth.slice(0, 4));
      let month = Number(initialMonth.slice(5, 7)) - 1;
      let labels;
      let selectedDate;
      let returnFocus;
      const locale = () => document.documentElement.lang;
      const dateLabel = date => new Intl.DateTimeFormat(locale(), {
        timeZone: 'Asia/Shanghai', weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
      }).format(new Date(`${date}T04:00:00Z`));
      const clinicName = clinic => clinics[clinic].querySelector('.clinic-name').textContent.replace(/^\d+\.\s*/, '');
      const timeLabel = session => labels[session.time] || session.time;

      function updateBooking() {
        const session = sessionFor(selectedDate);
        const source = clinics[session.clinic].querySelector('.appointment-qr-frame img');
        const image = source.cloneNode();
        image.removeAttribute('loading');
        document.getElementById('booking-clinic').textContent = clinicName(session.clinic);
        document.getElementById('booking-date').textContent = `${dateLabel(selectedDate)} · ${timeLabel(session)}`;
        dialog.querySelector('.booking-code').replaceChildren(image);
      }
      function openBooking(date, button) {
        selectedDate = date;
        returnFocus = button;
        updateBooking();
        dialog.showModal();
      }
      function render() {
        heading.textContent = new Intl.DateTimeFormat(locale(), { timeZone: 'UTC', year: 'numeric', month: 'long' })
          .format(new Date(Date.UTC(year, month, 1)));
        calendar.querySelector('.calendar-prev').disabled = `${year}-${String(month + 1).padStart(2, '0')}` === firstMonth;
        weekdays.replaceChildren(...Array.from({ length: 7 }, (_, index) => {
          const day = document.createElement('span');
          day.textContent = new Intl.DateTimeFormat(locale(), { timeZone: 'UTC', weekday: 'short' })
            .format(new Date(Date.UTC(2026, 9, 5 + index)));
          return day;
        }));
        const monthDays = daysInMonth(year, month);
        days.replaceChildren(...monthDays.map(({ date, day, session }, index) => {
          const cell = document.createElement('li');
          cell.dataset.date = date;
          if (!index) cell.style.gridColumnStart = String((new Date(`${date}T12:00:00Z`).getUTCDay() + 6) % 7 + 1);
          const number = document.createElement('span');
          number.className = 'calendar-day-number';
          number.textContent = String(day);
          if (session) {
            const button = document.createElement('button');
            button.type = 'button';
            button.className = `calendar-session ${session.clinic}`;
            button.dataset.clinic = session.clinic;
            button.setAttribute('aria-label', `${dateLabel(date)} · ${clinicName(session.clinic)} · ${timeLabel(session)}`);
            const clinic = document.createElement('span');
            clinic.className = 'calendar-clinic';
            clinic.textContent = labels[session.clinic] || (session.clinic === 'am-sino' ? 'Am-Sino' : 'Parkway');
            const time = document.createElement('span');
            time.className = 'calendar-time';
            time.textContent = timeLabel(session);
            button.append(number, clinic, time);
            if (date === todayDate) button.setAttribute('aria-current', 'date');
            button.addEventListener('click', () => openBooking(date, button));
            cell.append(button);
          } else {
            cell.className = 'calendar-off';
            cell.setAttribute('aria-label', dateLabel(date));
            if (date === todayDate) number.setAttribute('aria-current', 'date');
            cell.append(number);
          }
          return cell;
        }));
        calendar.querySelector('.calendar-empty').hidden = monthDays.some(day => day.session);
      }
      for (const [selector, step] of [['.calendar-prev', -1], ['.calendar-next', 1]]) {
        calendar.querySelector(selector).addEventListener('click', () => {
          const next = new Date(Date.UTC(year, month + step, 1));
          year = next.getUTCFullYear();
          month = next.getUTCMonth();
          render();
        });
      }
      dialog.addEventListener('close', () => {
        dialog.querySelector('.booking-code').replaceChildren();
        returnFocus?.focus();
      });
      return {
        update(copy) {
          labels = copy;
          render();
          if (dialog.open) updateBooking();
        }
      };
    }
  };
})();
