import assert from 'node:assert/strict'

import { __analyticsTestUtils } from '../lib/analytics/bundle-analytics'

function run(name: string, fn: () => void) {
  fn()
  console.log(`PASS ${name}`)
}

run('builds post metrics and engagement rate from imported post analytics', () => {
  const metrics = __analyticsTestUtils.postMetricsFromAnalytics({
    id: 'a1',
    profilePostId: 'p1',
    impressions: 1000,
    impressionsUnique: 800,
    views: 400,
    viewsUnique: 350,
    likes: 50,
    dislikes: 0,
    comments: 10,
    shares: 5,
    saves: 15,
    forced: false,
    createdAt: '2026-04-07T00:00:00.000Z',
    updatedAt: '2026-04-07T01:00:00.000Z',
  })

  assert.equal(metrics.engagementCount, 80)
  assert.equal(metrics.engagementRate, 8)
  assert.equal(metrics.impressions, 1000)
  assert.equal(metrics.saves, 15)
})

run('aggregates timeline points by post publish date', () => {
  const timeline = __analyticsTestUtils.buildTimeline(
    [
      {
        id: 'post-1',
        platform: 'INSTAGRAM',
        title: 'First',
        publishedAt: '2026-04-05T08:00:00.000Z',
        metrics: { impressions: 100, engagementCount: 20, likes: 12, comments: 5, shares: 3 },
      },
      {
        id: 'post-2',
        platform: 'INSTAGRAM',
        title: 'Second',
        publishedAt: '2026-04-05T12:00:00.000Z',
        metrics: { impressions: 250, engagementCount: 25, likes: 18, comments: 4, shares: 3 },
      },
    ] as any,
    __analyticsTestUtils.parseSelectionRange({ startDate: '2026-04-05', endDate: '2026-04-06' })
  )

  const day = timeline.find((entry) => entry.date === '2026-04-05')
  assert.ok(day)
  assert.equal(day?.postCount, 2)
  assert.equal(day?.metrics.impressions, 350)
  assert.equal(day?.metrics.engagementCount, 45)
})

run('detects advanced breakdown arrays from raw payloads', () => {
  const insights = __analyticsTestUtils.extractAdvancedInsights({
    trafficSources: [
      { source: 'Search', value: 120 },
      { source: 'Profile', value: 80 },
    ],
    deviceTypes: [
      { device: 'Mobile', value: 90 },
      { device: 'Desktop', value: 30 },
    ],
  })

  assert.equal(insights?.trafficSources?.length, 2)
  assert.equal(insights?.deviceTypes?.[0]?.label, 'Mobile')
})

run('creates capability-driven summary metric sets', () => {
  const capability = __analyticsTestUtils.buildCapability(
    'YOUTUBE',
    { views: 1000, likes: 100, comments: 12, engagementCount: 112, followers: 250, postCount: 6, engagementRate: 11.2 },
    { trafficSources: [{ label: 'Search', value: 50 }] },
    true
  )

  assert.equal(capability.hasTimeline, true)
  assert.equal(capability.hasTrafficSources, true)
  assert.ok(capability.summaryMetricIds.includes('views'))
  assert.ok(capability.summaryMetricIds.includes('engagementRate'))
})
