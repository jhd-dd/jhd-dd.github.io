const CLIENT_ID = '991396104439-a7lnh39sf20olhubn5vhptaas2juqq21.apps.googleusercontent.com';
const API_KEY = 'AIzaSyCEp8loJOr_EsYmhqWms3o-7IugLUpyTkg';
const DISCOVERY_DOC = 'https://www.googleapis.com/discovery/v1/apis/calendar/v3/rest';
const SCOPES = 'https://www.googleapis.com/auth/calendar.events';

const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December'];

let tokenClient, gapiInited = false, gisInited = false, accessToken = null;
let currentYear = 2026;
let selectedMonths = new Set();

function getNthWeekday(year, month, weekday, nth) {
    const first = new Date(year, month, 1).getDay();
    const offset = (weekday - first + 7)%7;
    return 1 + offset + (nth-1)*7;
}

function getLastWeekday(year, month, weekday) {
    const lastDay = new Date(year, month+1, 0);
    const offset = (lastDay.getDay() - weekday + 7) % 7;
    return lastDay.getDate() - offset;
}

function getPhilippineHolidays(year, monthIndex = null) {
    const fixedHolidays = [
        { name: "New Year's Day",                     month: 1,  day: 1,  type: 'regular' },
        { name: "National Fiction Day",               month: 1,  day: 2,  type: 'working' },
        { name: "National Hug Day",                   month: 1,  day: 21, type: 'social' },
        { name: "Valentine's Day",                    month: 2,  day: 14, type: 'social' },
        { name: "Kiss Day",                           month: 2,  day: 13, type: 'social' },
        { name: "Single Awareness Day",               month: 2,  day: 15, type: 'social' },
        { name: "People Power Anniversary",           month: 2,  day: 25, type: 'working' },
        { name: "National Proposal Day",              month: 3,  day: 20, type: 'social' },
        { name: "Montalban Founding Anniversary",      month: 4,  day: 27, type: 'montalban'},
        { name: "April Fool's Day",                   month: 4,  day: 1,  type: 'social' },
        { name: "Araw ng Kagitingan",                 month: 4,  day: 9,  type: 'regular' },
        { name: "Labor Day",                          month: 5,  day: 1,  type: 'regular' },
        { name: "BestFriend Day",                     month: 6,  day: 8,  type: 'social' },
        { name: "Independence Day",                   month: 6,  day: 12, type: 'regular' },
        { name: "Social Media Day",                   month: 6,  day: 30, type: 'social' },
        { name: "National Girlfriend Day",            month: 8,  day: 1,  type: 'social' },
        { name: "National Couple's Day",              month: 8,  day: 18, type: 'social' },
        { name: "Ninoy Aquino Day",                   month: 8,  day: 21, type: 'special' },
        { name: "National Aspin Day",                 month: 8,  day: 18, type: 'social' },
        { name: "National Crush Day",                 month: 9,  day: 27, type: 'social' },
        { name: "National Love People Day",           month: 9,  day: 30, type: 'social' },
        { name: "National BoyFriend Day",             month: 10, day: 3,  type: 'social' },
        { name: "National Text Your Ex Day",          month: 10, day: 30, type: 'social' },
        { name: "All Saints' Day",                    month: 11, day: 1,  type: 'special' },
        { name: "All Souls' Day",                     month: 11, day: 2,  type: 'special' },
        { name: "Bonifacio Day",                      month: 11, day: 30, type: 'regular' },
        { name: "Singles' Day",                       month: 11, day: 11, type: 'social' },
        { name: "Feast of the Immaculate Conception", month: 12, day: 8,  type: 'special' },
        { name: "Christmas Day",                      month: 12, day: 25, type: 'regular' },
        { name: "Rizal Day",                          month: 12, day: 30, type: 'regular' },
        { name: "New Year's Eve",                     month: 12, day: 31, type: 'special' },
    ];

    const easter = computeEaster(year);
    const maundyThursday = new Date(easter); maundyThursday.setDate(easter.getDate() - 3);
    const goodFriday = new Date(easter); goodFriday.setDate(easter.getDate() - 2);
    const blackSaturday = new Date(easter); blackSaturday.setDate(easter.getDate() - 1);

    let holidays = [
        ...fixedHolidays.map(h => ({ name: h.name, date: new Date(year, h.month - 1, h.day), type: h.type })),
        { name: 'National Heroes Day', date: new Date(year, 7, getLastWeekday(year, 7, 1 )), type: 'regular' },
        { name: 'Maundy Thursday',     date: maundyThursday,                type: 'regular' },
        { name: 'Good Friday',         date: goodFriday,                    type: 'regular' },
        { name: 'Black Saturday',      date: blackSaturday,                 type: 'special' },
        { name: "Mother's Day",        date: new Date(year, 4, getNthWeekday(year, 4, 0, 2)), type: 'social'},
        { name: "Father's Day",        date: new Date(year, 5, getNthWeekday(year, 5, 0, 3)), type: 'social'}, 
    ];

    if (monthIndex !== null) {
        const holyWeekNames = ['Maundy Thursday', 'Good Friday', 'Black Saturday'];
        holidays = holidays.filter(h => h.date.getMonth() === monthIndex || (holyWeekNames.includes(h.name) && (monthIndex === 2 || monthIndex === 3)));
    }

    return holidays.sort((a, b) => a.date - b.date);
}

