import assert from 'node:assert/strict'

import {
  getIntegrationChannelSelectionState,
  normalizeBundleAccountState,
  normalizeBundleCallbackCode,
  platformRequiresChannelSelection,
} from '../lib/bundle-account-state'

function run(name: string, fn: () => void) {
  fn()
  console.log(`PASS ${name}`)
}

run('requires channel selection for documented platforms without a selected channel', () => {
  const normalized = normalizeBundleAccountState({
    id: 'acc-1',
    type: 'YOUTUBE',
    channels: [{ id: 'channel-1', name: 'Main Channel' }],
  })

  assert.equal(normalized.metadata.requires_channel_selection, true)
  assert.equal(normalized.metadata.channel_id, null)
  assert.deepEqual(normalized.metadata.available_channels, [
    { id: 'channel-1', name: 'Main Channel', username: null, avatar_url: null },
  ])
  assert.equal(normalized.display_name, 'Configure YOUTUBE')
})

run('clears channel selection requirement once a documented platform has a selected channel', () => {
  const normalized = normalizeBundleAccountState({
    id: 'acc-2',
    type: 'FACEBOOK',
    channelId: 'page-1',
    channels: [{ id: 'page-1', name: 'Syncrio Page' }],
  })

  assert.equal(normalized.metadata.requires_channel_selection, false)
  assert.equal(normalized.metadata.channel_id, 'page-1')
  assert.equal(normalized.display_name, 'Syncrio Page')
  assert.equal(normalized.account_name, 'Syncrio Page')
})

run('does not force undocumented platforms like Google Business into channel selection', () => {
  const normalized = normalizeBundleAccountState({
    id: 'acc-3',
    type: 'GOOGLE_BUSINESS',
    displayName: 'Storefront',
  })

  assert.equal(platformRequiresChannelSelection('GOOGLE_BUSINESS'), false)
  assert.equal(normalized.metadata.requires_channel_selection, false)
  assert.equal(normalized.display_name, 'Storefront')
})

run('falls back to the selected channel name when top-level display names are missing', () => {
  const normalized = normalizeBundleAccountState({
    id: 'acc-4',
    type: 'LINKEDIN',
    channelId: 'company-1',
    channels: [{ id: 'company-1', name: 'Syncrio Company', username: 'syncrio', avatarUrl: 'https://cdn.example.com/logo.png' }],
  })

  assert.equal(normalized.display_name, 'Syncrio Company')
  assert.equal(normalized.account_name, 'Syncrio Company')
  assert.equal(normalized.username, 'syncrio')
  assert.equal(normalized.avatar_url, 'https://cdn.example.com/logo.png')
  assert.equal(normalized.account_id, 'company-1')
  assert.deepEqual(normalized.metadata.available_channels, [
    {
      id: 'company-1',
      name: 'Syncrio Company',
      username: 'syncrio',
      avatar_url: 'https://cdn.example.com/logo.png',
    },
  ])
})

run('uses the explicitly selected channel id to clear setup state when Bundle does not echo channelId', () => {
  const normalized = normalizeBundleAccountState(
    {
      id: 'acc-5',
      type: 'LINKEDIN',
      platformId: 'urn:li:person:Uk41MKGYGE',
      displayName: 'Personal LinkedIn',
      channels: [
        {
          id: 'urn:li:organization:123456',
          name: 'Syncrio Company',
          username: 'syncrio-company',
          avatarUrl: 'https://cdn.example.com/company.png',
        },
      ],
    },
    'LINKEDIN',
    'urn:li:organization:123456'
  )

  assert.equal(normalized.metadata.requires_channel_selection, false)
  assert.equal(normalized.metadata.channel_id, 'urn:li:organization:123456')
  assert.equal(normalized.account_id, 'urn:li:organization:123456')
  assert.equal(normalized.account_name, 'Syncrio Company')
  assert.equal(normalized.display_name, 'Syncrio Company')
  assert.equal(normalized.username, 'syncrio-company')
  assert.equal(normalized.avatar_url, 'https://cdn.example.com/company.png')
})

run('normalizes callback codes and UI channel detection consistently', () => {
  assert.equal(normalizeBundleCallbackCode(' NOT_ENOUGHT_PERMISSIONS '), 'not-enought-permissions')
  assert.equal(
    getIntegrationChannelSelectionState({
      platform: 'INSTAGRAM',
      metadata: { requires_channel_selection: false, channel_id: null },
    }),
    true
  )
  assert.equal(
    getIntegrationChannelSelectionState({
      platform: 'GOOGLE_BUSINESS',
      metadata: { requires_channel_selection: false, channel_id: null },
    }),
    false
  )
  assert.equal(
    getIntegrationChannelSelectionState({
      platform: 'LINKEDIN',
      accountId: 'urn:li:person:Uk41MKGYGE',
      metadata: {
        requires_channel_selection: true,
        channel_id: null,
        available_channels: [{ id: 'urn:li:person:Uk41MKGYGE' }],
      },
    }),
    false
  )
})
