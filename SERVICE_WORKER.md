# Service Worker & PWA Documentation

## Overview

The Climb Count application uses a Service Worker to provide Progressive Web App (PWA) functionality, including offline support, caching strategies, and update management. This document explains how the service worker works and how to manage updates.

## Files

- **`sw.js`** - The service worker implementation
- **`manifest.json`** - PWA manifest file
- **`app.js`** - Contains service worker registration and update handling

## Service Worker Features

### 1. Offline Caching

The service worker caches all essential app resources on first visit:

```javascript
const urlsToCache = [
  '/', '/index.html', '/app.js',
  '/models/ClimbModel.js', '/views/ClimbView.js', '/controllers/ClimbController.js',
  '/images/icon-192.png', '/images/icon-512.png', '/images/icon-large.png',
  '/manifest.json'
];
```

**What this means:**
- App works completely offline after first load
- Fast loading on subsequent visits
- Reliable experience even with poor connectivity

### 2. Cache Update Strategy

#### Version-Based Cache Management

```javascript
const CACHE_VERSION = '1.0.0';
const CACHE_NAME = `climb-count-v${CACHE_VERSION}`;
```

**How it works:**
- Each app version gets its own cache namespace
- Old caches are automatically deleted when new version activates
- Increment `CACHE_VERSION` to force cache updates

#### Stale-While-Revalidate for App Files

For JavaScript, HTML, and CSS files:
1. **Immediate Response**: Serve cached version instantly
2. **Background Update**: Fetch latest version from network
3. **Cache Update**: Store new version for next visit

**Benefits:**
- Users get instant load times
- Updates happen transparently in background
- No interruption to current session

#### Cache-First for Static Assets

For images and other static assets:
- Serve from cache if available
- Only fetch from network if not cached
- Reduces bandwidth usage

## Update Management

### Automatic Update Detection

The service worker automatically detects when a new version is available:

```javascript
registration.addEventListener('updatefound', () => {
  const newWorker = registration.installing;
  newWorker.addEventListener('statechange', () => {
    if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
      showUpdateNotification();
    }
  });
});
```

### User-Controlled Updates

When updates are available, users see a friendly prompt:
> "A new version of Climb Count is available. Would you like to update now?"

**User chooses "Yes":**
- Service worker switches to new version immediately
- Page reloads with latest content
- Seamless transition

**User chooses "No":**
- Continue using current version
- Update will be applied on next page load
- No disruption to current session

## Deployment & Cache Busting

### For Regular Updates

1. **Make your code changes**
2. **Update the cache version in `sw.js`:**
   ```javascript
   const CACHE_VERSION = '1.0.1'; // Increment version number
   ```
3. **Deploy your changes**
4. **Users will see update prompt on next visit**

### For Emergency/Critical Updates

If you need to force immediate cache refresh:

```javascript
// Use timestamp for instant cache busting
const CACHE_VERSION = Date.now().toString();
```

This forces all users to download fresh content immediately.

### Version Numbering Strategy

Use semantic versioning for clarity:

- **Major updates**: `1.0.0` → `2.0.0` (breaking changes)
- **Feature updates**: `1.0.0` → `1.1.0` (new features)
- **Bug fixes**: `1.0.0` → `1.0.1` (patches)

## Development vs Production

### Development Mode

For development, you may want to disable caching:

**Option 1**: Use timestamp versioning
```javascript
const CACHE_VERSION = Date.now().toString();
```

**Option 2**: Disable in browser dev tools
- Open DevTools → Application → Service Workers
- Check "Update on reload"
- Check "Bypass for network"

### Production Mode

For production, use stable version numbers and let the update system work automatically.

## Troubleshooting

### Cache Not Updating

**Problem**: Changes not appearing despite version increment

**Solutions:**
1. Check browser dev tools → Application → Storage → Clear storage
2. Verify `CACHE_VERSION` was actually incremented
3. Check network tab to see if service worker is intercepting requests

### Service Worker Not Installing

**Problem**: PWA features not working

**Solutions:**
1. Ensure app is served over HTTPS (required for service workers)
2. Check console for service worker registration errors
3. Verify `sw.js` file is accessible at root level

### Update Prompt Not Appearing

**Problem**: Users not seeing update notifications

**Solutions:**
1. Ensure `CACHE_VERSION` was incremented
2. Check that service worker update detection code is running
3. Verify new service worker is installing (check DevTools → Application → Service Workers)

## Future Enhancements

The current service worker includes hooks for:

### Background Sync
```javascript
self.addEventListener('sync', event => {
  if (event.tag === 'background-sync') {
    // Sync offline climbing data when connection restored
  }
});
```

### Push Notifications
```javascript
self.addEventListener('push', event => {
  // Handle push notifications for climbing reminders, etc.
});
```

## Performance Considerations

### Cache Storage Limits

- Modern browsers typically allow 50-100MB per origin
- Current app cache is minimal (~few MB)
- Monitor cache usage in production

### Network Usage

- First visit: Downloads all resources
- Subsequent visits: Only updated files downloaded
- Offline: Zero network usage

### Memory Usage

- Service worker runs in separate thread
- Minimal memory footprint
- Automatically terminated when inactive

## Security Notes

- Service workers require HTTPS in production
- Cache responses are validated before storage
- Only caches successful responses (200 status)
- Respects CORS policies

## Monitoring

To monitor service worker performance:

```javascript
// Log cache hit ratios
console.log('Cache hits:', cacheHits);
console.log('Network requests:', networkRequests);

// Monitor update frequency
console.log('Last update:', localStorage.getItem('lastSWUpdate'));
```

Consider integrating with analytics to track:
- Cache hit rates
- Update adoption rates  
- Offline usage patterns
- Performance metrics

## Summary

The Climb Count service worker provides:

✅ **Reliable offline functionality**  
✅ **Fast loading through intelligent caching**  
✅ **Smooth update management**  
✅ **User-controlled update timing**  
✅ **Automatic cache maintenance**  
✅ **Production-ready performance**  

The implementation balances performance, user experience, and maintainability while following PWA best practices.