function computeEaster(year) {
    const a = year % 19, b = Math.floor(year / 100), c = year % 100;
    const d = Math.floor(b / 4), e = b % 4, f = Math.floor((b + 8) / 25);
    const g = Math.floor((b - f + 1) / 3), h = (19 * a + b - d - g + 15) % 30;
    const i = Math.floor(c / 4), k = c % 4;
    const l = (32 + 2 * e + 2 * i - h - k) % 7;
    const m = Math.floor((a + 11 * h + 22 * l) / 451);
    const month = Math.floor((h + l - 7 * m + 114) / 31) - 1;
    const day = ((h + l - 7 * m + 114) % 31) + 1;
    return new Date(year, month, day);
}

function toDateString(date) {
    return `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}-${String(date.getDate()).padStart(2,'0')}`;
}

function formatDate(date) {
    return date.toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' });
}

function getTypeLabel(type) {
    switch(type) {
        case 'regular':    return '📌 Regular Holiday';
        case 'special':    return '⭐ Special Non-Working';
        case 'working':    return '🔵 Special Working';
        case 'social':     return '👥 Social Holiday';
        case 'montalban':  return '⛰️ Montalban Holiday';
        default:           return type;
    }
}

function getTypeColor(type) {
    switch(type) {
        case 'regular':    return '11';
        case 'special':    return '5';
        case 'working':    return '7';
        case 'social':     return '3';
        case 'montalban':  return '2';
        default:           return '1';
    }
}

function getTypeDescription(type) {
    switch(type) {
        case 'regular':    return 'Philippine Regular Public Holiday';
        case 'special':    return 'Philippine Special Non-Working Holiday';
        case 'working':    return 'Philippine Special Working Holiday';
        case 'social':     return 'Philippine Social Holiday';
        case 'montalban':  return 'Montalban Holiday';
        default:           return 'Philippine Holiday';
    }
}

function populateMonths() {
    const grid = document.getElementById('monthGrid');
    grid.innerHTML = '';
    MONTHS.forEach((name, i) => {
        const card = document.createElement('div');
        card.className = 'month-card';
        card.textContent = name;
        card.dataset.index = i;
        card.addEventListener('click', () => toggleMonth(i, card));
        grid.appendChild(card);
    });
}

function toggleMonth(index, element) {
    if (selectedMonths.has(index)) {
        selectedMonths.delete(index);
        element.classList.remove('selected');
    } else {
        selectedMonths.add(index);
        element.classList.add('selected');
    }
    document.getElementById('syncBtn').disabled = selectedMonths.size === 0;
    renderHolidays();
}

function selectAllMonths() {
    selectedMonths = new Set([0,1,2,3,4,5,6,7,8,9,10,11]);
    document.querySelectorAll('.month-card').forEach(card => card.classList.add('selected'));
    document.getElementById('syncBtn').disabled = false;
    renderHolidays();
}

function clearAllMonths() {
    selectedMonths.clear();
    document.querySelectorAll('.month-card').forEach(card => card.classList.remove('selected'));
    document.getElementById('syncBtn').disabled = true;
    document.getElementById('holidaysPreview').classList.add('hidden');
}

function renderHolidays() {
    if (selectedMonths.size === 0) {
        document.getElementById('holidaysPreview').classList.add('hidden');
        return;
    }

    const list = document.getElementById('holidaysList');
    list.innerHTML = '';

    const sortedMonths = [...selectedMonths].sort((a, b) => a - b);
    let totalCount = 0;

    sortedMonths.forEach(monthIndex => {
    let holidays = getPhilippineHolidays(currentYear, monthIndex);
    holidays = holidays.filter(h => {
        const holyWeekNames = ['Maundy Thursday', 'Good Friday', 'Black Saturday'];
        if (holyWeekNames.includes(h.name)) return h.date.getMonth() === monthIndex;
        return h.date.getMonth() === monthIndex;
    });
        totalCount += holidays.length;

        const label = document.createElement('div');
        label.className = 'month-group-label';
        label.textContent = MONTHS[monthIndex];
        list.appendChild(label);

        if (holidays.length === 0) {
            const none = document.createElement('p');
            none.className = 'no-holidays';
            none.textContent = 'No holidays this month.';
            list.appendChild(none);
        } else {
            holidays.forEach((holiday, i) => {
                const item = document.createElement('div');
                item.className = `holiday-item${holiday.type === 'special' ? ' special' : holiday.type === 'working' ? ' working' :  holiday.type === 'montalban' ? ' montalban' :holiday.type === 'social' ? ' social' :  ''}`;
                item.style.animationDelay = `${i * 0.05}s`;
                item.innerHTML = `
                    <div class="holiday-left">
                        <span class="holiday-name">${holiday.name}</span>
                        <span class="holiday-type">${getTypeLabel(holiday.type)}</span>
                    </div>
                    <span class="holiday-date">${formatDate(holiday.date)}</span>
                `;
                list.appendChild(item);
            });
        }
    });

    document.getElementById('holidayCount').textContent = `${totalCount} holiday${totalCount !== 1 ? 's' : ''}`;
    document.getElementById('holidaysPreview').classList.remove('hidden');
}

