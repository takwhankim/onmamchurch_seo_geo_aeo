const APP_TIMEZONE = 'Asia/Seoul';
const MEMBER_SHEET_NAME = '새가족명단';
const VISIT_SHEET_NAME = '심방기록';
const MEMBER_HEADERS = ['이름', '등록일', '담당사역자', '마지막심방일', '심방주기(일)', '연락처'];
const VISIT_HEADERS = ['이름', '담당사역자', '심방일', '메모', '기록일'];

const SAMPLE_MEMBERS = [
  ['김하준', '2025-11-03', '박민수 목사', '2026-04-01', 30, '010-2384-1192'],
  ['이서윤', '2025-12-14', '이은혜 전도사', '2026-03-28', 21, '010-4821-5730'],
  ['박도윤', '2025-09-22', '정우진 목사', '2026-03-15', 30, '010-3519-8842'],
  ['최지우', '2026-01-07', '김소라 전도사', '2026-04-10', 14, '010-6672-1048'],
  ['정민준', '2025-08-19', '박민수 목사', '2026-03-20', 45, '010-1948-6621'],
  ['한서아', '2025-10-11', '이은혜 전도사', '2026-04-05', 30, '010-5207-3186'],
  ['윤예준', '2025-07-30', '정우진 목사', '2026-03-30', 21, '010-7741-2059'],
  ['장하린', '2026-02-02', '김소라 전도사', '2026-04-12', 14, '010-6035-9471'],
  ['임주원', '2025-06-25', '박민수 목사', '2026-03-18', 30, '010-9264-7315'],
  ['오나연', '2025-11-28', '이은혜 전도사', '2026-04-02', 21, '010-4173-2864'],
  ['서지호', '2026-01-16', '정우진 목사', '2026-04-08', 14, '010-2816-5539'],
  ['신가은', '2025-09-05', '김소라 전도사', '2026-03-25', 30, '010-7350-1924'],
  ['권태윤', '2025-05-14', '박민수 목사', '2026-03-10', 60, '010-8642-4407'],
  ['조수빈', '2025-12-01', '이은혜 전도사', '2026-04-07', 21, '010-5931-7280'],
  ['백현우', '2025-08-27', '정우진 목사', '2026-03-21', 30, '010-1478-9652'],
  ['송다인', '2025-10-30', '김소라 전도사', '2026-03-29', 21, '010-6785-2341'],
  ['남유찬', '2026-02-10', '박민수 목사', '2026-04-11', 14, '010-3097-6814'],
  ['노유진', '2025-07-18', '이은혜 전도사', '2026-03-16', 45, '010-8426-1173'],
  ['문시우', '2026-01-24', '정우진 목사', '2026-04-06', 14, '010-4562-3908'],
  ['강채원', '2025-06-09', '김소라 전도사', '2026-03-12', 30, '010-9135-8420'],
  ['황준서', '2025-11-11', '박민수 목사', '2026-03-31', 21, '010-2249-5561'],
  ['유아린', '2026-02-18', '이은혜 전도사', '2026-04-13', 14, '010-7614-9082'],
  ['손지안', '2025-09-17', '정우진 목사', '2026-03-24', 30, '010-5480-3376'],
  ['홍시온', '2025-05-29', '김소라 전도사', '2026-03-08', 60, '010-6902-4815'],
  ['고은재', '2025-12-20', '박민수 목사', '2026-04-03', 21, '010-3751-6204'],
  ['양다정', '2025-08-08', '이은혜 전도사', '2026-03-19', 30, '010-8327-1549'],
  ['배지율', '2026-01-31', '정우진 목사', '2026-04-09', 14, '010-1184-7935'],
  ['전소민', '2025-07-07', '김소라 전도사', '2026-03-14', 45, '010-5742-2688'],
  ['하도현', '2025-10-21', '박민수 목사', '2026-04-04', 21, '010-9473-6157'],
  ['마예린', '2025-11-25', '이은혜 전도사', '2026-03-27', 30, '010-2865-4701'],
];

