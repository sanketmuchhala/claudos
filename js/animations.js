/* ===== ANIMATIONS: Advanced Animation Utilities ===== */

/**
 * Find dock icon element for a given app
 * @param {string} appName - App identifier (e.g., 'finder', 'notes')
 * @returns {HTMLElement|null} Dock icon element
 */
function findDockIcon(appName) {
  const dockIcons = document.querySelectorAll('.di');
  for (const icon of dockIcons) {
    if (icon.onclick && icon.onclick.toString().includes(`'${appName}'`)) {
      return icon;
    }
  }
  return null;
}

/**
 * Genie minimize animation - animates window to dock icon
 * @param {HTMLElement} windowEl - Window element to minimize
 * @param {string} appName - App name to find target dock icon
 * @param {Function} onComplete - Callback when animation finishes
 */
function genieMinimize(windowEl, appName, onComplete) {
  const dockIcon = findDockIcon(appName);
  if (!dockIcon) {
    // Fallback to simple minimize if can't find dock icon
    simpleMinimize(windowEl, onComplete);
    return;
  }

  const wRect = windowEl.getBoundingClientRect();
  const dRect = dockIcon.getBoundingClientRect();
  const scale = getOSScale();

  // Calculate target position (center of dock icon)
  const startX = wRect.left / scale;
  const startY = wRect.top / scale;
  const endX = (dRect.left + dRect.width / 2) / scale;
  const endY = (dRect.top + dRect.height / 2) / scale;

  const deltaX = endX - startX - wRect.width / 2;
  const deltaY = endY - startY - wRect.height / 2;

  // Check if Web Animations API is available
  if (typeof windowEl.animate === 'function') {
    try {
      windowEl.style.willChange = 'transform, opacity';

      const animation = windowEl.animate([
        {
          transform: 'translate(0, 0) scale(1)',
          opacity: 1
        },
        {
          transform: `translate(${deltaX}px, ${deltaY}px) scale(0.05)`,
          opacity: 0
        }
      ], {
        duration: 400,
        easing: 'cubic-bezier(0.4, 0.0, 0.2, 1)',
        fill: 'forwards'
      });

      animation.onfinish = () => {
        windowEl.style.willChange = 'auto';
        if (onComplete) onComplete();
      };
    } catch (e) {
      console.warn('Genie animation failed, using fallback', e);
      simpleMinimize(windowEl, onComplete);
    }
  } else {
    // Fallback for browsers without Web Animations API
    simpleMinimize(windowEl, onComplete);
  }
}

/**
 * Simple minimize fallback animation
 * @param {HTMLElement} windowEl - Window element
 * @param {Function} onComplete - Callback when done
 */
function simpleMinimize(windowEl, onComplete) {
  windowEl.classList.add('minimizing');
  setTimeout(() => {
    if (onComplete) onComplete();
  }, 400);
}

/**
 * Smooth maximize animation
 * @param {HTMLElement} windowEl - Window element to maximize
 * @param {Object} targetRect - Target dimensions {left, top, width, height}
 * @param {Function} onComplete - Callback when animation finishes
 */
function smoothMaximize(windowEl, targetRect, onComplete) {
  const currentRect = windowEl.getBoundingClientRect();
  const scale = getOSScale();

  // Current position in OS coordinates
  const currentLeft = currentRect.left / scale;
  const currentTop = currentRect.top / scale;
  const currentWidth = windowEl.offsetWidth;
  const currentHeight = windowEl.offsetHeight;

  // Check if Web Animations API is available
  if (typeof windowEl.animate === 'function') {
    try {
      windowEl.style.willChange = 'left, top, width, height, border-radius';

      const animation = windowEl.animate([
        {
          left: currentLeft + 'px',
          top: currentTop + 'px',
          width: currentWidth + 'px',
          height: currentHeight + 'px',
          borderRadius: '12px'
        },
        {
          left: targetRect.left + 'px',
          top: targetRect.top + 'px',
          width: targetRect.width + 'px',
          height: targetRect.height + 'px',
          borderRadius: targetRect.borderRadius || '0px'
        }
      ], {
        duration: 300,
        easing: 'cubic-bezier(0.16, 1, 0.3, 1)',
        fill: 'forwards'
      });

      animation.onfinish = () => {
        // Apply final styles directly to DOM
        windowEl.style.left = targetRect.left + 'px';
        windowEl.style.top = targetRect.top + 'px';
        windowEl.style.width = targetRect.width + 'px';
        windowEl.style.height = targetRect.height + 'px';
        windowEl.style.borderRadius = targetRect.borderRadius || '0px';
        windowEl.style.willChange = 'auto';

        if (onComplete) onComplete();
      };
    } catch (e) {
      console.warn('Maximize animation failed, using instant', e);
      // Fallback to instant change
      windowEl.style.left = targetRect.left + 'px';
      windowEl.style.top = targetRect.top + 'px';
      windowEl.style.width = targetRect.width + 'px';
      windowEl.style.height = targetRect.height + 'px';
      windowEl.style.borderRadius = targetRect.borderRadius || '0px';
      if (onComplete) onComplete();
    }
  } else {
    // Fallback for browsers without Web Animations API
    windowEl.style.transition = 'all 0.3s cubic-bezier(0.16, 1, 0.3, 1)';
    windowEl.style.left = targetRect.left + 'px';
    windowEl.style.top = targetRect.top + 'px';
    windowEl.style.width = targetRect.width + 'px';
    windowEl.style.height = targetRect.height + 'px';
    windowEl.style.borderRadius = targetRect.borderRadius || '0px';

    setTimeout(() => {
      windowEl.style.transition = '';
      if (onComplete) onComplete();
    }, 300);
  }
}