function changeYear(delta) {
    currentYear = Math.min(2035, Math.max(2020, currentYear + delta));
    document.getElementById('yearInput').value = currentYear;
    if (selectedMonths.size > 0) renderHolidays();
}

function showStatus(message, type) {
    const el = document.getElementById('authStatus');
    el.textContent = message;
    el.className = `status-${type} visible`;
}

function gapiLoaded() {
    gapi.load('client', async () => {
        try {
            await gapi.client.init({ apiKey: API_KEY, discoveryDocs: [DISCOVERY_DOC] });
            gapiInited = true;
            maybeEnableButtons();
        } catch (e) { showStatus('Failed to initialize Google API.', 'error'); }
    });
}

function gisLoaded() {
    try {
        tokenClient = google.accounts.oauth2.initTokenClient({
            client_id: CLIENT_ID,
            scope: SCOPES,
            callback: (response) => {
                if (response.error) { showStatus('Authentication failed: ' + response.error, 'error'); return; }
                accessToken = response.access_token;
                gapi.client.setToken({ access_token: accessToken });
                showStatus('✓ Connected to Google Calendar!', 'success');
                document.getElementById('authorizeBtn').classList.add('hidden');
                document.getElementById('signoutBtn').classList.remove('hidden');
                document.getElementById('mainContent').classList.remove('hidden');
                populateMonths();
            },
        });
        gisInited = true;
        maybeEnableButtons();
    } catch (e) { showStatus('Failed to initialize Google Sign-In.', 'error'); }
}

function maybeEnableButtons() {
    if (gapiInited && gisInited) {
        document.getElementById('authorizeBtn').disabled = false;
        showStatus('Ready! Click the button to connect your calendar.', 'info');
    }
}

async function syncToCalendar() {
    if (!accessToken) { showStatus('Please connect to Google Calendar first.', 'error'); return; }
    if (selectedMonths.size === 0) { showStatus('Please select at least one month.', 'error'); return; }

    const btn = document.getElementById('syncBtn');
    btn.innerHTML = '<span class="loading"></span> Syncing...';
    btn.disabled = true;

    let successCount = 0;
    const sortedMonths = [...selectedMonths].sort((a, b) => a - b);

    for (const monthIndex of sortedMonths) {
        const holidays = getPhilippineHolidays(currentYear, monthIndex);
        for (const holiday of holidays) {
            try {
                const dateStr = toDateString(holiday.date);
                await gapi.client.calendar.events.insert({
                    calendarId: 'primary',
                    resource: {
                        summary: holiday.name,
                        start: { date: dateStr },
                        end: { date: dateStr },
                        description: getTypeDescription(holiday.type),
                        colorId: getTypeColor(holiday.type),
                    },
                });
                successCount++;
            } catch (err) {
                console.error('Failed to sync:', holiday.name, err);
            }
        }
    }

    btn.textContent = 'Sync to Calendar';
    btn.disabled = false;

    showStatus(
        successCount > 0
            ? `✓ Synced ${successCount} holiday${successCount !== 1 ? 's' : ''} across ${selectedMonths.size} month${selectedMonths.size !== 1 ? 's' : ''} for ${currentYear}!`
            : '✗ Failed to sync. Please try again.',
        successCount > 0 ? 'success' : 'error'
    );
}

document.addEventListener('DOMContentLoaded', () => {
    showStatus('⏳ Loading Google APIs...', 'info');

    document.getElementById('authorizeBtn').addEventListener('click', () => {
        if (tokenClient) tokenClient.requestAccessToken({ prompt: 'consent' });
        else showStatus('Google Sign-In not ready. Please refresh.', 'error');
    });

    document.getElementById('signoutBtn').addEventListener('click', () => {
        if (accessToken) { google.accounts.oauth2.revoke(accessToken); gapi.client.setToken(null); accessToken = null; }
        selectedMonths.clear();
        document.getElementById('authorizeBtn').classList.remove('hidden');
        document.getElementById('signoutBtn').classList.add('hidden');
        document.getElementById('mainContent').classList.add('hidden');
        document.getElementById('holidaysPreview').classList.add('hidden');
        document.getElementById('monthGrid').innerHTML = '';
        document.getElementById('authStatus').className = '';
    });

    document.getElementById('prevYear').addEventListener('click', () => changeYear(-1));
    document.getElementById('nextYear').addEventListener('click', () => changeYear(1));
    document.getElementById('yearInput').addEventListener('change', (e) => {
        currentYear = parseInt(e.target.value);
        if (selectedMonths.size > 0) renderHolidays();
    });
    document.getElementById('syncBtn').addEventListener('click', syncToCalendar);
    document.getElementById('selectAllBtn').addEventListener('click', selectAllMonths);
    document.getElementById('clearAllBtn').addEventListener('click', clearAllMonths);
});
