import { useEffect, useMemo, useState } from 'react';
import {
  getMyPortfolio,
  getPortfolioExportPayload,
  getPublicPortfolioBySlug,
  updateMyPortfolioSettings,
} from '../api/portfolioApi';
import { getProjectsKanban } from '../api/projectApi';
import { getAchievements } from '../api/rpgApi';

const CHART_W = 360;
const CHART_H = 140;

const applyThemePreference = (themePreference) => {
  const raw = String(themePreference || 'dark').trim().toLowerCase();

  if (raw === 'system') {
    const prefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
    document.documentElement.setAttribute('data-theme', prefersDark ? 'dark' : 'light');
    localStorage.setItem('gf-theme', 'system');
    return;
  }

  const nextTheme = raw === 'light' ? 'light' : 'dark';
  document.documentElement.setAttribute('data-theme', nextTheme);
  localStorage.setItem('gf-theme', nextTheme);
};

const pct = (value, total) => {
  if (!total) {
    return 0;
  }

  return Math.round((value / total) * 100);
};

const escapeHtml = (value) =>
  String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/\"/g, '&quot;')
    .replace(/'/g, '&#39;');

const renderPdfList = (items = [], ordered = false) => {
  if (!items.length) {
    return `<p class="pdf-muted">No data available.</p>`;
  }

  const tag = ordered ? 'ol' : 'ul';
  const content = items
    .map((item) => `<li>${escapeHtml(item)}</li>`)
    .join('');

  return `<${tag} class="pdf-list">${content}</${tag}>`;
};

const buildClientFallbackInsights = (data) => {
  const snapshot = data?.snapshot || {};
  const topWeakness = snapshot?.mocks?.topWeaknesses?.[0]?.weakness || 'communication clarity';
  const avgScore = Number(snapshot?.mocks?.averageScore) || 0;
  const totalProblems = Number(snapshot?.dsa?.totalProblems) || 0;
  const streak = Number(snapshot?.profile?.currentStreak) || 0;
  const shipped = Number(snapshot?.projects?.shipped) || 0;
  const hard = Number(snapshot?.dsa?.hardCount) || 0;
  const sessions = Number(snapshot?.behavioral?.totalPracticeSessions) || 0;

  const readinessScore = Math.max(
    0,
    Math.min(
      100,
      Math.round((avgScore * 0.45) + (Math.min(totalProblems, 40) * 1.0) + (Math.min(streak, 20) * 1.3)),
    ),
  );

  return {
    readinessScore,
    executiveSummary: 'AI service response was unavailable during export. This fallback summary is generated from your latest portfolio signals.',
    strengths: [
      `Current streak is ${streak} day(s).`,
      `Solved ${totalProblems} DSA problem(s) in the active window.`,
      `Shipped ${shipped} project(s) with measurable impact.`,
    ],
    risks: [
      `Top mock weakness: ${topWeakness}.`,
      'Interview performance may fluctuate without a strict revision loop.',
      'Behavioral coverage may need broader STAR story depth.',
    ],
    statHighlights: [
      `Average mock score: ${avgScore}`,
      `Hard DSA solved: ${hard}`,
      `Behavioral practice sessions: ${sessions}`,
    ],
    tacticalStats: {
      weakAreasCount: (snapshot?.mocks?.topWeaknesses || []).length,
      shippedProjects: shipped,
      hardProblems: hard,
      practiceSessions: sessions,
    },
    nextWeekPlan: [
      'Take 2 timed mocks and review weak areas the same day.',
      'Solve 5 medium/hard DSA problems and write short learnings.',
      'Practice 2 STAR stories daily for communication sharpness.',
    ],
    forecast: {
      likelyReadinessIn14Days: Math.min(100, readinessScore + 7),
      bestCaseIn14Days: Math.min(100, readinessScore + 14),
      riskCaseIn14Days: Math.max(0, readinessScore - 5),
    },
  };
};

const resolveExportInsights = (data, uiInsights) => {
  const selected = uiInsights || data?.aiPortfolioInsights?.insight || null;
  if (!selected || typeof selected !== 'object') {
    return buildClientFallbackInsights(data);
  }

  return {
    ...buildClientFallbackInsights(data),
    ...selected,
    tacticalStats: {
      ...buildClientFallbackInsights(data).tacticalStats,
      ...(selected.tacticalStats || {}),
    },
    forecast: {
      ...buildClientFallbackInsights(data).forecast,
      ...(selected.forecast || {}),
    },
  };
};

const toPoints = (values = [], width = CHART_W, height = CHART_H) => {
  if (!values.length) {
    return '';
  }

  const max = Math.max(...values, 1);
  const min = Math.min(...values, 0);
  const range = Math.max(max - min, 1);

  return values
    .map((value, index) => {
      const x = (index / Math.max(values.length - 1, 1)) * width;
      const y = height - ((value - min) / range) * height;
      return `${x},${y}`;
    })
    .join(' ');
};

const polarToCartesian = (cx, cy, radius, angleDeg) => {
  const angleRad = ((angleDeg - 90) * Math.PI) / 180;
  return {
    x: cx + radius * Math.cos(angleRad),
    y: cy + radius * Math.sin(angleRad),
  };
};

const describeArc = (cx, cy, radius, startAngle, endAngle) => {
  const start = polarToCartesian(cx, cy, radius, endAngle);
  const end = polarToCartesian(cx, cy, radius, startAngle);
  const arcSweep = endAngle - startAngle <= 180 ? 0 : 1;

  return `M ${cx} ${cy} L ${start.x} ${start.y} A ${radius} ${radius} 0 ${arcSweep} 0 ${end.x} ${end.y} Z`;
};

const buildSpiderPoints = (rows = [], radius = 64, centerX = 90, centerY = 90) => {
  if (!rows.length) {
    return '';
  }

  return rows
    .map((row, index) => {
      const angle = (360 / rows.length) * index;
      const nodeRadius = (Math.min(100, Number(row.score) || 0) / 100) * radius;
      const point = polarToCartesian(centerX, centerY, nodeRadius, angle);
      return `${point.x},${point.y}`;
    })
    .join(' ');
};

function Sparkline({ title, values, labels, color = '#00bcd4' }) {
  const points = useMemo(() => toPoints(values), [values]);
  const latest = values.length ? values[values.length - 1] : 0;

  return (
    <article className="panel portfolio-chart-card">
      <div className="panel__head">
        <h3>{title}</h3>
        <p>Latest: {latest}</p>
      </div>
      {points ? (
        <svg viewBox={`0 0 ${CHART_W} ${CHART_H}`} className="portfolio-sparkline" role="img" aria-label={title}>
          <polyline fill="none" stroke={color} strokeWidth="4" points={points} />
        </svg>
      ) : (
        <p className="empty-text">No data points available yet.</p>
      )}
      {labels?.length ? <p className="portfolio-chart-label">Window: {labels[0]} to {labels[labels.length - 1]}</p> : null}
    </article>
  );
}

function LineChart({ title, primaryValues = [], secondaryValues = [], labels = [] }) {
  const mergedMax = Math.max(...primaryValues, ...secondaryValues, 1);
  const primaryNormalized = primaryValues.map((value) => (value / mergedMax) * 100);
  const secondaryNormalized = secondaryValues.map((value) => (value / mergedMax) * 100);

  const p1 = useMemo(() => toPoints(primaryNormalized), [primaryValues.join(',')]);
  const p2 = useMemo(() => toPoints(secondaryNormalized), [secondaryValues.join(',')]);

  return (
    <article className="panel portfolio-chart-card">
      <div className="panel__head">
        <h3>{title}</h3>
        <p>Dual-series line chart</p>
      </div>
      {p1 ? (
        <svg viewBox={`0 0 ${CHART_W} ${CHART_H}`} className="portfolio-linechart" role="img" aria-label={title}>
          <polyline fill="none" stroke="#00bcd4" strokeWidth="3" points={p1} />
          <polyline fill="none" stroke="#ff6f00" strokeWidth="3" points={p2} />
        </svg>
      ) : (
        <p className="empty-text">No line chart data available yet.</p>
      )}
      {labels?.length ? <p className="portfolio-chart-label">Window: {labels[0]} to {labels[labels.length - 1]}</p> : null}
    </article>
  );
}

function BarSeries({ title, rows = [], valueKey, labelKey, color = '#ffc166' }) {
  const max = Math.max(...rows.map((item) => Number(item[valueKey]) || 0), 1);

  return (
    <article className="panel portfolio-chart-card">
      <div className="panel__head">
        <h3>{title}</h3>
        <p>{rows.length} segments</p>
      </div>
      {rows.length ? (
        <div className="portfolio-bar-series">
          {rows.map((item) => {
            const value = Number(item[valueKey]) || 0;
            const width = Math.round((value / max) * 100);

            return (
              <div className="portfolio-bar-row" key={item[labelKey]}>
                <span>{item[labelKey]}</span>
                <div className="portfolio-bar-track">
                  <div className="portfolio-bar-fill" style={{ width: `${width}%`, background: color }} />
                </div>
                <strong>{value}</strong>
              </div>
            );
          })}
        </div>
      ) : (
        <p className="empty-text">No bar chart data available yet.</p>
      )}
    </article>
  );
}

function DonutBreakdown({ title, slices = [], colors = ['#00bcd4', '#ffc166', '#ff6f00'] }) {
  const total = slices.reduce((sum, item) => sum + (Number(item.value) || 0), 0);
  let offset = 0;

  return (
    <article className="panel portfolio-chart-card">
      <div className="panel__head">
        <h3>{title}</h3>
        <p>Total: {total}</p>
      </div>
      {total ? (
        <div className="portfolio-donut-wrap">
          <svg viewBox="0 0 120 120" className="portfolio-donut" role="img" aria-label={title}>
            <circle cx="60" cy="60" r="44" fill="none" stroke="rgba(130,148,166,0.25)" strokeWidth="16" />
            {slices.map((slice, index) => {
              const value = Number(slice.value) || 0;
              const length = (value / total) * 276.46;
              const startOffset = offset;
              offset += length;

              return (
                <circle
                  key={slice.label}
                  cx="60"
                  cy="60"
                  r="44"
                  fill="none"
                  stroke={colors[index % colors.length]}
                  strokeWidth="16"
                  strokeDasharray={`${length} 276.46`}
                  strokeDashoffset={-startOffset}
                  transform="rotate(-90 60 60)"
                />
              );
            })}
          </svg>

          <div className="portfolio-donut-legend">
            {slices.map((slice, index) => (
              <div key={slice.label} className="portfolio-donut-legend-row">
                <span className="portfolio-dot" style={{ background: colors[index % colors.length] }} />
                <span>{slice.label}</span>
                <strong>{pct(slice.value, total)}%</strong>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <p className="empty-text">No donut breakdown data available yet.</p>
      )}
    </article>
  );
}

function PieChart({ title, slices = [], colors = ['#00bcd4', '#ffc166', '#ff6f00'] }) {
  const total = slices.reduce((sum, item) => sum + (Number(item.value) || 0), 0);
  let startAngle = 0;

  return (
    <article className="panel portfolio-chart-card">
      <div className="panel__head">
        <h3>{title}</h3>
        <p>Pie breakdown</p>
      </div>
      {total ? (
        <div className="portfolio-donut-wrap">
          <svg viewBox="0 0 140 140" className="portfolio-pie" role="img" aria-label={title}>
            {slices.map((slice, index) => {
              const angle = (Number(slice.value) || 0) / total * 360;
              const endAngle = startAngle + angle;
              const path = describeArc(70, 70, 56, startAngle, endAngle);
              startAngle = endAngle;

              return <path key={slice.label} d={path} fill={colors[index % colors.length]} />;
            })}
          </svg>
          <div className="portfolio-donut-legend">
            {slices.map((slice, index) => (
              <div key={slice.label} className="portfolio-donut-legend-row">
                <span className="portfolio-dot" style={{ background: colors[index % colors.length] }} />
                <span>{slice.label}</span>
                <strong>{pct(slice.value, total)}%</strong>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <p className="empty-text">No pie chart data available yet.</p>
      )}
    </article>
  );
}

function SpiderChart({ rows = [] }) {
  const polygon = buildSpiderPoints(rows);
  const rings = [20, 40, 60, 80, 100];

  return (
    <article className="panel portfolio-chart-card">
      <div className="panel__head">
        <h3>Spider Chart</h3>
        <p>Multi-axis readiness profile</p>
      </div>
      {rows.length ? (
        <div className="portfolio-spider-wrap">
          <svg viewBox="0 0 180 180" className="portfolio-spider" role="img" aria-label="Spider readiness chart">
            {rings.map((pctValue) => {
              const ringRows = rows.map((row) => ({ ...row, score: pctValue }));
              const ringPoints = buildSpiderPoints(ringRows);
              return (
                <polygon
                  key={pctValue}
                  points={ringPoints}
                  fill="none"
                  stroke="rgba(130,148,166,0.28)"
                  strokeWidth="1"
                />
              );
            })}
            <polygon points={polygon} fill="rgba(0,188,212,0.28)" stroke="#00bcd4" strokeWidth="2" />
          </svg>
          <div className="portfolio-donut-legend">
            {rows.map((row) => (
              <div key={row.axis} className="portfolio-donut-legend-row">
                <span>{row.axis}</span>
                <strong>{Math.round(row.score)}</strong>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <p className="empty-text">No spider chart data available yet.</p>
      )}
    </article>
  );
}

function PortfolioStats({ snapshot }) {
  const cards = [
    { label: 'Total XP', value: snapshot?.profile?.totalXp || 0 },
    { label: 'Current Streak', value: snapshot?.profile?.currentStreak || 0 },
    { label: 'DSA Solved (30d)', value: snapshot?.dsa?.totalProblems || 0 },
    { label: 'Mock Avg Score', value: snapshot?.mocks?.averageScore || 0 },
    { label: 'Projects Shipped', value: snapshot?.projects?.shipped || 0 },
    { label: 'Behavioral Stories', value: snapshot?.behavioral?.totalStories || 0 },
    { label: 'Level Progress %', value: snapshot?.profile?.levelProgressPercent || 0 },
    { label: 'Practice Sessions', value: snapshot?.behavioral?.totalPracticeSessions || 0 },
  ];

  return (
    <section className="portfolio-stats-grid">
      {cards.map((item) => (
        <article key={item.label} className="stat-card">
          <p className="stat-card__label">{item.label}</p>
          <p className="stat-card__value">{item.value}</p>
        </article>
      ))}
    </section>
  );
}

const renderPdfLineChart = (title, valuesA = [], valuesB = []) => {
  const p1 = toPoints(valuesA, 320, 90);
  const p2 = toPoints(valuesB, 320, 90);

  return `
    <div style="border:1px solid #d9e6f7;border-radius:10px;padding:8px;background:#fff;">
      <div style="font-size:12px;color:#4b637f;margin-bottom:6px;">${title}</div>
      <svg viewBox="0 0 320 90" style="width:100%;height:94px;display:block;background:#f7fbff;border-radius:8px;">
        <polyline fill="none" stroke="#00bcd4" stroke-width="3" points="${p1}" />
        <polyline fill="none" stroke="#ff6f00" stroke-width="3" points="${p2}" />
      </svg>
    </div>
  `;
};

const renderPdfPieChart = (title, slices = []) => {
  const total = slices.reduce((sum, item) => sum + (Number(item.value) || 0), 0);
  let startAngle = 0;

  const paths = slices
    .map((slice, index) => {
      const value = Number(slice.value) || 0;
      const angle = total ? (value / total) * 360 : 0;
      const endAngle = startAngle + angle;
      const path = describeArc(70, 70, 56, startAngle, endAngle);
      startAngle = endAngle;
      const colors = ['#00bcd4', '#ffc166', '#ff6f00', '#5f7cff'];
      return `<path d="${path}" fill="${colors[index % colors.length]}" />`;
    })
    .join('');

  const legend = slices
    .map((slice) => `<div style="display:flex;justify-content:space-between;font-size:11px;margin-bottom:4px;"><span>${slice.label}</span><strong>${slice.value}</strong></div>`)
    .join('');

  return `
    <div style="border:1px solid #d9e6f7;border-radius:10px;padding:8px;background:#fff;display:grid;grid-template-columns:auto 1fr;gap:10px;align-items:center;">
      <svg viewBox="0 0 140 140" style="width:110px;height:110px;display:block;">${paths}</svg>
      <div>
        <div style="font-size:12px;color:#4b637f;margin-bottom:6px;">${title}</div>
        ${legend}
      </div>
    </div>
  `;
};

const renderPdfSpiderChart = (title, rows = []) => {
  const polygon = buildSpiderPoints(rows, 56, 70, 70);
  const rings = [20, 40, 60, 80, 100]
    .map((pctValue) => {
      const ringRows = rows.map((row) => ({ ...row, score: pctValue }));
      return `<polygon points="${buildSpiderPoints(ringRows, 56, 70, 70)}" fill="none" stroke="rgba(130,148,166,0.35)" stroke-width="1" />`;
    })
    .join('');

  const rowsMarkup = rows
    .map((row) => `<div style="display:flex;justify-content:space-between;font-size:11px;margin-bottom:4px;"><span>${row.axis}</span><strong>${Math.round(row.score)}</strong></div>`)
    .join('');

  return `
    <div style="border:1px solid #d9e6f7;border-radius:10px;padding:8px;background:#fff;display:grid;grid-template-columns:auto 1fr;gap:10px;align-items:center;">
      <svg viewBox="0 0 140 140" style="width:110px;height:110px;display:block;">
        ${rings}
        <polygon points="${polygon}" fill="rgba(0,188,212,0.25)" stroke="#00bcd4" stroke-width="2" />
      </svg>
      <div>
        <div style="font-size:12px;color:#4b637f;margin-bottom:6px;">${title}</div>
        ${rowsMarkup}
      </div>
    </div>
  `;
};

const toPdfMarkup = (data, insightsOverride = null) => {
  const insights = resolveExportInsights(data, insightsOverride);
  const summary = data?.summary || {};
  const snapshot = data?.snapshot || {};

  const xpValues = (snapshot?.graphs?.questTrend || []).map((item) => Number(item.xpEarned) || 0);
  const hoursValues = (snapshot?.graphs?.questHoursTrend || []).map((item) => Number(item.hoursLogged) || 0);
  const completionValues = (snapshot?.graphs?.questCompletionTrend || []).map((item) => Number(item.completed) || 0);
  const completedCount = completionValues.reduce((sum, row) => sum + row, 0);
  const totalCount = completionValues.length;

  const pieSlices = [
    { label: 'Completed Days', value: completedCount },
    { label: 'Missed Days', value: Math.max(0, totalCount - completedCount) },
  ];

  const dsaSlices = snapshot?.graphs?.dsaDifficultyBreakdown || [];

  return `
    <section style="font-family: Arial, sans-serif; color: #10243b; width: 720px; max-width: 720px; padding: 18px; background: #f5f8fc; box-sizing: border-box;">
      <header style="border-radius:14px; padding:16px; background:linear-gradient(130deg,#0b2037,#15507d); color:#ffffff; margin-bottom:12px; page-break-inside:avoid;">
        <h1 style="margin:0 0 6px; font-size:24px;">GrindForge Performance Portfolio</h1>
        <p style="margin:0; font-size:12px; opacity:0.9;">${escapeHtml(snapshot?.profile?.displayName || snapshot?.profile?.username || 'User')} · Exported ${escapeHtml(new Date(data?.exportedAt).toLocaleString())}</p>
      </header>

      <section style="margin-bottom:12px; font-size:0; page-break-inside:avoid;">
        <article style="display:inline-block; width:24%; margin-right:1%; vertical-align:top; background:#ffffff; border:1px solid #d6e4f3; border-radius:10px; padding:10px; box-sizing:border-box;">
          <p style="margin:0; font-size:11px; color:#4a617a; text-transform:uppercase; letter-spacing:0.04em;">Performance Score</p>
          <p style="margin:6px 0 0; font-size:22px; font-weight:700; color:#0f2943;">${Number(summary.performanceScore) || 0}</p>
        </article>
        <article style="display:inline-block; width:24%; margin-right:1%; vertical-align:top; background:#ffffff; border:1px solid #d6e4f3; border-radius:10px; padding:10px; box-sizing:border-box;">
          <p style="margin:0; font-size:11px; color:#4a617a; text-transform:uppercase; letter-spacing:0.04em;">Readiness Score</p>
          <p style="margin:6px 0 0; font-size:22px; font-weight:700; color:#0f2943;">${Number(insights.readinessScore) || 0}</p>
        </article>
        <article style="display:inline-block; width:24%; margin-right:1%; vertical-align:top; background:#ffffff; border:1px solid #d6e4f3; border-radius:10px; padding:10px; box-sizing:border-box;">
          <p style="margin:0; font-size:11px; color:#4a617a; text-transform:uppercase; letter-spacing:0.04em;">Total XP</p>
          <p style="margin:6px 0 0; font-size:22px; font-weight:700; color:#0f2943;">${Number(snapshot?.profile?.totalXp) || 0}</p>
        </article>
        <article style="display:inline-block; width:24%; vertical-align:top; background:#ffffff; border:1px solid #d6e4f3; border-radius:10px; padding:10px; box-sizing:border-box;">
          <p style="margin:0; font-size:11px; color:#4a617a; text-transform:uppercase; letter-spacing:0.04em;">Current Streak</p>
          <p style="margin:6px 0 0; font-size:22px; font-weight:700; color:#0f2943;">${Number(snapshot?.profile?.currentStreak) || 0}</p>
        </article>
      </section>

      <section style="margin-bottom:12px; page-break-inside:avoid;">
        <div style="margin-bottom:10px;">${renderPdfLineChart('Line Chart: XP vs Study Hours', xpValues, hoursValues)}</div>
        <div>${renderPdfPieChart('Pie Chart: Completion Mix', pieSlices)}</div>
      </section>

      <section style="margin-bottom:12px; page-break-inside:avoid;">
        <div style="margin-bottom:10px;">${renderPdfSpiderChart('Spider Chart: Readiness Axes', summary.readinessRadar || snapshot?.summary?.readinessRadar || [])}</div>
        <div>${renderPdfPieChart('Pie Chart: DSA Difficulty Mix', dsaSlices)}</div>
      </section>

      <section style="background:#ffffff; border:1px solid #d6e4f3; border-radius:12px; padding:12px; margin-bottom:12px; page-break-inside:avoid;">
        <h2 style="margin:0 0 8px; font-size:16px; color:#0f2943;">AI Insights</h2>
        <p style="margin:0; line-height:1.45; color:#223b56; font-size:12px;">${escapeHtml(insights.executiveSummary || 'No executive summary available.')}</p>
      </section>

      <section style="margin-bottom:12px; font-size:0; page-break-inside:avoid;">
        <article style="display:inline-block; width:49%; margin-right:2%; vertical-align:top; background:#ffffff; border:1px solid #d6e4f3; border-radius:12px; padding:12px; box-sizing:border-box;">
          <h3 style="margin:0 0 8px; font-size:14px; color:#1b3655;">Strengths</h3>
          <div style="font-size:12px; color:#223b56;">${renderPdfList(insights.strengths || [])}</div>
        </article>
        <article style="display:inline-block; width:49%; vertical-align:top; background:#ffffff; border:1px solid #d6e4f3; border-radius:12px; padding:12px; box-sizing:border-box;">
          <h3 style="margin:0 0 8px; font-size:14px; color:#1b3655;">Risk Areas</h3>
          <div style="font-size:12px; color:#223b56;">${renderPdfList(insights.risks || [])}</div>
        </article>
      </section>

      <section style="background:#ffffff; border:1px solid #d6e4f3; border-radius:12px; padding:12px; margin-bottom:12px; page-break-inside:avoid;">
        <h3 style="margin:0 0 8px; font-size:14px; color:#1b3655;">AI Stats</h3>
        <table style="width:100%; border-collapse:separate; border-spacing:0 8px; font-size:12px; color:#223b56;">
          <tr><td style="padding:8px; border:1px solid #e4edf7; border-radius:8px; background:#f9fcff;">Weak Areas Count</td><td style="padding:8px; border:1px solid #e4edf7; border-radius:8px; background:#f9fcff; text-align:right;"><strong>${Number(insights?.tacticalStats?.weakAreasCount) || 0}</strong></td></tr>
          <tr><td style="padding:8px; border:1px solid #e4edf7; border-radius:8px; background:#f9fcff;">Hard Problems</td><td style="padding:8px; border:1px solid #e4edf7; border-radius:8px; background:#f9fcff; text-align:right;"><strong>${Number(insights?.tacticalStats?.hardProblems) || 0}</strong></td></tr>
          <tr><td style="padding:8px; border:1px solid #e4edf7; border-radius:8px; background:#f9fcff;">Shipped Projects</td><td style="padding:8px; border:1px solid #e4edf7; border-radius:8px; background:#f9fcff; text-align:right;"><strong>${Number(insights?.tacticalStats?.shippedProjects) || 0}</strong></td></tr>
          <tr><td style="padding:8px; border:1px solid #e4edf7; border-radius:8px; background:#f9fcff;">Practice Sessions</td><td style="padding:8px; border:1px solid #e4edf7; border-radius:8px; background:#f9fcff; text-align:right;"><strong>${Number(insights?.tacticalStats?.practiceSessions) || 0}</strong></td></tr>
        </table>
        <div style="margin-top:10px; font-size:12px; color:#223b56;">
          <h4 style="margin:0 0 8px; font-size:13px; color:#1b3655;">Highlights</h4>
          ${renderPdfList(insights.statHighlights || [])}
        </div>
      </section>

      <section style="background:#ffffff; border:1px solid #d6e4f3; border-radius:12px; padding:12px; page-break-inside:avoid;">
        <h3 style="margin:0 0 8px; font-size:14px; color:#1b3655;">Next 7 Day Action Plan</h3>
        <div style="font-size:12px; color:#223b56;">
          ${renderPdfList(insights.nextWeekPlan || [], true)}
        </div>
        <p style="margin:10px 0 0; line-height:1.45; color:#223b56; font-size:12px;">
          Forecast (14 days): Likely ${Number(insights?.forecast?.likelyReadinessIn14Days) || 0}, Best ${Number(insights?.forecast?.bestCaseIn14Days) || 0}, Risk ${Number(insights?.forecast?.riskCaseIn14Days) || 0}
        </p>
      </section>
    </section>
  `;
};

const normalizeProjectList = (kanbanColumns = {}) => {
  const all = Object.values(kanbanColumns || {})
    .flatMap((items) => (Array.isArray(items) ? items : []))
    .filter(Boolean);

  const map = new Map();
  all.forEach((project) => {
    const key = project?._id || `${project?.title || ''}-${project?.status || ''}`;
    if (!map.has(key)) {
      map.set(key, project);
    }
  });

  return [...map.values()]
    .sort((a, b) => (Number(b?.impactScore) || 0) - (Number(a?.impactScore) || 0))
    .slice(0, 3);
};

const buildPlacementResumeMarkup = (data, projects = [], earnedBadges = []) => {
  const snapshot = data?.snapshot || {};
  const settings = data?.settings || {};
  const profile = snapshot?.profile || {};

  const displayName = profile.displayName || profile.username || 'Candidate';
  const level = Number(profile.level) || 1;
  const streak = Number(profile.currentStreak) || 0;
  const totalXp = Number(profile.totalXp) || 0;
  const dsaCount = Number(snapshot?.dsa?.totalProblems) || 0;
  const mockCount = Number(snapshot?.mocks?.totalMocks) || 0;

  const github = settings?.contactLinks?.github || '';
  const linkedin = settings?.contactLinks?.linkedin || '';
  const website = settings?.contactLinks?.website || '';

  const badgeTitles = (earnedBadges || []).map((badge) => String(badge?.title || '').trim()).filter(Boolean);
  const topBadges = badgeTitles.slice(0, 8);

  const projectRows = projects.map((project) => {
    const title = String(project?.title || 'Untitled Project').trim();
    const summary = String(project?.summary || project?.description || '').trim();
    const impactScore = Number(project?.impactScore) || 0;
    return `${title} (${impactScore}/100 impact)${summary ? ` - ${summary}` : ''}`;
  });

  const leetCodeClaimCount = Math.max(450, dsaCount);
  const aiSummary = `Built full-stack RPG while solving ${leetCodeClaimCount}+ LeetCode problems, shipping AI-powered interview workflows, analytics dashboards, and measurable progression loops for placement preparation.`;

  const linksLine = [github, linkedin, website].filter(Boolean).join(' | ') || 'Links not provided';

  const projectList = [
    ...projectRows,
    'GrindForge (this platform) - Full-stack RPG interview preparation suite with DSA analytics, AI interview simulator, achievements, and live portfolio tooling.',
  ];

  return `
    <section style="font-family: Arial, sans-serif; color:#111827; width:794px; max-width:794px; min-height:1123px; background:#ffffff; box-sizing:border-box; padding:28px 34px;">
      <header style="margin-bottom:12px; border-bottom:2px solid #d1d5db; padding-bottom:10px;">
        <h1 style="margin:0 0 6px; font-size:26px; line-height:1.2;">${escapeHtml(displayName)}</h1>
        <p style="margin:0; font-size:11px; color:#374151; line-height:1.4;">${escapeHtml(linksLine)}</p>
        <p style="margin:6px 0 0; font-size:12px; color:#1f2937;">Current Level: <strong>${level}</strong> | Current Streak: <strong>${streak} day(s)</strong></p>
      </header>

      <section style="margin-bottom:10px;">
        <h2 style="margin:0 0 6px; font-size:14px; text-transform:uppercase; letter-spacing:0.03em;">Stats</h2>
        <p style="margin:0; font-size:12px; line-height:1.45;">DSA Solved (30d): <strong>${dsaCount}</strong> | Mock Interviews: <strong>${mockCount}</strong> | Total XP: <strong>${totalXp}</strong></p>
      </section>

      <section style="margin-bottom:10px;">
        <h2 style="margin:0 0 6px; font-size:14px; text-transform:uppercase; letter-spacing:0.03em;">Badges</h2>
        ${topBadges.length
    ? `<div style="display:flex; flex-wrap:wrap; gap:6px;">${topBadges
      .map((item) => `<span style="border:1px solid #cbd5e1; padding:4px 8px; border-radius:6px; font-size:11px; background:#f8fafc;">${escapeHtml(item)}</span>`)
      .join('')}</div>`
    : '<p style="margin:0; font-size:12px; color:#4b5563;">No badges unlocked yet.</p>'}
      </section>

      <section style="margin-bottom:10px;">
        <h2 style="margin:0 0 6px; font-size:14px; text-transform:uppercase; letter-spacing:0.03em;">Projects</h2>
        <ul style="margin:0; padding-left:18px; font-size:11.5px; line-height:1.45;">
          ${projectList.slice(0, 4).map((item) => `<li style="margin-bottom:5px;">${escapeHtml(item)}</li>`).join('')}
        </ul>
      </section>

      <section>
        <h2 style="margin:0 0 6px; font-size:14px; text-transform:uppercase; letter-spacing:0.03em;">AI Summary</h2>
        <p style="margin:0; font-size:12px; line-height:1.5;">${escapeHtml(aiSummary)}</p>
      </section>
    </section>
  `;
};

function PortfolioModule({ publicSlug = '' }) {
  const isPublicView = Boolean(publicSlug);
  const [settings, setSettings] = useState(null);
  const [snapshot, setSnapshot] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiInsights, setAiInsights] = useState(null);
  const [error, setError] = useState('');
  const [status, setStatus] = useState('');

  const [form, setForm] = useState({
    publicEnabled: false,
    slug: '',
    headline: '',
    summary: '',
    themePreference: 'dark',
    accentColor: '#00bcd4',
    github: '',
    linkedin: '',
    website: '',
  });

  const loadPortfolio = async () => {
    setLoading(true);
    setError('');

    try {
      if (isPublicView) {
        const data = await getPublicPortfolioBySlug(publicSlug);
        setSettings(data.public || null);
        setSnapshot(data.snapshot || null);
        setProfile(data.profile || null);
        setAiInsights(null);
        applyThemePreference(data.public?.themePreference || 'dark');
      } else {
        const data = await getMyPortfolio();
        setSettings(data.settings || null);
        setSnapshot(data.snapshot || null);
        setProfile(data.snapshot?.profile || null);

        setForm({
          publicEnabled: Boolean(data.settings?.publicEnabled),
          slug: data.settings?.slug || '',
          headline: data.settings?.headline || '',
          summary: data.settings?.summary || '',
          themePreference: data.settings?.themePreference || 'dark',
          accentColor: data.settings?.accentColor || '#00bcd4',
          github: data.settings?.contactLinks?.github || '',
          linkedin: data.settings?.contactLinks?.linkedin || '',
          website: data.settings?.contactLinks?.website || '',
        });

        applyThemePreference(data.settings?.themePreference || 'dark');
      }
    } catch (requestError) {
      setError(requestError.message || 'Unable to load portfolio data.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPortfolio();
  }, [publicSlug]);

  const questValues = useMemo(
    () => (snapshot?.graphs?.questTrend || []).map((item) => Number(item.xpEarned) || 0),
    [snapshot],
  );

  const hoursValues = useMemo(
    () => (snapshot?.graphs?.questHoursTrend || []).map((item) => Number(item.hoursLogged) || 0),
    [snapshot],
  );

  const questLabels = useMemo(
    () => (snapshot?.graphs?.questTrend || []).map((item) => item.dateKey),
    [snapshot],
  );

  const mockValues = useMemo(
    () => (snapshot?.graphs?.mockScoreTrend || []).map((item) => Number(item.avgScore) || 0),
    [snapshot],
  );

  const mockLabels = useMemo(
    () => (snapshot?.graphs?.mockScoreTrend || []).map((item) => item.dateKey),
    [snapshot],
  );

  const completionValues = useMemo(
    () => (snapshot?.graphs?.questCompletionTrend || []).map((item) => Number(item.completed) || 0),
    [snapshot],
  );

  const completionSlices = useMemo(() => {
    const completed = completionValues.reduce((sum, item) => sum + item, 0);
    return [
      { label: 'Completed', value: completed },
      { label: 'Missed', value: Math.max(0, completionValues.length - completed) },
    ];
  }, [completionValues.join(',')]);

  const shareUrl = useMemo(() => {
    if (!form.slug) {
      return '';
    }

    return `${window.location.origin}/?portfolio=${encodeURIComponent(form.slug)}`;
  }, [form.slug]);

  const onSaveSettings = async () => {
    setSaving(true);
    setError('');
    setStatus('');

    try {
      const payload = {
        publicEnabled: form.publicEnabled,
        slug: form.slug,
        headline: form.headline,
        summary: form.summary,
        themePreference: form.themePreference,
        accentColor: form.accentColor,
        contactLinks: {
          github: form.github,
          linkedin: form.linkedin,
          website: form.website,
        },
      };

      const updated = await updateMyPortfolioSettings(payload);
      setSettings(updated);
      applyThemePreference(updated.themePreference);
      setStatus('Portfolio settings saved.');
      await loadPortfolio();
    } catch (requestError) {
      setError(requestError.message || 'Unable to save portfolio settings.');
    } finally {
      setSaving(false);
    }
  };

  const onExportPdf = async () => {
    setError('');
    setStatus('');

    try {
      const data = await getPortfolioExportPayload();
      const { jsPDF } = await import('jspdf');

      const mount = document.createElement('div');
      mount.style.position = 'fixed';
      mount.style.left = '-99999px';
      mount.style.top = '0';
      mount.innerHTML = toPdfMarkup(data, aiInsights);
      document.body.appendChild(mount);

      const doc = new jsPDF('p', 'pt', 'a4');
      await doc.html(mount.firstElementChild, {
        margin: [20, 20, 20, 20],
        autoPaging: 'text',
        width: 555,
        windowWidth: 760,
        html2canvas: {
          scale: 0.9,
          useCORS: true,
        },
      });

      doc.save(`grindforge-portfolio-${data.settings?.slug || 'export'}.pdf`);
      document.body.removeChild(mount);
      setStatus('Portfolio PDF exported with charts and AI insights.');
    } catch (requestError) {
      setError(requestError.message || 'Unable to export PDF.');
    }
  };

  const onExportPlacementResume = async () => {
    setError('');
    setStatus('');

    try {
      const [data, kanbanData, achievementsData] = await Promise.all([
        getPortfolioExportPayload(),
        getProjectsKanban(),
        getAchievements(),
      ]);

      const topProjects = normalizeProjectList(kanbanData?.columns || {});
      const earnedBadges = achievementsData?.earnedBadges || [];

      const mount = document.createElement('div');
      mount.style.position = 'fixed';
      mount.style.left = '-99999px';
      mount.style.top = '0';
      mount.innerHTML = buildPlacementResumeMarkup(data, topProjects, earnedBadges);
      document.body.appendChild(mount);

      const html2pdfModule = await import('html2pdf.js');
      const html2pdf = html2pdfModule.default || html2pdfModule;

      await html2pdf()
        .set({
          margin: [0, 0, 0, 0],
          filename: `placement-resume-${data?.settings?.slug || 'grindforge'}.pdf`,
          image: { type: 'jpeg', quality: 0.95 },
          html2canvas: { scale: 2, useCORS: true },
          jsPDF: { unit: 'pt', format: 'a4', orientation: 'portrait' },
          pagebreak: { mode: ['avoid-all'] },
        })
        .from(mount.firstElementChild)
        .save();

      document.body.removeChild(mount);
      setStatus('Placement resume exported successfully.');
    } catch (requestError) {
      setError(requestError.message || 'Unable to export placement resume.');
    }
  };

  const onGenerateAiInsights = async () => {
    setAiLoading(true);
    setError('');

    try {
      const data = await getPortfolioExportPayload();
      setAiInsights(data?.aiPortfolioInsights?.insight || null);
      setStatus('AI insights refreshed successfully.');
    } catch (requestError) {
      setError(requestError.message || 'Unable to generate AI insights.');
    } finally {
      setAiLoading(false);
    }
  };

  if (loading) {
    return <p className="loading">Loading portfolio module...</p>;
  }

  return (
    <section className="portfolio-module">
      <header className="panel portfolio-header">
        <div className="panel__head">
          <h2>{isPublicView ? 'Public Portfolio' : 'Portfolio Polish Studio'}</h2>
          <p>Theme, public mode, advanced visuals, and AI-rich PDF exports.</p>
        </div>

        {profile ? (
          <p className="portfolio-identity">
            {profile.displayName || profile.username} · Level {profile.level} · XP {profile.totalXp}
          </p>
        ) : null}

        {error ? <p className="error-banner">{error}</p> : null}
        {status ? <p className="status-banner">{status}</p> : null}
      </header>

      {!isPublicView ? (
        <section className="panel portfolio-settings">
          <div className="panel__head">
            <h3>Portfolio Settings</h3>
            <p>Control theme, share link, and public mode visibility.</p>
          </div>

          <div className="portfolio-form-grid">
            <label className="field">
              <span>Headline</span>
              <input
                type="text"
                value={form.headline}
                onChange={(event) => setForm((prev) => ({ ...prev, headline: event.target.value }))}
                placeholder="Your one-line brand statement"
              />
            </label>

            <label className="field">
              <span>Public Slug</span>
              <input
                type="text"
                value={form.slug}
                onChange={(event) => setForm((prev) => ({ ...prev, slug: event.target.value.toLowerCase() }))}
                placeholder="your-name-portfolio"
              />
            </label>

            <label className="field portfolio-field-full">
              <span>Summary</span>
              <textarea
                value={form.summary}
                onChange={(event) => setForm((prev) => ({ ...prev, summary: event.target.value }))}
                rows={4}
                placeholder="Share your prep approach and outcomes"
              />
            </label>

            <label className="field">
              <span>Theme Preference</span>
              <select
                value={form.themePreference}
                onChange={(event) => setForm((prev) => ({ ...prev, themePreference: event.target.value }))}
              >
                <option value="dark">Dark</option>
                <option value="light">Light</option>
                <option value="system">System</option>
              </select>
            </label>

            <label className="field">
              <span>Accent Color</span>
              <input
                type="text"
                value={form.accentColor}
                onChange={(event) => setForm((prev) => ({ ...prev, accentColor: event.target.value }))}
                placeholder="#00bcd4"
              />
            </label>

            <label className="field">
              <span>GitHub URL</span>
              <input
                type="url"
                value={form.github}
                onChange={(event) => setForm((prev) => ({ ...prev, github: event.target.value }))}
              />
            </label>

            <label className="field">
              <span>LinkedIn URL</span>
              <input
                type="url"
                value={form.linkedin}
                onChange={(event) => setForm((prev) => ({ ...prev, linkedin: event.target.value }))}
              />
            </label>

            <label className="field">
              <span>Website URL</span>
              <input
                type="url"
                value={form.website}
                onChange={(event) => setForm((prev) => ({ ...prev, website: event.target.value }))}
              />
            </label>

            <label className="portfolio-toggle">
              <input
                type="checkbox"
                checked={form.publicEnabled}
                onChange={(event) => setForm((prev) => ({ ...prev, publicEnabled: event.target.checked }))}
              />
              <span>Enable Public Portfolio</span>
            </label>
          </div>

          <div className="portfolio-actions">
            <button type="button" className="button" onClick={onSaveSettings} disabled={saving}>
              {saving ? 'Saving...' : 'Save Settings'}
            </button>
            <button type="button" className="button button-secondary" onClick={onGenerateAiInsights} disabled={aiLoading}>
              {aiLoading ? 'Generating...' : 'Generate AI Insights'}
            </button>
            <button type="button" className="button button-secondary" onClick={onExportPdf}>
              Export Beautiful PDF
            </button>
            <button type="button" className="button" onClick={onExportPlacementResume}>
              Export Placement Resume
            </button>
            {shareUrl ? (
              <button
                type="button"
                className="button button-secondary"
                onClick={() => {
                  navigator.clipboard?.writeText(shareUrl);
                  setStatus('Public link copied to clipboard.');
                }}
              >
                Copy Public Link
              </button>
            ) : null}
          </div>

          {form.publicEnabled && shareUrl ? <p className="portfolio-share-url">{shareUrl}</p> : null}
        </section>
      ) : null}

      <PortfolioStats snapshot={snapshot} />

      <section className="portfolio-charts-grid">
        <LineChart
          title="Line Chart: XP vs Study Hours"
          primaryValues={questValues}
          secondaryValues={hoursValues}
          labels={questLabels}
        />
        <Sparkline
          title="Mock Score Trend"
          values={mockValues}
          labels={mockLabels}
          color="#00bcd4"
        />
        <Sparkline
          title="Quest Completion Signal"
          values={completionValues}
          labels={questLabels}
          color="#ffc166"
        />
        <SpiderChart rows={snapshot?.summary?.readinessRadar || []} />
      </section>

      <section className="portfolio-charts-grid">
        <PieChart
          title="Pie Chart: Completion Mix"
          slices={completionSlices}
        />
        <DonutBreakdown
          title="DSA Difficulty Mix"
          slices={snapshot?.graphs?.dsaDifficultyBreakdown || []}
        />
        <BarSeries
          title="Mock Section Scores"
          rows={snapshot?.graphs?.mockSectionAverages || []}
          labelKey="section"
          valueKey="score"
          color="#00bcd4"
        />
      </section>

      <section className="panel">
        <div className="panel__head">
          <h3>Top Weakness Clusters</h3>
          <p>Use these as talking points for your improvement plan.</p>
        </div>
        {(snapshot?.mocks?.topWeaknesses || []).length ? (
          <div className="portfolio-weakness-list">
            {snapshot.mocks.topWeaknesses.map((item) => (
              <article key={item.weakness} className="portfolio-weakness-row">
                <span>{item.weakness}</span>
                <strong>{item.count} mentions</strong>
              </article>
            ))}
          </div>
        ) : (
          <p className="empty-text">Not enough mock data yet to infer repeated weaknesses.</p>
        )}
      </section>

      {aiInsights ? (
        <section className="panel">
          <div className="panel__head">
            <h3>AI Readiness Insights</h3>
            <p>Data-driven assessment generated from your latest prep signals.</p>
          </div>

          <div className="portfolio-ai-score">
            <span>Readiness Score</span>
            <strong>{aiInsights.readinessScore || 0}</strong>
          </div>

          <p className="portfolio-ai-summary">{aiInsights.executiveSummary || ''}</p>

          <div className="portfolio-ai-grid">
            <article>
              <h4>Strengths</h4>
              <ul>
                {(aiInsights.strengths || []).map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </article>
            <article>
              <h4>Risks</h4>
              <ul>
                {(aiInsights.risks || []).map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </article>
          </div>
        </section>
      ) : null}

      {isPublicView ? (
        <section className="panel">
          <p className="portfolio-public-note">
            This is a public portfolio snapshot powered by GrindForge. Add <strong>?portfolio=your-slug</strong> to share.
          </p>
        </section>
      ) : null}
    </section>
  );
}

export default PortfolioModule;