/**
 * Smooth restore from maximize
 * @param {HTMLElement} windowEl - Window element
 * @param {Object} targetRect - Original dimensions to restore
 * @param {Function} onComplete - Callback when done
 */
function smoothRestore(windowEl, targetRect, onComplete) {
  // Parse current styles
  const currentLeft = parseInt(windowEl.style.left) || 0;
  const currentTop = parseInt(windowEl.style.top) || 0;
  const currentWidth = parseInt(windowEl.style.width) || windowEl.offsetWidth;
  const currentHeight = parseInt(windowEl.style.height) || windowEl.offsetHeight;

  // Parse target styles (targetRect is the saved cssText)
  const tempDiv = document.createElement('div');
  tempDiv.style.cssText = targetRect;
  const targetLeft = parseInt(tempDiv.style.left) || 100;
  const targetTop = parseInt(tempDiv.style.top) || 100;
  const targetWidth = parseInt(tempDiv.style.width) || 600;
  const targetHeight = parseInt(tempDiv.style.height) || 400;

  if (typeof windowEl.animate === 'function') {
    try {
      windowEl.style.willChange = 'left, top, width, height, border-radius';

      const animation = windowEl.animate([
        {
          left: currentLeft + 'px',
          top: currentTop + 'px',
          width: currentWidth + 'px',
          height: currentHeight + 'px',
          borderRadius: '0px'
        },
        {
          left: targetLeft + 'px',
          top: targetTop + 'px',
          width: targetWidth + 'px',
          height: targetHeight + 'px',
          borderRadius: '12px'
        }
      ], {
        duration: 300,
        easing: 'cubic-bezier(0.16, 1, 0.3, 1)',
        fill: 'forwards'
      });

      animation.onfinish = () => {
        windowEl.style.cssText = targetRect;
        windowEl.style.willChange = 'auto';
        if (onComplete) onComplete();
      };
    } catch (e) {
      console.warn('Restore animation failed', e);
      windowEl.style.cssText = targetRect;
      if (onComplete) onComplete();
    }
  } else {
    // Fallback
    windowEl.style.transition = 'all 0.3s cubic-bezier(0.16, 1, 0.3, 1)';
    setTimeout(() => {
      windowEl.style.cssText = targetRect;
      windowEl.style.transition = '';
      if (onComplete) onComplete();
    }, 10);
  }
}

/**
 * Notification banner slide-in animation
 * @param {string} title - Notification title
 * @param {string} message - Notification message
 * @param {string} icon - Emoji icon (default: 🔔)
 * @param {number} duration - Auto-dismiss duration in ms (default: 5000)
 * @returns {HTMLElement} Banner element
 */
function showNotificationBanner(title, message, icon = '🔔', duration = 5000) {
  const banner = document.createElement('div');
  banner.className = 'notification-banner';
  banner.innerHTML = `
    <div class="notif-icon">${icon}</div>
    <div class="notif-content">
      <div class="notif-title">${title}</div>
      <div class="notif-message">${message}</div>
    </div>
    <button class="notif-close" onclick="this.parentElement.remove()">✕</button>
  `;

  // Stack multiple notifications
  const existing = document.querySelectorAll('.notification-banner');
  let topOffset = 40;
  existing.forEach((el, i) => {
    const currentTop = parseInt(el.style.top) || 40;
    el.style.top = (currentTop + 90) + 'px';
    topOffset += 90;
  });
  banner.style.top = '40px';

  document.body.appendChild(banner);

  // Slide in animation
  if (typeof banner.animate === 'function') {
    banner.animate([
      { transform: 'translateX(400px)', opacity: 0 },
      { transform: 'translateX(0)', opacity: 1 }
    ], {
      duration: 400,
      easing: 'cubic-bezier(0.16, 1, 0.3, 1)',
      fill: 'forwards'
    });
  } else {
    banner.style.opacity = '1';
  }

  // Auto-dismiss
  setTimeout(() => {
    if (banner.parentElement) {
      if (typeof banner.animate === 'function') {
        const fadeOut = banner.animate([
          { transform: 'translateX(0)', opacity: 1 },
          { transform: 'translateX(400px)', opacity: 0 }
        ], {
          duration: 300,
          easing: 'cubic-bezier(0.4, 0, 1, 1)',
          fill: 'forwards'
        });
        fadeOut.onfinish = () => banner.remove();
      } else {
        banner.remove();
      }
    }
  }, duration);

  return banner;
}

/**
 * Dock icon bounce animation (when app opens)
 * @param {string} appName - App name to find dock icon
 */
function dockIconBounce(appName) {
  const dockIcon = findDockIcon(appName);
  if (!dockIcon) return;

  if (typeof dockIcon.animate === 'function') {
    dockIcon.animate([
      { transform: 'translateY(0) scale(1)' },
      { transform: 'translateY(-20px) scale(1.2)' },
      { transform: 'translateY(0) scale(1)' },
      { transform: 'translateY(-10px) scale(1.1)' },
      { transform: 'translateY(0) scale(1)' }
    ], {
      duration: 600,
      easing: 'cubic-bezier(0.34, 1.56, 0.64, 1)' // Bounce effect
    });
  }
}

/**
 * Update dock badge count
 * @param {string} appName - App name
 * @param {number} count - Badge count (0 to remove)
 */
function updateDockBadge(appName, count) {
  const dockIcon = findDockIcon(appName);
  if (!dockIcon) return;

  let badge = dockIcon.querySelector('.dock-badge');

  if (count === 0 || count === null || count === undefined) {
    if (badge) badge.remove();
    return;
  }

  if (!badge) {
    badge = document.createElement('div');
    badge.className = 'dock-badge';
    dockIcon.appendChild(badge);
  }

  badge.textContent = count > 99 ? '99+' : count;
}
