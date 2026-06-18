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
    'https://cors.lol/?',
    'https://api.allorigins.win/raw?url=',
    'https://corsproxy.io/?',
    'https://api.codetabs.com/v1/proxy?quest='
  ];

  // 自動更新の間隔（ミリ秒）: 5分
  var REFRESH_INTERVAL_MS = 5 * 60 * 1000;

  var today = new Date();
  today.setHours(0, 0, 0, 0);

  // 1. スクリプトの読み込みと同時に非同期取得を開始（並行処理）
  var closedDatesPromise = fetchCalendarData();

  document.addEventListener('DOMContentLoaded', function () {
    // 2. ローカルストレージからキャッシュされた定休日データを読み込む
    var cachedData = null;
    try {
      var json = localStorage.getItem('rosepale_closed_dates');
      if (json) {
        cachedData = JSON.parse(json);
      }
    } catch (e) {
      console.warn('[Calendar] キャッシュの読み込みに失敗しました。', e);
    }

    // 3. キャッシュがあれば即座に（ページを開いた瞬間に）描画し、なければ空で表示
    if (cachedData) {
      renderAll(today, cachedData);
    } else {
      renderAll(today, null);
    }

    // 4. 最新データの取得完了時にカレンダーを再描画
    closedDatesPromise.then(function (closedDates) {
      if (closedDates) {
        renderAll(today, closedDates);
      }
    });

    // 5. 以降は定期更新（ページを開いている間、5分ごと）
    setInterval(function () {
      today = new Date();
      today.setHours(0, 0, 0, 0);
      fetchCalendarData().then(function (closedDates) {
        if (closedDates) {
          renderAll(today, closedDates);
        }
      });
    }, REFRESH_INTERVAL_MS);
  });

  // ── Google カレンダーを取得して再描画 ────────────────────
  function fetchCalendarData() {
    var cacheBust = '?_=' + Date.now();

    // 1. 同一オリジンの静的 ICS ファイルを最優先で取得（GitHub Pages / ローカル環境用）
    return fetch('data/calendar.ics' + cacheBust)
      .then(function (res) {
        if (!res.ok) throw new Error('Static ICS HTTP ' + res.status);
        return res.text();
      })
      .then(function (icsText) {
        var closedDates = parseICS(icsText);
        saveToCache(closedDates);
        return closedDates;
      })
      .catch(function (err) {
        console.warn('[Calendar] 同一オリジンのICSファイル取得に失敗しました。フォールバックします。', err);
        
        // 2. Cloudflare Pages Function または CORSプロキシへフォールバック
        if (window.location.protocol !== 'file:') {
          return fetch('/api/calendar' + cacheBust)
            .then(function (res) {
              if (!res.ok) throw new Error('Pages Function HTTP ' + res.status);
              return res.text();
            })
            .then(function (icsText) {
              var closedDates = parseICS(icsText);
              saveToCache(closedDates);
              return closedDates;
            })
            .catch(function (err2) {
              console.warn('[Calendar] Pages Functionでの取得に失敗しました。CORSプロキシへフォールバックします。', err2);
              return fetchViaProxies(cacheBust);
            });
        } else {
          return fetchViaProxies(cacheBust);
        }
      });
  }

  // CORSプロキシ経由で取得
  function fetchViaProxies(cacheBust) {
    return fetchWithFallback(PROXIES, 0, ICS_URL + cacheBust)
      .then(function (icsText) {
        var closedDates = parseICS(icsText);
        saveToCache(closedDates);
        return closedDates;
      })
      .catch(function (err) {
        console.warn('[Calendar] すべてのプロキシ経由でのカレンダー取得に失敗しました。', err);
        return null;
      });
  }

  // キャッシュ保存用ヘルパー
  function saveToCache(closedDates) {
    try {
      localStorage.setItem('rosepale_closed_dates', JSON.stringify(closedDates));
    } catch (e) {
      console.warn('[Calendar] キャッシュの保存に失敗しました。', e);
    }
  }

  // ── プロキシを順番に試して ICS を取得 ────────────────────
  function fetchWithFallback(proxies, index, targetUrl) {
    if (index >= proxies.length) {
      return Promise.reject(new Error('全プロキシで取得失敗'));
    }
    var proxy = proxies[index];
    var url;
    // url= や quest= などのパラメータを持つプロキシのみエンコードし、それ以外（cors.lol/? や corsproxy.io/?）は生URLを結合
    if (proxy.indexOf('url=') !== -1 || proxy.indexOf('quest=') !== -1) {
      url = proxy + encodeURIComponent(targetUrl);
    } else {
      url = proxy + targetUrl;
    }
    return fetch(url)
      .then(function (res) {
        if (!res.ok) throw new Error('HTTP ' + res.status);
        return res.text();
      })
      .catch(function () {
        return fetchWithFallback(proxies, index + 1, targetUrl);
      });
  }

  // ── YYYYMMDD 文字列を Date オブジェクトに変換（ローカル時刻）──
  function ymdToDate(ymd) {
    var m = ymd.match(/(\d{4})(\d{2})(\d{2})/);
    if (!m) return null;
    return new Date(parseInt(m[1], 10), parseInt(m[2], 10) - 1, parseInt(m[3], 10));
  }

  // ── Date を 'YYYY-MM-DD' 文字列に変換 ──
  function dateToKey(d) {
    return d.getFullYear() + '-'
      + String(d.getMonth() + 1).padStart(2, '0') + '-'
      + String(d.getDate()).padStart(2, '0');
  }

  // ── 繰り返し予定（RRULE）処理用ヘルパー ─────────────────────
  var DOW_MAP = { 'SU': 0, 'MO': 1, 'TU': 2, 'WE': 3, 'TH': 4, 'FR': 5, 'SA': 6 };

  function getWeekStart(date) {
    var d = new Date(date);
    var day = d.getDay();
    var diff = d.getDate() - day + (day === 0 ? -6 : 1);
    return new Date(d.setDate(diff));
  }

  function getMondayOffset(dow) {
    return dow === 0 ? 6 : dow - 1;
  }

  function parseRRule(rruleStr) {
    var rule = {};
    var parts = rruleStr.replace(/^RRULE:/i, '').split(';');
    for (var i = 0; i < parts.length; i++) {
      var pair = parts[i].split('=');
      if (pair.length === 2) {
        rule[pair[0].toUpperCase()] = pair[1];
      }
    }
    rule.INTERVAL = rule.INTERVAL ? parseInt(rule.INTERVAL, 10) : 1;
    if (rule.COUNT) rule.COUNT = parseInt(rule.COUNT, 10);
    return rule;
  }

  function getOccurrences(startDate, durationMs, rule, exdatesSet, windowStart, windowEnd) {
    var occurrences = [];
    var freq = rule.FREQ;
    var interval = rule.INTERVAL;
    var count = rule.COUNT;
    var untilDate = rule.UNTIL ? ymdToDate(rule.UNTIL) : null;

    if (untilDate) {
      untilDate.setHours(23, 59, 59, 999);
    }

    if (freq === 'DAILY') {
      var d = 0;
      if (!count && startDate < windowStart) {
        var diffDays = Math.round((windowStart.getTime() - startDate.getTime()) / (24 * 3600 * 1000));
        if (diffDays > 0) {
          d = Math.max(0, Math.floor((diffDays - 1) / interval) * interval);
        }
      }
      var totalGenerated = 0;
      while (true) {
        var occStart = new Date(startDate.getFullYear(), startDate.getMonth(), startDate.getDate() + d * interval);
        if (untilDate && occStart > untilDate) break;
        if (!count && occStart > windowEnd) break;

        if (occStart >= startDate) {
          totalGenerated++;
          if (count && totalGenerated > count) break;
          if (occStart >= windowStart && occStart <= windowEnd) {
            occurrences.push(occStart);
          }
        }
        d++;
      }

    } else if (freq === 'WEEKLY') {
      var startWeekMonday = getWeekStart(startDate);
      var weekdays = [];
      if (rule.BYDAY) {
        weekdays = rule.BYDAY.split(',').map(function (day) {
          var clean = day.trim().toUpperCase();
          return DOW_MAP[clean.substring(clean.length - 2)];
        });
      } else {
        weekdays = [startDate.getDay()];
      }
      weekdays.sort(function (a, b) {
        return getMondayOffset(a) - getMondayOffset(b);
      });

      var w = 0;
      if (!count && startWeekMonday < windowStart) {
        var diffWeeks = Math.round((windowStart.getTime() - startWeekMonday.getTime()) / (7 * 24 * 3600 * 1000));
        if (diffWeeks > 0) {
          w = Math.max(0, Math.floor((diffWeeks - 1) / interval) * interval);
        }
      }

      var totalGenerated = 0;
      var finished = false;
      while (!finished) {
        var weekMonday = new Date(startWeekMonday.getFullYear(), startWeekMonday.getMonth(), startWeekMonday.getDate() + w * interval * 7);
        for (var i = 0; i < weekdays.length; i++) {
          var dow = weekdays[i];
          var offset = getMondayOffset(dow);
          var occStart = new Date(weekMonday.getFullYear(), weekMonday.getMonth(), weekMonday.getDate() + offset);

          if (untilDate && occStart > untilDate) {
            finished = true;
            break;
          }
          if (!count && occStart > windowEnd) {
            finished = true;
            break;
          }

          if (occStart >= startDate) {
            totalGenerated++;
            if (count && totalGenerated > count) {
              finished = true;
              break;
            }
            if (occStart >= windowStart && occStart <= windowEnd) {
              occurrences.push(occStart);
            }
          }
        }
        w++;
      }

    } else if (freq === 'MONTHLY') {
      var m = 0;
      if (!count && startDate < windowStart) {
        var diffMonths = (windowStart.getFullYear() - startDate.getFullYear()) * 12 + (windowStart.getMonth() - startDate.getMonth());
        if (diffMonths > 0) {
          m = Math.max(0, Math.floor((diffMonths - 1) / interval) * interval);
        }
      }

      var totalGenerated = 0;
      var finished = false;
      while (!finished) {
        var targetYear = startDate.getFullYear();
        var targetMonth = startDate.getMonth() + m * interval;

        var monthCandidates = [];
        if (rule.BYMONTHDAY) {
          var monthDays = rule.BYMONTHDAY.split(',').map(function (x) { return parseInt(x.trim(), 10); });
          monthDays.forEach(function (dayVal) {
            var date;
            if (dayVal > 0) {
              date = new Date(targetYear, targetMonth, dayVal);
            } else {
              date = new Date(targetYear, targetMonth + 1, dayVal + 1);
            }
            var testDate = new Date(targetYear, targetMonth, 1);
            if (date.getFullYear() === testDate.getFullYear() && date.getMonth() === testDate.getMonth()) {
              monthCandidates.push(date);
            }
          });
        } else if (rule.BYDAY) {
          var byDays = rule.BYDAY.split(',');
          byDays.forEach(function (byDay) {
            var clean = byDay.trim().toUpperCase();
            var dayStr = clean.substring(clean.length - 2);
            var weekdayIndex = DOW_MAP[dayStr];
            var prefixStr = clean.substring(0, clean.length - 2);
            var prefix = prefixStr ? parseInt(prefixStr, 10) : null;

            var days = [];
            var daysInMonth = new Date(targetYear, targetMonth + 1, 0).getDate();
            for (var dNum = 1; dNum <= daysInMonth; dNum++) {
              var date = new Date(targetYear, targetMonth, dNum);
              if (date.getDay() === weekdayIndex) {
                days.push(date);
              }
            }

            if (prefix === null) {
              monthCandidates = monthCandidates.concat(days);
            } else if (prefix > 0) {
              if (days[prefix - 1]) monthCandidates.push(days[prefix - 1]);
            } else if (prefix < 0) {
              if (days[days.length + prefix]) monthCandidates.push(days[days.length + prefix]);
            }
          });
        } else {
          var date = new Date(targetYear, targetMonth, startDate.getDate());
          var testDate = new Date(targetYear, targetMonth, 1);
          if (date.getFullYear() === testDate.getFullYear() && date.getMonth() === testDate.getMonth()) {
            monthCandidates.push(date);
          }
        }

        monthCandidates.sort(function (a, b) { return a.getTime() - b.getTime(); });

        for (var i = 0; i < monthCandidates.length; i++) {
          var occStart = monthCandidates[i];
          if (untilDate && occStart > untilDate) {
            finished = true;
            break;
          }
          if (!count && occStart > windowEnd) {
            finished = true;
            break;
          }

          if (occStart >= startDate) {
            totalGenerated++;
            if (count && totalGenerated > count) {
              finished = true;
              break;
            }
            if (occStart >= windowStart && occStart <= windowEnd) {
              occurrences.push(occStart);
            }
          }
        }

        if (!count && new Date(targetYear, targetMonth, 1) > windowEnd) {
          finished = true;
        }
        m++;
      }
    }

    return occurrences;
  }

  // ── ICS パーサー ─────────────────────────────────────────
  // 「休み」を含むイベントの日付のみを Set で返す
  // 複数日イベント（DTEND 付き）、繰り返し予定（RRULE）に対応
  function parseICS(text) {
    var closedSet = {};

    // 折り返し行（行頭スペース/タブで継続する ICS の仕様）を連結
    var normalized = text.replace(/\r\n([ \t])/g, '$1').replace(/\r/g, '');
    var lines = normalized.split('\n');

    var inEvent = false;
    var dtstart  = null;
    var dtend    = null;
    var summary  = null;
    var rrule    = null;
    var exdates  = [];

    // 表示ウィンドウ範囲（前後余裕を持たせる：当月1日〜3ヶ月先の1日まで）
    var windowStart = new Date(today.getFullYear(), today.getMonth(), 1);
    var windowEnd   = new Date(today.getFullYear(), today.getMonth() + 3, 1);

    for (var i = 0; i < lines.length; i++) {
      var line = lines[i].trim();

      if (line === 'BEGIN:VEVENT') {
        inEvent = true;
        dtstart  = null;
        dtend    = null;
        summary  = null;
        rrule    = null;
        exdates  = [];

      } else if (line === 'END:VEVENT') {
        if (inEvent && dtstart && summary && summary.indexOf('休み') !== -1) {
          // 「休み」を含むイベントのみ定休日として登録
          var startDate = ymdToDate(dtstart);
          if (startDate) {
            var durationMs = 0;
            if (dtend) {
              var endDate = ymdToDate(dtend);
              if (endDate) {
                durationMs = endDate.getTime() - startDate.getTime();
              }
            }

            if (rrule) {
              var rule = parseRRule(rrule);
              var exdatesSet = {};
              exdates.forEach(function (exd) {
                var exDate = ymdToDate(exd);
                if (exDate) {
                  exdatesSet[dateToKey(exDate)] = true;
                }
              });

              var occurrences = getOccurrences(startDate, durationMs, rule, exdatesSet, windowStart, windowEnd);
              occurrences.forEach(function (occStart) {
                var occKey = dateToKey(occStart);
                if (!exdatesSet[occKey]) {
                  if (durationMs > 0) {
                    var occEnd = new Date(occStart.getTime() + durationMs);
                    var cur = new Date(occStart);
                    while (cur < occEnd) {
                      closedSet[dateToKey(cur)] = true;
                      cur.setDate(cur.getDate() + 1);
                    }
                  } else {
                    closedSet[occKey] = true;
                  }
                }
              });
            } else {
              // 単発（または通常の複数日）イベント
              if (durationMs > 0) {
                var cur = new Date(startDate);
                var occEnd = new Date(startDate.getTime() + durationMs);
                while (cur < occEnd) {
                  closedSet[dateToKey(cur)] = true;
                  cur.setDate(cur.getDate() + 1);
                }
              } else {
                closedSet[dateToKey(startDate)] = true;
              }
            }
          }
        }
        inEvent = false;

      } else if (inEvent) {
        // DTSTART / DTEND / SUMMARY / RRULE / EXDATE の値を取得（大文字小文字、パラメータ付きに対応）
        if (/^DTSTART[;:]/i.test(line)) {
          dtstart = line.split(':').slice(1).join(':');
        } else if (/^DTEND[;:]/i.test(line)) {
          dtend = line.split(':').slice(1).join(':');
        } else if (/^SUMMARY[;:]/i.test(line)) {
          summary = line.split(':').slice(1).join(':');
        } else if (/^RRULE[;:]/i.test(line)) {
          rrule = line.split(':').slice(1).join(':');
        } else if (/^EXDATE[;:]/i.test(line)) {
          var exVal = line.split(':').slice(1).join(':');
          var parts = exVal.split(',');
          for (var p = 0; p < parts.length; p++) {
            var dStr = parts[p].trim();
            if (dStr) {
              exdates.push(dStr);
            }
          }
        }
      }
    }

    return closedSet;
  }


  // ── レンダリング ─────────────────────────────────────────
  // closedDates が null の場合は水・木を静的に定休日表示（フォールバック）
  function renderAll(todayDate, closedDates) {
    for (var m = 0; m < 2; m++) {
      var firstDay = new Date(todayDate.getFullYear(), todayDate.getMonth() + m, 1);
      var el = document.getElementById('cal-month-' + m);
      if (el) el.innerHTML = buildMonth(firstDay, todayDate, closedDates);
    }
  }

  function buildMonth(firstDay, todayDate, closedDates) {
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

      if (closedDates && closedDates[dateKey]) {
        // Googleカレンダーで「休み」と登録された日のみ定休日色
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