function doGet() {
  ensureSheets_();

  const template = HtmlService.createTemplateFromFile('Index');
  return template
    .evaluate()
    .setTitle('새가족 심방 스케줄러')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

function include(filename) {
  return HtmlService.createHtmlOutputFromFile(filename).getContent();
}

function getDashboardData() {
  ensureSheets_();

  const today = startOfDay_(new Date());
  const members = getMembers_();
  const stats = {
    totalMembers: members.length,
    overdueCount: 0,
    todayCount: 0,
    upcomingCount: 0,
    ministers: {},
  };

  members.forEach((member) => {
    stats.ministers[member.minister] = (stats.ministers[member.minister] || 0) + 1;

    if (member.daysUntilNextVisit < 0) {
      stats.overdueCount += 1;
    } else if (member.daysUntilNextVisit === 0) {
      stats.todayCount += 1;
    } else if (member.daysUntilNextVisit <= 7) {
      stats.upcomingCount += 1;
    }
  });

  return {
    generatedAt: formatDate_(today),
    stats: stats,
    members: members,
    recentVisits: getRecentVisits_(),
  };
}

function addMember(formData) {
  ensureSheets_();
  validateMemberForm_(formData);

  const sheet = SpreadsheetApp.getActive().getSheetByName(MEMBER_SHEET_NAME);
  const row = [
    String(formData.name).trim(),
    normalizeDateInput_(formData.registeredAt),
    String(formData.minister).trim(),
    normalizeDateInput_(formData.lastVisitAt),
    Number(formData.cycleDays),
    String(formData.phone).trim(),
  ];

  sheet.appendRow(row);
  return getDashboardData();
}

function recordVisit(payload) {
  ensureSheets_();

  const rowNumber = Number(payload.rowNumber);
  const visitDate = normalizeDateInput_(payload.visitDate);
  const note = String(payload.note || '').trim();
  const membersSheet = SpreadsheetApp.getActive().getSheetByName(MEMBER_SHEET_NAME);
  const visitsSheet = SpreadsheetApp.getActive().getSheetByName(VISIT_SHEET_NAME);

  if (!rowNumber || rowNumber < 2 || rowNumber > membersSheet.getLastRow()) {
    throw new Error('대상 행을 찾을 수 없습니다.');
  }

  const rowValues = membersSheet.getRange(rowNumber, 1, 1, MEMBER_HEADERS.length).getValues()[0];
  const memberName = rowValues[0];
  const minister = rowValues[2];

  membersSheet.getRange(rowNumber, 4).setValue(visitDate);
  visitsSheet.appendRow([
    memberName,
    minister,
    visitDate,
    note,
    formatDate_(new Date()),
  ]);

  return getDashboardData();
}

function seedSampleData() {
  ensureSheets_();

  const sheet = SpreadsheetApp.getActive().getSheetByName(MEMBER_SHEET_NAME);
  const dataRowCount = Math.max(sheet.getLastRow() - 1, 0);
  if (dataRowCount > 0) {
    throw new Error('이미 새가족 데이터가 있어서 샘플 데이터를 넣지 않았습니다.');
  }

  sheet.getRange(2, 1, SAMPLE_MEMBERS.length, MEMBER_HEADERS.length).setValues(SAMPLE_MEMBERS);
  return getDashboardData();
}

function resetAndSeedSampleData() {
  ensureSheets_();

  const spreadsheet = SpreadsheetApp.getActive();
  const memberSheet = spreadsheet.getSheetByName(MEMBER_SHEET_NAME);
  const visitSheet = spreadsheet.getSheetByName(VISIT_SHEET_NAME);

  clearSheetData_(memberSheet, MEMBER_HEADERS.length);
  clearSheetData_(visitSheet, VISIT_HEADERS.length);

  memberSheet.getRange(2, 1, SAMPLE_MEMBERS.length, MEMBER_HEADERS.length).setValues(SAMPLE_MEMBERS);
  return getDashboardData();
}

function ensureSheets_() {
  const spreadsheet = SpreadsheetApp.getActive();
  const memberSheet = getOrCreateSheet_(spreadsheet, MEMBER_SHEET_NAME);
  const visitSheet = getOrCreateSheet_(spreadsheet, VISIT_SHEET_NAME);

  ensureHeaderRow_(memberSheet, MEMBER_HEADERS);
  ensureHeaderRow_(visitSheet, VISIT_HEADERS);
}

function getMembers_() {
  const sheet = SpreadsheetApp.getActive().getSheetByName(MEMBER_SHEET_NAME);
  const lastRow = sheet.getLastRow();
  if (lastRow < 2) {
    return [];
  }

  const rows = sheet.getRange(2, 1, lastRow - 1, MEMBER_HEADERS.length).getValues();
  return rows
    .map((row, index) => mapMemberRow_(row, index + 2))
    .filter(Boolean)
    .sort((a, b) => a.daysUntilNextVisit - b.daysUntilNextVisit);
}

function getRecentVisits_() {
  const sheet = SpreadsheetApp.getActive().getSheetByName(VISIT_SHEET_NAME);
  const lastRow = sheet.getLastRow();
  if (lastRow < 2) {
    return [];
  }

  const rows = sheet.getRange(2, 1, lastRow - 1, VISIT_HEADERS.length).getValues();
  return rows
    .map((row) => ({
      name: row[0],
      minister: row[1],
      visitDate: formatDate_(row[2]),
      note: row[3] || '',
      loggedAt: formatDate_(row[4]),
    }))
    .reverse()
    .slice(0, 10);
}

function mapMemberRow_(row, rowNumber) {
  const name = String(row[0] || '').trim();
  if (!name) {
    return null;
  }

  const registeredAt = parseDate_(row[1]);
  const lastVisitAt = parseDate_(row[3]);
  const cycleDays = Number(row[4]);
  const nextVisitAt = calculateNextVisitDate_(lastVisitAt, cycleDays);
  const daysUntilNextVisit = calculateDayDiff_(startOfDay_(new Date()), nextVisitAt);
  const status = getVisitStatus_(daysUntilNextVisit);

  return {
    rowNumber: rowNumber,
    name: name,
    registeredAt: formatDate_(registeredAt),
    minister: String(row[2] || '').trim(),
    lastVisitAt: formatDate_(lastVisitAt),
    cycleDays: cycleDays,
    phone: String(row[5] || '').trim(),
    nextVisitAt: formatDate_(nextVisitAt),
    daysUntilNextVisit: daysUntilNextVisit,
    status: status.label,
    statusCode: status.code,
  };
}

function validateMemberForm_(formData) {
  if (!formData) {
    throw new Error('입력값이 없습니다.');
  }

  if (!String(formData.name || '').trim()) {
    throw new Error('이름을 입력해주세요.');
  }

  if (!String(formData.minister || '').trim()) {
    throw new Error('담당사역자를 입력해주세요.');
  }

  if (!normalizeDateInput_(formData.registeredAt)) {
    throw new Error('등록일을 입력해주세요.');
  }

  if (!normalizeDateInput_(formData.lastVisitAt)) {
    throw new Error('마지막 심방일을 입력해주세요.');
  }

  if (!Number(formData.cycleDays) || Number(formData.cycleDays) <= 0) {
    throw new Error('심방주기는 1일 이상이어야 합니다.');
  }
}

function getVisitStatus_(daysUntilNextVisit) {
  if (daysUntilNextVisit < 0) {
    return { code: 'overdue', label: '지연' };
  }
  if (daysUntilNextVisit === 0) {
    return { code: 'today', label: '오늘' };
  }
  if (daysUntilNextVisit <= 7) {
    return { code: 'upcoming', label: '임박' };
  }
  return { code: 'normal', label: '여유' };
}

function calculateNextVisitDate_(lastVisitAt, cycleDays) {
  const nextVisit = new Date(lastVisitAt);
  nextVisit.setDate(nextVisit.getDate() + Number(cycleDays));
  return startOfDay_(nextVisit);
}

function calculateDayDiff_(fromDate, toDate) {
  const oneDayMs = 1000 * 60 * 60 * 24;
  return Math.round((startOfDay_(toDate).getTime() - startOfDay_(fromDate).getTime()) / oneDayMs);
}

function getOrCreateSheet_(spreadsheet, name) {
  return spreadsheet.getSheetByName(name) || spreadsheet.insertSheet(name);
}

function ensureHeaderRow_(sheet, headers) {
  if (sheet.getLastRow() === 0) {
    sheet.appendRow(headers);
  } else {
    const currentHeaders = sheet.getRange(1, 1, 1, headers.length).getValues()[0];
    if (headers.join('|') !== currentHeaders.join('|')) {
      sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
    }
  }

  sheet.setFrozenRows(1);
  sheet.autoResizeColumns(1, headers.length);
}

function clearSheetData_(sheet, columnCount) {
  const lastRow = sheet.getLastRow();
  if (lastRow > 1) {
    sheet.getRange(2, 1, lastRow - 1, columnCount).clearContent();
  }
}

function normalizeDateInput_(value) {
  const date = parseDate_(value);
  return formatDate_(date);
}

function parseDate_(value) {
  if (Object.prototype.toString.call(value) === '[object Date]' && !isNaN(value)) {
    return startOfDay_(value);
  }

  const parsed = new Date(value);
  if (isNaN(parsed)) {
    throw new Error('날짜 형식이 올바르지 않습니다: ' + value);
  }
  return startOfDay_(parsed);
}

function formatDate_(date) {
  return Utilities.formatDate(parseDate_(date), APP_TIMEZONE, 'yyyy-MM-dd');
}

function startOfDay_(date) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}
