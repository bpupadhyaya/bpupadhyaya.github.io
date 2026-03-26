#!/usr/bin/env node
const fs = require('fs');

const releases = JSON.parse(fs.readFileSync('releases.json', 'utf8'));

function esc(str) {
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function renderRelease(r, index) {
  const dotClass = r.current ? '' : ' past';
  const tags = [];
  tags.push(`<span class="release-tag ${esc(r.tag)}">${esc(r.tag.charAt(0).toUpperCase() + r.tag.slice(1))}</span>`);
  if (r.current) tags.push('<span class="release-tag current">Current</span>');

  let body = `<p>${esc(r.summary)}</p>`;

  if (r.included && r.included.length > 0) {
    body += '\n\n                    <h4>What\'s included</h4>\n                    <ul>\n';
    for (const item of r.included) {
      body += `                        <li>${esc(item)}</li>\n`;
    }
    body += '                    </ul>';
  }

  if (r.coming && r.coming.length > 0) {
    body += '\n\n                    <h4>What\'s coming next</h4>\n                    <ul>\n';
    for (const item of r.coming) {
      body += `                        <li>${esc(item)}</li>\n`;
    }
    body += '                    </ul>';
  }

  if (r.fixes && r.fixes.length > 0) {
    body += '\n\n                    <h4>Bug fixes</h4>\n                    <ul>\n';
    for (const item of r.fixes) {
      body += `                        <li>${esc(item)}</li>\n`;
    }
    body += '                    </ul>';
  }

  if (r.changes && r.changes.length > 0) {
    body += '\n\n                    <h4>Changes</h4>\n                    <ul>\n';
    for (const item of r.changes) {
      body += `                        <li>${esc(item)}</li>\n`;
    }
    body += '                    </ul>';
  }

  let platforms = '';
  if (r.platforms && r.platforms.length > 0) {
    platforms = '\n\n                    <div class="platforms-row">\n';
    for (const p of r.platforms) {
      platforms += `                        <span class="platform-badge">${esc(p)}</span>\n`;
    }
    platforms += '                    </div>';
  }

  return `
        <!-- v${esc(r.version)} -->
        <div class="release-entry">
            <div class="release-dot${dotClass}"></div>
            <div class="release-card">
                <div class="release-header">
                    <span class="release-version">v${esc(r.version)}</span>
                    ${tags.join('\n                    ')}
                    <span class="release-date">${esc(r.date)}</span>
                </div>
                <div class="release-body">
                    ${body}${platforms}
                </div>
            </div>
        </div>`;
}

const entriesHtml = releases.map((r, i) => renderRelease(r, i)).join('\n');

const html = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Release Notes — NutriSize — EqualInformation</title>
    <meta name="description" content="NutriSize release history — what's new in each version of the health intelligence app.">
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800;900&family=JetBrains+Mono:wght@400;500&display=swap" rel="stylesheet">
    <link rel="stylesheet" href="style.css">
    <style>
        .release-timeline { position: relative; margin-top: 40px; }
        .release-entry { position: relative; padding-left: 32px; margin-bottom: 48px; }
        .release-entry::before {
            content: '';
            position: absolute;
            left: 7px;
            top: 8px;
            bottom: -40px;
            width: 2px;
            background: rgba(255,255,255,0.06);
        }
        .release-entry:last-child::before { display: none; }
        .release-dot {
            position: absolute;
            left: 0;
            top: 6px;
            width: 16px;
            height: 16px;
            border-radius: 50%;
            background: var(--accent);
            border: 3px solid var(--bg-primary);
            box-shadow: 0 0 0 2px rgba(34, 197, 94, 0.3);
        }
        .release-dot.past {
            background: rgba(255,255,255,0.15);
            box-shadow: 0 0 0 2px rgba(255,255,255,0.06);
        }
        .release-header { display: flex; align-items: center; gap: 12px; flex-wrap: wrap; margin-bottom: 12px; }
        .release-version {
            font-family: 'JetBrains Mono', monospace;
            font-size: 20px;
            font-weight: 700;
            color: var(--text-primary);
        }
        .release-date { font-size: 14px; color: var(--text-muted); }
        .release-tag {
            display: inline-block;
            padding: 2px 10px;
            border-radius: 20px;
            font-size: 11px;
            font-weight: 600;
            text-transform: uppercase;
            letter-spacing: 0.5px;
        }
        .release-tag.beta { background: rgba(249, 115, 22, 0.15); color: #f97316; }
        .release-tag.stable { background: rgba(34, 197, 94, 0.15); color: #22c55e; }
        .release-tag.current { background: rgba(34, 197, 94, 0.15); color: #22c55e; }
        .release-body { color: var(--text-secondary); font-size: 15px; line-height: 1.8; }
        .release-body ul { list-style: none; padding: 0; margin: 16px 0; }
        .release-body ul li {
            position: relative;
            padding-left: 20px;
            margin-bottom: 8px;
        }
        .release-body ul li::before {
            content: '';
            position: absolute;
            left: 0;
            top: 10px;
            width: 6px;
            height: 6px;
            border-radius: 50%;
            background: var(--accent);
        }
        .release-body h4 {
            color: var(--text-primary);
            font-size: 15px;
            font-weight: 600;
            margin-top: 20px;
            margin-bottom: 8px;
        }
        .release-card {
            background: rgba(255,255,255,0.03);
            border: 1px solid rgba(255,255,255,0.06);
            border-radius: 16px;
            padding: 24px;
        }
        .platforms-row { display: flex; gap: 8px; margin-top: 16px; }
        .platforms-row .platform-badge { font-size: 11px; }
    </style>
</head>
<body>

<!-- Navigation -->
<nav>
    <div class="nav-inner">
        <a href="index.html" class="nav-logo">
            <div class="nav-logo-icon">EI</div>
            EqualInformation
        </a>
        <ul class="nav-links">
            <li><a href="index.html#apps">Apps</a></li>
            <li><a href="index.html#expertise">Expertise</a></li>
            <li><a href="index.html#about">About</a></li>
            <li><a href="index.html#contact">Contact</a></li>
            <li><a href="release-notes.html">Release Notes</a></li>
            <li class="nav-dropdown">
                <a href="privacy.html">Privacy Policy <span class="dropdown-arrow">&#9662;</span></a>
                <ul class="dropdown-menu">
                    <li><a href="privacy.html">Overview</a></li>
                    <li><a href="privacy-android.html">Nutrisize Android</a></li>
                    <li><a href="privacy-ios.html">Nutrisize iOS</a></li>
                </ul>
            </li>
            <li class="nav-dropdown">
                <a href="support.html" class="nav-cta">Support <span class="dropdown-arrow">&#9662;</span></a>
                <ul class="dropdown-menu">
                    <li><a href="support.html">Overview</a></li>
                    <li><a href="support-nutrisize.html">Support Nutrisize</a></li>
                </ul>
            </li>
        </ul>
        <button class="mobile-menu-btn" onclick="toggleMobileMenu()">&#9776;</button>
    </div>
</nav>

<!-- Hero -->
<div class="hero hero-sub">
    <div class="hero-bg"></div>
    <div class="hero-content">
        <h1>Release <span class="gradient">Notes</span></h1>
        <p class="hero-subtitle">
            What's new in NutriSize — version history and milestones.
        </p>
    </div>
</div>

<!-- Breadcrumb -->
<ul class="breadcrumb">
    <li><a href="index.html">Home</a></li>
    <li class="sep">/</li>
    <li><a href="index.html#apps">Apps</a></li>
    <li class="sep">/</li>
    <li class="current">Release Notes</li>
</ul>

<!-- Content -->
<div class="content-section">

    <div class="highlight-box">
        <p>NutriSize is under active development. This page documents each production release with what changed, what's new, and what to expect.</p>
    </div>

    <div class="release-timeline">
${entriesHtml}
    </div>

    <p style="color: var(--text-muted); font-size: 12px; margin-top: 40px; text-align: center; font-style: italic; opacity: 0.7;">
        These release notes are maintained by AI agents. While we strive for accuracy, limitations may apply.
    </p>

    <p style="color: var(--text-muted); font-size: 13px; margin-top: 16px; text-align: center;">
        New releases will be documented here as they ship.<br>
        For feedback or questions, contact <a href="mailto:nutrisize.universal@gmail.com" style="color: var(--accent); text-decoration: none;">nutrisize.universal@gmail.com</a>
    </p>

</div>

<!-- Footer -->
<footer>
    <div class="footer-inner">
        <ul class="footer-links">
            <li><a href="index.html#apps">Apps</a></li>
            <li><a href="index.html#expertise">Expertise</a></li>
            <li><a href="index.html#about">About</a></li>
            <li><a href="index.html#contact">Contact</a></li>
            <li><a href="privacy.html">Privacy Policy</a></li>
            <li><a href="support.html">Support</a></li>
            <li><a href="release-notes.html">Release Notes</a></li>
        </ul>
        <p class="footer-copy">
            &copy; 2026 EqualInformation, LLC. All rights reserved.<br>
            <span class="highlight">Maintaining and improving human life at near-zero cost.</span>
        </p>
    </div>
</footer>

<script>
function toggleMobileMenu() {
    document.querySelector('.nav-links').classList.toggle('show');
}
document.querySelectorAll('.nav-dropdown').forEach(function(dd) {
    dd.addEventListener('click', function(e) {
        if (window.innerWidth <= 768) {
            var menu = dd.querySelector('.dropdown-menu');
            if (e.target.closest('.dropdown-menu')) return;
            e.preventDefault();
            dd.classList.toggle('open');
        }
    });
});
</script>

</body>
</html>
`;

fs.writeFileSync('release-notes.html', html);
console.log('Generated release-notes.html from releases.json');
