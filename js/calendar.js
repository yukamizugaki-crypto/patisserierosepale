// ========================================
// Patisserie Rose Pale - Calendar Script
// Google カレンダー連携版（自動更新）
// embed src: patisserierosepale@gmail.com
// ========================================

(function () {
  'use strict';

  var DAYS_JA = ['日', '月', '火', '水', '木', '金', '土'];

  // 埋め込みコードのカレンダーID から ICS URL を生成
  var CALENDAR_ID = 'patisserierosepale@gmail.com';
  var ICS_URL = 'https://calendar.google.com/calendar/ical/'
                + encodeURIComponent(CALENDAR_ID)
                + '/public/basic.ics';

  // CORS プロキシ（順番に試す）
  var PROXIES = [
    'https://api.allorigins.win/raw?url=',
    'https://corsproxy.io/?',
    'https://api.codetabs.com/v1/proxy?quest='
  ];

  // 自動更新の間隔（ミリ秒）: 5分
  var REFRESH_INTERVAL_MS = 5 * 60 * 1000;

  var today = new Date();
  today.setHours(0, 0, 0, 0);

  document.addEventListener('DOMContentLoaded', function () {
    // 最初に空のカレンダーを即座に表示
    renderAll(today, null);

    // 初回取得
    syncCalendar();

    // 以降は自動で定期更新（ページを開いている間、5分ごと）
    setInterval(function () {
      // 日付をリフレッシュ（日をまたいだ場合に対応）
      today = new Date();
      today.setHours(0, 0, 0, 0);
      syncCalendar();
    }, REFRESH_INTERVAL_MS);
  });

  // ── Google カレンダーを取得して再描画 ────────────────────
  function syncCalendar() {
    // ブラウザキャッシュを防ぐためタイムスタンプをパラメータに追加
    var cacheBust = '&_=' + Date.now();
    fetchWithFallback(PROXIES, 0, ICS_URL + cacheBust)
      .then(function (icsText) {
        var events = parseICS(icsText);
        renderAll(today, events);
      })
      .catch(function (err) {
        console.warn('[Calendar] Googleカレンダーの取得に失敗しました。定休日（水・木）を静的表示します。', err);
        renderAll(today, null);
      });
  }

  // ── プロキシを順番に試して ICS を取得 ────────────────────
  function fetchWithFallback(proxies, index, targetUrl) {
    if (index >= proxies.length) {
      return Promise.reject(new Error('全プロキシで取得失敗'));
    }
    var url = proxies[index] + encodeURIComponent(targetUrl);
    return fetch(url)
      .then(function (res) {
        if (!res.ok) throw new Error('HTTP ' + res.status);
        return res.text();
      })
      .catch(function () {
        return fetchWithFallback(proxies, index + 1, targetUrl);
      });
  }

  // ── ICS パーサー ─────────────────────────────────────────
  // 戻り値: { 'YYYY-MM-DD': '予定タイトル', ... }
  function parseICS(text) {
    var events = {};

    // 折り返し行（行頭スペース/タブで継続する ICS の仕様）を連結
    var normalized = text.replace(/\r\n([ \t])/g, '$1').replace(/\r/g, '');
    var lines = normalized.split('\n');

    var inEvent = false;
    var dtstart  = null;
    var summary  = null;

    for (var i = 0; i < lines.length; i++) {
      var line = lines[i].trim();

      if (line === 'BEGIN:VEVENT') {
        inEvent = true;
        dtstart  = null;
        summary  = null;

      } else if (line === 'END:VEVENT') {
        if (inEvent && dtstart) {
          // DATE形式（YYYYMMDD）も DATETIME形式（YYYYMMDDTHHMMSS）も対応
          var m = dtstart.match(/(\d{4})(\d{2})(\d{2})/);
          if (m) {
            var key = m[1] + '-' + m[2] + '-' + m[3];
            if (!events[key]) {
              events[key] = summary || '休業';
            }
          }
        }
        inEvent = false;

      } else if (inEvent) {
        // DTSTART の値を取得（"DTSTART;VALUE=DATE:20260604" 形式にも対応）
        if (/^DTSTART[;:]/.test(line)) {
          dtstart = line.split(':').slice(1).join(':');
        } else if (line.indexOf('SUMMARY:') === 0) {
          summary = line.substring(8);
        }
      }
    }

    return events;
  }

  // ── レンダリング ─────────────────────────────────────────
  // events が null の場合は水・木を静的に定休日表示（フォールバック）
  function renderAll(todayDate, events) {
    for (var m = 0; m < 2; m++) {
      var firstDay = new Date(todayDate.getFullYear(), todayDate.getMonth() + m, 1);
      var el = document.getElementById('cal-month-' + m);
      if (el) el.innerHTML = buildMonth(firstDay, todayDate, events);
    }
  }

  function buildMonth(firstDay, todayDate, events) {
    var year        = firstDay.getFullYear();
    var month       = firstDay.getMonth();
    var daysInMonth = new Date(year, month + 1, 0).getDate();
    var startDow    = firstDay.getDay();
    var html        = '';

    // 月ヘッダー
    var monthStr = String(month + 1).padStart(2, '0');
    html += '<div class="cal-month-header">' + year + '年' + monthStr + '月</div>';
    html += '<div class="cal-table">';

    // 曜日行
    html += '<div class="cal-dow-row">';
    DAYS_JA.forEach(function (d, i) {
      var cls = i === 0 ? 'sun' : i === 6 ? 'sat' : '';
      html += '<div class="cal-dow-cell ' + cls + '">' + d + '</div>';
    });
    html += '</div>';

    html += '<div class="cal-body">';

    // 月初の空白セル
    for (var e = 0; e < startDow; e++) {
      html += '<div class="cal-cell cal-empty"></div>';
    }

    // 各日
    for (var day = 1; day <= daysInMonth; day++) {
      var date    = new Date(year, month, day);
      var dow     = date.getDay();
      var dateKey = year + '-'
                  + String(month + 1).padStart(2, '0') + '-'
                  + String(day).padStart(2, '0');

      var classes = ['cal-cell'];
      if (dow === 0) classes.push('cal-sun');
      if (dow === 6) classes.push('cal-sat');
      if (date.getTime() === todayDate.getTime()) classes.push('cal-today');

      if (events === null) {
        // フォールバック: 水・木を静的に定休日表示
        if (dow === 3 || dow === 4) classes.push('cal-closed');
      } else if (events[dateKey]) {
        // Google カレンダーに予定がある日 → オレンジ（定休日）
        classes.push('cal-closed');
      }

      html += '<div class="' + classes.join(' ') + '">';
      html += '<span class="cal-day-num">' + day + '</span>';
      html += '</div>';
    }

    // 末尾の空白セル（7の倍数に揃える）
    var totalCells = startDow + daysInMonth;
    var remainder  = totalCells % 7;
    if (remainder !== 0) {
      for (var f = 0; f < 7 - remainder; f++) {
        html += '<div class="cal-cell cal-empty"></div>';
      }
    }

    html += '</div>'; // .cal-body
    html += '</div>'; // .cal-table
    return html;
  }

})();
