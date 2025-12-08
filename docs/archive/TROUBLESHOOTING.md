# Troubleshooting Admin Settings

## If the game crashes or shadows don't work:

### Quick Fix: Reset Admin Settings

Open browser console (F12) and run:
```javascript
localStorage.removeItem('admin-settings')
location.reload()
```

This will clear all admin settings and reload with defaults.

### Check for Errors

1. Open browser console (F12 or Cmd+Option+I)
2. Look for red error messages
3. Take a screenshot and report

### Common Issues

**Shadows not visible:**
- Set time to noon: Press Opt+T, then 12
- Check Shadow Map Size isn't too low (should be 4096)
- Check Shadow Camera Bounds (should be 40)
- Verify sun is above horizon (not night time)

**Game crashes when changing time:**
- Clear localStorage (see Quick Fix above)
- Report error message from console

**Settings don't persist:**
- Check browser localStorage is enabled
- Try private/incognito mode
- Check console for save errors

### Safe Mode

To start with all default settings, add to URL:
```
http://localhost:3000?reset=true
```

(Feature coming soon)
